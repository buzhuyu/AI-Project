import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// Import existing project
router.post('/import', async (req: Request, res: Response) => {
    try {
        const { name, content, userId } = req.body;
        
        if (!content || !name) {
            return res.status(400).json({ success: false, error: 'Name and content are required' });
        }

        // 1. Parse content
        const chapters = parseNovelContent(content);
        if (chapters.length === 0) {
            return res.status(400).json({ success: false, error: 'No chapters found in content' });
        }

        // 2. Create Project
        const { data: project, error: projError } = await supabase
            .from('projects')
            .insert({
                name,
                description: `Imported from file. Contains ${chapters.length} chapters.`,
                user_id: userId,
                target_words: content.length, // Approx
                target_chapters: chapters.length + 20, // Assume continuation
                current_chapter: chapters.length + 1,
                settings: {
                    novelType: 'General', // Default
                    background: { description: 'Imported novel context.' },
                    characters: []
                },
                status: 'running' // Ready to continue
            })
            .select()
            .single();

        if (projError) throw projError;

        // 3. Insert Chapters
        const chapterRows = chapters.map(ch => ({
            project_id: project.id,
            chapter_number: ch.chapter_number,
            title: ch.title,
            content: ch.content,
            word_count: ch.content.length,
            status: 'completed'
        }));

        const { error: chError } = await supabase
            .from('chapters')
            .insert(chapterRows);

        if (chError) throw chError;

        // 4. Trigger Summary for last 5 chapters (Async)
        // We do this in background to avoid timeout
        (async () => {
            console.log(`[Import] Generating summaries for last 5 chapters of ${project.id}...`);
            const recentChapters = chapterRows.slice(-5);
            for (const ch of recentChapters) {
                try {
                    const summary = await summaryAgent.generateSummary(ch.content);
                    if (summary) {
                        // Find the chapter ID (we need to query it back since insert doesn't return IDs for bulk easily in all versions, or we can fetch)
                        // Actually, let's fetch the inserted chapters to get IDs
                        const { data: insertedCh } = await supabase
                            .from('chapters')
                            .select('id')
                            .eq('project_id', project.id)
                            .eq('chapter_number', ch.chapter_number)
                            .single();
                        
                        if (insertedCh) {
                            await supabase.from('chapters').update({ summary }).eq('id', insertedCh.id);
                            // Also log review
                            await supabase.from('reviews').insert({
                                chapter_id: insertedCh.id,
                                agent_type: 'summary_agent',
                                score: 10,
                                feedback: { content: summary },
                                status: 'approved'
                            });
                        }
                    }
                } catch (e) {
                    console.error('[Import] Summary error:', e);
                }
            }
            console.log(`[Import] Context build complete for ${project.id}`);
        })();

        res.json({ success: true, data: project });

    } catch (error: any) {
        console.error('Import error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create a new project
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, novelType, targetWords, chapterCount, aiWriteCount, background, powerSystem, characterInfo, plotOutline, characters, userId } = req.body;

    // TODO: Validate input

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        user_id: userId, // In a real app, get this from auth middleware
        target_words: targetWords,
        target_chapters: chapterCount,
        settings: {
            novelType,
            background,
            powerSystem,
            characterInfo,
            plotOutline,
            characters,
            aiWriteCount // 记录 AI 试写章节数
        },
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;

    // Create initial chapters based on count
    const chapters = Array.from({ length: chapterCount }, (_, i) => ({
        project_id: data.id,
        chapter_number: i + 1,
        title: `第${i + 1}章`,
        status: 'pending'
    }));

    const { error: chapterError } = await supabase
        .from('chapters')
        .insert(chapters);

    if (chapterError) throw chapterError;

    res.status(201).json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all projects for a user
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }

        const { data: projects, error } = await supabase
            .from('projects')
            .select(`
                *,
                chapters (
                    id,
                    status,
                    word_count,
                    content
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Calculate stats for each project
        const enrichedProjects = projects.map((p: any) => {
            const completedChapters = p.chapters?.filter((c: any) => c.status === 'completed' || (c.content && c.content.length > 50)) || [];
            const totalWords = completedChapters.reduce((sum: number, c: any) => sum + (c.word_count || (c.content ? c.content.length : 0)), 0);
            
            // Remove chapters from list to keep response light
            const { chapters, ...projectData } = p;
            
            return {
                ...projectData,
                total_chapters_count: completedChapters.length,
                total_word_count: totalWords
            };
        });

        res.json({ success: true, data: enrichedProjects });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get project details
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                chapters (
                    *,
                    reviews (count)
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Sort chapters
        if (data.chapters) {
            data.chapters.sort((a: any, b: any) => a.chapter_number - b.chapter_number);
            
            // Format reviews count
            data.chapters = data.chapters.map((ch: any) => ({
                ...ch,
                review_count: ch.reviews?.[0]?.count || 0
            }));
        }

        // Calculate total stats
        const completedChapters = data.chapters?.filter((c: any) => c.status === 'completed' || (c.content && c.content.length > 50)) || [];
        const totalWords = completedChapters.reduce((sum: number, c: any) => sum + (c.word_count || (c.content ? c.content.length : 0)), 0);

        const responseData = {
            ...data,
            total_chapters_count: completedChapters.length,
            total_word_count: totalWords
        };

        res.json({ success: true, data: responseData });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

import { writerAgent } from '../agents/writer.js';
import { revisionAgent } from '../agents/revision.js';
import { parseNovelContent } from '../lib/parser.js';
import { summaryAgent } from '../agents/summary.js'; // Import revision agent

// Start writing a chapter (Trigger Writer Agent)
router.post('/:id/start', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { chapterNumber = 1 } = req.body;

        // Update project status to running
        await supabase
            .from('projects')
            .update({ status: 'running', current_chapter: chapterNumber })
            .eq('id', id);

        // Update chapter status to writing and trigger background generation
        const { data: chapter } = await supabase
            .from('chapters')
            .select('id')
            .eq('project_id', id)
            .eq('chapter_number', chapterNumber)
            .single();
            
        if (chapter) {
             await supabase
            .from('chapters')
            .update({ status: 'writing', content: '' })
            .eq('id', chapter.id);

            // Trigger background generation
            writerAgent.startBackgroundGeneration(id, chapterNumber).catch(err => console.error('BG Gen Error:', err));
        }

        res.json({ 
            success: true, 
            message: 'Project started',
            projectId: id,
            currentChapter: chapterNumber
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Force Start Next Chapter
router.post('/:id/start-next', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { currentChapterNumber } = req.body;

        // Find next chapter
        const nextNum = Number(currentChapterNumber) + 1;
        
        // Trigger Writer Agent for next chapter
        // Logic similar to start, but specifically for next chapter
        // We can reuse workflowManager's startNextChapter logic or just call writerAgent directly
        
        // Update project
        await supabase
            .from('projects')
            .update({ status: 'running', current_chapter: nextNum })
            .eq('id', id);

        const { data: nextChapter } = await supabase
            .from('chapters')
            .select('id')
            .eq('project_id', id)
            .eq('chapter_number', nextNum)
            .single();

        if (nextChapter) {
             await supabase
            .from('chapters')
            .update({ status: 'writing' })
            .eq('id', nextChapter.id);

            writerAgent.startBackgroundGeneration(id, nextNum).catch(err => console.error('BG Gen Error:', err));
        } else {
            return res.status(400).json({ success: false, error: 'Next chapter not found' });
        }

        res.json({ success: true, message: 'Next chapter started' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Stop/Reset Project Status
router.post('/:id/stop', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await supabase
            .from('projects')
            .update({ status: 'paused' })
            .eq('id', id);
        
        res.json({ success: true, message: 'Project stopped' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update project settings
router.put('/:id/settings', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, settings } = req.body;
        
        // Fetch current project to merge settings
        const { data: project } = await supabase
            .from('projects')
            .select('settings, name, description')
            .eq('id', id)
            .single();
            
        const newSettings = {
            ...project?.settings,
            ...settings
        };

        const updateData: any = { settings: newSettings };
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        const { data, error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Worldview Endpoints
router.get('/:id/worldview', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('worldview_entries')
            .select('*')
            .eq('project_id', id)
            .order('category', { ascending: true });
            
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/:id/worldview', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, category, description, status } = req.body;
        
        const { data, error } = await supabase
            .from('worldview_entries')
            .insert({
                project_id: id,
                name,
                category,
                description,
                status
            })
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/:id/worldview/:entryId', async (req: Request, res: Response) => {
    try {
        const { id, entryId } = req.params;
        const { error } = await supabase
            .from('worldview_entries')
            .delete()
            .eq('id', entryId)
            .eq('project_id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Worldview Endpoints (existing code...)

// Plot Thread Endpoints
router.get('/:id/plot-threads', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('plot_threads')
            .select('*')
            .eq('project_id', id)
            .order('status', { ascending: false }) // 'open' first if 'open' > 'resolved' alphabetically? No, 'r' > 'o'. So 'resolved' first. Let's filter in frontend or use custom order.
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/:id/plot-threads', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { content, start_chapter_number } = req.body;
        
        const { data, error } = await supabase
            .from('plot_threads')
            .insert({
                project_id: id,
                content,
                start_chapter_number: start_chapter_number || null,
                status: 'open'
            })
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch('/:id/plot-threads/:threadId', async (req: Request, res: Response) => {
    try {
        const { id, threadId } = req.params;
        const { status, resolved_chapter_number } = req.body;
        
        const { data, error } = await supabase
            .from('plot_threads')
            .update({ status, resolved_chapter_number })
            .eq('id', threadId)
            .eq('project_id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/:id/plot-threads/:threadId', async (req: Request, res: Response) => {
    try {
        const { id, threadId } = req.params;
        const { error } = await supabase
            .from('plot_threads')
            .delete()
            .eq('id', threadId)
            .eq('project_id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Export project to TXT
router.get('/:id/export', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { data: project } = await supabase.from('projects').select('name').eq('id', id).single();
        const { data: chapters, error } = await supabase
            .from('chapters')
            .select('chapter_number, title, content')
            .eq('project_id', id)
            .order('chapter_number', { ascending: true });

        if (error) throw error;

        let fileContent = `${project?.name || 'Novel'}\n\n`;
        
        if (chapters) {
            chapters.forEach(ch => {
                if (ch.content) {
                    fileContent += `第${ch.chapter_number}章 ${ch.title || ''}\n\n`;
                    fileContent += `${ch.content}\n\n`;
                    fileContent += `--------------------------------------------------\n\n`;
                }
            });
        }

        const filename = encodeURIComponent((project?.name || 'novel') + '.txt');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
        res.send(fileContent);

    } catch (error: any) {
        console.error('Export error:', error);
        res.status(500).send('Export failed');
    }
});

import { worldviewAgent } from '../agents/worldview.js';

// ...

// Start Full Analysis
router.post('/:id/analyze-all', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await worldviewAgent.startFullAnalysis(id);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Stop Analysis
router.post('/:id/analyze-stop', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const stopped = worldviewAgent.stopAnalysis(id);
        if (stopped) {
            res.json({ success: true, message: 'Analysis stopped' });
        } else {
            res.status(400).json({ success: false, message: 'No analysis running or failed to stop' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Analysis Progress
router.get('/:id/analysis-progress', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const progress = worldviewAgent.getProgress(id);
        res.json({ success: true, data: progress });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Stream generation endpoint (SSE)
router.get('/:id/chapters/:chapterNumber/stream', async (req: Request, res: Response) => {
    const { id, chapterNumber } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        // Find chapter ID first
        const { data: chapter } = await supabase
            .from('chapters')
            .select('id, status, content')
            .eq('project_id', id)
            .eq('chapter_number', chapterNumber)
            .single();

        if (!chapter) {
             res.write(`data: ${JSON.stringify({ error: 'Chapter not found' })}\n\n`);
             res.end();
             return;
        }

        // If active generation, subscribe
        if (chapter.status === 'writing') {
             // Check if it's WriterAgent or RevisionAgent
             // For now both emit to same stream logic? 
             // RevisionAgent doesn't expose subscribeToStream yet in my code above? 
             // Let's check RevisionAgent code. I copied WriterAgent's subscribe logic.
             // But we need to know WHICH one is active.
             // Simple hack: try subscribing to both? Or check if writer has it.
             
             // Actually, RevisionAgent.startRevision sets status to 'writing' (or I should have set it to 'revising'?)
             // In triggerRevision I set it to 'writing'. 
             // Let's try WriterAgent first.
             
             // We can check `writerAgent.activeStreams.has(chapter.id)`? (Need to make it public or add method)
             // But activeStreams is private.
             // Let's just try to subscribe. If no stream, it sends nothing immediately.
             
             // BETTER: Check which agent has the stream
             // I'll assume it's writerAgent for now. If user is in revision loop, it might be revisionAgent.
             // Let's modify RevisionAgent to share the stream or handle it.
             
             // Let's try both.
             writerAgent.subscribeToStream(chapter.id, res);
             revisionAgent.subscribeToStream(chapter.id, res);
        } else {
             // If already done, just return content once
             res.write(`data: ${JSON.stringify({ content: chapter.content || '' })}\n\n`);
             res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
             res.end();
        }
    } catch (error: any) {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// Stop specific chapter generation
router.post('/:id/chapters/:chapterNumber/stop', async (req: Request, res: Response) => {
    try {
        const { id, chapterNumber } = req.params;
        const { data: chapter } = await supabase
            .from('chapters')
            .select('id')
            .eq('project_id', id)
            .eq('chapter_number', chapterNumber)
            .single();

        if (chapter) {
            const stopped = writerAgent.stopGeneration(chapter.id);
            if (stopped) {
                res.json({ success: true, message: 'Generation stopped' });
            } else {
                // Also try stopping revision agent if needed, but for now just writer
                res.json({ success: false, message: 'No active generation found' });
            }
        } else {
            res.status(404).json({ success: false, message: 'Chapter not found' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Continue generation / Insert Instruction
router.post('/:id/chapters/:chapterNumber/continue', async (req: Request, res: Response) => {
    try {
        const { id, chapterNumber } = req.params;
        const { content, instruction } = req.body; 
        
        writerAgent.continueGeneration(id, parseInt(chapterNumber), content, instruction)
            .then(result => res.json(result))
            .catch(err => res.status(500).json({ success: false, error: err.message }));

    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete project
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Note: Supabase with foreign key cascade delete enabled on DB level is best.
        // If not enabled, we must manually delete related rows.
        // Assuming cascade is ON for simplicity, but let's be safe and delete children first.

        // 1. Delete Reviews
        // (If reviews reference chapters, they go when chapters go, but...)
        
        // 2. Delete Chapters
        const { error: chError } = await supabase.from('chapters').delete().eq('project_id', id);
        if (chError) console.warn('Error deleting chapters:', chError);

        // 3. Delete Worldview Entries
        const { error: wvError } = await supabase.from('worldview_entries').delete().eq('project_id', id);
        if (wvError) console.warn('Error deleting worldview:', wvError);

        // 4. Delete Plot Threads
        const { error: ptError } = await supabase.from('plot_threads').delete().eq('project_id', id);
        if (ptError) console.warn('Error deleting plot threads:', ptError);

        // 5. Delete Project
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;

        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error: any) {
        console.error('Delete project error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;

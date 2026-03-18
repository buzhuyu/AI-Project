import { supabase } from './supabase.js';
import { writerAgent } from '../agents/writer.js';
import { summaryAgent } from '../agents/summary.js';
import { worldviewAgent } from '../agents/worldview.js';
import { revisionAgent } from '../agents/revision.js';
import { proofreader, editorChief, editorPlot, editorCharacter, editorWorld, readerCasual, readerCritic, readerEmotional, readerMarket, logicChecker, styleChecker, consistencyChecker, ReviewResult } from '../agents/reviewers.js';

export class WorkflowManager {
  
  constructor() {
    // Listen to writer agent events for auto-driving the workflow
    writerAgent.on('chapter_done', (data: any) => {
        this.handleChapterGenerationComplete(data).catch(err => console.error('[Workflow] Auto-generation error:', err));
    });
    
    // Listen to revision agent events for re-review
    revisionAgent.on('revision_done', (data: any) => {
        console.log(`[Workflow] Revision done for ${data.chapterId}. Re-triggering review...`);
        this.handleChapterConfirmation(data.chapterId, false).catch(e => console.error(e));
    });
  }

  async handleChapterGenerationComplete(data: { chapterId: string, projectId: string, chapterNumber: number, content: string }) {
      console.log(`[Workflow] Chapter ${data.chapterNumber} generated. Auto-starting next...`);
      
      // 0. Generate Summary
      try {
          console.log(`[Workflow] Generating summary for chapter ${data.chapterNumber}...`);
          const summary = await summaryAgent.generateSummary(data.content);
          if (summary) {
              // Save to reviews as backup/log
              await this.logReview(data.chapterId, 'summary_agent', {
                  passed: true,
                  score: 10,
                  feedback: summary,
                  issues: [],
                  suggestions: []
              });
              
              // Save to chapter column
              await supabase.from('chapters').update({ summary }).eq('id', data.chapterId);
          }

          // 0.5 Trigger Worldview Analysis (Async, non-blocking)
          // Ensure method exists
          if (typeof worldviewAgent.analyzeAndExtract === 'function') {
              worldviewAgent.analyzeAndExtract(data.projectId, data.chapterNumber, data.content)
                  .then(res => console.log('[Workflow] Worldview updated:', res))
                  .catch(err => console.error('[Workflow] Worldview update failed:', err));
          }

      } catch (err) {
          console.error('[Workflow] Failed to generate summary:', err);
      }

      // 1. Check AI write limit and Start next chapter
      const { data: project } = await supabase.from('projects').select('settings').eq('id', data.projectId).single();
      const aiWriteLimit = project?.settings?.aiWriteCount;
      
      if (aiWriteLimit && data.chapterNumber >= aiWriteLimit) {
          console.log(`[Workflow] AI write limit (${aiWriteLimit}) reached. Stopping auto-generation.`);
          await supabase.from('projects').update({ status: 'paused' }).eq('id', data.projectId);
      } else {
          await this.startNextChapter(data.projectId, data.chapterNumber);
      }

      // 2. Check for Batch Review (every 10 chapters)
      if (data.chapterNumber % 10 === 0) {
          console.log(`[Workflow] Triggering batch review for chapters up to ${data.chapterNumber}`);
          this.triggerBatchReview(data.projectId, data.chapterNumber).catch(e => console.error(e));
      }
  }

  async triggerBatchReview(projectId: string, endChapterNum: number) {
      const startNum = Math.max(1, endChapterNum - 9);
      console.log(`[Workflow] Batch reviewing chapters ${startNum} to ${endChapterNum}`);

      const { data: chapters } = await supabase
          .from('chapters')
          .select('id, chapter_number')
          .eq('project_id', projectId)
          .gte('chapter_number', startNum)
          .lte('chapter_number', endChapterNum)
          .order('chapter_number');

      if (!chapters) return;

      for (const chapter of chapters) {
          // Run review but DO NOT auto-start next chapter (avoid loop)
          await this.handleChapterConfirmation(chapter.id, false);
      }
  }

  async handleChapterConfirmation(chapterId: string, enableAutoNext: boolean = true) {
    console.log(`[Workflow] Starting workflow for chapter ${chapterId} (AutoNext: ${enableAutoNext})`);
    
    // 1. Get Chapter & Project Info
    const { data: chapter } = await supabase.from('chapters').select('*').eq('id', chapterId).single();
    if (!chapter) return;
    const projectId = chapter.project_id;
    const chapterNum = chapter.chapter_number;
    const currentVersion = chapter.version || 1;
    const MAX_REVISIONS = 3;

    // Fetch previous chapter content for continuity check
    let prevContent = undefined;
    if (chapterNum > 1) {
        const { data: prev } = await supabase.from('chapters')
            .select('content')
            .eq('project_id', projectId)
            .eq('chapter_number', chapterNum - 1)
            .single();
        if (prev) prevContent = prev.content;
    }

    // Fetch existing titles for duplication check
    const { data: otherChapters } = await supabase
        .from('chapters')
        .select('title')
        .eq('project_id', projectId)
        .neq('id', chapterId); // Exclude current chapter
    
    const existingTitles = otherChapters?.map(c => c.title).filter((t): t is string => !!t) || [];

    // --- Parallel Review Phase 1: Quality Assurance ---
    await this.updateStatus(chapterId, 'reviewing_agents'); // New status for parallel review

    // Run all agents in parallel to save time
    const [proofResult, logicResult, styleResult, consistencyResult] = await Promise.all([
        proofreader.review(chapter.content),
        logicChecker.review(chapter.content),
        styleChecker.review(chapter.content),
        consistencyChecker.review(chapter.content, prevContent, existingTitles)
    ]);

    // Log all reviews
    await this.logReview(chapterId, 'proofreader', proofResult);
    await this.logReview(chapterId, 'logic_checker', logicResult);
    await this.logReview(chapterId, 'style_checker', styleResult);
    await this.logReview(chapterId, 'consistency_checker', consistencyResult);

    // Aggregate results
    const failedReviews = [];
    if (!proofResult.passed) failedReviews.push({ agent: '校对', ...proofResult });
    if (!logicResult.passed) failedReviews.push({ agent: '逻辑', ...logicResult });
    if (!styleResult.passed) failedReviews.push({ agent: '修辞', ...styleResult });
    if (!consistencyResult.passed) failedReviews.push({ agent: '连贯性', ...consistencyResult });

    if (failedReviews.length > 0) {
        if (currentVersion >= MAX_REVISIONS) {
            console.warn(`[Workflow] Chapter ${chapterId} rejected by agents but max revisions (${MAX_REVISIONS}) reached. Forcing pass.`);
            // Log warning but continue
        } else {
            const combinedFeedback = failedReviews.map(r => `【${r.agent}反馈】${r.feedback}`).join('\n\n');
            console.log(`[Workflow] Chapter ${chapterId} rejected by agents. Revisions needed (Attempt ${currentVersion}/${MAX_REVISIONS}).`);
            await this.triggerRevision(chapterId, projectId, chapterNum, combinedFeedback, currentVersion + 1);
            return;
        }
    }

    // 3. Trigger Editor (Every 5 chapters OR First chapter)
    // First chapter is crucial, so check it too
    if (chapterNum === 1 || chapterNum % 5 === 0) {
        await this.updateStatus(chapterId, 'editing');
        
        // Run Editorial Board
        const [chiefResult, plotResult, charResult, worldResult] = await Promise.all([
            editorChief.review("Project Context Placeholder", chapter.content),
            editorPlot.review("Project Context Placeholder", chapter.content),
            editorCharacter.review("Project Context Placeholder", chapter.content),
            editorWorld.review("Project Context Placeholder", chapter.content)
        ]);

        await this.logReview(chapterId, 'editor_chief', chiefResult);
        await this.logReview(chapterId, 'editor_plot', plotResult);
        await this.logReview(chapterId, 'editor_character', charResult);
        await this.logReview(chapterId, 'editor_world', worldResult);

        const failedEditors = [];
        if (!chiefResult.passed) failedEditors.push({ agent: '主编', ...chiefResult });
        if (!plotResult.passed) failedEditors.push({ agent: '剧情编辑', ...plotResult });
        if (!charResult.passed) failedEditors.push({ agent: '角色编辑', ...charResult });
        if (!worldResult.passed) failedEditors.push({ agent: '设定编辑', ...worldResult });

        if (failedEditors.length > 0) {
             if (currentVersion >= MAX_REVISIONS) {
                 console.warn(`[Workflow] Chapter ${chapterId} rejected by editors but max revisions reached. Forcing pass.`);
             } else {
                 const editorFeedback = failedEditors.map(r => `【${r.agent}意见】${r.feedback}`).join('\n\n');
                 await this.triggerRevision(chapterId, projectId, chapterNum, editorFeedback, currentVersion + 1);
                 return;
             }
        }
    }

    // 4. Trigger Reader Group (Market Validation)
    await this.updateStatus(chapterId, 'reading');
    
    const [casualResult, criticResult, emotionalResult, marketResult] = await Promise.all([
        readerCasual.review(chapter.content),
        readerCritic.review(chapter.content),
        readerEmotional.review(chapter.content),
        readerMarket.review(chapter.content)
    ]);

    await this.logReview(chapterId, 'reader_casual', casualResult);
    await this.logReview(chapterId, 'reader_critic', criticResult);
    await this.logReview(chapterId, 'reader_emotional', emotionalResult);
    await this.logReview(chapterId, 'reader_market', marketResult);

    // Strict mode: If Market Reader says NO, we revise.
    if (!marketResult.passed) {
        if (currentVersion >= MAX_REVISIONS) {
            console.warn(`[Workflow] Chapter ${chapterId} rejected by market reader but max revisions reached. Forcing pass.`);
        } else {
            await this.triggerRevision(chapterId, projectId, chapterNum, `【市场反馈不佳】${marketResult.feedback}`, currentVersion + 1);
            return;
        }
    }

    // 6. Start Next Chapter (If not already exists)
    // IMPORTANT: This now runs independently of the review result if we want pipeline mode.
    // But this function `handleChapterConfirmation` is called when User clicks "Confirm".
    // So if it passes, we mark completed and start next.
    await this.updateStatus(chapterId, 'completed');
    console.log(`[Workflow] Chapter ${chapterId} completed successfully.`);

    // Generate Summary
    try {
        console.log(`[Workflow] Generating summary for confirmed chapter ${chapterId}...`);
        const summary = await summaryAgent.generateSummary(chapter.content);
        if (summary) {
            await this.logReview(chapterId, 'summary_agent', {
                passed: true,
                score: 10,
                feedback: summary,
                issues: [],
                suggestions: []
            });
        }
    } catch (err) {
        console.error('[Workflow] Failed to generate summary:', err);
    }

    if (enableAutoNext) {
        // Check AI write limit
        const { data: project } = await supabase.from('projects').select('settings').eq('id', projectId).single();
        const aiWriteLimit = project?.settings?.aiWriteCount;
        
        if (aiWriteLimit && chapterNum >= aiWriteLimit) {
            console.log(`[Workflow] AI write limit (${aiWriteLimit}) reached after confirmation. Stopping auto-generation.`);
            await supabase.from('projects').update({ status: 'paused' }).eq('id', projectId);
        } else {
            await this.startNextChapter(projectId, chapterNum);
        }
    }
  }

  // New method: Allow user to force start next chapter even if current is revising
  async forceStartNextChapter(projectId: string, currentChapterNum: number) {
      await this.startNextChapter(projectId, currentChapterNum);
  }

  // Manual proofread trigger
  async manualProofread(chapterId: string) {
      console.log(`[Workflow] Manual full review for ${chapterId}`);
      
      const { data: chapter } = await supabase.from('chapters').select('*').eq('id', chapterId).single();
      if (!chapter) throw new Error('Chapter not found');

      // Fetch previous chapter content for continuity check
      let prevContent = undefined;
      if (chapter.chapter_number > 1) {
          const { data: prev } = await supabase.from('chapters')
              .select('content')
              .eq('project_id', chapter.project_id)
              .eq('chapter_number', chapter.chapter_number - 1)
              .single();
          if (prev) prevContent = prev.content;
      }

      // Fetch existing titles for duplication check
      const { data: otherChapters } = await supabase
          .from('chapters')
          .select('title')
          .eq('project_id', chapter.project_id)
          .neq('id', chapterId);
      
      const existingTitles = otherChapters?.map(c => c.title).filter((t): t is string => !!t) || [];

      // Run ALL parallel agents for manual check
      const [proofResult, logicResult, styleResult, consistencyResult] = await Promise.all([
        proofreader.review(chapter.content),
        logicChecker.review(chapter.content),
        styleChecker.review(chapter.content),
        consistencyChecker.review(chapter.content, prevContent, existingTitles)
      ]);
      
      // Save review logs
      await this.logReview(chapterId, 'proofreader_manual', proofResult);
      await this.logReview(chapterId, 'logic_manual', logicResult);
      await this.logReview(chapterId, 'style_manual', styleResult);
      await this.logReview(chapterId, 'consistency_manual', consistencyResult);
      
      return { success: true };
  }

  async recover() {
      console.log('[WorkflowManager] Checking for interrupted workflows...');
      
      // Recover 'reviewing_agents'
      const { data: reviewingChapters } = await supabase
          .from('chapters')
          .select('*')
          .eq('status', 'reviewing_agents');
      
      if (reviewingChapters && reviewingChapters.length > 0) {
          console.log(`[WorkflowManager] Found ${reviewingChapters.length} interrupted reviews. Restarting...`);
          for (const chapter of reviewingChapters) {
              // Restart workflow
              this.handleChapterConfirmation(chapter.id).catch(e => console.error(e));
          }
      }

      // Recover 'editing' (Editor Agent)
      const { data: editingChapters } = await supabase
        .from('chapters')
        .select('*')
        .eq('status', 'editing');

      if (editingChapters && editingChapters.length > 0) {
         console.log(`[WorkflowManager] Found ${editingChapters.length} interrupted editing tasks. Restarting...`);
         for (const chapter of editingChapters) {
            // Trigger Editor logic again
             // NOTE: We need to replicate the logic inside handleChapterConfirmation
             // Ideally refactor logic into granular methods. For now, restarting the whole confirmation flow is safest/easiest 
             // although it repeats the proofreading.
             // Let's just restart the whole flow to be safe.
             this.handleChapterConfirmation(chapter.id).catch(e => console.error(e));
         }
      }

      // Recover 'reading' (Reader Agent)
      const { data: readingChapters } = await supabase.from('chapters').select('*').eq('status', 'reading');
       if (readingChapters && readingChapters.length > 0) {
           // Restart whole flow
           for (const chapter of readingChapters) {
               this.handleChapterConfirmation(chapter.id).catch(e => console.error(e));
           }
       }
  }

  private async updateStatus(chapterId: string, status: string) {
      await supabase.from('chapters').update({ status }).eq('id', chapterId);
  }

  private async logReview(chapterId: string, agent: string, result: ReviewResult) {
      await supabase.from('reviews').insert({
          chapter_id: chapterId,
          agent_type: agent,
          score: result.score,
          feedback: { content: result.feedback },
          suggestions: result.suggestions,
          status: result.passed ? 'approved' : 'rejected'
      });
  }

  private async triggerRevision(chapterId: string, projectId: string, chapterNum: number, feedback: string, newVersion: number) {
      await supabase.from('chapters').update({ 
          status: 'writing', // UI shows 'writing' (or 'revising' if we add it)
          version: newVersion 
      }).eq('id', chapterId);
      
      // Use the dedicated RevisionAgent for better quality
      console.log(`[Workflow] Triggering revision for ${chapterId} with dedicated RevisionAgent`);
      await revisionAgent.startRevision(projectId, chapterId, feedback);
  }

  private async startNextChapter(projectId: string, currentChapterNum: number) {
      const nextNum = currentChapterNum + 1;

      // Fetch previous summary (for currentChapterNum)
      let prevSummary = undefined;
      
      try {
          // 1. Get ID of current chapter (which is previous to next chapter)
          const { data: prevChapter } = await supabase
              .from('chapters')
              .select('id')
              .eq('project_id', projectId)
              .eq('chapter_number', currentChapterNum)
              .single();
              
          if (prevChapter) {
              // 2. Get Summary Review
              const { data: reviews } = await supabase
                  .from('reviews')
                  .select('feedback')
                  .eq('chapter_id', prevChapter.id)
                  .eq('agent_type', 'summary_agent')
                  .order('created_at', { ascending: false })
                  .limit(1);
                  
              if (reviews && reviews.length > 0) {
                  const feedback = reviews[0].feedback;
                  // Handle JSON structure { content: ... } or raw string
                  if (typeof feedback === 'string') {
                      prevSummary = feedback;
                  } else if (feedback && typeof feedback === 'object' && feedback.content) {
                      prevSummary = feedback.content;
                  }
                  console.log(`[Workflow] Found summary for chapter ${currentChapterNum}`);
              }
          }
      } catch (err) {
          console.error('[Workflow] Failed to fetch previous summary:', err);
      }

      const { data: nextChapter } = await supabase
          .from('chapters')
          .select('id, status')
          .eq('project_id', projectId)
          .eq('chapter_number', nextNum)
          .single();

      if (nextChapter) {
          // Check if already active to prevent double-start
          if (['writing', 'reviewing', 'reviewing_agents', 'editing', 'reading', 'completed'].includes(nextChapter.status)) {
              console.log(`[Workflow] Next chapter ${nextNum} already active/done (Status: ${nextChapter.status}). Skipping start.`);
              return;
          }

          console.log(`[Workflow] Starting next chapter ${nextNum}`);
          await supabase.from('projects').update({ current_chapter: nextNum, status: 'running' }).eq('id', projectId);
          await this.updateStatus(nextChapter.id, 'writing');
          await writerAgent.startBackgroundGeneration(projectId, nextNum, prevSummary);
      } else {
          // Check if we reached target? Or just no more chapters defined?
          // If no more chapters defined, maybe we should create one? 
          // For now, assume fixed number of chapters.
          console.log(`[Workflow] No next chapter found (Num: ${nextNum}). Project might be completed.`);
          await supabase.from('projects').update({ status: 'completed' }).eq('id', projectId);
      }
  }
}

export const workflowManager = new WorkflowManager();

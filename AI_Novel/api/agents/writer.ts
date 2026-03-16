import { createAIClient, MODEL_NAME, TIER_CONFIG } from '../lib/ai.js';
import { supabase } from '../lib/supabase.js';
import { EventEmitter } from 'events';

export class WriterAgent extends EventEmitter {
  private activeStreams: Map<string, string> = new Map(); // chapterId -> partialContent
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    super();
  }

  // ... (stopGeneration and continueGeneration remain same)

  stopGeneration(chapterId: string) {
      const controller = this.abortControllers.get(chapterId);
      if (controller) {
          controller.abort();
          this.abortControllers.delete(chapterId);
          this.activeStreams.delete(chapterId);
          console.log(`[WriterAgent] Stopped generation for chapter ${chapterId}`);
          return true;
      }
      return false;
  }

  async continueGeneration(projectId: string, chapterNumber: number, currentContent: string, instruction?: string) {
      return this.startBackgroundGeneration(projectId, chapterNumber, undefined, undefined, currentContent, instruction);
  }

  async startBackgroundGeneration(projectId: string, chapterNumber: number, previousSummary?: string, feedback?: string, existingContent?: string, instruction?: string) {
    try {
      // 1. Fetch context
      const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
      if (!project) throw new Error('Project not found');

      // Fetch User Tier (Mock logic for now, or fetch from users table)
      const { data: user } = await supabase.from('users').select('tier').eq('id', project.user_id).single();
      const userTier = (user?.tier || 'free') as 'free' | 'pro' | 'ultra';
      const tierConfig = TIER_CONFIG[userTier];

      const { data: chapter } = await supabase.from('chapters').select('*').eq('project_id', projectId).eq('chapter_number', chapterNumber).single();
      if (!chapter) throw new Error('Chapter not found');

      // Fetch last N chapters based on Tier Context Limit
      // Simple heuristic: 1 chapter ~ 3000 tokens (conservative). 
      // Free (4k) -> 1 prev chapter summary
      // Pro (32k) -> 5 prev chapters
      // Ultra (128k) -> 20 prev chapters
      const historyLimit = userTier === 'free' ? 1 : (userTier === 'pro' ? 5 : 20);

      const { data: recentChapters } = await supabase
        .from('chapters')
        .select('chapter_number, title, summary, content')
        .eq('project_id', projectId)
        .lt('chapter_number', chapterNumber)
        .order('chapter_number', { ascending: false })
        .limit(historyLimit);

      const recentSummaries = recentChapters?.reverse().map(c => 
        `【第${c.chapter_number}章：${c.title}】\n${c.summary || c.content?.slice(0, 500) + '...' || '（暂无摘要）'}`
      ).join('\n\n') || '（暂无前文摘要）';

      // ... (Rest of context fetching remains similar) ...
      // Fetch Active Plot Threads
      const { data: plotThreads } = await supabase
          .from('plot_threads')
          .select('content, start_chapter_number')
          .eq('project_id', projectId)
          .eq('status', 'open');
      
      const plotThreadsText = plotThreads && plotThreads.length > 0
          ? plotThreads.map(t => `- [伏笔/暗线] (始于第${t.start_chapter_number}章): ${t.content}`).join('\n')
          : '（暂无未解决伏笔）';

      // Fetch Active Worldview Entities
      const { data: activeEntities } = await supabase
          .from('worldview_entries')
          .select('name, category, status')
          .eq('project_id', projectId)
          .in('category', ['Character', 'Item', 'Location'])
          .limit(20);
      
      const entitiesText = activeEntities && activeEntities.length > 0
          ? activeEntities.map(e => `- [${e.category}] ${e.name}: ${e.status}`).join('\n')
          : '（暂无活跃实体记录）';


      // Auto-fetch previous chapter summary/content if not provided
      let actualPreviousSummary = previousSummary;
      if (!actualPreviousSummary && chapterNumber > 1) {
          const { data: prevChapter } = await supabase
              .from('chapters')
              .select('content, title, summary')
              .eq('project_id', projectId)
              .eq('chapter_number', chapterNumber - 1)
              .single();
          
          if (prevChapter) {
              // Prefer summary if available
              if (prevChapter.summary) {
                  actualPreviousSummary = `（上一章：${prevChapter.title}）\n${prevChapter.summary}\n\n【上一章结尾片段】\n...${prevChapter.content?.slice(-500) || ''}`;
              } else if (prevChapter.content) {
                  actualPreviousSummary = `（上一章：${prevChapter.title}）...${prevChapter.content.slice(-1000)}`;
              }
          }
      }

      const chapterId = chapter.id;
      
      // If already generating, don't restart (unless force restart, but let's assume one at a time for now)
      if (this.activeStreams.has(chapterId)) {
          return { success: true, message: 'Already generating' };
      }

      const initialContent = existingContent || '';
      this.activeStreams.set(chapterId, initialContent);

      // 2. Construct Prompt
      const targetWordCount = Math.floor(project.target_words / project.target_chapters);
      
      let systemPrompt = `你是一位专业的小说家，擅长${project.settings.novelType}类型的小说创作。
你的任务是根据给定的故事背景、角色设定和章节大纲，创作第${chapterNumber}章的内容。
      
【故事背景】
${project.settings.background?.description || ''}

【力量/等级体系】
${project.settings.powerSystem || '（未设定，请自由发挥）'}

【主要角色设定】
${project.settings.characterInfo || '（未设定）'}

【剧情走向】
${project.settings.plotOutline || '（未设定）'}

【主要角色（系统记录）】
${JSON.stringify(project.settings.characters || [])}

【当前世界观状态】
${entitiesText}

【未回收伏笔/暗线】
${plotThreadsText}

【前情回顾（最近${historyLimit}章）】
${recentSummaries}

【写作要求】
- **字数严格控制**：目标为 ${targetWordCount} 字左右（允许浮动±10%）。请把控叙事节奏，不要过度注水，也不要草草了事。如果字数即将超标，请加快剧情推进以在合适位置结束。
- 风格：情节跌宕起伏，人物刻画生动，注重爽点铺设。
- **核心要求**：必须承接上一章的剧情，确保语言风格和剧情发展的连贯性。
- **结尾要求**：本章必须以完整的句子结束（句号、感叹号、问号或省略号）。严禁在半句话中断。
- **标题要求**：请为本章构思一个**独特、有吸引力且概括核心冲突**的标题。
  - **严禁**使用“开局...”、“第一...”等千篇一律的套路标题（除非确实是第一章）。
  - **严禁**与前几章标题雷同。
  - 标题应能激发读者的阅读欲望。
- **开篇特别指导（仅针对前3章）**：
  - 如果这是前3章（特别是第1章），请务必在剧情展开前或展开中，自然地融入对世界观、背景设定、主角现状的描写。
  - 不要直接堆砌设定，而是通过环境描写、主角的感官体验、或者旁白来交代“我在哪”、“这个世界是什么样的”、“我的处境如何”。
  - 避免“开幕雷击”式的直接进入高潮战斗，除非剧情特别要求。
  - 让读者有代入感，先建立起对世界的认知，再展开冲突。
- **格式严格要求**：
  1. **第一行必须只输出章节标题**（例如：第${chapterNumber}章：风云再起），不要包含任何Markdown符号或前缀。
  2. **第二行开始直接输出正文**。
  3. **正文结束时严禁输出逗号**，必须以句号、感叹号或省略号结尾。
  4. 不要输出任何“好的”、“开始创作”等废话，直接开始写标题。
`;

      let userPrompt = `请开始创作第${chapterNumber}章。
章节标题（参考）：${chapter.title || `第${chapterNumber}章`}
上一章概要/结尾：${actualPreviousSummary || '本章是故事的开篇。'}

请直接输出小说正文内容。第一行务必输出章节标题。确保结尾完整，不要烂尾或半句话结束。`;

      if (existingContent) {
          systemPrompt += `\n【续写模式】\n你正在续写本章。当前已写内容如下：\n${existingContent}\n请紧接着上述内容继续创作，保持文风一致。`;
          userPrompt = `请继续创作第${chapterNumber}章，接在已有内容后面。`;
      }

      if (instruction) {
          systemPrompt += `\n【用户指令】\n用户要求：${instruction}\n请务必在接下来的创作中体现这一点。`;
      }

      if (feedback) {
          systemPrompt += `\n【重要修正指令】\n上一轮创作收到了以下反馈，请务必针对性修改：\n${feedback}`;
          userPrompt += `\n请根据反馈重新创作本章。`;
      }

      // 3. Call Streaming API
      // Don't await the stream completion here, run it in "background"
      const modelConfig = project.settings?.modelConfig || {};
      const styleSample = project.settings?.styleSample;

      // 如果有 styleSample（文风参考），尝试将其添加到 Prompt 中
      // 但为了效果更好，我们不再只是简单的截取前1000字
      // 而是明确告诉AI这是一段需要模仿的风格样本
      if (styleSample) {
          systemPrompt += `\n\n【文风模仿】\n以下是用户提供的目标文风样本。请仔细分析其用词习惯、句式节奏、描写密度（是侧重环境还是侧重对话）、以及情感基调，并尽可能在创作中模仿这种风格：\n\n${styleSample.slice(0, 2000)}\n\n（以上是文风样本，请模仿其风格进行后续创作）`;
      }

      this._runStream(chapterId, projectId, chapterNumber, systemPrompt, userPrompt, initialContent, modelConfig, userTier);

      return { success: true, message: 'Generation started' };
    } catch (error: any) {
      console.error('Start generation error:', error);
      return { success: false, error: error.message };
    }
  }

  // ... (recover method remains same)

  async recover() {
      console.log('[WriterAgent] Checking for interrupted tasks...');
      const { data: chapters } = await supabase
          .from('chapters')
          .select('*')
          .eq('status', 'writing');
      
      if (chapters && chapters.length > 0) {
          console.log(`[WriterAgent] Found ${chapters.length} interrupted chapters. Restarting...`);
          for (const chapter of chapters) {
              if (!this.activeStreams.has(chapter.id)) {
                   console.log(`[WriterAgent] Restarting chapter ${chapter.chapter_number} (ID: ${chapter.id})`);
                   await this.startBackgroundGeneration(chapter.project_id, chapter.chapter_number);
              }
          }
      }
  }

  private async _runStream(chapterId: string, projectId: string, chapterNumber: number, systemPrompt: string, userPrompt: string, initialContent: string = '', modelConfig: any = {}, userTier: 'free' | 'pro' | 'ultra' = 'free') {
      try {
        const controller = new AbortController();
        this.abortControllers.set(chapterId, controller);

        const { client, model } = createAIClient({
            apiKey: modelConfig.apiKey,
            baseURL: modelConfig.baseUrl,
            modelName: modelConfig.writerModel,
            tier: userTier
        });

        console.log(`[WriterAgent] Generating with model: ${model} (Tier: ${userTier})`);

        const stream = await client.chat.completions.create({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.8,
            max_tokens: 4000,
            stream: true,
        }, { signal: controller.signal });

        // ... (rest of stream processing remains same)
        let fullContent = initialContent;
        let lastSaveTime = Date.now();
        const SAVE_INTERVAL = 5000; // Save every 5 seconds

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullContent += content;
                this.activeStreams.set(chapterId, fullContent);
                this.emit(`chunk:${chapterId}`, content);
                
                // Intermediate Save
                if (Date.now() - lastSaveTime > SAVE_INTERVAL) {
                    const updatePayload: any = { content: fullContent, word_count: fullContent.length };
                    
                    // Try to extract title on the fly
                    const lines = fullContent.split('\n');
                    if (lines.length > 0 && lines[0].trim().match(/^第[0-9一二三四五六七八九十]+章/)) {
                        const extractedTitle = lines[0].trim().replace(/^第[0-9一二三四五六七八九十]+章[：:\s]*/, '');
                        if (extractedTitle) {
                             updatePayload.title = extractedTitle;
                        }
                    }

                    await supabase
                        .from('chapters')
                        .update(updatePayload)
                        .eq('id', chapterId);
                    lastSaveTime = Date.now();
                }
            }
        }

        this.activeStreams.delete(chapterId);
        this.abortControllers.delete(chapterId);
        
        // Extract title if present (first line)
        const lines = fullContent.split('\n');
        let newTitle = null;
        if (lines.length > 0 && lines[0].trim().match(/^第[0-9一二三四五六七八九十]+章/)) {
            newTitle = lines[0].trim().replace(/^第[0-9一二三四五六七八九十]+章[：:\s]*/, '');
        }

        this.emit(`done:${chapterId}`, fullContent);
        this.emit('chapter_done', { chapterId, projectId, chapterNumber, content: fullContent });

        // 4. Save final result and set status to 'completed' (Auto-advance)
        const updateData: any = {
            content: fullContent,
            word_count: fullContent.length,
            status: 'completed', // Auto-completed to allow next chapter to start
        };
        
        if (newTitle) {
            updateData.title = newTitle;
        }

        await supabase
            .from('chapters')
            .update(updateData)
            .eq('id', chapterId);

      } catch (error: any) {
          if (error.name === 'AbortError') {
              console.log(`Stream aborted for chapter ${chapterId}`);
              // Don't revert status to pending, just leave it (user can continue)
              return;
          }
          console.error(`Stream error for chapter ${chapterId}:`, error);
          this.activeStreams.delete(chapterId);
          this.abortControllers.delete(chapterId);
          this.emit(`error:${chapterId}`, error);
          
          await supabase
            .from('chapters')
            .update({ status: 'pending' }) // Revert to pending on error
            .eq('id', chapterId);
      }
  }

  // ... (subscribeToStream remains same)
  subscribeToStream(chapterId: string, res: any) {
      // If active stream exists, send current accumulated content first
      const currentContent = this.activeStreams.get(chapterId);
      if (currentContent) {
          res.write(`data: ${JSON.stringify({ content: currentContent })}\n\n`);
      }

      const onChunk = (content: string) => {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
      };

      const onDone = () => {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          cleanup();
      };

      const onError = (err: any) => {
          res.write(`data: ${JSON.stringify({ error: err.message || 'Unknown error' })}\n\n`);
          res.end();
          cleanup();
      };

      const cleanup = () => {
          this.off(`chunk:${chapterId}`, onChunk);
          this.off(`done:${chapterId}`, onDone);
          this.off(`error:${chapterId}`, onError);
      };

      this.on(`chunk:${chapterId}`, onChunk);
      this.on(`done:${chapterId}`, onDone);
      this.on(`error:${chapterId}`, onError);

      // Handle client disconnect
      res.on('close', cleanup);
  }
}

export const writerAgent = new WriterAgent();

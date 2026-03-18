import { aiClient, MODEL_NAME } from '../lib/ai.js';
import { supabase } from '../lib/supabase.js';
import { EventEmitter } from 'events';

export class RevisionAgent extends EventEmitter {
  private activeStreams: Map<string, string> = new Map();

  constructor() {
    super();
  }

  async startRevision(projectId: string, chapterId: string, feedback: string) {
    try {
      // 1. Fetch context
      const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
      const { data: chapter } = await supabase.from('chapters').select('*').eq('id', chapterId).single();
      
      if (!project || !chapter) throw new Error('Resource not found');

      if (this.activeStreams.has(chapterId)) {
          return { success: true, message: 'Already revising' };
      }

      this.activeStreams.set(chapterId, '');

      // 2. Construct Prompt for Revision
      const systemPrompt = `你是一位资深小说主编和精修师。你的任务是根据审校团队的反馈，对现有章节内容进行修改和润色。

【项目背景】
小说类型：${project.settings.novelType}
当前章节：第${chapter.chapter_number}章

【修改原则】
1. **精准修正**：严格针对反馈指出的问题进行修改（如逻辑漏洞、错别字、人设崩坏等）。
2. **保留精华**：原文中未被指出的精彩部分应予以保留，不要进行无意义的重写。
3. **风格统一**：确保修改后的段落与全文风格保持一致。
4. **格式规范**：
   - 第一行必须只输出章节标题（如：第${chapter.chapter_number}章：xxxx）。
   - 第二行开始正文。
   - **正文结束时严禁输出逗号**，必须以句号、感叹号或省略号结尾。

【原文内容】
${chapter.content}
`;

      const userPrompt = `请根据以下反馈意见，对上述原文进行修订。

【审校反馈（必须解决的问题）】
${feedback}

【思考步骤】
在开始写作前，请先在心中思考：
1. 反馈指出的具体位置在哪？
2. 为什么之前会写错？
3. 如何修改才能既解决问题又不破坏上下文？

请直接输出修改后的完整章节正文（包含标题）。结尾必须完整。`;

      // 3. Call Streaming API
      this._runStream(chapterId, systemPrompt, userPrompt);

      return { success: true, message: 'Revision started' };

    } catch (error: any) {
      console.error('Start revision error:', error);
      return { success: false, error: error.message };
    }
  }

  private async _runStream(chapterId: string, systemPrompt: string, userPrompt: string) {
      try {
        const stream = await aiClient.chat.completions.create({
            model: MODEL_NAME,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.3, // Lower temperature for revision to ensure adherence to instructions
            max_tokens: 4000,
            stream: true,
        });

        let fullContent = '';
        let lastSaveTime = Date.now();
        const SAVE_INTERVAL = 5000;

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullContent += content;
                this.activeStreams.set(chapterId, fullContent);
                this.emit(`chunk:${chapterId}`, content);
                
                if (Date.now() - lastSaveTime > SAVE_INTERVAL) {
                    await this._saveProgress(chapterId, fullContent);
                    lastSaveTime = Date.now();
                }
            }
        }

        this.activeStreams.delete(chapterId);
        
        // Final Save & Extract Title
        await this._saveProgress(chapterId, fullContent, true);
        this.emit(`done:${chapterId}`, fullContent);
        this.emit('revision_done', { chapterId, projectId: (await supabase.from('chapters').select('project_id').eq('id', chapterId).single()).data?.project_id });

        // Update status to completed (Auto-trigger re-review via WorkflowManager)
        await supabase
            .from('chapters')
            .update({ status: 'completed' }) 
            .eq('id', chapterId);

      } catch (error) {
          console.error(`Revision stream error for chapter ${chapterId}:`, error);
          this.activeStreams.delete(chapterId);
          this.emit(`error:${chapterId}`, error);
          
          await supabase.from('chapters').update({ status: 'editing' }).eq('id', chapterId); // Fallback status
      }
  }

  private async _saveProgress(chapterId: string, content: string, isFinal = false) {
      const updatePayload: any = { content, word_count: content.length };
      
      if (isFinal) {
        const lines = content.split('\n');
        if (lines.length > 0 && lines[0].trim().match(/^第[0-9一二三四五六七八九十]+章/)) {
            const extractedTitle = lines[0].trim().replace(/^第[0-9一二三四五六七八九十]+章[：:\s]*/, '');
            if (extractedTitle) updatePayload.title = extractedTitle;
        }
      }

      await supabase.from('chapters').update(updatePayload).eq('id', chapterId);
  }

  // Reuse subscription logic
  subscribeToStream(chapterId: string, res: any) {
      const currentContent = this.activeStreams.get(chapterId);
      if (currentContent) {
          res.write(`data: ${JSON.stringify({ content: currentContent })}\n\n`);
      }

      const onChunk = (content: string) => res.write(`data: ${JSON.stringify({ content })}\n\n`);
      const onDone = () => {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          cleanup();
      };
      const onError = (err: any) => {
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
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
      res.on('close', cleanup);
  }
}

export const revisionAgent = new RevisionAgent();

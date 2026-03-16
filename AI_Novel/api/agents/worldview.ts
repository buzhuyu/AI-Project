import { createAIClient, MODEL_NAME } from '../lib/ai.js';
import { supabase } from '../lib/supabase.js';
import pLimit from 'p-limit';

export class WorldviewAgent {
  private model = MODEL_NAME;
  private isAnalyzing: Map<string, boolean> = new Map(); // projectId -> analyzing status
  private progress: Map<string, { current: number, total: number }> = new Map();

  // 单章分析方法（适配 workflow 调用）
  async analyzeAndExtract(projectId: string, chapterNumber: number, content: string) {
      // 复用批量分析逻辑，但只处理一章
      return this.analyzeBatch(projectId, [{ chapterNumber, content }]);
  }

  // 合并后的批量分析方法
  async analyzeBatch(projectId: string, chapters: { chapterNumber: number, content: string }[]) {
    try {
      const chapterNumbers = chapters.map(c => c.chapterNumber).join(', ');
      console.log(`[WorldviewAgent] Analyzing batch chapters: [${chapterNumbers}]...`);
      
      const { client, model } = createAIClient();
      
      // 合并内容，并在每章前加上标记
      let combinedContent = '';
      for (const ch of chapters) {
          combinedContent += `\n\n=== 第 ${ch.chapterNumber} 章 ===\n${ch.content}`;
      }

      const prompt = `你是一位小说世界观管理员。你的任务是阅读多章小说内容，提取其中的【实体状态变更】。

【需提取的实体类型】
1. **角色 (Character)**：受伤、死亡、获得物品、能力提升、位置变更、心理状态剧变。
2. **物品 (Item)**：获得、丢失、损坏、修复、被使用。
3. **地点 (Location)**：毁灭、重建、被发现。
4. **伏笔 (PlotThread)**：新出现的神秘线索、未解之谜、预言。

【提取规则】
- 仅提取**本批次章节中发生**的显著变更。
- 如果是新出现的实体，标记为 [NEW]。
- 如果是已有实体的状态变更，标记为 [UPDATE]。
- 对于伏笔，如果本章开启了一个新悬念，标记为 [NEW_THREAD]。
- 对于伏笔，如果本章解决了一个旧悬念，标记为 [RESOLVED_THREAD]。
- **重要：** 忽略日常对话和琐碎细节，只关注对剧情或世界观有长期影响的变化。

请返回 JSON 格式结果，包含一个 updates 数组和一个 threads 数组。无需按章节拆分，直接汇总：
{
  "updates": [
    { "type": "Character"|"Item"|"Location", "name": "名称", "status": "当前状态描述", "action": "NEW"|"UPDATE" },
    ...
  ],
  "threads": [
    { "content": "伏笔内容", "action": "NEW_THREAD"|"RESOLVED_THREAD", "chapter": 章节号(可选) }
  ]
}`;

      const response = await client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: combinedContent },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // 批量处理 Updates
      if (result.updates && Array.isArray(result.updates)) {
          // 并行处理数据库查询和插入
          await Promise.all(result.updates.map(async (update: any) => {
              const { data: existing } = await supabase
                  .from('worldview_entries')
                  .select('id')
                  .eq('project_id', projectId)
                  .eq('name', update.name)
                  .eq('category', update.type)
                  .single();

              if (existing) {
                  await supabase
                      .from('worldview_entries')
                      .update({ status: update.status, updated_at: new Date() })
                      .eq('id', existing.id);
              } else {
                  await supabase.from('worldview_entries').insert({
                      project_id: projectId,
                      name: update.name,
                      category: update.type,
                      status: update.status,
                      description: `Auto-extracted from Batch [${chapterNumbers}]`
                  });
              }
          }));
      }

      // 批量处理 Threads
      if (result.threads && Array.isArray(result.threads)) {
          await Promise.all(result.threads.map(async (thread: any) => {
              if (thread.action === 'NEW_THREAD') {
                  await supabase.from('plot_threads').insert({
                      project_id: projectId,
                      content: thread.content,
                      start_chapter_number: thread.chapter || chapters[0].chapterNumber,
                      status: 'open'
                  });
              } else if (thread.action === 'RESOLVED_THREAD') {
                  console.log(`[WorldviewAgent] Suggested resolve: ${thread.content}`);
              }
          }));
      }

      return result;

    } catch (error) {
      console.error(`Batch analysis error for [${chapters.map(c=>c.chapterNumber)}]`, error);
      return null;
    }
  }

  async startFullAnalysis(projectId: string) {
      if (this.isAnalyzing.get(projectId)) return { success: false, message: 'Analysis already in progress' };
      
      this.isAnalyzing.set(projectId, true);
      
      // Fetch all chapters
      const { data: chapters } = await supabase
          .from('chapters')
          .select('chapter_number, content')
          .eq('project_id', projectId)
          .order('chapter_number', { ascending: true });

      if (!chapters || chapters.length === 0) {
          this.isAnalyzing.set(projectId, false);
          return { success: false, message: 'No chapters found' };
      }

      this.progress.set(projectId, { current: 0, total: chapters.length });

      // Run async in background
      (async () => {
          console.log(`[WorldviewAgent] Starting full analysis for project ${projectId} (${chapters.length} chapters)`);
          
          // 1. 智能分批逻辑
          const BATCH_SIZE_LIMIT = 6000; // 字符数限制
          const batches: { chapterNumber: number, content: string }[][] = [];
          let currentBatch: { chapterNumber: number, content: string }[] = [];
          let currentBatchSize = 0;

          for (const chapter of chapters) {
              if (!chapter.content) continue;
              
              if (currentBatchSize + chapter.content.length > BATCH_SIZE_LIMIT && currentBatch.length > 0) {
                  batches.push(currentBatch);
                  currentBatch = [];
                  currentBatchSize = 0;
              }
              
              currentBatch.push({ 
                  chapterNumber: chapter.chapter_number, 
                  content: chapter.content 
              });
              currentBatchSize += chapter.content.length;
          }
          if (currentBatch.length > 0) batches.push(currentBatch);

          console.log(`[WorldviewAgent] Split into ${batches.length} batches.`);

          // 2. 并发控制
          const limit = pLimit(5); // 提高并发到 5
          let processedChaptersCount = 0;

          const tasks = batches.map(batch => limit(async () => {
              // Check stop signal
              if (!this.isAnalyzing.get(projectId)) return;

              // 使用 Promise.race 设置超时，避免单次请求卡死
              const analysisPromise = this.analyzeBatch(projectId, batch);
              const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 45000)); // 45s 超时

              await Promise.race([analysisPromise, timeoutPromise]);
              
              // Update progress
              processedChaptersCount += batch.length;
              this.progress.set(projectId, { 
                  current: Math.min(processedChaptersCount, chapters.length), 
                  total: chapters.length 
              });
          }));

          try {
              await Promise.all(tasks);
              console.log(`[WorldviewAgent] Full analysis complete for project ${projectId}`);
          } catch (e) {
              console.error('[WorldviewAgent] Analysis interrupted or failed', e);
          } finally {
              this.isAnalyzing.set(projectId, false);
          }
      })();

      return { success: true, message: 'Analysis started' };
  }

  stopAnalysis(projectId: string) {
      if (this.isAnalyzing.get(projectId)) {
          this.isAnalyzing.set(projectId, false);
          return true;
      }
      return false;
  }

  getProgress(projectId: string) {
      return {
          isAnalyzing: this.isAnalyzing.get(projectId) || false,
          progress: this.progress.get(projectId) || { current: 0, total: 0 }
      };
  }
}

export const worldviewAgent = new WorldviewAgent();

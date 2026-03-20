import { supabase } from './supabase.js';
import { writerAgent } from '../agents/writer.js';
import { summaryAgent } from '../agents/summary.js';
import { worldviewAgent } from '../agents/worldview.js';
import { revisionAgent } from '../agents/revision.js';
import { proofreader, editorChief, editorPlot, editorCharacter, editorWorld, readerCasual, readerCritic, readerEmotional, readerMarket, logicChecker, styleChecker, consistencyChecker, ReviewResult } from '../agents/reviewers.js';

export interface ChapterContext {
    chapterId: string;
    chapter: any;
    projectId: string;
    chapterNum: number;
    currentVersion: number;
    prevContent?: string;
    existingTitles: string[];
}

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

  async handleChapterConfirmation(chapterId: string, enableAutoNext: boolean = true, startFromStage?: string) {
      console.log(`[Workflow] Starting workflow for chapter ${chapterId} (AutoNext: ${enableAutoNext}, StartStage: ${startFromStage || 'auto'})`);
      
      const ctx = await this.fetchContext(chapterId);
      if (!ctx) return;
      const MAX_REVISIONS = 3;

      // Determine initial stage
      let currentStage = startFromStage || 'reviewing_agents';

      // --- Stage 1: Parallel QA ---
      if (currentStage === 'reviewing_agents') {
          await this.updateStatus(chapterId, 'reviewing_agents');
          const qaResults = await this.runAgentReviews(ctx);
          const { failed } = this.aggregateAndDecideQA(qaResults);
          
          if (failed.length > 0) {
              if (ctx.currentVersion >= MAX_REVISIONS) {
                  console.warn(`[Workflow] Chapter ${chapterId} rejected by agents but max revisions (${MAX_REVISIONS}) reached. Forcing pass.`);
              } else {
                  const combinedFeedback = failed.map(r => `【${r.agent}反馈】${r.feedback}`).join('\n\n');
                  console.log(`[Workflow] Chapter ${chapterId} rejected by agents. Revisions needed (Attempt ${ctx.currentVersion}/${MAX_REVISIONS}).`);
                  await this.triggerRevision(chapterId, ctx.projectId, ctx.chapterNum, combinedFeedback, ctx.currentVersion + 1);
                  return;
              }
          }
          currentStage = 'editing';
      }

      // --- Stage 2: Editorial Board ---
      if (currentStage === 'editing') {
          if (ctx.chapterNum === 1 || ctx.chapterNum % 5 === 0) {
              await this.updateStatus(chapterId, 'editing');
              const editorResults = await this.runEditorialBoard(ctx);
              const { failed } = this.aggregateAndDecideEditors(editorResults);

              if (failed.length > 0) {
                   if (ctx.currentVersion >= MAX_REVISIONS) {
                       console.warn(`[Workflow] Chapter ${chapterId} rejected by editors but max revisions reached. Forcing pass.`);
                   } else {
                       const editorFeedback = failed.map(r => `【${r.agent}意见】${r.feedback}`).join('\n\n');
                       await this.triggerRevision(chapterId, ctx.projectId, ctx.chapterNum, editorFeedback, ctx.currentVersion + 1);
                       return;
                   }
              }
          }
          currentStage = 'reading';
      }

      // --- Stage 3: Reader Group ---
      if (currentStage === 'reading') {
          await this.updateStatus(chapterId, 'reading');
          const { marketResult } = await this.runReaderGroup(ctx);

          if (!marketResult.passed) {
              if (ctx.currentVersion >= MAX_REVISIONS) {
                  console.warn(`[Workflow] Chapter ${chapterId} rejected by market reader but max revisions reached. Forcing pass.`);
              } else {
                  await this.triggerRevision(chapterId, ctx.projectId, ctx.chapterNum, `【市场反馈不佳】${marketResult.feedback}`, ctx.currentVersion + 1);
                  return;
              }
          }
          currentStage = 'completed';
      }

      // --- Stage 4: Completion & Next Chapter ---
      if (currentStage === 'completed') {
          await this.updateStatus(chapterId, 'completed');
          console.log(`[Workflow] Chapter ${chapterId} completed successfully.`);

          await this.generateSummary(ctx);

          if (enableAutoNext) {
              await this.scheduleNextChapter(ctx);
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
      
      const ctx = await this.fetchContext(chapterId);
      if (!ctx) throw new Error('Chapter not found');

      // Run ALL parallel agents for manual check
      await this.runAgentReviews(ctx, true);
      
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
              this.handleChapterConfirmation(chapter.id, true, 'reviewing_agents').catch(e => console.error(e));
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
             this.handleChapterConfirmation(chapter.id, true, 'editing').catch(e => console.error(e));
         }
      }

      // Recover 'reading' (Reader Agent)
      const { data: readingChapters } = await supabase.from('chapters').select('*').eq('status', 'reading');
       if (readingChapters && readingChapters.length > 0) {
           for (const chapter of readingChapters) {
               this.handleChapterConfirmation(chapter.id, true, 'reading').catch(e => console.error(e));
           }
       }
  }

  private async fetchContext(chapterId: string): Promise<ChapterContext | null> {
      const { data: chapter } = await supabase.from('chapters').select('*').eq('id', chapterId).single();
      if (!chapter) return null;
      const projectId = chapter.project_id;
      const chapterNum = chapter.chapter_number;
      const currentVersion = chapter.version || 1;

      let prevContent = undefined;
      if (chapterNum > 1) {
          const { data: prev } = await supabase.from('chapters')
              .select('content')
              .eq('project_id', projectId)
              .eq('chapter_number', chapterNum - 1)
              .single();
          if (prev) prevContent = prev.content;
      }

      const { data: otherChapters } = await supabase
          .from('chapters')
          .select('title')
          .eq('project_id', projectId)
          .neq('id', chapterId);
      
      const existingTitles = otherChapters?.map(c => c.title).filter((t): t is string => !!t) || [];

      return { chapterId, chapter, projectId, chapterNum, currentVersion, prevContent, existingTitles };
  }

  private async runAgentReviews(ctx: ChapterContext, isManual: boolean = false) {
      const [proofResult, logicResult, styleResult, consistencyResult] = await Promise.all([
          proofreader.review(ctx.chapter.content),
          logicChecker.review(ctx.chapter.content),
          styleChecker.review(ctx.chapter.content),
          consistencyChecker.review(ctx.chapter.content, ctx.prevContent, ctx.existingTitles)
      ]);

      const suffix = isManual ? '_manual' : '';
      await this.logReview(ctx.chapterId, `proofreader${suffix}`, proofResult);
      await this.logReview(ctx.chapterId, `logic_checker${suffix}`, logicResult);
      await this.logReview(ctx.chapterId, `style_checker${suffix}`, styleResult);
      await this.logReview(ctx.chapterId, `consistency_checker${suffix}`, consistencyResult);

      return { proofResult, logicResult, styleResult, consistencyResult };
  }

  private aggregateAndDecideQA(results: any) {
      const failedReviews = [];
      if (!results.proofResult.passed) failedReviews.push({ agent: '校对', ...results.proofResult });
      if (!results.logicResult.passed) failedReviews.push({ agent: '逻辑', ...results.logicResult });
      if (!results.styleResult.passed) failedReviews.push({ agent: '修辞', ...results.styleResult });
      if (!results.consistencyResult.passed) failedReviews.push({ agent: '连贯性', ...results.consistencyResult });
      return { failed: failedReviews };
  }

  private async runEditorialBoard(ctx: ChapterContext) {
      const [chiefResult, plotResult, charResult, worldResult] = await Promise.all([
          editorChief.review("Project Context Placeholder", ctx.chapter.content),
          editorPlot.review("Project Context Placeholder", ctx.chapter.content),
          editorCharacter.review("Project Context Placeholder", ctx.chapter.content),
          editorWorld.review("Project Context Placeholder", ctx.chapter.content)
      ]);

      await this.logReview(ctx.chapterId, 'editor_chief', chiefResult);
      await this.logReview(ctx.chapterId, 'editor_plot', plotResult);
      await this.logReview(ctx.chapterId, 'editor_character', charResult);
      await this.logReview(ctx.chapterId, 'editor_world', worldResult);

      return { chiefResult, plotResult, charResult, worldResult };
  }

  private aggregateAndDecideEditors(results: any) {
      const failedEditors = [];
      if (!results.chiefResult.passed) failedEditors.push({ agent: '主编', ...results.chiefResult });
      if (!results.plotResult.passed) failedEditors.push({ agent: '剧情编辑', ...results.plotResult });
      if (!results.charResult.passed) failedEditors.push({ agent: '角色编辑', ...results.charResult });
      if (!results.worldResult.passed) failedEditors.push({ agent: '设定编辑', ...results.worldResult });
      return { failed: failedEditors };
  }

  private async runReaderGroup(ctx: ChapterContext) {
      const [casualResult, criticResult, emotionalResult, marketResult] = await Promise.all([
          readerCasual.review(ctx.chapter.content),
          readerCritic.review(ctx.chapter.content),
          readerEmotional.review(ctx.chapter.content),
          readerMarket.review(ctx.chapter.content)
      ]);

      await this.logReview(ctx.chapterId, 'reader_casual', casualResult);
      await this.logReview(ctx.chapterId, 'reader_critic', criticResult);
      await this.logReview(ctx.chapterId, 'reader_emotional', emotionalResult);
      await this.logReview(ctx.chapterId, 'reader_market', marketResult);

      return { marketResult };
  }

  private async generateSummary(ctx: ChapterContext) {
      try {
          console.log(`[Workflow] Generating summary for confirmed chapter ${ctx.chapterId}...`);
          const summary = await summaryAgent.generateSummary(ctx.chapter.content);
          if (summary) {
              await this.logReview(ctx.chapterId, 'summary_agent', {
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
  }

  private async scheduleNextChapter(ctx: ChapterContext) {
      const { data: project } = await supabase.from('projects').select('settings').eq('id', ctx.projectId).single();
      const aiWriteLimit = project?.settings?.aiWriteCount;
      
      if (aiWriteLimit && ctx.chapterNum >= aiWriteLimit) {
          console.log(`[Workflow] AI write limit (${aiWriteLimit}) reached after confirmation. Stopping auto-generation.`);
          await supabase.from('projects').update({ status: 'paused' }).eq('id', ctx.projectId);
      } else {
          await this.startNextChapter(ctx.projectId, ctx.chapterNum);
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

import { aiClient, MODEL_NAME } from '../lib/ai.js';

export class SummaryAgent {
  private model = MODEL_NAME;

  async generateSummary(chapterContent: string): Promise<string> {
    try {
      const prompt = `你是一位专业的小说情节总结师。
      
【任务】
请阅读以下章节内容，生成一份精炼的剧情摘要（300字以内）。
这份摘要将作为下一章创作的重要参考，因此必须包含：
1. **核心剧情**：发生了什么主要事件？
2. **关键信息**：揭示了什么伏笔或秘密？
3. **人物状态**：主角及主要配角的位置、状态和心理变化。
4. **结尾悬念**：章节结束时的具体情境。

请直接输出摘要内容，不要包含任何Markdown格式或额外说明。`;

      const response = await aiClient.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: chapterContent },
        ],
        temperature: 0.5,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Summary generation error:', error);
      return '';
    }
  }
}

export const summaryAgent = new SummaryAgent();

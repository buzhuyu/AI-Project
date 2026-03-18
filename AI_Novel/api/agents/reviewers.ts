import { aiClient, MODEL_NAME } from '../lib/ai.js';
import { supabase } from '../lib/supabase.js';

export interface ReviewIssue {
  type: 'format' | 'typo' | 'style' | 'consistency';
  quote: string; // The exact text to find
  replacement?: string; // The suggested replacement
  explanation: string;
}

export interface ReviewResult {
  passed: boolean;
  score: number;
  feedback: string;
  issues: ReviewIssue[];
  suggestions: string[]; // Keep for backward compatibility or general advice
}

export class BaseAgent {
  protected model = MODEL_NAME;
  
  protected async analyze(systemPrompt: string, content: string): Promise<ReviewResult> {
    try {
      const response = await aiClient.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
        temperature: 0.3, // Lower temp for analysis
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        passed: result.passed ?? false,
        score: result.score ?? 0,
        feedback: result.feedback || '',
        issues: result.issues || [],
        suggestions: result.suggestions || []
      };
    } catch (error) {
      console.error('Agent analysis error:', error);
      return {
        passed: true, // Fail open if error to avoid blocking? Or fail closed?
        score: 0,
        feedback: 'Agent error: ' + error,
        issues: [],
        suggestions: []
      };
    }
  }
}

export class ProofreaderAgent extends BaseAgent {
  async review(chapterContent: string): Promise<ReviewResult> {
    // 1. Programmatic Regex Checks (Strict Rules)
    const regexErrors: ReviewIssue[] = [];
    
    // Check for Markdown headers (## Title) - Relaxed: Allow them
    /*
    const mdHeaderMatch = chapterContent.match(/^\s*#+\s?.*$/m);
    if (mdHeaderMatch) {
        regexErrors.push({
            type: 'format',
            quote: mdHeaderMatch[0].trim(),
            replacement: '',
            explanation: "检测到 Markdown 标题符号 (#)，严禁出现此类格式，请使用中文直接写作。"
        });
    }
    */

    // Check for "One, Title" style headers or "Chapter 1"
    const numberHeaderMatch = chapterContent.match(/(^|\n)\s*(第?[0-9一二三四五六七八九十百]+[章节回]\s+|[0-9一二三四五六七八九十]+[、.]\s*)\S+/);
    if (numberHeaderMatch) {
        regexErrors.push({
            type: 'format',
            quote: numberHeaderMatch[0].trim(),
            replacement: '',
            explanation: "检测到分节标题（如'一、'或'第一章'），正文应连续，请删除或融入段落。"
        });
    }

    // Check for "Title:" artifacts
    const metaMatch = chapterContent.match(/(Title:|Chapter\s+\d+:|^标题：)/im);
    if (metaMatch) {
        regexErrors.push({
            type: 'format',
            quote: metaMatch[0],
            replacement: '',
            explanation: "检测到元数据标记，请删除。"
        });
    }

    // Check for Markdown bold/italic symbols - Relaxed: Allow them
    /*
    const styleMatch = chapterContent.match(/(\*\*|__|\*|_)[^\s*]+(\*\*|__|\*|_)/);
    if (styleMatch) {
         regexErrors.push({
            type: 'format',
            quote: styleMatch[0],
            replacement: styleMatch[0].replace(/[\*_]/g, ''),
            explanation: "检测到 Markdown 加粗/斜体符号，小说正文不应使用此类标记。"
        });
    }
    */

    // Check for incomplete ending sentence
    const trimmedContent = chapterContent.trim();
    // Check if it ends with punctuation. Punctuation can be 。！？……”"
    // Note: ” might be used if dialogue ends.
    if (!/[。！？………”"]$/.test(trimmedContent)) {
        const lastChars = trimmedContent.slice(-20);
        regexErrors.push({
            type: 'format',
            quote: lastChars,
            replacement: lastChars + "。",
            explanation: "章节结尾似乎不完整（未以标点符号结束）。请确保句子完整。"
        });
    }

    // 2. LLM Analysis
    const prompt = `你是一位拥有20年经验的资深出版校对专家。
    
【任务】
请找出文中所有的错别字、格式错误、标点误用。
**注意**：本文允许使用 Markdown 格式（如 # 标题、**加粗**、*斜体*）进行排版，请忽略这些 Markdown 符号，不要视为错误。

【重点检查】
1. **错别字与地得**：严格检查"的、地、得"的用法
2. **标点规范**：必须使用全角中文标点，省略号必须是六点（……）
3. **结尾完整性**：检查章节最后一句是否完整，是否突然中断。
4. **Markdown 兼容**：允许合理的 Markdown 标记，仅当 Markdown 语法错误（如未闭合）时才报错。

请以JSON格式返回结果：
{
  "passed": boolean, 
  "score": number,
  "feedback": string,
  "issues": [
    { "type": "format"|"typo"|"style", "quote": "原文（精准匹配）", "replacement": "修改后", "explanation": "错误原因" }
  ]
}`;
    
    const result = await this.analyze(prompt, chapterContent);

    // 3. Merge Regex Results
    if (regexErrors.length > 0) {
        result.passed = false;
        result.score = Math.min(result.score, 3); // Fail hard on format errors
        // Dedup issues based on quote
        const existingQuotes = new Set(result.issues.map(i => i.quote));
        for (const err of regexErrors) {
            if (!existingQuotes.has(err.quote)) {
                result.issues.unshift(err);
            }
        }
        result.feedback = `【格式严重错误】发现 ${regexErrors.length} 处格式硬伤（Markdown或标题残留）。\n${result.feedback}`;
    }

    return result;
  }
}

export interface EditorPersona {
  id: string;
  name: string;
  role: string;
  description: string;
  focus: string;
}

export class EditorAgent extends BaseAgent {
  private persona: EditorPersona;

  constructor(persona: EditorPersona) {
    super();
    this.persona = persona;
  }

  async review(projectContext: string, recentChapters: string): Promise<ReviewResult> {
    const prompt = `你是一位${this.persona.role}，代号"${this.persona.name}"。
    
【你的职责】
${this.persona.description}

【你的关注点】
${this.persona.focus}

【判定标准】
- 如果发现严重违反你职责范围的问题（如剧情崩坏、人设OOC、设定冲突），请果断给出 **不通过 (passed: false)**。
- 给出具体的修改方向。

请以JSON格式返回结果：
{
  "passed": boolean,
  "score": number, // 0-10
  "feedback": string, // 总体评价
  "issues": [
    { "type": "editor_feedback", "quote": "原文片段", "explanation": "具体问题分析" }
  ],
  "suggestions": string[] // 修改建议
}`;
    return this.analyze(prompt, recentChapters);
  }
}

// Define Editor Personas
const chiefEditor: EditorPersona = {
    id: 'chief',
    name: '主编',
    role: '总编',
    description: '负责把控小说整体方向、市场定位和商业价值。',
    focus: '黄金三章是否吸引人？卖点是否清晰？是否符合目标受众口味？'
};

const plotEditor: EditorPersona = {
    id: 'plot',
    name: '剧情',
    role: '剧情策划',
    description: '负责梳理故事脉络、冲突设置和节奏把控。',
    focus: '情节是否拖沓？冲突是否激烈？伏笔是否回收？逻辑是否闭环？'
};

const characterEditor: EditorPersona = {
    id: 'character',
    name: '角色',
    role: '角色监督',
    description: '负责审核人物性格、动机和成长弧光。',
    focus: '人物是否OOC？动机是否合理？对话是否贴脸？配角是否出彩？'
};

const worldEditor: EditorPersona = {
    id: 'world',
    name: '设定',
    role: '世界观架构师',
    description: '负责维护世界观规则、力量体系和物品设定的一致性。',
    focus: '战力体系是否崩坏？设定是否前后矛盾？新设定是否突兀？'
};

export const editorChief = new EditorAgent(chiefEditor);
export const editorPlot = new EditorAgent(plotEditor);
export const editorCharacter = new EditorAgent(characterEditor);
export const editorWorld = new EditorAgent(worldEditor);

export interface ReaderPersona {
  id: string;
  name: string;
  role: string;
  description: string;
  focus: string;
}

export class ReaderAgent extends BaseAgent {
  private persona: ReaderPersona;

  constructor(persona: ReaderPersona) {
    super();
    this.persona = persona;
  }

  async review(chapterContent: string): Promise<ReviewResult> {
    const prompt = `你是一位${this.persona.role}，代号"${this.persona.name}"。
    
【你的画像】
${this.persona.description}

【你的关注点】
${this.persona.focus}

【任务】
请阅读以下章节内容，从你的独特视角出发，给出最真实的反馈。
1. 如果读得爽/感动/有趣，请点赞。
2. 如果觉得毒点/无聊/尴尬，请狠狠吐槽。
3. 请特别关注符合你人设的细节。

请以JSON格式返回结果：
{
  "passed": boolean, // 如果完全无法忍受则为false
  "score": number, // 0-10分
  "feedback": string, // 你的具体评价（请用第一人称，符合你的说话风格）
  "issues": [
    { "type": "reader_feedback", "quote": "原文片段", "explanation": "吐槽或建议" }
  ],
  "suggestions": string[] // 给作者的改进建议
}`;
    return this.analyze(prompt, chapterContent);
  }
}

export class LogicAgent extends BaseAgent {
  async review(chapterContent: string): Promise<ReviewResult> {
    const prompt = `你是一位逻辑侦探，专门负责寻找小说中的"BUG"。
    
【任务】
请仔细检查本章内容，寻找以下逻辑漏洞：
1. **时间线错误**：例如早上刚吃完饭又说天黑了。
2. **空间位置错误**：例如在A地打架突然出现在B地。
3. **因果关系断裂**：例如前文说没钱，后文突然大肆挥霍且未解释来源。
4. **战力崩坏**：例如设定很弱的反派突然秒杀主角。

如果发现逻辑硬伤，请务必指出。如果没有，则通过。

请以JSON格式返回结果：
{
  "passed": boolean,
  "score": number,
  "feedback": string,
  "issues": [
    { "type": "logic", "quote": "问题片段", "explanation": "逻辑漏洞分析" }
  ],
  "suggestions": string[]
}`;
    return this.analyze(prompt, chapterContent);
  }
}

export class StyleAgent extends BaseAgent {
  async review(chapterContent: string): Promise<ReviewResult> {
    const prompt = `你是一位修辞大师。请检查本章的文字风格。
    
【重点检查】
1. **词汇重复**：是否高频使用同一个形容词或动词？
2. **句式单调**：是否全是"他..."开头的句子？
3. **描写空洞**：是否存在大量堆砌辞藻但无实质内容的段落？
4. **口语化泛滥**：非对话部分是否过于随意？

请以JSON格式返回结果：
{
  "passed": boolean,
  "score": number,
  "feedback": string,
  "issues": [
    { "type": "style", "quote": "问题片段", "explanation": "修辞问题分析" }
  ],
  "suggestions": string[]
}`;
    return this.analyze(prompt, chapterContent);
  }
}

export class ConsistencyAgent extends BaseAgent {
  async review(chapterContent: string, previousContent?: string, existingTitles: string[] = []): Promise<ReviewResult> {
    const issues: ReviewIssue[] = [];

    // 1. Programmatic Check for Duplicate Titles
    const lines = chapterContent.split('\n');
    if (lines.length > 0) {
        const firstLine = lines[0].trim();
        // Try to extract pure title part (remove "第X章")
        const titleMatch = firstLine.match(/^第[0-9一二三四五六七八九十]+章[：:\s]*(.+)$/);
        const currentTitle = titleMatch ? titleMatch[1].trim() : firstLine;
        
        if (currentTitle && existingTitles.length > 0) {
            // Check for exact match or strong similarity
            const isDuplicate = existingTitles.some(t => {
                if (!t) return false;
                // Simple exact match of the main title part
                return t.trim() === currentTitle;
            });

            if (isDuplicate) {
                issues.push({
                    type: 'consistency',
                    quote: firstLine,
                    explanation: `检测到章节标题 "${currentTitle}" 与其他章节重复，请更换更有创意的标题。`
                });
            }
        }
    }

    let prompt = `你是一位连贯性检查员。你的职责是确保小说内部的一致性。
    
【重点检查】
1. **人名一致性**：是否存在同一个人名字前后写法不一致？（如"张三"变成"张山"）
2. **称谓一致性**：角色对他人的称呼是否突然改变且无理由？
3. **设定一致性**：前文提到的物品/技能名称是否在后文发生变化？
4. **格式一致性**：段落缩进、空行是否统一？`;

    if (previousContent) {
        prompt += `
5. **章节衔接**：本章开头是否能自然承接上一章的结尾？是否存在突兀的转折或断裂感？
        
【上一章结尾参考】
${previousContent.slice(-500)}
`;
    }

    prompt += `
如果发现明显的不一致或衔接问题，请指出。
    
请以JSON格式返回结果：
{
  "passed": boolean,
  "score": number,
  "feedback": string,
  "issues": [
    { "type": "consistency", "quote": "问题片段", "explanation": "不一致之处" }
  ],
  "suggestions": string[]
}`;
    
    const result = await this.analyze(prompt, chapterContent);
    
    // Merge programmatic issues
    if (issues.length > 0) {
        result.passed = false;
        result.score = Math.min(result.score, 5);
        result.feedback = `【标题重复】发现章节标题重复问题。\n${result.feedback}`;
        result.issues = [...issues, ...result.issues];
    }

    return result;
  }
}

// Define Personas
const casualReader: ReaderPersona = {
    id: 'casual',
    name: '乐子人',
    role: '爽文爱好者',
    description: '看书只为图一乐，喜欢快节奏、装逼打脸和轻松搞笑。最讨厌虐主、文青病和长篇大论的设定。',
    focus: '爽点是否足？节奏是否快？主角是否憋屈？'
};

const criticReader: ReaderPersona = {
    id: 'critic',
    name: '老书虫',
    role: '毒舌书评人',
    description: '阅书无数，眼光极高。痛恨套路化、降智光环和逻辑硬伤。不仅看故事，还看文笔和架构。',
    focus: '逻辑是否严密？有无陈词滥调？人物智商是否在线？'
};

const emotionalReader: ReaderPersona = {
    id: 'emotional',
    name: '嗑学家',
    role: '情感共鸣者',
    description: '关注人物关系和情感互动。容易被细节打动，也容易因为人设崩塌而弃书。',
    focus: '人物互动甜不甜/虐不虐？感情线是否突兀？角色是否有魅力？'
};

const marketReader: ReaderPersona = {
    id: 'market',
    name: '数据帝',
    role: '市场风向标',
    description: '代表主流付费群体。关注黄金三章、留存率要素和商业卖点。',
    focus: '开篇是否抓人？悬念钩子是否有效？期待感是否拉满？'
};

export const readerCasual = new ReaderAgent(casualReader);
export const readerCritic = new ReaderAgent(criticReader);
export const readerEmotional = new ReaderAgent(emotionalReader);
export const readerMarket = new ReaderAgent(marketReader);

export const proofreader = new ProofreaderAgent();
export const editor = new EditorAgent(chiefEditor); // Default export for compatibility if needed, but better to use specific ones
// export const reader = new ReaderAgent(); // Replaced by specific readers
export const logicChecker = new LogicAgent();
export const styleChecker = new StyleAgent();
export const consistencyChecker = new ConsistencyAgent();

# AI Novel Generator (AI 小说生成器)

一个基于多智能体（Multi-Agent）协作的自动化小说创作平台。通过 Writer, Editor, Reviewer 等多个 AI 智能体的协同工作，实现从大纲设计、章节创作、自动润色到质量把控的全流程自动化。

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-6-purple) ![Supabase](https://img.shields.io/badge/Supabase-Database-green) ![OpenAI](https://img.shields.io/badge/AI-DeepSeek%2FOpenAI-orange)

## ✨ 核心特性

- **🕵️ 多智能体协同**:
    - **Writer Agent**: 负责正文创作，支持风格模仿。
    - **Editor Agent**: 检查剧情连贯性和人物一致性。
    - **Reviewer Agent**: 模拟读者反馈，提供评分和建议。
- **📝 沉浸式创作**:
    - **流式生成**: 实时展示 AI 创作过程。
    - **富文本编辑**: 集成 TipTap 编辑器。
    - **一键重写**: 支持随时重生成不满意的段落。
- **🧠 智能辅助**:
    - **风格学习**: 提取参考文风。
    - **伏笔管理**: 自动追踪剧情伏笔。
    - **世界观一致性**: 实时检测设定冲突。

## 🛠️ 技术栈

- **前端**: React 18, TypeScript, Tailwind CSS, Vite
- **后端**: Express (Node.js), Supabase (PostgreSQL + Vector)
- **AI**: OpenAI SDK (兼容 DeepSeek, ChatGPT, Claude)

## 📂 目录结构

```
AI_Novel/
├── api/                # 后端 Express 服务与 Agent 逻辑
│   ├── agents/         # 智能体实现 (Writer, Reviewer 等)
│   ├── routes/         # API 路由
│   └── ...
├── src/                # 前端 React 应用
│   ├── components/     # UI 组件
│   ├── pages/          # 页面视图
│   └── ...
├── supabase/           # 数据库迁移文件
└── package.json        # 项目配置
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd AI_Novel
npm install
```

### 2. 配置环境变量

复制示例配置文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入 Supabase 和 AI 模型配置：

```env
# Supabase 配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# AI 模型配置 (默认 DeepSeek)
DEEPSEEK_API_KEY=sk-your-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-chat
```

### 3. 初始化数据库

在 Supabase 控制台执行 `supabase/migrations` 目录下的 SQL 脚本，创建表结构。

### 4. 启动项目

同时启动前端和后端服务：

```bash
npm run dev
```

访问 `http://localhost:5173` 开始创作！

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

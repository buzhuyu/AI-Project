# AI Novel Generator

多智能体协作的自动化小说创作平台，覆盖大纲、章节生成与质量把控。强调可维护性与专业化的本地部署。

## 核心特性

- 多智能体协作：Writer、Editor、Reviewer 等角色分工
- 实时流式生成与富文本编辑
- 风格学习、伏笔管理与世界观一致性检测

## 技术栈

- 前端：React、TypeScript、Vite、Tailwind CSS
- 服务：Node.js（Express）、Supabase
- AI：OpenAI SDK（兼容 DeepSeek 等）

## 目录结构

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

## 快速开始

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

编辑 `.env` 文件，仅保留前端可公开变量：

```env
# Supabase（前端）
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 服务器端密钥请通过系统环境变量设置（不要写入 .env）
# 使用示例脚本：scripts/setup_env_example.ps1
```

### 3. 初始化数据库

在 Supabase 控制台执行 `supabase/migrations` 目录下的 SQL 脚本，创建表结构。

### 4. 启动项目

同时启动前端与服务端：

```bash
npm run dev
```

访问 `http://localhost:5173` 使用前端；服务端默认端口 `3001`

### 5. 运行要求

- Node.js 建议版本 ≥ 20（兼容库未来版本）

### 6. 说明

- 本项目与其他模块独立运行，按需分别启动

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

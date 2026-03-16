# AI Tools Station (AI 资讯站)

这是一个基于 FastAPI 和 Next.js 构建的 AI 资讯聚合与推送平台。它能够抓取科技资讯，利用 LLM 生成中文摘要，并通过飞书或微信进行推送，同时提供现代化的 Web 界面进行浏览。

## ✨ 功能特性

- **🕷️ 资讯抓取**: 支持从 Hacker News、GitHub Trending 等来源抓取最新科技资讯。
- **🧠 智能摘要**: 集成 OpenAI 接口，自动生成高质量中文摘要。
- **🛡️ 本地回退**: 如果 LLM 服务不可用，使用 `newspaper3k` 进行本地摘要提取。
- **📢 多渠道推送**: 支持飞书 Webhook 推送，预留微信公众号推送接口。
- **💻 现代化前端**: 基于 Next.js + Shadcn/UI 构建的响应式 Web 界面。
- **🔌 RESTful API**: 提供标准的 API 服务。

## 🛠️ 技术栈

- **后端**: FastAPI, Python 3.10+, SQLAlchemy, APScheduler
- **前端**: Next.js 14, React, Tailwind CSS, Shadcn/UI
- **数据库**: SQLite (默认) / PostgreSQL
- **AI**: OpenAI API / DeepSeek API

## 📂 目录结构

```
ToolsStation/
├── backend/            # Python 后端服务
│   ├── routers/        # API 路由
│   ├── services/       # 业务服务 (通知、LLM)
│   ├── crawler.py      # 爬虫逻辑
│   ├── main.py         # FastAPI 入口
│   └── ...
├── frontend/           # Next.js 前端应用
│   ├── app/            # 页面路由
│   ├── components/     # UI 组件
│   └── ...
├── docker-compose.yml  # 容器编排配置
└── README.md           # 项目说明
```

## 🚀 快速开始

### 方式一：Docker 一键启动（推荐）

如果你安装了 Docker，可以直接启动整个应用：

```bash
# 在 ToolsStation 目录下
docker-compose up -d
```
访问地址：
- 前端页面: `http://localhost:3000`
- 后端 API: `http://localhost:8000/docs`

### 方式二：本地开发运行

#### 1. 后端服务 (Backend)

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 配置环境变量 (复制示例并填入 Key)
cp .env.example .env
# 编辑 .env 文件...

# 初始化数据库
python init_db_script.py

# 启动服务
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. 前端应用 (Frontend)

```bash
cd frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local 
# 或者手动创建 .env.local 并写入: NEXT_PUBLIC_API_URL=http://localhost:8000

# 启动开发服务器
npm run dev
```

## 📝 环境变量说明

### 后端 (.env)
| 变量名 | 说明 |
|--------|------|
| `OPENAI_API_KEY` | 用于生成智能摘要 (必填/可选) |
| `OPENAI_BASE_URL` | 自定义 API 地址 (如使用 DeepSeek) |
| `FEISHU_WEBHOOK_URL` | 飞书机器人 Webhook 地址 |

### 前端 (.env.local)
| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_API_URL` | 后端 API 地址 (默认 http://localhost:8000) |

## 📄 许可证

MIT License

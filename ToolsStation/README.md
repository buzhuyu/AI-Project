# ToolsStation

基于 FastAPI 与 Next.js 的资讯聚合与推送平台，支持多源抓取、LLM 摘要与飞书/微信推送。采用前后端分离与本地脚本化部署。

## 功能特性

- 多源资讯抓取（如 Hacker News、GitHub Trending）
- LLM 驱动摘要；支持不可用时本地回退
- 多渠道推送（飞书 Webhook，预留微信公众号）
- Web 界面与 RESTful API

## 技术栈

- 后端：FastAPI、Python、SQLAlchemy、APScheduler
- 前端：Next.js、React、Tailwind CSS
- 数据库：SQLite（默认）/ PostgreSQL

## 目录结构

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

## 快速开始

### 本地分离运行

#### 后端（backend）

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（系统环境变量，避免提交 .env）
# 使用示例脚本：../../scripts/setup_env_example.ps1

# 初始化数据库
python init_db_script.py

# 启动服务
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 前端（frontend）

```bash
cd frontend

# 安装依赖
npm install

# 配置前端环境变量（公开）
# 创建 .env.local 并写入:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# 启动开发服务器
npm run dev
```

## 环境变量说明

### 后端（系统环境变量）
- OPENAI_API_KEY：LLM 摘要密钥
- OPENAI_BASE_URL：自定义 API 地址（如 DeepSeek）
- OPENAI_MODEL：模型名称
- FEISHU_WEBHOOK_URL：飞书机器人 Webhook

### 前端（.env.local）
- NEXT_PUBLIC_API_URL：后端地址（默认 http://localhost:8000）

## 许可证

MIT License

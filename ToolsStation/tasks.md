# Tasks

## Phase 1: 项目初始化与基础架构
- [ ] 初始化项目结构 (Monorepo: `backend`, `frontend`). <!-- id: 1 -->
- [ ] 配置 Python 虚拟环境与依赖 (`requirements.txt` / `pyproject.toml`). <!-- id: 2 -->
- [ ] 搭建 FastAPI 基础框架与数据库模型 (SQLAlchemy). <!-- id: 3 -->
- [ ] 配置日志系统 (Loguru) 与 环境变量管理 (.env). <!-- id: 4 -->

## Phase 2: 数据采集模块 (Crawler)
- [ ] 定义通用爬虫接口/基类 (`BaseCrawler`). <!-- id: 5 -->
- [ ] 实现 GitHub Trending 爬虫. <!-- id: 6 -->
- [ ] 实现 Hugging Face Daily Papers/Models 爬虫. <!-- id: 7 -->
- [ ] 实现 Reddit (r/LocalLLaMA) 爬虫 (使用 PRAW 或 RSS). <!-- id: 8 -->
- [ ] 实现 掘金/CSDN 爬虫. <!-- id: 9 -->
- [ ] 编写测试脚本验证各爬虫的数据获取能力. <!-- id: 10 -->

## Phase 3: AI 处理模块 (Processor)
- [ ] 集成 LLM API 客户端 (OpenAI/DeepSeek/Gemini). <!-- id: 11 -->
- [ ] 设计 Prompt Template 用于资讯分类与摘要. <!-- id: 12 -->
- [ ] 实现数据清洗与去重逻辑. <!-- id: 13 -->
- [ ] 开发处理管道：Raw Data -> LLM -> Structured Data. <!-- id: 14 -->
- [ ] 编写单元测试验证分类准确性. <!-- id: 15 -->

## Phase 4: 后端 API 与定时任务
- [ ] 实现资讯查询 API (`/news`, `/news/{id}`). <!-- id: 16 -->
- [ ] 集成 APScheduler 实现每日定时抓取与处理. <!-- id: 17 -->
- [ ] 实现手动触发更新的 API 接口. <!-- id: 18 -->

## Phase 5: 前端开发 (Web UI)
- [ ] 初始化 Next.js 项目与 UI 组件库 (Shadcn/UI). <!-- id: 19 -->
- [ ] 开发首页日报流布局 (按分类展示). <!-- id: 20 -->
- [ ] 开发资讯详情卡片与原文跳转. <!-- id: 21 -->
- [ ] 开发日期选择与历史归档页面. <!-- id: 22 -->
- [ ] 联调后端 API 并优化加载体验. <!-- id: 23 -->

## Phase 6: 部署与文档
- [ ] 编写 `docker-compose.yml` 编排服务. <!-- id: 24 -->
- [ ] 编写 `README.md` 与部署文档. <!-- id: 25 -->
- [ ] 进行端到端测试 (E2E). <!-- id: 26 -->

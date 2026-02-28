# AI News Aggregator Specification

## 1. 项目概述
本项目旨在开发一个自动化的 AI 资讯聚合平台，名为 **AI Daily Feed**。该平台每天定时（如早晨 8:00）从全球主流 AI 社区和技术论坛抓取前一日的最新资讯，利用大语言模型（LLM）进行智能筛选、分类、去重和摘要，最终通过 Web 界面以日报的形式呈现给用户。

## 2. 用户故事
- 作为一名 **AI 开发者**，我希望每天早上能看到 GitHub 上最热门的 AI 项目和 Hugging Face 上的新模型，以便跟进最新技术。
- 作为一名 **行业研究员**，我希望看到 Reddit 和 智源研究院 的深度讨论和报告，以便了解学术前沿和宏观趋势。
- 作为一名 **应用工程师**，我希望筛选出 CSDN 和 掘金 上的实战教程，以便解决工作中的具体问题。
- 作为 **用户**，我希望资讯经过 AI 总结，去除由于营销号产生的低质量内容，只看干货。

## 3. 功能需求

### 3.1 数据采集 (Crawler Service)
系统需支持从以下源获取数据（可扩展）：
- **Hugging Face**: Daily Papers, Trending Models/Spaces.
- **GitHub**: Trending Repositories (Python/C++ with AI tags), Specific Discussions.
- **Reddit**: r/MachineLearning, r/LocalLLaMA, r/AI_Agents 的热门帖子 (Top/Hot).
- **中文社区**: 掘金 (AI 标签), CSDN (AI/大模型 频道), 公众号/RSS (可选).
- **资讯媒体**: 机器之心, 智源研究院 (通过 RSS 或 网页抓取).

### 3.2 智能处理 (AI Processing Service)
- **清洗与去重**: 识别相似内容的文章/项目，进行合并或去重。
- **分类**: 将内容自动归类为以下板块：
    - 🚀 **模型与工具** (Models & Tools): 新模型发布、库更新。
    - 💻 **工程实践** (Engineering): 部署教程、优化技巧、代码实战。
    - 🔬 **学术前沿** (Research): 论文解读、算法创新。
    - 📢 **行业动态** (Industry): 融资新闻、政策法规、大厂动态。
- **摘要**: 对长文章/讨论串生成 100-200 字的中文摘要。
- **评分**: 根据热度（Star/Upvote）和内容质量进行评分，优先展示高分内容。

### 3.3 后端服务 (Backend API)
- 提供 RESTful API 获取每日资讯列表。
- 支持按日期、类别、标签筛选。
- 支持全文搜索。
- 定时任务调度（每天凌晨执行抓取和处理）。

### 3.4 前端界面 (Web UI)
- **首页/日报页**: 展示当天的精选资讯，按板块通过卡片流形式展示。
- **详情页**: 点击卡片查看详细摘要、原文链接、来源数据（Stars/Comments）。
- **历史归档**: 查看过往日期的日报。
- **订阅配置** (可选): 用户可选择关注的特定源或关键词。

## 4. 技术架构

### 4.1 技术栈
- **后端**: Python (FastAPI)
- **数据库**: SQLite (初期) / PostgreSQL (生产), Redis (缓存/队列)
- **爬虫**: Playwright (动态网页) / HTTPX (API) / Beautiful Soup
- **AI/LLM**: LangChain / OpenAI API (或兼容的 DeepSeek/Gemini API)
- **前端**: React (Next.js) + Tailwind CSS + Shadcn/UI
- **部署**: Docker / Docker Compose

### 4.2 数据流
1. **Scheduler** 触发抓取任务。
2. **Crawlers** 并行抓取各源数据 -> 存入 `RawData` 表。
3. **Processor** 读取 `RawData` -> 调用 LLM API 进行清洗、分类、摘要 -> 存入 `ProcessedNews` 表。
4. **API Server** 响应前端请求，从 `ProcessedNews` 读取数据。

## 5. 接口设计 (初步)

- `GET /api/v1/news/latest`: 获取最新一期的日报。
- `GET /api/v1/news?date=2026-02-27&category=engineering`: 按日期和分类获取。
- `GET /api/v1/sources`: 获取支持的数据源列表。
- `POST /api/v1/trigger-update`: 手动触发更新（管理员）。

## 6. 非功能需求
- **时效性**: 每日更新需在 8:00 AM 前完成。
- **稳定性**: 单个源抓取失败不应影响整体服务。
- **可扩展性**: 易于添加新的数据源插件。

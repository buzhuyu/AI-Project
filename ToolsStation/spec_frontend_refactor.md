# AI Daily Feed 2.0 - 前端重构规格说明书

## 1. 现状问题分析
当前 MVP 版本虽然功能可用，但在用户体验 (UX) 和界面设计 (UI) 上存在以下不足：
- **信息密度过低**：目前使用简单的卡片堆叠，一屏展示内容过少，用户需要大量滚动。
- **缺乏重点**：所有资讯平铺直叙，没有“头条”或“精选”概念，用户难以快速获取最重要信息。
- **交互单一**：仅有简单的列表和跳转，缺乏预览、稍后阅读、分享等常用功能。
- **视觉层级弱**：不同来源（GitHub 代码 vs 论文 vs 文章）的展示形式雷同，没有体现各自的内容特征（如代码语言、论文引用数、文章阅读量）。

## 2. 设计目标
打造一个 **高效率、高颜值、沉浸式** 的 AI 资讯聚合阅读器。参考 Product Hunt, Hacker News, 即刻 (Jike) 等产品的设计理念。

## 3. 核心改进方案

### 3.1 布局重构：三栏式仪表盘 (Dashboard Layout)
抛弃目前的单列/双列流式布局，采用更紧凑的 **三栏布局**：
- **左侧边栏 (Sidebar)**：导航与筛选。
    - Logo & 搜索框
    - **我的订阅**：按平台（GitHub, Hugging Face, Juejin）或 主题（LLM, Agent, CV）分类。
    - **工具栏**：设置、深色模式切换、关于。
- **中间主栏 (Feed Stream)**：核心资讯流。
    - 采用 **"Timeline" (时间轴)** 模式，按时间倒序混合展示所有来源的最新资讯。
    - **置顶/头条 (Featured)**：每天 AI 筛选出的 Top 3 最重要新闻，以大卡片/轮播图形式展示。
    - **列表项优化**：
        - **GitHub**: 突出显示 `Repo Name` (Bold), `Language` (Color Tag), `Stars` (Badge)。
        - **Paper**: 突出显示 `Title`, `Authors` (Truncated), `Abstract` (Collapsed by default)。
        - **Article**: 左文右图模式，突出 `Title` 和 `Summary`。
- **右侧边栏 (Widgets & Trends)**：辅助信息。
    - **热门标签 (Trending Tags)**: #LLM, #RAG, #Transformer。
    - **历史归档 (Calendar)**: 快速跳转到某一天的日报。
    - **相关推荐**: 基于当前浏览内容的推荐（未来规划）。

### 3.2 交互体验升级
- **模态预览 (Modal Preview)**：点击列表项不直接跳转新标签页，而是弹出一个 **侧边抽屉 (Drawer)** 或 **模态框 (Modal)**，展示 AI 生成的详细摘要、核心观点、代码片段预览。用户感兴趣再点击 "Read Original" 跳转原文。
- **快捷操作**: 每个卡片增加 `Copy Link`, `Share`, `Save/Bookmark` 按钮。
- **无限滚动 (Infinite Scroll)**：替代传统的分页，提升浏览流畅度。
- **骨架屏 (Skeleton)**：数据加载时展示骨架屏，减少视觉突变。

### 3.3 视觉风格 (UI Polish)
- **卡片式设计 (Modern Cards)**：增加细微的阴影 (Shadow-sm) 和 圆角 (Rounded-xl)，悬停时轻微上浮 (Hover Lift)。
- **标签系统 (Tag System)**：为不同来源定义专属色（GitHub: 黑/灰, HF: 黄/橙, Juejin: 蓝）。
- **字体优化**: 标题使用更粗重的字重，正文使用高可读性字体（Inter/系统默认），代码使用等宽字体。

## 4. 技术实现路径 (Frontend Refactor)

### 4.1 组件拆分
- `Sidebar`: 侧边导航。
- `NewsFeed`: 资讯流容器。
- `NewsCard`: 通用卡片组件 (包含 `Header`, `Body`, `Footer`)。
    - `GitHubCard`: 继承自 NewsCard，定制 GitHub 特有展示。
    - `PaperCard`: 定制论文展示。
- `NewsDrawer`: 详情预览抽屉。
- `CalendarWidget`: 日历组件。

### 4.2 状态管理
- 引入 `Zustand` 或 `Context API` 管理全局状态（当前选中分类、搜索关键词、已读列表）。

### 4.3 UI 库升级
- 继续使用 **Tailwind CSS**。
- 引入 **Shadcn/UI** (基于 Radix UI) 的 `Sheet` (抽屉), `Dialog` (模态框), `ScrollArea`, `Tabs` 等组件，快速提升交互质感。
- 引入 `lucide-react` 图标库。

## 5. 开发计划 (Phase 5)
- [ ] 安装 `shadcn/ui` 及相关依赖 (`clsx`, `tailwind-merge`).
- [ ] 重构 `layout.tsx` 为三栏布局。
- [ ] 封装 `NewsCard` 组件，实现多态展示。
- [ ] 实现 `NewsDrawer` 预览功能。
- [ ] 优化移动端适配 (Mobile Responsive)，在小屏下隐藏侧边栏，改为底部导航或汉堡菜单。

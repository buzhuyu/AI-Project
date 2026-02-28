# AI.NEXUS 部署指南

## 1. 部署方式选择

对于 **AI.NEXUS** 这种资讯聚合类应用，推荐使用 **Docker 容器化部署**。

### 优势
- **环境一致性**: 不用担心服务器 Python/Node 版本问题。
- **一键启动**: 使用 `docker-compose` 可以同时启动前端和后端。
- **易于迁移**: 可以轻松迁移到任何云服务器 (AWS, 阿里云, DigitalOcean 等)。

## 2. 快速部署步骤 (Docker)

### 前置条件
- 服务器已安装 [Docker](https://docs.docker.com/get-docker/) 和 [Docker Compose](https://docs.docker.com/compose/install/)。

### 步骤
1. **上传代码** 到服务器。
2. **配置环境变量**:
   在项目根目录创建 `.env` 文件（参考 `backend/.env`），填入 API Key：
   ```env
   OPENAI_API_KEY=sk-xxxx
   OPENAI_BASE_URL=https://api.openai.com/v1
   ```
3. **修改前端配置** (可选):
   如果部署在公网，需修改 `docker-compose.yml` 中的 `NEXT_PUBLIC_API_URL` 为服务器 IP 或域名。
4. **启动服务**:
   ```bash
   docker-compose up -d --build
   ```
5. **访问**:
   - 前端: `http://your-server-ip:3000`
   - 后端 API: `http://your-server-ip:8000/docs`

---

## 3. Web 端 vs 移动端：选哪个？

### 结论：优先 Web 端 (PWA)

对于资讯聚合类产品，**Web 端 (特别是适配移动端的 Web)** 是最佳起步选择。

### 对比分析

| 维度 | Web 端 (当前方案) | 移动端 (Native App) | 建议 |
| :--- | :--- | :--- | :--- |
| **开发成本** | ⭐⭐⭐⭐⭐ (已就绪) | ⭐⭐ (需额外开发 iOS/Android 包) | Web 胜 |
| **更新维护** | ⭐⭐⭐⭐⭐ (服务器部署即更新) | ⭐⭐ (需发版、审核、用户下载) | Web 胜 |
| **跨平台** | ⭐⭐⭐⭐⭐ (PC/手机/平板通用) | ⭐⭐⭐ (需分别适配) | Web 胜 |
| **访问门槛** | ⭐⭐⭐⭐⭐ (点链接即看) | ⭐⭐ (需下载安装) | Web 胜 |
| **系统能力** | ⭐⭐⭐ (受限，但在进步) | ⭐⭐⭐⭐⭐ (推送、离线、高性能) | App 胜 |
| **用户留存** | ⭐⭐⭐ (依赖书签/记忆) | ⭐⭐⭐⭐⭐ (桌面图标、推送唤醒) | App 胜 |

### 最佳实践路线图
1.  **阶段一 (MVP)**: **响应式 Web**。当前项目已经适配了移动端布局（Sidebar 折叠、Grid 布局），直接部署 Web 版即可覆盖 PC 和手机用户。
2.  **阶段二 (增强)**: **PWA (Progressive Web App)**。通过简单的配置，让 Web 网页可以被“安装”到手机桌面，拥有独立的图标和启动屏，体验接近原生 App。
3.  **阶段三 (如果做大)**: **跨平台 App (Flutter/React Native)**。只有当需要强依赖“推送通知”功能，且用户量巨大时，才考虑开发原生 App。

### 如何体验移动端效果？
当前代码已包含移动端适配：
- 打开浏览器开发者工具 (F12) -> 切换到手机模式。
- 或者在手机浏览器中访问部署后的 IP。
- 侧边栏会自动变为左上角的“汉堡菜单”，布局会自动变为单列，体验非常顺滑。

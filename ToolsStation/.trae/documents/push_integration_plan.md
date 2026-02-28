# ToolsStation 推送能力扩展计划

## 1. 目标与背景
当前 ToolsStation 具备 AI 资讯的聚合、去重、分类与摘要生成能力。为了让用户更便捷地获取高价值信息，计划将这些能力扩展到第三方平台（如微信公众号、飞书、钉钉等），实现资讯的主动推送与交互式查询。

## 2. 现有系统影响分析与隔离措施 (关键)
本方案采用 **非侵入式设计**，确保对现有 Web 端没有任何负面影响：

1.  **独立服务模块**: 新增的 `NotificationService` 完全独立于现有的 `crawler` 和 `processor` 逻辑。Web 端的数据读取接口（如 `/api/v1/news`）不受任何变更影响。
2.  **异步非阻塞执行**:
    - 推送任务将在后台线程或异步任务中执行（使用 `asyncio`），不会阻塞主线程。
    - 即使推送服务因网络原因超时或失败，也不会影响资讯的生成、存储和 Web 端展示。
3.  **资源占用极低**: 推送动作仅在每日资讯生成后触发一次（或用户手动触发），对 CPU 和内存的占用几乎可以忽略不计。
4.  **错误隔离**: 推送模块拥有独立的异常捕获机制，任何推送错误仅记录日志，不会导致主程序崩溃。

## 3. 业务流程设计

### 3.1 核心流程
1.  **数据源就绪**：`processor.py` 完成每日资讯的爬取、处理与摘要生成。
2.  **触发推送**：系统检测到新数据生成（或定时任务触发），调用 `NotificationService`。
3.  **渠道适配**：服务根据配置的渠道（微信公众号、飞书 Webhook 等）组装消息格式。
4.  **消息发送**：
    - **广播模式**：通过 Webhook 推送到群组（适用于飞书/钉钉）。
    - **订阅模式**：通过公众号接口推送到关注用户（适用于微信）。
5.  **结果反馈**：记录推送日志，便于排查失败原因。

### 3.2 交互模式（针对公众号）
- **被动回复**：用户发送“最新”、“日报”等关键词，系统回复当日 Top 5 资讯摘要。
- **主动推送**：每日定时（如早上 8:30）推送当日生成的 AI 日报（需使用服务号模板消息或订阅号群发接口）。

## 4. 技术栈方案

### 4.1 后端扩展 (Python/FastAPI)
- **HTTP 客户端**: 使用 `httpx` 处理第三方 API 调用（异步支持）。
- **微信生态集成**: 引入 `wechatpy` 库，简化微信公众号 API 的调用（Token 管理、消息加解密）。
- **任务队列**: 沿用 `APScheduler` 进行定时推送任务管理。
- **配置管理**: 扩展 `config.py` 或数据库表，存储 API Key、Secret、Webhook URL 等敏感信息。

### 4.2 数据库设计 (SQLAlchemy)
需新增以下表结构支持推送业务：
- **ChannelConfig**: 存储渠道配置（如 `type='wechat'`, `app_id='...'`, `secret='...'`, `webhook_url='...'`）。
- **Subscriber** (可选): 存储公众号关注用户的 OpenID（用于定向推送）。
- **NotificationLog**: 记录推送历史（时间、渠道、内容摘要、状态）。

## 5. 操作模式与实施步骤

### 5.1 阶段一：基础架构与 Webhook 推送（飞书/钉钉）
**操作模式**：用户在设置页面填写飞书/钉钉机器人的 Webhook 地址。
**实施步骤**：
1.  创建 `NotificationService` 类。
2.  实现 `send_feishu_webhook(title, content, url)` 方法。
3.  在 `main.py` 的定时任务中，当 `process_news` 完成后调用推送。

### 5.2 阶段二：微信公众号集成
**操作模式**：
- **管理员**：在后台配置 AppID 和 AppSecret，配置服务器 URL 和 Token（用于微信验证）。
- **用户**：关注公众号，发送指令获取资讯。
**实施步骤**：
1.  引入 `wechatpy` 依赖。
2.  新增 `/api/v1/wechat` 接口，处理微信服务器的验证与消息回调。
3.  实现消息处理器：解析用户文本消息，查询数据库中最新的 `NewsItem`，组装成图文消息或文本消息回复。
4.  实现主动推送逻辑（模板消息或客服消息）。

### 5.3 阶段三：前端配置界面
**操作模式**：在前端增加“通知设置”页面，允许开启/关闭特定渠道，并填写配置信息。
**实施步骤**：
1.  后端新增 `/api/v1/config/notifications` 接口（GET/POST）。
2.  前端实现配置表单。

## 6. 示例代码结构

```python
# backend/services/notification.py

class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    async def push_daily_digest(self):
        # 1. 获取今日资讯
        news_items = self.get_todays_news()
        if not news_items:
            return

        # 2. 格式化消息
        markdown_content = self.format_news_to_markdown(news_items)

        # 3. 获取启用的渠道
        channels = self.get_enabled_channels()

        # 4. 分发
        for channel in channels:
            if channel.type == 'feishu':
                await self.send_feishu(channel.webhook_url, markdown_content)
            elif channel.type == 'wechat':
                await self.send_wechat_template(channel.config, news_items)
```

## 7. 总结
本计划优先实现 **Webhook 推送**（开发成本低，见效快），随后实现 **微信公众号被动回复**（交互性好），最后根据需求实现 **公众号主动推送**（受限于微信接口权限）。

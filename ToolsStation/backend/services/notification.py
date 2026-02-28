import httpx
from loguru import logger
from typing import List, Dict, Any, Optional
import os
from wechatpy import WeChatClient
from wechatpy.exceptions import WeChatClientException
from database import SessionLocal, NewsItem
from datetime import datetime, date

class NotificationService:
    def __init__(self):
        pass

    async def push_daily_digest(self):
        """
        推送每日摘要到配置的渠道
        """
        db = SessionLocal()
        try:
            # 获取最新的 10 条资讯
            items = db.query(NewsItem).order_by(NewsItem.created_at.desc()).limit(10).all()
            if not items:
                logger.info("No news to push.")
                return

            date_str = date.today().strftime("%Y-%m-%d")
            
            # 格式化飞书消息
            feishu_content = ""
            for idx, item in enumerate(items, 1):
                feishu_content += f"**{idx}. [{item.title}]({item.url})**\n"
                if item.summary:
                    # 截断摘要以避免过长
                    summary = item.summary[:100] + "..." if len(item.summary) > 100 else item.summary
                    feishu_content += f"{summary}\n"
                feishu_content += f"_{item.source}_\n\n"
            
            feishu_content += "\n[查看完整列表](http://localhost:3000)" # TODO: 配置前端 URL

            # 发送飞书
            webhook_url = os.getenv("FEISHU_WEBHOOK_URL")
            if webhook_url:
                await self.send_feishu_webhook(webhook_url, f"AI Daily Digest - {date_str}", feishu_content)
            else:
                logger.info("FEISHU_WEBHOOK_URL not set, skipping Feishu push.")

        except Exception as e:
            logger.error(f"Error in push_daily_digest: {e}")
        finally:
            db.close()

    async def send_feishu_webhook(self, webhook_url: str, title: str, content: str):
        """
        发送飞书 Webhook 消息
        :param webhook_url: 飞书机器人的 Webhook URL
        :param title: 消息标题
        :param content: 消息内容（支持 Markdown）
        """
        if not webhook_url:
            logger.warning("Feishu webhook URL is empty, skipping notification.")
            return

        payload = {
            "msg_type": "interactive",
            "card": {
                "header": {
                    "title": {
                        "tag": "plain_text", 
                        "content": title
                    },
                    "template": "blue"
                },
                "elements": [
                    {
                        "tag": "div",
                        "text": {
                            "tag": "lark_md", 
                            "content": content
                        }
                    }
                ]
            }
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(webhook_url, json=payload, timeout=10.0)
                response.raise_for_status()
                result = response.json()
                if result.get("code") != 0:
                     logger.error(f"Feishu webhook failed: {result}")
                else:
                    logger.info("Feishu notification sent successfully")
        except Exception as e:
            logger.error(f"Failed to send Feishu notification: {e}")

    async def send_wechat_template(self, app_id: str, app_secret: str, open_ids: List[str], template_id: str, data: Dict[str, Any], url: Optional[str] = None):
        """
        发送微信公众号模板消息
        :param app_id: 公众号 AppID
        :param app_secret: 公众号 AppSecret
        :param open_ids: 接收者的 OpenID 列表
        :param template_id: 模板 ID
        :param data: 模板数据
        :param url: 跳转链接
        """
        if not app_id or not app_secret:
             logger.warning("WeChat AppID or AppSecret is missing.")
             return

        try:
            # WeChatClient is synchronous by default, consider wrapping in run_in_executor if needed for high concurrency
            # For now, it's fine for low volume
            client = WeChatClient(app_id, app_secret)
            for open_id in open_ids:
                try:
                    client.message.send_template(
                        user_id=open_id,
                        template_id=template_id,
                        data=data,
                        url=url
                    )
                    logger.info(f"WeChat template message sent to {open_id}")
                except WeChatClientException as e:
                    logger.error(f"Failed to send WeChat message to {open_id}: {e}")
        except Exception as e:
            logger.error(f"Failed to initialize WeChat client or send message: {e}")

notification_service = NotificationService()

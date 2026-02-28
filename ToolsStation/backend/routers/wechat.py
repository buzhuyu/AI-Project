from fastapi import APIRouter, Request, HTTPException, Response, BackgroundTasks
from loguru import logger
from wechatpy import parse_message, create_reply
from wechatpy.utils import check_signature
from wechatpy.exceptions import InvalidSignatureException
import os
from database import SessionLocal, NewsItem

router = APIRouter(prefix="/api/v1/wechat", tags=["wechat"])

WECHAT_TOKEN = os.getenv("WECHAT_TOKEN", "your_token_here")
WECHAT_APPID = os.getenv("WECHAT_APPID", "")
WECHAT_AES_KEY = os.getenv("WECHAT_AES_KEY", "")

@router.get("")
async def wechat_verify(signature: str, timestamp: str, nonce: str, echostr: str):
    """
    Verify WeChat server request.
    """
    try:
        check_signature(WECHAT_TOKEN, signature, timestamp, nonce)
        return Response(content=echostr)
    except InvalidSignatureException:
        logger.warning("WeChat signature verification failed.")
        raise HTTPException(status_code=403, detail="Invalid signature")

@router.post("")
async def wechat_message(request: Request, signature: str, timestamp: str, nonce: str, background_tasks: BackgroundTasks, openid: str = None, encrypt_type: str = "raw", msg_signature: str = None):
    """
    Handle incoming WeChat messages.
    """
    # 1. Verify signature
    try:
        check_signature(WECHAT_TOKEN, signature, timestamp, nonce)
    except InvalidSignatureException:
        raise HTTPException(status_code=403, detail="Invalid signature")

    # 2. Parse XML body
    body = await request.body()
    
    # 3. Decrypt if needed
    crypto = None
    if encrypt_type == 'aes':
        try:
            from wechatpy.crypto import WeChatCrypto
            if not WECHAT_AES_KEY or not WECHAT_APPID:
                logger.error("WeChat AES Key or AppID not configured for encryption")
                raise HTTPException(status_code=500, detail="Server configuration error")
                
            crypto = WeChatCrypto(WECHAT_TOKEN, WECHAT_AES_KEY, WECHAT_APPID)
            decrypted_xml = crypto.decrypt_message(body, msg_signature, timestamp, nonce)
            msg = parse_message(decrypted_xml)
        except InvalidSignatureException:
            raise HTTPException(status_code=403, detail="Invalid encryption signature")
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise HTTPException(status_code=400, detail="Decryption failed")
    else:
        msg = parse_message(body)

    # 4. Handle message logic
    reply = None
    if msg.type == 'text':
        content = msg.content.strip()
        if content in ["最新", "日报", "news"]:
            # Query DB for latest news
            db = SessionLocal()
            try:
                items = db.query(NewsItem).order_by(NewsItem.created_at.desc()).limit(5).all()
                if items:
                    articles = []
                    for item in items:
                        articles.append({
                            "title": item.title,
                            "description": item.summary[:50] + "..." if item.summary else "",
                            "image": item.thumbnail or "",
                            "url": item.url
                        })
                    # Create Article Reply (News)
                    reply = create_reply(articles, msg)
                else:
                    reply = create_reply("暂无今日资讯", msg)
            finally:
                db.close()
        else:
            reply = create_reply("收到您的消息：" + content + "\n回复【最新】获取 AI 日报", msg)
    else:
        reply = create_reply("暂不支持此类消息", msg)

    # 5. Render reply XML
    xml = reply.render()
    
    # 6. Encrypt if needed
    if encrypt_type == 'aes' and crypto:
        encrypted_xml = crypto.encrypt_message(xml, nonce, timestamp)
        return Response(content=encrypted_xml, media_type="application/xml")
    
    return Response(content=xml, media_type="application/xml")

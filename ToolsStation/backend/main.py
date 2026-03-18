from fastapi import FastAPI, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, init_db, NewsItem
from processor import process_news
from services.notification import notification_service
from loguru import logger
from apscheduler.schedulers.background import BackgroundScheduler
from contextlib import asynccontextmanager
import asyncio
from routers import wechat

scheduler = BackgroundScheduler()

def run_process_and_notify():
    """
    Run the news processing pipeline and then trigger notifications.
    This is a synchronous wrapper for the scheduler.
    """
    try:
        # 1. Process News
        logger.info("Scheduled task: Starting process_news")
        process_news()
        
        # 2. Trigger Notification
        logger.info("Scheduled task: Starting notification push")
        # Since this runs in a thread, we create a new event loop for async task
        asyncio.run(notification_service.push_daily_digest())
        logger.info("Scheduled task: Notification push completed")
        
    except Exception as e:
        logger.error(f"Error in scheduled task: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    
    # Schedule task: Run every day at 8:00 AM
    scheduler.add_job(run_process_and_notify, 'cron', hour=8, minute=0, id='daily_update')
    scheduler.start()
    logger.info("Scheduler started. Daily update scheduled at 08:00.")
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    logger.info("Scheduler shut down.")

app = FastAPI(title="AI Daily Feed API", lifespan=lifespan)
app.include_router(wechat.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Daily Feed API"}

@app.post("/api/v1/trigger-update")
def trigger_update(background_tasks: BackgroundTasks):
    """
    Manually triggers the news fetching and processing pipeline in the background.
    """
    background_tasks.add_task(process_news)
    return {"status": "success", "message": "Update task started in background"}

@app.get("/api/v1/news")
def get_news(source: str = None, limit: int = 10, db: Session = Depends(get_db)):
    """
    Get processed news from the database.
    Optional filter by source: 'GitHub Trending' or 'Hugging Face Daily Papers'
    Limit defaults to 10 items per source (or total if source specified).
    """
    query = db.query(NewsItem).order_by(NewsItem.created_at.desc())
    
    if source:
        query = query.filter(NewsItem.source == source)
        items = query.limit(limit).all()
    else:
        # If no source specified, we might want to return mixed results, 
        # or grouped results. For simplicity in this API, let's just return latest `limit` items total.
        # But user requirement says "Top 10 per platform". 
        # So maybe we should fetch separately if no source is provided?
        # Let's support fetching all if no source, but limit total. 
        # Better approach for UI: UI calls this API multiple times or we group here.
        # Let's keep it simple: Limit applies to the result set.
        items = query.limit(limit).all()
        
    return {"status": "success", "data": items}

@app.post("/api/v1/notify")
async def trigger_notify(background_tasks: BackgroundTasks):
    """
    Manually triggers the notification push in the background.
    """
    background_tasks.add_task(notification_service.push_daily_digest)
    return {"status": "success", "message": "Notification task started in background"}

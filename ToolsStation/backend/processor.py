import concurrent.futures
from sqlalchemy.orm import Session
from database import SessionLocal, NewsItem
from crawler import fetch_github_trending, fetch_huggingface_daily_papers, fetch_juejin_ai_trending, fetch_reddit_ml_hot, fetch_qbitai_news
from llm_service import llm_service
from loguru import logger

def determine_category(title: str, description: str) -> str:
    """
    Classify news into: 'Product', 'Technology', 'Other' based on keywords.
    """
    text = (title + " " + description).lower()
    
    product_keywords = ["launch", "release", "product", "app", "service", "startup", "tool", "platform", "发布", "产品", "应用", "上线", "工具"]
    tech_keywords = ["paper", "algorithm", "model", "architecture", "code", "repo", "library", "framework", "dataset", "论文", "算法", "模型", "架构", "代码", "库", "框架", "数据集", "transformer", "diffusion"]
    
    score_prod = sum(1 for k in product_keywords if k in text)
    score_tech = sum(1 for k in tech_keywords if k in text)
    
    if score_tech > score_prod:
        return "Technology"
    elif score_prod > score_tech:
        return "Product"
    else:
        # Default fallback or logic
        if "github" in text or "hugging face" in text or "arxiv" in text:
            return "Technology"
        return "Other"

def process_single_item(item_data, db):
    """
    Process a single news item: Check existence -> Generate Summary -> Save
    Returns: 1 if new, 0 if updated/skipped
    """
    try:
        # Check if exists
        existing = db.query(NewsItem).filter(NewsItem.url == item_data["url"]).first()
        
        if existing:
            # Update stats if needed (stars/upvotes)
            existing.stars = item_data["stars"]
            existing.upvotes = item_data["upvotes"]
            return 0
        else:
            # New item -> Generate Summary & Category
            logger.info(f"Processing new item: {item_data['title']}")
            
            # Context for summary
            context = f"Source: {item_data['source']}"
            summary = llm_service.generate_summary(item_data["original_desc"], context, url=item_data["url"])
            
            # Auto Categorize (In real app, LLM can do this too, but regex is faster)
            category = determine_category(item_data["title"], item_data["original_desc"])
            # Append category to summary or store it? 
            # Current DB schema doesn't have category column. 
            # We can hack it into 'source' or just prepend to summary for UI parsing, 
            # OR better: Add category column to DB.
            # Since we cannot easily migrate DB schema in this environment without alembic or reset,
            # Let's RESET DB again since user is okay with it (implied by previous interactions).
            # WAIT, adding a column is safer if we just recreate tables.
            # For now, let's store it in a way frontend can read.
            # Let's prepend "[Technology]" or "[Product]" to the summary? 
            # Or better: Just do it in Frontend? No, backend logic is requested.
            # Let's assume we will add a category field to DB in next step.
            # For this step, I'll return it and let the DB add handle it (if model updated).
            
            new_item = NewsItem(
                title=item_data["title"],
                url=item_data["url"],
                source=item_data["source"],
                original_desc=item_data["original_desc"],
                summary=summary, # We will update model to include category
                stars=item_data["stars"],
                upvotes=item_data["upvotes"],
                thumbnail=item_data["thumbnail"]
            )
            # Monkey patch category for now if model supports it
            new_item.category = category 
            
            db.add(new_item)
            return 1
    except Exception as e:
        logger.error(f"Error processing item {item_data.get('title')}: {e}")
        return 0

def process_news():
    """
    Fetches news, checks for duplicates, generates summaries, and saves to DB.
    Uses ThreadPoolExecutor for parallel processing.
    """
    try:
        logger.info("Starting news processing...")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            future_gh = executor.submit(fetch_github_trending)
            future_hf = executor.submit(fetch_huggingface_daily_papers)
            future_jj = executor.submit(fetch_juejin_ai_trending)
            future_rd = executor.submit(fetch_reddit_ml_hot)
            future_qbit = executor.submit(fetch_qbitai_news)
            
            # Collect results safely
            results = {}
            for future, name in [(future_gh, "gh"), (future_hf, "hf"), (future_jj, "jj"), 
                                 (future_rd, "rd"), (future_qbit, "qbit")]:
                try:
                    results[name] = future.result()
                except Exception as e:
                    logger.error(f"Error in crawler {name}: {e}")
                    results[name] = []
        
        all_items = []
        
        # Helper to add items
        def add_items(items, source_name):
            for item in items:
                all_items.append({
                    "title": item["title"],
                    "url": item["url"],
                    "source": source_name,
                    "original_desc": item.get("description", item.get("title", "")),
                    "stars": item.get("stars"),
                    "upvotes": item.get("upvotes"),
                    "thumbnail": item.get("thumbnail")
                })

        add_items(results["gh"], "GitHub Trending")
        add_items(results["hf"], "Hugging Face Daily Papers")
        add_items(results["jj"], "Juejin AI")
        add_items(results["rd"], "Reddit ML")
        add_items(results["qbit"], "QbitAI")
            
        logger.info(f"Total items fetched: {len(all_items)}")
        
        # 2. Process Items (Summary generation is slow, so parallelize it)
        # However, DB writes must be careful.
        # Strategy: 
        #   - Check DB for existing URLs (Main thread)
        #   - Filter out new items
        #   - Generate summaries for new items (Parallel)
        #   - Write new items to DB (Main thread)
        
        db: Session = SessionLocal()
        existing_urls = set(url for url, in db.query(NewsItem.url).all())
        
        new_items_data = []
        updated_count = 0
        
        for item in all_items:
            if item["url"] in existing_urls:
                # Ideally update stats here, but for batch performance we skip or do bulk update later
                # For simplicity, let's just count it
                updated_count += 1
            else:
                new_items_data.append(item)
        
        logger.info(f"New items to process: {len(new_items_data)}")
        
        # Parallel Summary Generation
        def generate_summary_wrapper(item):
            context = f"Source: {item['source']}"
            summary = llm_service.generate_summary(item["original_desc"], context, url=item["url"])
            item["summary"] = summary
            return item

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            # Map returns iterator in order
            processed_new_items = list(executor.map(generate_summary_wrapper, new_items_data))
            
        # Write to DB
        for item in processed_new_items:
            new_item = NewsItem(
                title=item["title"],
                url=item["url"],
                source=item["source"],
                original_desc=item["original_desc"],
                summary=item["summary"],
                stars=item["stars"],
                upvotes=item["upvotes"],
                thumbnail=item["thumbnail"]
            )
            db.add(new_item)
            
        db.commit()
        db.close()
        
        logger.info(f"Processing complete. New: {len(processed_new_items)}, Updated/Skipped: {updated_count}")
        return {"new": len(processed_new_items), "updated": updated_count}
        
    except Exception as e:
        logger.error(f"Error in processing pipeline: {e}")
        raise e

if __name__ == "__main__":
    from database import init_db
    init_db()
    process_news()

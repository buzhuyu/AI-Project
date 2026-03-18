import requests
from bs4 import BeautifulSoup
from loguru import logger

def fetch_github_trending():
    """
    Fetches the trending repositories from GitHub (filtered by AI topics/languages if possible, 
    but for MVP let's just grab general trending or Python trending).
    Here we grab Python trending as a proxy for AI activity, or search specific topics.
    
    Actually, a better proxy for AI might be searching for repositories with topic 'machine-learning' or 'artificial-intelligence' created recently, 
    but trending page is more about what's hot *now*.
    
    Let's try to fetch https://github.com/trending/python?since=daily which often has AI stuff.
    """
    url = "https://github.com/trending/python?since=daily"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        logger.info(f"Fetching GitHub trending from {url}")
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "lxml")
        repos = []
        
        # GitHub trending structure (subject to change by GitHub)
        # Each repo is in an <article class="Box-row">
        articles = soup.select("article.Box-row")
        
        for article in articles:
            # Title: h2 a -> href (link), text (owner/repo)
            title_tag = article.select_one("h2 a")
            if not title_tag:
                continue
                
            repo_name = title_tag.text.strip().replace("\n", "").replace(" ", "")
            repo_url = "https://github.com" + title_tag["href"]
            
            # Description: p
            desc_tag = article.select_one("p")
            description = desc_tag.text.strip() if desc_tag else "No description"
            
            # Stars: 
            # span with octicon-star -> parent text
            # Usually in the footer
            stats = article.select_one("div.f6")
            stars = "0"
            if stats:
                star_link = stats.select_one("a[href$='/stargazers']")
                if star_link:
                    stars = star_link.text.strip()
            
            repos.append({
                "title": repo_name,
                "url": repo_url,
                "description": description,
                "stars": stars,
                "source": "GitHub Trending"
            })
            
        logger.info(f"Found {len(repos)} repos")
        return repos
        
    except Exception as e:
        logger.error(f"Error fetching GitHub trending: {e}")
        return []

def fetch_huggingface_daily_papers():
    """
    Fetches the daily papers from Hugging Face Daily Papers.
    URL: https://huggingface.co/papers
    """
    url = "https://huggingface.co/papers"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        logger.info(f"Fetching Hugging Face Daily Papers from {url}")
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "lxml")
        papers = []
        
        # Each paper is usually in an article tag or div with specific classes
        # Currently (as of late 2024/early 2025), structure might be:
        # article.flex.flex-col
        # Let's try to find articles that look like papers
        
        articles = soup.select("article")
        
        for article in articles:
            # Title is usually in an h3
            title_tag = article.select_one("h3")
            if not title_tag:
                continue
            
            title = title_tag.text.strip()
            link_tag = article.select_one("a")
            paper_url = "https://huggingface.co" + link_tag["href"] if link_tag else ""
            
            # Upvotes
            upvote_tag = article.select_one("div.leading-none")
            upvotes = upvote_tag.text.strip() if upvote_tag else "0"
            
            # Thumbnail (optional)
            img_tag = article.select_one("img")
            thumbnail = img_tag["src"] if img_tag else ""

            papers.append({
                "title": title,
                "url": paper_url,
                "upvotes": upvotes,
                "thumbnail": thumbnail,
                "source": "Hugging Face Daily Papers"
            })
            
        logger.info(f"Found {len(papers)} papers")
        return papers

    except Exception as e:
        logger.error(f"Error fetching Hugging Face papers: {e}")
        return []

def fetch_juejin_ai_trending():
    """
    Fetches trending AI articles from Juejin (稀土掘金).
    API: https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed
    We can filter by category '6809637773935378440' (Artificial Intelligence) or tags.
    For simplicity, let's use the web search or specific tag page scraping if API is complex.
    
    Actually, Juejin has a simple API for categories.
    Category ID for AI: 6809637773935378440
    """
    url = "https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Content-Type": "application/json"
    }
    payload = {
        "cate_id": "6809637773935378440", # AI category
        "id_type": 2,
        "limit": 20,
        "sort_type": 200 # Hot/Trending
    }
    
    try:
        logger.info(f"Fetching Juejin AI Trending from API")
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        articles = []
        
        if "data" in data and data["data"]:
            for item in data["data"]:
                if "article_info" not in item:
                    continue
                    
                info = item["article_info"]
                title = info.get("title", "")
                article_id = info.get("article_id", "")
                desc = info.get("brief_content", "")
                cover = info.get("cover_image", "")
                
                # Juejin stats
                digg_count = info.get("digg_count", 0)
                
                if not title or not article_id:
                    continue
                    
                articles.append({
                    "title": title,
                    "url": f"https://juejin.cn/post/{article_id}",
                    "description": desc,
                    "upvotes": str(digg_count),
                    "thumbnail": cover,
                    "source": "Juejin AI"
                })
        
        logger.info(f"Found {len(articles)} Juejin articles")
        return articles

    except Exception as e:
        logger.error(f"Error fetching Juejin articles: {e}")
        return []

def fetch_reddit_ml_hot():
    """
    Fetches hot posts from Reddit r/MachineLearning or r/ArtificialInteligence.
    Since Reddit API requires auth, we can try using the JSON feed: https://www.reddit.com/r/MachineLearning/hot.json
    Note: Reddit aggressively rate limits user-agent scripts.
    """
    url = "https://www.reddit.com/r/MachineLearning/hot.json?limit=10"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        logger.info(f"Fetching Reddit ML from {url}")
        response = requests.get(url, headers=headers, timeout=10)
        # response.raise_for_status() # Reddit might return 429
        
        if response.status_code != 200:
            logger.warning(f"Reddit fetch failed with status {response.status_code}")
            return []
            
        data = response.json()
        articles = []
        
        if "data" in data and "children" in data["data"]:
            for item in data["data"]["children"]:
                post = item["data"]
                if post.get("stickied"): continue # Skip pinned posts
                
                title = post.get("title", "")
                permalink = post.get("permalink", "")
                url = f"https://www.reddit.com{permalink}"
                selftext = post.get("selftext", "")
                ups = post.get("ups", 0)
                thumbnail = post.get("thumbnail", "")
                if thumbnail in ["self", "default", "nsfw", ""]: thumbnail = None
                
                articles.append({
                    "title": title,
                    "url": url,
                    "description": selftext[:200] + "..." if selftext else title,
                    "upvotes": str(ups),
                    "thumbnail": thumbnail,
                    "source": "Reddit ML"
                })
                
        logger.info(f"Found {len(articles)} Reddit articles")
        return articles
    except Exception as e:
        logger.error(f"Error fetching Reddit: {e}")
        return []

def fetch_qbitai_news():
    """
    Fetches AI news from QbitAI (量子位).
    URL: https://www.qbitai.com/
    """
    url = "https://www.qbitai.com/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        logger.info(f"Fetching QbitAI from {url}")
        response = requests.get(url, headers=headers, timeout=10)
        response.encoding = 'utf-8' # Ensure correct encoding
        
        soup = BeautifulSoup(response.text, "lxml")
        articles = []
        
        # QbitAI structure: .text_box h4 a
        titles = soup.select(".text_box h4 a")
        
        for link in titles:
            title = link.text.strip()
            href = link.get("href")
            
            if not title or not href: continue
            
            # Get description if possible (p.intro)
            desc_tag = link.find_parent("div", class_="text_box").find("p", class_="intro") if link.find_parent("div", class_="text_box") else None
            desc = desc_tag.text.strip() if desc_tag else title
            
            # Get thumbnail (img in sibling .picture)
            # Structure: div.picture > a > img
            # Need to go up to .item_inner then down to .picture
            # This is complex, let's skip thumb or try simple search
            thumbnail = None
            
            articles.append({
                "title": title,
                "url": href,
                "description": desc,
                "upvotes": None,
                "thumbnail": thumbnail,
                "source": "QbitAI"
            })
            
        logger.info(f"Found {len(articles)} QbitAI articles")
        return articles
    except Exception as e:
        logger.error(f"Error fetching QbitAI: {e}")
        return []

def fetch_baai_updates():
    """
    Fetches updates from BAAI (Beijing Academy of Artificial Intelligence).
    Since API/HTML is hard to scrape, we will use a fallback or try scraping 
    Machine Heart (机器之心) via RSS if available, or just return empty for now 
    until we find a stable BAAI source.
    Actually, let's try scraping 'OSChina AI' or similar as a placeholder for 'Tech Community'.
    Let's use OSChina for now: https://www.oschina.net/news/project
    """
    # For now, return empty to avoid errors
    return []

if __name__ == "__main__":
    # Test run
    # ... (Keep existing tests)
    print("\n--- Reddit ML ---")
    rd_data = fetch_reddit_ml_hot()
    for item in rd_data[:2]: print(item)

    print("\n--- QbitAI ---")
    qbit_data = fetch_qbitai_news()
    for item in qbit_data[:2]: print(item)

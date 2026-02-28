import requests
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

def debug_segmentfault_rss():
    url = "https://segmentfault.com/feeds/tag/artificial-intelligence"
    headers = {"User-Agent": "Mozilla/5.0"}
    print(f"Fetching SegmentFault RSS: {url}")
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            # Parse XML
            root = ET.fromstring(resp.content)
            # Namespace might be involved
            channel = root.find("channel")
            if channel:
                items = channel.findall("item")
                print(f"Found {len(items)} items")
                for item in items[:3]:
                    title = item.find("title").text
                    link = item.find("link").text
                    print(f" - {title} -> {link}")
    except Exception as e:
        print(f"SF RSS Error: {e}")

def debug_qbitai_html():
    url = "https://www.qbitai.com/"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
    print(f"\nFetching QbitAI: {url}")
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'lxml')
            # Inspect structure. Usually .item .title a
            titles = soup.select(".text_box h4 a") # Guessing based on common layout
            if not titles:
                titles = soup.select("a.title")
            
            print(f"Found {len(titles)} titles")
            for t in titles[:3]:
                print(f" - {t.text.strip()} -> {t.get('href')}")
    except Exception as e:
        print(f"QbitAI Error: {e}")

if __name__ == "__main__":
    debug_segmentfault_rss()
    debug_qbitai_html()

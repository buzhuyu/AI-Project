import os
import openai
from loguru import logger
from dotenv import load_dotenv
from newspaper import Article, Config

load_dotenv()

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        
        if self.api_key:
            self.client = openai.OpenAI(api_key=self.api_key, base_url=self.base_url)
        else:
            self.client = None
            logger.warning("OPENAI_API_KEY not found. LLM service will be disabled/mocked.")

    def generate_summary(self, text: str, context: str = "", url: str = None) -> str:
        """
        Generates a Chinese summary for the given text.
        If no API key is present, uses local NLP (newspaper3k) to extract summary from URL or text.
        """
        if not self.client:
            return self.generate_local_summary(url, text)
            
        try:
            prompt = f"""
            Please summarize the following content into a concise Chinese summary (around 100-150 words). 
            The content is about AI/Technology.
            
            Context: {context}
            Content: {text}
            
            Summary in Chinese:
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant that summarizes tech news into Chinese."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error calling LLM: {e}")
            return f"（生成摘要失败: {str(e)}）"

    def generate_local_summary(self, url: str, text: str) -> str:
        """
        Uses newspaper3k to extract summary locally without LLM.
        """
        try:
            if not url:
                # Fallback to simple truncation if no URL provided
                return text[:150] + "..." if len(text) > 150 else text

            logger.info(f"Generating local summary for: {url}")
            
            # Configure newspaper
            config = Config()
            config.browser_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            config.request_timeout = 10
            
            article = Article(url, config=config, language='zh') # Default to zh, auto-detects
            article.download()
            article.parse()
            article.nlp()
            
            summary = article.summary
            
            if not summary:
                # Fallback if NLP fails to extract summary
                if article.text:
                    summary = article.text[:200] + "..."
                else:
                    return text[:150] + "..."
            
            # Ensure it's not too long
            if len(summary) > 300:
                summary = summary[:300] + "..."
                
            return f"[自动提取] {summary}"
            
        except Exception as e:
            logger.warning(f"Local summary generation failed for {url}: {e}")
            return text[:150] + "..."

llm_service = LLMService()

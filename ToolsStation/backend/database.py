from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

Base = declarative_base()

class NewsItem(Base):
    __tablename__ = "news_items"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    url = Column(String, unique=True, index=True)
    source = Column(String)  # "GitHub Trending", "Hugging Face Daily Papers"
    original_desc = Column(Text)
    summary = Column(Text, nullable=True) # AI generated summary
    category = Column(String, nullable=True, default="Other") # New Field
    stars = Column(String, nullable=True)
    upvotes = Column(String, nullable=True)
    thumbnail = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
# SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./news.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

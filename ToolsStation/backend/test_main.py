import pytest
from fastapi.testclient import TestClient
from main import app
from database import init_db, SessionLocal, NewsItem

client = TestClient(app)

# Initialize DB for tests (in-memory or file-based, here we use the same file for simplicity 
# but in real world we should use a test.db)
init_db()

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to AI Daily Feed API"}

def test_trigger_update():
    """
    Test triggering the update process. 
    Note: The actual process runs in background, so we just check if the endpoint returns success.
    To fully test the side effects, we might need to mock the fetch functions or check DB after a wait.
    """
    response = client.post("/api/v1/trigger-update")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_get_news():
    """
    Test retrieving news.
    """
    response = client.get("/api/v1/news")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert isinstance(data["data"], list)

def test_llm_mock_summary():
    """
    Test if the LLM service returns a mock summary when no API key is present.
    """
    from llm_service import llm_service
    # Ensure no client is set (or force it to None if you want to be sure)
    # llm_service.client = None 
    
    summary = llm_service.generate_summary("This is a test article about AI.")
    assert "[测试模式]" in summary
    assert "This is a test article" in summary

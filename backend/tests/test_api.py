import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"

def test_api_dashboard():
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert "monthly_trends" in data
    assert "regional_breakdown" in data

def test_api_schema():
    response = client.get("/api/schema")
    assert response.status_code == 200
    data = response.json()
    assert "tables" in data
    assert "relationships" in data

def test_api_chat():
    payload = {"question": "Show me monthly revenue"}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "sql" in data
    assert "rows" in data

def test_api_security_check():
    payload = {"sql": "SELECT * FROM orders"}
    response = client.post("/api/security-check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True

def test_api_security_check_malicious():
    payload = {"sql": "DROP TABLE customers"}
    response = client.post("/api/security-check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is False

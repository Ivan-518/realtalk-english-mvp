from fastapi.testclient import TestClient

from server.main import app


def test_static_routes_are_served_from_web():
    client = TestClient(app)

    assert client.get("/").status_code == 200
    assert "RealTalk English" in client.get("/").text
    assert client.get("/styles.css").status_code == 200
    assert client.get("/app.js").status_code == 200


def test_health_endpoint():
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_chat_endpoint_falls_back_without_api_key(monkeypatch):
    monkeypatch.setattr("server.main.get_openai_api_key", lambda: "")
    client = TestClient(app)

    response = client.post(
        "/api/chat",
        json={
            "sceneId": "restaurant",
            "sceneTitle": "餐厅点餐",
            "role": "Waiter",
            "goal": "练习点餐",
            "turn": 0,
            "maxTurns": 5,
            "messages": [
                {"speaker": "Waiter", "text": "Hi, welcome in.", "type": "ai"},
                {"speaker": "You", "text": "I want eat beef", "type": "user"},
            ],
            "userReply": "I want eat beef",
        },
    )

    data = response.json()
    assert response.status_code == 200
    assert data["source"] == "fallback"
    assert "politeness" in data["errorTags"]


def test_scenario_endpoint_falls_back_without_api_key(monkeypatch):
    monkeypatch.setattr("server.main.get_openai_api_key", lambda: "")
    client = TestClient(app)

    response = client.post(
        "/api/scenario",
        json={
            "sceneId": "restaurant",
            "sceneTitle": "餐厅点餐",
            "role": "Waiter",
            "level": "beginner",
            "recentScenarioTitles": [],
        },
    )

    data = response.json()
    assert response.status_code == 200
    assert data["source"] == "fallback"
    assert data["opener"]
    assert len(data["constraints"]) >= 2

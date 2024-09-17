from fastapi.testclient import TestClient
from main import app  # FastAPIアプリをインポート

client = TestClient(app)


def test_read_root():
    response = client.get("/api_test")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to nullpoga server!"}

# def test_play_turn():
#     response = client.post("/play", json={"player_action": "move"})
#     assert response.status_code == 200
#     assert response.json()["result"] == expected_result

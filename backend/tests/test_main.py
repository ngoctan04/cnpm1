

def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["code"] == 200

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["data"]["api"] == "healthy"

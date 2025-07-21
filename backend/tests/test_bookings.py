def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp["code"] == 200
    assert json_resp["data"]["api"] == "healthy"

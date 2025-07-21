def test_login_fail(client):
    response = client.post("/api/v1/users/login", json={
        "username": "string",
        "password": "string"
    })
    assert response.status_code == 401

# Nếu bạn đã có user admin/admin123, test thành công luôn:
def test_login_success(client):
    response = client.post("/api/v1/users/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

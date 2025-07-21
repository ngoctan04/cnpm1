import uuid

def test_register_login_get_update_user(client):
    unique_suffix = str(uuid.uuid4())[:8]
    register_data = {
        "username": f"testuser_{unique_suffix}",
        "email": f"testuser_{unique_suffix}@example.com",
        "password": "Test1234",
        "first_name": "Test",
        "last_name": "User",
        "phone": "0123456789"
    }
    reg_resp = client.post("/api/v1/users/register", json=register_data)
    assert reg_resp.status_code == 201

    login_data = {"username": register_data["username"], "password": "Test1234"}
    login_resp = client.post("/api/v1/users/login", json=login_data)
    assert login_resp.status_code == 200

    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    profile_resp = client.get("/api/v1/users/me", headers=headers)
    assert profile_resp.status_code == 200

    user_id = profile_resp.json()["id"]  # ✅ lấy user_id để PUT

    update_data = {
        "first_name": "Updated",
        "last_name": "UserUpdated",
        "phone": "0987654321",
        "email": f"{register_data['email']}"
    }

    update_resp = client.put(f"/api/v1/users/{user_id}", json=update_data, headers=headers)
    print(update_resp.json())
    assert update_resp.status_code == 200

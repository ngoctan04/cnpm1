import uuid

def test_create_and_update_room(client):
    login_data = {"username": "admin", "password": "admin123"}
    login_resp = client.post("/api/v1/users/login", json=login_data)
    assert login_resp.status_code == 200

    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    unique_suffix = str(uuid.uuid4())[:8]
    room_number = f"R100_{unique_suffix}"

    data = {
        "hotel_id": 1,
        "room_number": room_number,
        "room_type": "single",
        "capacity": 1,
        "price_per_night": 500000,
        "description": "Test room",
        "amenities": "Wifi, AC",
        "is_available": True,
        "area_sqm": 20,
        "bed_type": "Queen"
    }

    create_resp = client.post("/api/v1/rooms/", json=data, headers=headers)
    print(create_resp.json())
    assert create_resp.status_code == 201

    room_id = create_resp.json()["data"]["id"]  # ✅ FIX KeyError

    update_data = {"price_per_night": 600000}
    update_resp = client.put(f"/api/v1/rooms/{room_id}", json=update_data, headers=headers)
    assert update_resp.status_code == 200

    delete_resp = client.delete(f"/api/v1/rooms/{room_id}", headers=headers)
    assert delete_resp.status_code == 200

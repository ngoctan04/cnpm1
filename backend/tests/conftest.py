import os

# Thiết lập PYTHONPATH
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Không import gdrive khi chạy CI
if os.getenv("CI", "").lower() != "true":
    import utils.gdrive

import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

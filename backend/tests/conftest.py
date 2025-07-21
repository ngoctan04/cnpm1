import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

if 'pytest' in sys.modules:
    # Force load .env.test for testing
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=".env.test", override=True)

    # Mock Google Drive to disable during tests
    import utils.gdrive
    utils.gdrive.get_service = lambda: None
    utils.gdrive.get_or_create_root = lambda name: "mock_folder_id"
    utils.gdrive.upload_bytes = lambda data, filename, parent_id: ("mock_file_id", "mock_public_link")
    utils.gdrive.list_files = lambda parent_id: []

import pytest
from main import app
from fastapi.testclient import TestClient

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

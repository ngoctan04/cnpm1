"""Google Drive helper utilities.

Requires environment variable GOOGLE_DRIVE_CREDENTIALS pointing to a
Service-Account JSON key. Optional environment variables:
  * GDRIVE_PARENT_HOTELS – ID of parent folder chứa các sub-folder của từng khách sạn.
  * GDRIVE_PARENT_ROOMS  – ID of parent folder chứa các sub-folder của từng phòng.

This module cung cấp:
  - get_service(): googleapiclient.discovery.Resource đã được cache.
  - ensure_folder(name, parent_id) -> folder_id
  - upload_bytes(data, filename, parent_id) -> (file_id, public_link)
  - list_files(parent_id) -> List[dict] (name,id,size,link)
"""

from __future__ import annotations

import io
import mimetypes
import os
from functools import lru_cache
from typing import List, Tuple

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

_SCOPES = ["https://www.googleapis.com/auth/drive"]
_CREDS_PATH = os.getenv("GOOGLE_DRIVE_CREDENTIALS")
if not _CREDS_PATH or not os.path.exists(_CREDS_PATH):
    raise RuntimeError("GOOGLE_DRIVE_CREDENTIALS file not found: set env var and mount json key")


@lru_cache()
def get_service():
    creds = service_account.Credentials.from_service_account_file(_CREDS_PATH, scopes=_SCOPES)
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def ensure_folder(name: str, parent_id: str) -> str:
    """Return folder id, create if not exists under parent_id."""
    service = get_service()
    query = (
        f"mimeType='application/vnd.google-apps.folder' and trashed=false "
        f"and name='{name}' and '{parent_id}' in parents"
    )
    resp = service.files().list(q=query, fields="files(id)").execute()
    if resp.get("files"):
        return resp["files"][0]["id"]
    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    new_folder = service.files().create(body=metadata, fields="id").execute()
    return new_folder["id"]


def _share_public(file_id: str):
    service = get_service()
    try:
        service.permissions().create(
            fileId=file_id,
            supportsAllDrives=True,
            body={"role": "reader", "type": "anyone"},
            fields="id",
        ).execute()
    except Exception:
        pass  # Already shared


def _make_public_link(file_id: str) -> str:
    """Return direct link that an <img> tag can load (no cookie required)."""
    # Use Google Drive CDN link (no cookies) to avoid tracker blocking
    return f"https://lh3.googleusercontent.com/d/{file_id}=w1200"


def upload_bytes(data: bytes, filename: str, parent_id: str) -> Tuple[str, str]:
    """Upload bytes to Drive, return (file_id, public_link)."""
    service = get_service()
    mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    media = MediaIoBaseUpload(io.BytesIO(data), mimetype=mime_type, resumable=False)
    meta = {"name": filename, "parents": [parent_id]}
    file = service.files().create(body=meta, media_body=media, fields="id").execute()
    file_id = file["id"]
    _share_public(file_id)
    return file_id, _make_public_link(file_id)


def list_files(parent_id: str) -> List[dict]:
    service = get_service()
    query = f"trashed=false and '{parent_id}' in parents"
    resp = service.files().list(q=query, fields="files(id,name,size,modifiedTime)").execute()
    files = resp.get("files", [])
    for f in files:
        f["link"] = _make_public_link(f["id"])
    # sort by modifiedTime desc
    files.sort(key=lambda x: x.get("modifiedTime", ""), reverse=True)
    return files


# -------- Convenience helpers for root folders ---------

def get_or_create_root(folder_name: str) -> str:
    """Return ID of a root-level folder with given name. Create if absent."""
    service = get_service()
    query = (
        "mimeType='application/vnd.google-apps.folder' and trashed=false "
        f"and name='{folder_name}' and 'root' in parents"
    )
    resp = service.files().list(q=query, fields="files(id)").execute()
    if resp.get("files"):
        return resp["files"][0]["id"]

    metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": ["root"],
    }
    new_f = service.files().create(body=metadata, fields="id").execute()
    return new_f["id"] 
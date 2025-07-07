from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
import os, uuid, datetime

from database import get_db
from models import User
from schemas import HotelCreate, HotelUpdate, HotelResponse, RoomResponse, HotelListResponse, HotelDetailResponse, RoomListResponse
from auth import get_current_user
from services.hotel_service import HotelService
from utils.gdrive import ensure_folder, upload_bytes, get_or_create_root

router = APIRouter()

MEDIA_ROOT = os.getenv("MEDIA_ROOT", "media")  # still keep for legacy but not used for hotel upload

# Determine parent folder ID for hotels
GDRIVE_PARENT_HOTELS = os.getenv("GDRIVE_PARENT_HOTELS") or get_or_create_root("Hotels")

# --- Upload helpers ---
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# Stream save to disk to tránh ngốn RAM & phát hiện file rỗng
async def _save_upload_file(upload_file: UploadFile, dest_path: Path, chunk_size: int = 1024 * 1024) -> int:
    """Ghi file upload vào dest_path, trả về kích thước (bytes). Nếu 0 byte -> raise lỗi."""
    with dest_path.open("wb") as buffer:
        while True:
            chunk = await upload_file.read(chunk_size)
            if not chunk:
                break
            buffer.write(chunk)

    size = dest_path.stat().st_size if dest_path.exists() else 0
    if size == 0:
        # Xóa file rỗng nếu có
        try:
            dest_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp tin rỗng hoặc lỗi trong quá trình upload"
        )
    return size

@router.post("/", response_model=HotelDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_hotel(
    hotel_data: HotelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Tạo khách sạn mới (chỉ admin)
    """
    service = HotelService(db)
    hotel = service.create_hotel(hotel_data, current_user)
    return {"code": 201, "message": "Tạo khách sạn thành công", "data": HotelResponse.model_validate(hotel)}

@router.get("/", response_model=HotelListResponse)
async def get_hotels(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    city: Optional[str] = Query(None, description="Lọc theo thành phố"),
    country: Optional[str] = Query(None, description="Lọc theo quốc gia"),
    min_rating: Optional[int] = Query(None, ge=1, le=5, description="Đánh giá tối thiểu"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc mô tả"),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách khách sạn với bộ lọc
    """
    service = HotelService(db)
    hotels = service.get_hotels(
        skip=skip,
        limit=limit,
        city=city,
        country=country,
        min_rating=min_rating,
        search=search
    )
    return {"code": 200, "message": "Thành công", "data": [HotelResponse.model_validate(hotel) for hotel in hotels]}

@router.get("/{hotel_id}", response_model=HotelDetailResponse)
async def get_hotel(
    hotel_id: int,
    db: Session = Depends(get_db)
):
    """
    Lấy thông tin chi tiết khách sạn
    """
    service = HotelService(db)
    hotel = service.get_hotel_by_id(hotel_id)
    
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy khách sạn"
        )
    
    return {"code": 200, "message": "Thành công", "data": HotelResponse.model_validate(hotel)}

@router.put("/{hotel_id}", response_model=HotelDetailResponse)
async def update_hotel(
    hotel_id: int,
    hotel_data: HotelUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cập nhật thông tin khách sạn (chỉ admin)
    """
    service = HotelService(db)
    hotel = service.update_hotel(hotel_id, hotel_data, current_user)
    return {"code": 200, "message": "Cập nhật khách sạn thành công", "data": HotelResponse.model_validate(hotel)}

@router.delete("/{hotel_id}")
async def delete_hotel(
    hotel_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Xóa khách sạn (chỉ admin)
    """
    service = HotelService(db)
    success = service.delete_hotel(hotel_id, current_user)
    
    if success:
        return {"code": 200, "message": "Xóa khách sạn thành công"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể xóa khách sạn"
        )

@router.get("/{hotel_id}/rooms", response_model=RoomListResponse)
async def get_hotel_rooms(
    hotel_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách phòng của khách sạn
    """
    service = HotelService(db)
    rooms = service.get_hotel_rooms(hotel_id, skip=skip, limit=limit)
    return {"code": 200, "message": "Thành công", "data": [RoomResponse.model_validate(room) for room in rooms]}

@router.get("/{hotel_id}/stats")
async def get_hotel_stats(
    hotel_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy thống kê khách sạn (chỉ admin)
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền xem thống kê"
        )
    
    service = HotelService(db)
    stats = service.get_hotel_stats(hotel_id)
    return {"code": 200, "message": "Thành công", "data": stats}

@router.get("/stats/overview")
async def get_hotels_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy tổng quan thống kê tất cả khách sạn (chỉ admin)
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền xem thống kê"
        )
    
    service = HotelService(db)
    stats = service.get_hotel_stats()
    return {"code": 200, "message": "Thành công", "data": stats}

@router.post("/search")
async def search_hotels(
    search_params: dict,
    db: Session = Depends(get_db)
):
    """
    Tìm kiếm khách sạn nâng cao
    """
    service = HotelService(db)
    hotels = service.search_hotels(search_params)
    return {"code": 200, "message": "Thành công", "data": [HotelResponse.model_validate(hotel) for hotel in hotels]}

# ------------------  Upload images for hotel ------------------
@router.post("/{hotel_id}/upload-images", status_code=status.HTTP_201_CREATED)
async def upload_hotel_images(
    hotel_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
):
    """Tải nhiều ảnh cho khách sạn (chỉ admin)"""
    if current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ admin mới có quyền upload ảnh")

    print(f"🔄 Uploading images for hotel {hotel_id}")
    print(f"📁 Files received: {len(files)}")
    
    saved_urls = []
    ts = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")

    # Get / create subfolder in Drive for this hotel
    drive_folder = ensure_folder(str(hotel_id), GDRIVE_PARENT_HOTELS)

    for i, file in enumerate(files):
        ext = Path(file.filename).suffix or ""
        filename = f"{ts}_{uuid.uuid4().hex}{ext}"
        content = await file.read()
        if len(content) == 0:
            continue

        try:
            file_id, link = upload_bytes(content, filename, drive_folder)
            print(f"✅ Uploaded to Drive id={file_id}")
            saved_urls.append(link)
        except Exception as e:
            print(f"❌ Drive upload error: {e}")
            raise HTTPException(status_code=500, detail="Lỗi khi upload Google Drive")

    print(f"🎉 Upload completed: {len(saved_urls)} files")
    return {"code": 201, "message": "Upload ảnh thành công", "data": saved_urls} 
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from pathlib import Path
import os, uuid, datetime

from database import get_db
from models import User
from schemas import RoomCreate, RoomUpdate, RoomResponse, RoomListResponse, RoomDetailResponse
from auth import get_current_user
from services.room_service import RoomService
from utils.gdrive import ensure_folder, upload_bytes, get_or_create_root

router = APIRouter()

MEDIA_ROOT = os.getenv("MEDIA_ROOT", "media")

# --- Upload helpers ---
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

async def _save_upload_file(upload_file: UploadFile, dest_path: Path, chunk_size: int = 1024 * 1024) -> int:
    """Stream file -> disk, trả về kích thước bytes, lỗi nếu 0 byte."""
    with dest_path.open("wb") as buffer:
        while True:
            chunk = await upload_file.read(chunk_size)
            if not chunk:
                break
            buffer.write(chunk)

    size = dest_path.stat().st_size if dest_path.exists() else 0
    if size == 0:
        try:
            dest_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tệp tin rỗng hoặc lỗi upload")
    return size

@router.post("/", response_model=RoomDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Tạo phòng mới (chỉ admin)
    """
    service = RoomService(db)
    room = service.create_room(room_data, current_user)
    return {"code": 201, "message": "Tạo phòng thành công", "data": RoomResponse.model_validate(room)}

@router.get("/")
async def get_rooms(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    hotel_id: Optional[str] = Query(None, description="Lọc theo khách sạn"),
    room_type: Optional[str] = Query(None, description="Lọc theo loại phòng"),
    min_price: Optional[str] = Query(None, description="Giá tối thiểu"),
    max_price: Optional[str] = Query(None, description="Giá tối đa"),
    capacity: Optional[str] = Query(None, description="Sức chứa tối thiểu"),
    guests: Optional[str] = Query(None, description="Số lượng khách"),
    available_only: bool = Query(True, description="Chỉ phòng có sẵn"),
    check_in: Optional[str] = Query(None, description="Ngày check-in"),
    check_out: Optional[str] = Query(None, description="Ngày check-out"),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách phòng với bộ lọc và kiểm tra availability
    """
    # Convert string parameters to appropriate types
    hotel_id_int = int(hotel_id) if hotel_id and hotel_id.strip() else None
    min_price_float = float(min_price) if min_price and min_price.strip() else None
    max_price_float = float(max_price) if max_price and max_price.strip() else None
    capacity_int = int(capacity) if capacity and capacity.strip() else None
    guests_int = int(guests) if guests and guests.strip() else None
    
    # Convert date strings to date objects
    check_in_date_obj = None
    check_out_date_obj = None
    if check_in and check_in.strip():
        try:
            check_in_date_obj = date.fromisoformat(check_in)
        except ValueError:
            pass
    if check_out and check_out.strip():
        try:
            check_out_date_obj = date.fromisoformat(check_out)
        except ValueError:
            pass
    
    # Use guests as capacity if provided and capacity is not provided
    if guests_int and not capacity_int:
        capacity_int = guests_int
    
    service = RoomService(db)
    rooms = service.get_rooms(
        skip=skip,
        limit=limit,
        hotel_id=hotel_id_int,
        room_type=room_type,
        min_price=min_price_float,
        max_price=max_price_float,
        capacity=capacity_int,
        available_only=available_only,
        check_in_date=check_in_date_obj,
        check_out_date=check_out_date_obj
    )
    return {"code": 200, "message": "Thành công", "data": [RoomResponse.model_validate(room) for room in rooms]}

@router.get("/{room_id}", response_model=RoomDetailResponse)
async def get_room(
    room_id: int,
    db: Session = Depends(get_db)
):
    """
    Lấy thông tin chi tiết phòng
    """
    service = RoomService(db)
    room = service.get_room_by_id(room_id)
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phòng"
        )
    
    return {"code": 200, "message": "Thành công", "data": RoomResponse.model_validate(room)}

@router.put("/{room_id}", response_model=RoomDetailResponse)
async def update_room(
    room_id: int,
    room_data: RoomUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cập nhật thông tin phòng (chỉ admin)
    """
    service = RoomService(db)
    room = service.update_room(room_id, room_data, current_user)
    return {"code": 200, "message": "Cập nhật phòng thành công", "data": RoomResponse.model_validate(room)}

@router.delete("/{room_id}")
async def delete_room(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Xóa phòng (chỉ admin)
    """
    service = RoomService(db)
    success = service.delete_room(room_id, current_user)
    
    if success:
        return {"code": 200, "message": "Xóa phòng thành công"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể xóa phòng"
        )

@router.get("/{room_id}/availability")
async def check_room_availability(
    room_id: int,
    check_in_date: date = Query(..., description="Ngày check-in"),
    check_out_date: date = Query(..., description="Ngày check-out"),
    db: Session = Depends(get_db)
):
    """
    Kiểm tra phòng có sẵn trong thời gian cụ thể
    """
    service = RoomService(db)
    is_available = service.check_room_availability(room_id, check_in_date, check_out_date)
    
    return {
        "code": 200,
        "message": "Thành công",
        "data": {
            "room_id": room_id,
            "check_in_date": check_in_date,
            "check_out_date": check_out_date,
            "is_available": is_available
        }
    }

@router.post("/{room_id}/maintenance")
async def set_room_maintenance(
    room_id: int,
    is_maintenance: bool = Query(..., description="Trạng thái bảo trì"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Đặt phòng vào trạng thái bảo trì (chỉ admin)
    """
    service = RoomService(db)
    room = service.set_room_maintenance(room_id, is_maintenance, current_user)
    
    status_msg = "bảo trì" if is_maintenance else "sẵn sàng"
    return {
        "code": 200,
        "message": f"Đặt phòng vào trạng thái {status_msg} thành công",
        "data": RoomResponse.model_validate(room)
    }

@router.post("/search")
async def search_rooms(
    search_params: dict,
    db: Session = Depends(get_db)
):
    """
    Tìm kiếm phòng nâng cao
    """
    service = RoomService(db)
    rooms = service.search_rooms(search_params)
    return {"code": 200, "message": "Thành công", "data": [RoomResponse.model_validate(room) for room in rooms]}

@router.get("/stats/overview")
async def get_rooms_stats(
    hotel_id: Optional[int] = Query(None, description="Lọc theo khách sạn"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy thống kê phòng (chỉ admin)
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền xem thống kê"
        )
    
    service = RoomService(db)
    stats = service.get_room_stats(hotel_id)
    return {"code": 200, "message": "Thành công", "data": stats}

# ------------------ Upload images for room ------------------
@router.post("/{room_id}/upload-images", status_code=status.HTTP_201_CREATED)
async def upload_room_images(
    room_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tải nhiều ảnh cho phòng (chỉ admin)"""
    if current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ admin mới có quyền upload ảnh")

    # Check room exists
    room_service = RoomService(db)
    room = room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng")

    saved_urls = []
    ts = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")

    GDRIVE_PARENT_ROOMS = os.getenv("GDRIVE_PARENT_ROOMS") or get_or_create_root("Rooms")

    drive_folder = ensure_folder(str(room_id), GDRIVE_PARENT_ROOMS)

    for file in files:
        ext = Path(file.filename).suffix or ""
        filename = f"{ts}_{uuid.uuid4().hex}{ext}"
        content = await file.read()
        if len(content) == 0:
            continue

        try:
            _, link = upload_bytes(content, filename, drive_folder)
            saved_urls.append(link)
        except Exception as e:
            raise HTTPException(status_code=500, detail="Lỗi khi upload Google Drive")

    return {"code": 201, "message": "Upload ảnh thành công", "data": saved_urls} 
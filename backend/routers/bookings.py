from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, timedelta, date
import uuid
import string
import random

from database import get_db
from models import Booking, User, Room, BookingStatus
from schemas import BookingCreate, BookingResponse, BookingUpdate, BookingSearchFilters, PaymentResponse
from auth import get_current_active_user, get_current_admin_user, get_current_user
from services.booking_service import BookingService

router = APIRouter()


def generate_booking_reference() -> str:
    """Generate a unique booking reference"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


def calculate_total_nights(check_in: datetime, check_out: datetime) -> int:
    """Calculate total nights between check-in and check-out dates"""
    return (check_out.date() - check_in.date()).days


@router.get("/")
async def get_bookings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    user_id: Optional[int] = Query(None, description="Lọc theo người dùng"),
    room_id: Optional[int] = Query(None, description="Lọc theo phòng"),
    hotel_id: Optional[int] = Query(None, description="Lọc theo khách sạn"),
    status: Optional[BookingStatus] = Query(None, description="Lọc theo trạng thái"),
    start_date: Optional[date] = Query(None, description="Từ ngày"),
    end_date: Optional[date] = Query(None, description="Đến ngày"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách booking (admin xem tất cả, user chỉ xem của mình)
    """
    service = BookingService(db)
    
    # If not admin, force user_id to current user
    if current_user.role.value != "admin":
        user_id = current_user.id
    
    bookings = service.get_bookings(
        skip=skip,
        limit=limit,
        user_id=user_id,
        room_id=room_id,
        hotel_id=hotel_id,
        status=status,
        start_date=start_date,
        end_date=end_date
    )
    return {"code": 200, "message": "Thành công", "data": [BookingResponse.model_validate(booking) for booking in bookings]}


@router.get("/my-bookings/")
async def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách booking của người dùng hiện tại
    """
    service = BookingService(db)
    bookings = service.get_user_bookings(current_user.id, current_user)
    return {"code": 200, "message": "Thành công", "data": [BookingResponse.model_validate(booking) for booking in bookings]}


@router.get("/user/{user_id}")
async def get_user_bookings(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách booking của người dùng cụ thể
    """
    service = BookingService(db)
    bookings = service.get_user_bookings(user_id, current_user)
    return {"code": 200, "message": "Thành công", "data": [BookingResponse.model_validate(booking) for booking in bookings]}


@router.get("/{booking_id}/", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy thông tin chi tiết booking
    """
    service = BookingService(db)
    booking = service.get_booking_by_id(booking_id)
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy booking"
        )
    
    # Check permissions
    if current_user.role.value != "admin" and current_user.id != booking.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền xem booking này"
        )
    
    return {"code": 200, "message": "Thành công", "data": BookingResponse.model_validate(booking)}


@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    booking_data: BookingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cập nhật thông tin booking
    """
    service = BookingService(db)
    booking = service.update_booking(booking_id, booking_data, current_user)
    return {"code": 200, "message": "Cập nhật booking thành công", "data": BookingResponse.model_validate(booking)}


@router.post("/{booking_id}/cancel/")
async def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Hủy booking
    """
    service = BookingService(db)
    booking = service.cancel_booking(booking_id, current_user)
    return {"code": 200, "message": "Hủy booking thành công", "data": BookingResponse.model_validate(booking)}


@router.post("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Xác nhận booking (chỉ admin)
    """
    service = BookingService(db)
    booking = service.confirm_booking(booking_id, current_user)
    return {"code": 200, "message": "Xác nhận booking thành công", "data": BookingResponse.model_validate(booking)}


@router.delete("/{booking_id}")
async def delete_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Xóa booking (chỉ admin)
    """
    service = BookingService(db)
    success = service.delete_booking(booking_id, current_user)
    
    if success:
        return {"code": 200, "message": "Xóa booking thành công"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể xóa booking"
        )


@router.get("/stats/overview")
async def get_booking_stats(
    hotel_id: Optional[int] = Query(None, description="Lọc theo khách sạn"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy thống kê booking (chỉ admin)
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền xem thống kê"
        )
    
    service = BookingService(db)
    stats = service.get_booking_stats(hotel_id)
    return {"code": 200, "message": "Thành công", "data": stats}


@router.get("/upcoming/list")
async def get_upcoming_bookings(
    days_ahead: int = Query(7, ge=1, le=30, description="Số ngày tới"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách booking sắp tới (chỉ admin)
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền xem danh sách booking sắp tới"
        )
    
    service = BookingService(db)
    bookings = service.get_upcoming_bookings(days_ahead)
    return {"code": 200, "message": "Thành công", "data": [BookingResponse.model_validate(booking) for booking in bookings]}


@router.get("/current/guests")
async def get_current_guests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách khách hiện tại (đang ở) (chỉ admin)
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền xem danh sách khách hiện tại"
        )
    
    service = BookingService(db)
    bookings = service.get_current_guests()
    return {"code": 200, "message": "Thành công", "data": [BookingResponse.model_validate(booking) for booking in bookings]}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Tạo booking mới
    """
    from datetime import datetime
    
    # Convert date strings to datetime objects
    check_in_date = datetime.fromisoformat(booking_data.check_in_date)
    check_out_date = datetime.fromisoformat(booking_data.check_out_date)
    
    # Create BookingCreate object with user_id from current user
    from schemas import BookingBase
    
    booking_create_data = BookingBase(
        user_id=current_user.id,
        room_id=booking_data.room_id,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        guest_count=booking_data.guest_count,
        special_requests=booking_data.special_requests
    )
    
    service = BookingService(db)
    booking = service.create_booking(booking_create_data, current_user)
    return {"code": 201, "message": "Tạo booking thành công", "data": BookingResponse.model_validate(booking)} 
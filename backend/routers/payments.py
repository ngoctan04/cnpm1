from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from database import get_db
from models import Payment, User, Booking, PaymentStatus, PaymentMethod
from schemas import PaymentCreate, PaymentResponse, PaymentUpdate
from auth import get_current_active_user, get_current_admin_user, get_current_user
from services.payment_service import PaymentService

router = APIRouter()


def generate_transaction_id() -> str:
    """Generate a unique transaction ID"""
    return f"TXN_{uuid.uuid4().hex[:12].upper()}"


@router.get("/", response_model=List[PaymentResponse])
async def get_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    booking_id: Optional[int] = Query(None, description="Lọc theo booking"),
    user_id: Optional[int] = Query(None, description="Lọc theo người dùng"),
    status: Optional[PaymentStatus] = Query(None, description="Lọc theo trạng thái"),
    payment_method: Optional[PaymentMethod] = Query(None, description="Lọc theo phương thức thanh toán"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách thanh toán (admin xem tất cả, user chỉ xem của mình)
    """
    service = PaymentService(db)
    
    # If not admin, force user_id to current user
    if current_user.role.value != "admin":
        user_id = current_user.id
    
    payments = service.get_payments(
        skip=skip,
        limit=limit,
        booking_id=booking_id,
        user_id=user_id,
        status=status,
        payment_method=payment_method
    )
    return {"code": 200, "message": "Thành công", "data": [PaymentResponse.model_validate(payment) for payment in payments]}


@router.get("/my-payments", response_model=List[PaymentResponse])
async def get_my_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách thanh toán của người dùng hiện tại
    """
    service = PaymentService(db)
    payments = service.get_user_payments(current_user.id, current_user)
    return {"code": 200, "message": "Thành công", "data": [PaymentResponse.model_validate(payment) for payment in payments]}


@router.get("/user/{user_id}", response_model=List[PaymentResponse])
async def get_user_payments(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách thanh toán của người dùng cụ thể
    """
    service = PaymentService(db)
    payments = service.get_user_payments(user_id, current_user)
    return {"code": 200, "message": "Thành công", "data": [PaymentResponse.model_validate(payment) for payment in payments]}


@router.get("/booking/{booking_id}", response_model=List[PaymentResponse])
async def get_booking_payments(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách thanh toán của booking cụ thể
    """
    service = PaymentService(db)
    payments = service.get_booking_payments(booking_id, current_user)
    return {"code": 200, "message": "Thành công", "data": [PaymentResponse.model_validate(payment) for payment in payments]}


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy thông tin chi tiết thanh toán
    """
    service = PaymentService(db)
    payment = service.get_payment_by_id(payment_id)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thanh toán"
        )
    
    # Check permissions
    if current_user.role.value != "admin" and current_user.id != payment.booking.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền xem thanh toán này"
        )
    
    return {"code": 200, "message": "Thành công", "data": PaymentResponse.model_validate(payment)}


@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: int,
    payment_data: PaymentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cập nhật thông tin thanh toán
    """
    service = PaymentService(db)
    payment = service.update_payment(payment_id, payment_data, current_user)
    return {"code": 200, "message": "Cập nhật thanh toán thành công", "data": PaymentResponse.model_validate(payment)}


@router.post("/{payment_id}/process")
async def process_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Xử lý thanh toán (đánh dấu hoàn thành) - chỉ admin
    """
    service = PaymentService(db)
    payment = service.process_payment(payment_id, current_user)
    return {"code": 200, "message": "Xử lý thanh toán thành công", "data": PaymentResponse.model_validate(payment)}


@router.post("/{payment_id}/fail")
async def fail_payment(
    payment_id: int,
    reason: str = Query(..., description="Lý do thanh toán thất bại"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Đánh dấu thanh toán thất bại - chỉ admin
    """
    service = PaymentService(db)
    payment = service.fail_payment(payment_id, reason, current_user)
    return {"code": 200, "message": "Đánh dấu thanh toán thất bại", "data": PaymentResponse.model_validate(payment)}


@router.post("/{payment_id}/cancel")
async def cancel_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Hủy thanh toán
    """
    service = PaymentService(db)
    payment = service.cancel_payment(payment_id, current_user)
    return {"code": 200, "message": "Hủy thanh toán thành công", "data": PaymentResponse.model_validate(payment)}


@router.delete("/{payment_id}")
async def delete_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Xóa thanh toán (chỉ admin)
    """
    service = PaymentService(db)
    success = service.delete_payment(payment_id, current_user)
    
    if success:
        return {"code": 200, "message": "Xóa thanh toán thành công"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể xóa thanh toán"
        )


@router.get("/stats/overview")
async def get_payment_stats(
    hotel_id: Optional[int] = Query(None, description="Lọc theo khách sạn"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy thống kê thanh toán (chỉ admin)
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền xem thống kê"
        )
    
    service = PaymentService(db)
    stats = service.get_payment_stats(hotel_id)
    return {"code": 200, "message": "Thành công", "data": stats}


@router.get("/booking/{booking_id}/status")
async def get_booking_payment_status(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy trạng thái thanh toán của booking
    """
    service = PaymentService(db)
    status_info = service.get_booking_payment_status(booking_id)
    return {"code": 200, "message": "Thành công", "data": status_info}


@router.get("/recent/list")
async def get_recent_payments(
    days: int = Query(7, ge=1, le=30, description="Số ngày gần đây"),
    limit: int = Query(50, ge=1, le=100, description="Giới hạn kết quả"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách thanh toán gần đây (chỉ admin)
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền xem danh sách thanh toán gần đây"
        )
    
    service = PaymentService(db)
    payments = service.get_recent_payments(days, limit)
    return {"code": 200, "message": "Thành công", "data": [PaymentResponse.model_validate(payment) for payment in payments]} 
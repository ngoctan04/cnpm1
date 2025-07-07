from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
import uuid

from models import Payment, User, Booking, PaymentStatus, PaymentMethod, BookingStatus
from schemas import PaymentCreate, PaymentUpdate, PaymentResponse


class PaymentService:
    """Service layer for payment operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_payment(self, payment_data: PaymentCreate, current_user: User) -> Payment:
        """Create a new payment"""
        # Check if booking exists
        booking = self.db.query(Booking).filter(Booking.id == payment_data.booking_id).first()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy booking"
            )
        
        # Check permissions
        if current_user.role.value != "admin" and current_user.id != booking.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền tạo thanh toán cho booking này"
            )
        
        # Check if booking is confirmed
        if booking.status != BookingStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chỉ có thể thanh toán cho booking đã được xác nhận"
            )
        
        # Check if amount is valid
        if payment_data.amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số tiền thanh toán phải lớn hơn 0"
            )
        
        # Check if amount doesn't exceed booking total
        existing_payments = self.db.query(Payment).filter(
            and_(
                Payment.booking_id == payment_data.booking_id,
                Payment.status == PaymentStatus.COMPLETED
            )
        ).all()
        
        total_paid = sum(payment.amount for payment in existing_payments)
        
        if total_paid + payment_data.amount > booking.total_price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số tiền thanh toán vượt quá tổng booking (đã thanh toán: {total_paid}, tổng: {booking.total_price})"
            )
        
        # Generate payment reference
        payment_reference = f"PAY-{uuid.uuid4().hex[:8].upper()}"
        
        # Create payment
        db_payment = Payment(
            booking_id=payment_data.booking_id,
            amount=payment_data.amount,
            payment_method=payment_data.payment_method,
            status=PaymentStatus.PENDING,
            payment_reference=payment_reference,
            notes=payment_data.notes
        )
        
        self.db.add(db_payment)
        self.db.commit()
        self.db.refresh(db_payment)
        
        return db_payment
    
    def get_payment_by_id(self, payment_id: int) -> Optional[Payment]:
        """Get payment by ID with related data"""
        return self.db.query(Payment).options(
            joinedload(Payment.booking).joinedload(Booking.user),
            joinedload(Payment.booking).joinedload(Booking.room)
        ).filter(Payment.id == payment_id).first()
    
    def get_payments(
        self,
        skip: int = 0,
        limit: int = 100,
        booking_id: Optional[int] = None,
        user_id: Optional[int] = None,
        status: Optional[PaymentStatus] = None,
        payment_method: Optional[PaymentMethod] = None
    ) -> List[Payment]:
        """Get list of payments with filtering"""
        query = self.db.query(Payment).options(
            joinedload(Payment.booking).joinedload(Booking.user),
            joinedload(Payment.booking).joinedload(Booking.room)
        )
        
        # Apply filters
        if booking_id:
            query = query.filter(Payment.booking_id == booking_id)
        
        if user_id:
            query = query.join(Booking).filter(Booking.user_id == user_id)
        
        if status:
            query = query.filter(Payment.status == status)
        
        if payment_method:
            query = query.filter(Payment.payment_method == payment_method)
        
        return query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_user_payments(self, user_id: int, current_user: User) -> List[Payment]:
        """Get all payments for a specific user"""
        # Users can only see their own payments, admins can see all
        if current_user.role.value != "admin" and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền xem thanh toán của người dùng khác"
            )
        
        return self.get_payments(user_id=user_id)
    
    def get_booking_payments(self, booking_id: int, current_user: User) -> List[Payment]:
        """Get all payments for a specific booking"""
        booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
        
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy booking"
            )
        
        # Check permissions
        if current_user.role.value != "admin" and current_user.id != booking.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền xem thanh toán của booking này"
            )
        
        return self.get_payments(booking_id=booking_id)
    
    def update_payment(self, payment_id: int, payment_data: PaymentUpdate, current_user: User) -> Payment:
        """Update payment information"""
        payment = self.get_payment_by_id(payment_id)
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thanh toán"
            )
        
        # Check permissions
        if current_user.role.value != "admin" and current_user.id != payment.booking.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền chỉnh sửa thanh toán này"
            )
        
        # Can't update completed or failed payments
        if payment.status in [PaymentStatus.COMPLETED, PaymentStatus.FAILED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể chỉnh sửa thanh toán đã hoàn thành hoặc thất bại"
            )
        
        # Update fields
        update_data = payment_data.model_dump(exclude_unset=True)
        
        # If amount is being changed, validate
        if 'amount' in update_data:
            if update_data['amount'] <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Số tiền thanh toán phải lớn hơn 0"
                )
            
            # Check if new amount doesn't exceed booking total
            existing_payments = self.db.query(Payment).filter(
                and_(
                    Payment.booking_id == payment.booking_id,
                    Payment.status == PaymentStatus.COMPLETED,
                    Payment.id != payment_id
                )
            ).all()
            
            total_paid = sum(p.amount for p in existing_payments)
            
            if total_paid + update_data['amount'] > payment.booking.total_price:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Số tiền thanh toán vượt quá tổng booking (đã thanh toán: {total_paid}, tổng: {payment.booking.total_price})"
                )
        
        # Apply updates
        for field, value in update_data.items():
            if hasattr(payment, field) and value is not None:
                setattr(payment, field, value)
        
        payment.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(payment)
        
        return payment
    
    def process_payment(self, payment_id: int, current_user: User) -> Payment:
        """Process a payment (mark as completed)"""
        payment = self.get_payment_by_id(payment_id)
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thanh toán"
            )
        
        # Check permissions (only admin can process payments)
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền xử lý thanh toán"
            )
        
        if payment.status != PaymentStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chỉ có thể xử lý thanh toán đang chờ"
            )
        
        # Simulate payment processing
        payment.status = PaymentStatus.COMPLETED
        payment.paid_at = datetime.utcnow()
        payment.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(payment)
        
        return payment
    
    def fail_payment(self, payment_id: int, reason: str, current_user: User) -> Payment:
        """Mark payment as failed"""
        payment = self.get_payment_by_id(payment_id)
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thanh toán"
            )
        
        # Check permissions (only admin can fail payments)
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền đánh dấu thanh toán thất bại"
            )
        
        if payment.status != PaymentStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chỉ có thể đánh dấu thất bại thanh toán đang chờ"
            )
        
        payment.status = PaymentStatus.FAILED
        payment.notes = f"{payment.notes or ''}\nLý do thất bại: {reason}".strip()
        payment.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(payment)
        
        return payment
    
    def cancel_payment(self, payment_id: int, current_user: User) -> Payment:
        """Cancel a payment"""
        payment = self.get_payment_by_id(payment_id)
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thanh toán"
            )
        
        # Check permissions
        if current_user.role.value != "admin" and current_user.id != payment.booking.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền hủy thanh toán này"
            )
        
        # Can only cancel pending payments
        if payment.status != PaymentStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chỉ có thể hủy thanh toán đang chờ"
            )
        
        payment.status = PaymentStatus.CANCELLED
        payment.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(payment)
        
        return payment
    
    def delete_payment(self, payment_id: int, current_user: User) -> bool:
        """Delete a payment (admin only)"""
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền xóa thanh toán"
            )
        
        payment = self.get_payment_by_id(payment_id)
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thanh toán"
            )
        
        # Can't delete completed payments
        if payment.status == PaymentStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa thanh toán đã hoàn thành"
            )
        
        self.db.delete(payment)
        self.db.commit()
        
        return True
    
    def get_payment_stats(self, hotel_id: Optional[int] = None) -> dict:
        """Get payment statistics"""
        query = self.db.query(Payment)
        
        if hotel_id:
            query = query.join(Booking).join(Booking.room).filter(
                Booking.room.has(hotel_id=hotel_id)
            )
        
        total_payments = query.count()
        completed_payments = query.filter(Payment.status == PaymentStatus.COMPLETED).count()
        pending_payments = query.filter(Payment.status == PaymentStatus.PENDING).count()
        failed_payments = query.filter(Payment.status == PaymentStatus.FAILED).count()
        cancelled_payments = query.filter(Payment.status == PaymentStatus.CANCELLED).count()
        
        # Total revenue
        total_revenue = query.filter(
            Payment.status == PaymentStatus.COMPLETED
        ).with_entities(func.sum(Payment.amount)).scalar() or 0
        
        # Average payment amount
        avg_payment = query.filter(
            Payment.status == PaymentStatus.COMPLETED
        ).with_entities(func.avg(Payment.amount)).scalar() or 0
        
        # Payment method breakdown
        payment_methods = {}
        for method in PaymentMethod:
            count = query.filter(
                and_(
                    Payment.payment_method == method,
                    Payment.status == PaymentStatus.COMPLETED
                )
            ).count()
            payment_methods[method.value] = count
        
        return {
            "total_payments": total_payments,
            "completed_payments": completed_payments,
            "pending_payments": pending_payments,
            "failed_payments": failed_payments,
            "cancelled_payments": cancelled_payments,
            "total_revenue": float(total_revenue),
            "average_payment": float(avg_payment),
            "payment_methods": payment_methods
        }
    
    def get_booking_payment_status(self, booking_id: int) -> dict:
        """Get payment status for a specific booking"""
        booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
        
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy booking"
            )
        
        payments = self.db.query(Payment).filter(Payment.booking_id == booking_id).all()
        
        total_paid = sum(p.amount for p in payments if p.status == PaymentStatus.COMPLETED)
        total_pending = sum(p.amount for p in payments if p.status == PaymentStatus.PENDING)
        
        remaining_balance = booking.total_price - total_paid
        
        return {
            "booking_id": booking_id,
            "total_amount": float(booking.total_price),
            "total_paid": float(total_paid),
            "total_pending": float(total_pending),
            "remaining_balance": float(remaining_balance),
            "is_fully_paid": remaining_balance <= 0,
            "payment_count": len(payments)
        }
    
    def get_recent_payments(self, days: int = 7, limit: int = 50) -> List[Payment]:
        """Get recent payments"""
        cutoff_date = datetime.utcnow() - datetime.timedelta(days=days)
        
        return self.db.query(Payment).options(
            joinedload(Payment.booking).joinedload(Booking.user),
            joinedload(Payment.booking).joinedload(Booking.room)
        ).filter(
            Payment.created_at >= cutoff_date
        ).order_by(Payment.created_at.desc()).limit(limit).all() 
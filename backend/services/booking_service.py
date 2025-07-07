from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from models import Booking, User, Room, Hotel, BookingStatus, Payment, PaymentStatus
from schemas import BookingCreate, BookingUpdate, BookingResponse
from services.room_service import RoomService


class BookingService:
    """Service layer for booking operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.room_service = RoomService(db)
    
    def create_booking(self, booking_data: BookingCreate, current_user: User) -> Booking:
        """Create a new booking"""
        # Check if room exists
        room = self.room_service.get_room_by_id(booking_data.room_id)
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy phòng"
            )
        
        # Validate dates
        if booking_data.check_in_date >= booking_data.check_out_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ngày check-in phải trước ngày check-out"
            )
        
        if booking_data.check_in_date.date() < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ngày check-in không thể trong quá khứ"
            )
        
        # Check room availability
        is_available = self.room_service.check_room_availability(
            booking_data.room_id,
            booking_data.check_in_date,
            booking_data.check_out_date
        )
        
        if not is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phòng không có sẵn trong thời gian đã chọn"
            )
        
        # Validate guest count
        if booking_data.guest_count > room.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số lượng khách ({booking_data.guest_count}) vượt quá sức chứa của phòng ({room.capacity})"
            )
        
        # Calculate total price
        nights = (booking_data.check_out_date - booking_data.check_in_date).days
        total_price = room.price_per_night * nights
        
        # Generate booking reference
        from routers.bookings import generate_booking_reference
        
        # Create booking
        db_booking = Booking(
            user_id=current_user.id,
            room_id=booking_data.room_id,
            check_in_date=booking_data.check_in_date,
            check_out_date=booking_data.check_out_date,
            guest_count=booking_data.guest_count,
            total_nights=nights,
            total_price=total_price,
            status=BookingStatus.PENDING,
            booking_reference=generate_booking_reference(),
            special_requests=booking_data.special_requests
        )
        
        self.db.add(db_booking)
        self.db.commit()
        self.db.refresh(db_booking)
        
        return db_booking
    
    def get_booking_by_id(self, booking_id: int) -> Optional[Booking]:
        """Get booking by ID with related data"""
        return self.db.query(Booking).options(
            joinedload(Booking.user),
            joinedload(Booking.room).joinedload(Room.hotel),
            joinedload(Booking.payments)
        ).filter(Booking.id == booking_id).first()
    
    def get_bookings(
        self,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[int] = None,
        room_id: Optional[int] = None,
        hotel_id: Optional[int] = None,
        status: Optional[BookingStatus] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[Booking]:
        """Get list of bookings with filtering"""
        query = self.db.query(Booking).options(
            joinedload(Booking.user),
            joinedload(Booking.room).joinedload(Room.hotel),
            joinedload(Booking.payments)
        )
        
        # Apply filters
        if user_id:
            query = query.filter(Booking.user_id == user_id)
        
        if room_id:
            query = query.filter(Booking.room_id == room_id)
        
        if hotel_id:
            query = query.join(Room).filter(Room.hotel_id == hotel_id)
        
        if status:
            query = query.filter(Booking.status == status)
        
        if start_date:
            query = query.filter(Booking.check_in_date >= start_date)
        
        if end_date:
            query = query.filter(Booking.check_out_date <= end_date)
        
        return query.order_by(Booking.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_user_bookings(self, user_id: int, current_user: User) -> List[Booking]:
        """Get all bookings for a specific user"""
        # Users can only see their own bookings, admins can see all
        if current_user.role.value != "admin" and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền xem booking của người dùng khác"
            )
        
        return self.get_bookings(user_id=user_id)
    
    def update_booking(self, booking_id: int, booking_data: BookingUpdate, current_user: User) -> Booking:
        """Update booking information"""
        booking = self.get_booking_by_id(booking_id)
        
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy booking"
            )
        
        # Check permissions
        if current_user.role.value != "admin" and current_user.id != booking.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền chỉnh sửa booking này"
            )
        
        # Can't update confirmed or cancelled bookings (except by admin)
        if booking.status in [BookingStatus.CONFIRMED, BookingStatus.CANCELLED] and current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể chỉnh sửa booking đã được xác nhận hoặc đã hủy"
            )
        
        # Update fields
        update_data = booking_data.model_dump(exclude_unset=True)
        
        # If dates are being changed, validate and check availability
        if 'check_in_date' in update_data or 'check_out_date' in update_data:
            new_check_in = update_data.get('check_in_date', booking.check_in_date)
            new_check_out = update_data.get('check_out_date', booking.check_out_date)
            
            if new_check_in >= new_check_out:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ngày check-in phải trước ngày check-out"
                )
            
            if new_check_in < date.today():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ngày check-in không thể trong quá khứ"
                )
            
            # Check availability (excluding current booking)
            conflicting_bookings = self.db.query(Booking).filter(
                and_(
                    Booking.room_id == booking.room_id,
                    Booking.id != booking_id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
                    or_(
                        and_(
                            Booking.check_in_date <= new_check_in,
                            Booking.check_out_date > new_check_in
                        ),
                        and_(
                            Booking.check_in_date < new_check_out,
                            Booking.check_out_date >= new_check_out
                        ),
                        and_(
                            Booking.check_in_date >= new_check_in,
                            Booking.check_out_date <= new_check_out
                        )
                    )
                )
            ).count()
            
            if conflicting_bookings > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phòng không có sẵn trong thời gian mới"
                )
            
            # Recalculate total price
            nights = (new_check_out - new_check_in).days
            update_data['total_price'] = booking.room.price_per_night * nights
        
        # Update guest count validation
        if 'guest_count' in update_data:
            if update_data['guest_count'] > booking.room.capacity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Số lượng khách ({update_data['guest_count']}) vượt quá sức chứa của phòng ({booking.room.capacity})"
                )
        
        # Apply updates
        for field, value in update_data.items():
            if hasattr(booking, field) and value is not None:
                setattr(booking, field, value)
        
        booking.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(booking)
        
        return booking
    
    def cancel_booking(self, booking_id: int, current_user: User) -> Booking:
        """Cancel a booking"""
        booking = self.get_booking_by_id(booking_id)
        
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy booking"
            )
        
        # Check permissions
        if current_user.role.value != "admin" and current_user.id != booking.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền hủy booking này"
            )
        
        # Can't cancel already cancelled bookings
        if booking.status == BookingStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking đã được hủy trước đó"
            )
        
        # Can't cancel bookings that have already started
        if booking.check_in_date <= date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể hủy booking đã bắt đầu"
            )
        
        booking.status = BookingStatus.CANCELLED
        booking.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(booking)
        
        return booking
    
    def confirm_booking(self, booking_id: int, current_user: User) -> Booking:
        """Confirm a booking (admin only)"""
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền xác nhận booking"
            )
        
        booking = self.get_booking_by_id(booking_id)
        
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy booking"
            )
        
        if booking.status != BookingStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chỉ có thể xác nhận booking đang chờ"
            )
        
        # Check if room is still available
        is_available = self.room_service.check_room_availability(
            booking.room_id,
            booking.check_in_date,
            booking.check_out_date,
            exclude_booking_id=booking_id
        )
        
        if not is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phòng không còn trống trong thời gian này"
            )
        
        booking.status = BookingStatus.CONFIRMED
        booking.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(booking)
        
        return booking
    
    def delete_booking(self, booking_id: int, current_user: User) -> bool:
        """Delete a booking (admin only)"""
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền xóa booking"
            )
        
        booking = self.get_booking_by_id(booking_id)
        
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy booking"
            )
        
        # Check if booking has payments
        payments_count = self.db.query(Payment).filter(Payment.booking_id == booking_id).count()
        
        if payments_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa booking có thanh toán. Hãy hủy booking thay vì xóa."
            )
        
        self.db.delete(booking)
        self.db.commit()
        
        return True
    
    def get_booking_stats(self, hotel_id: Optional[int] = None) -> dict:
        """Get booking statistics"""
        query = self.db.query(Booking)
        
        if hotel_id:
            query = query.join(Room).filter(Room.hotel_id == hotel_id)
        
        total_bookings = query.count()
        confirmed_bookings = query.filter(Booking.status == BookingStatus.CONFIRMED).count()
        pending_bookings = query.filter(Booking.status == BookingStatus.PENDING).count()
        cancelled_bookings = query.filter(Booking.status == BookingStatus.CANCELLED).count()
        
        # Total revenue
        total_revenue = query.filter(
            Booking.status == BookingStatus.CONFIRMED
        ).with_entities(func.sum(Booking.total_price)).scalar() or 0
        
        # Monthly bookings
        current_month = date.today().replace(day=1)
        monthly_bookings = query.filter(
            Booking.created_at >= current_month
        ).count()
        
        return {
            "total_bookings": total_bookings,
            "confirmed_bookings": confirmed_bookings,
            "pending_bookings": pending_bookings,
            "cancelled_bookings": cancelled_bookings,
            "total_revenue": float(total_revenue),
            "monthly_bookings": monthly_bookings
        }
    
    def get_upcoming_bookings(self, days_ahead: int = 7) -> List[Booking]:
        """Get upcoming bookings for the next N days"""
        end_date = date.today() + datetime.timedelta(days=days_ahead)
        
        return self.db.query(Booking).options(
            joinedload(Booking.user),
            joinedload(Booking.room).joinedload(Room.hotel)
        ).filter(
            and_(
                Booking.check_in_date >= date.today(),
                Booking.check_in_date <= end_date,
                Booking.status == BookingStatus.CONFIRMED
            )
        ).order_by(Booking.check_in_date).all()
    
    def get_current_guests(self) -> List[Booking]:
        """Get current guests (checked in but not checked out)"""
        today = date.today()
        
        return self.db.query(Booking).options(
            joinedload(Booking.user),
            joinedload(Booking.room).joinedload(Room.hotel)
        ).filter(
            and_(
                Booking.check_in_date <= today,
                Booking.check_out_date > today,
                Booking.status == BookingStatus.CONFIRMED
            )
        ).order_by(Booking.check_in_date).all() 
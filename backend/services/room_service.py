from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, not_
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime, date
import os
from pathlib import Path

from utils.gdrive import ensure_folder, list_files
from models import Room, User, Hotel, Booking, BookingStatus, RoomType
from schemas import RoomCreate, RoomUpdate, RoomResponse


class RoomService:
    """Service layer for room operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_room(self, room_data: RoomCreate, current_user: User) -> Room:
        """Create a new room"""
        # Only admin can create rooms
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền tạo phòng"
            )
        
        # Check if hotel exists
        hotel = self.db.query(Hotel).filter(Hotel.id == room_data.hotel_id).first()
        if not hotel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khách sạn"
            )
        
        # Check if room number already exists in this hotel
        existing_room = self.db.query(Room).filter(
            and_(
                Room.hotel_id == room_data.hotel_id,
                Room.room_number == room_data.room_number
            )
        ).first()
        
        if existing_room:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Phòng số {room_data.room_number} đã tồn tại trong khách sạn này"
            )
        
        # Create room
        db_room = Room(
            hotel_id=room_data.hotel_id,
            room_number=room_data.room_number,
            room_type=room_data.room_type,
            price_per_night=room_data.price_per_night,
            capacity=room_data.capacity,
            description=room_data.description,
            amenities=room_data.amenities,
            is_available=True
        )
        
        self.db.add(db_room)
        self.db.commit()
        self.db.refresh(db_room)
        
        return db_room
    
    def get_room_by_id(self, room_id: int) -> Optional[Room]:
        """Get room by ID with hotel information"""
        room = self.db.query(Room).options(
            joinedload(Room.hotel)
        ).filter(Room.id == room_id).first()
        if room:
            # Add images to room object
            room.images = self._get_room_images(room.id)
        return room
    
    def get_rooms(
        self,
        skip: int = 0,
        limit: int = 100,
        hotel_id: Optional[int] = None,
        room_type: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        capacity: Optional[int] = None,
        available_only: bool = True,
        check_in_date: Optional[date] = None,
        check_out_date: Optional[date] = None
    ) -> List[Room]:
        """Get list of rooms with filtering and availability checking"""
        query = self.db.query(Room).options(joinedload(Room.hotel))
        
        # Apply basic filters
        if hotel_id:
            query = query.filter(Room.hotel_id == hotel_id)
        
        if room_type:
            query = query.filter(Room.room_type == room_type)
        
        if min_price:
            query = query.filter(Room.price_per_night >= min_price)
        
        if max_price:
            query = query.filter(Room.price_per_night <= max_price)
        
        if capacity:
            query = query.filter(Room.capacity >= capacity)
        
        if available_only:
            query = query.filter(Room.is_available == True)
        
        # Check availability for specific dates
        if check_in_date and check_out_date:
            if check_in_date >= check_out_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ngày check-in phải trước ngày check-out"
                )
            
            # Find rooms that are NOT booked for the given period
            booked_room_ids = self.db.query(Booking.room_id).filter(
                and_(
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
                    or_(
                        # Booking overlaps with requested period
                        and_(
                            Booking.check_in_date <= check_in_date,
                            Booking.check_out_date > check_in_date
                        ),
                        and_(
                            Booking.check_in_date < check_out_date,
                            Booking.check_out_date >= check_out_date
                        ),
                        and_(
                            Booking.check_in_date >= check_in_date,
                            Booking.check_out_date <= check_out_date
                        )
                    )
                )
            ).subquery()
            
            query = query.filter(not_(Room.id.in_(booked_room_ids)))
        
        rooms = query.offset(skip).limit(limit).all()
        
        # Add images to each room
        for room in rooms:
            room.images = self._get_room_images(room.id)
        
        return rooms
    
    def update_room(self, room_id: int, room_data: RoomUpdate, current_user: User) -> Room:
        """Update room information"""
        # Only admin can update rooms
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền cập nhật thông tin phòng"
            )
        
        room = self.get_room_by_id(room_id)
        
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy phòng"
            )
        
        # Check if room number is being changed and not already taken
        if room_data.room_number and room_data.room_number != room.room_number:
            existing_room = self.db.query(Room).filter(
                and_(
                    Room.hotel_id == room.hotel_id,
                    Room.room_number == room_data.room_number,
                    Room.id != room_id
                )
            ).first()
            
            if existing_room:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Phòng số {room_data.room_number} đã tồn tại trong khách sạn này"
                )
        
        # Update fields
        update_data = room_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(room, field) and value is not None:
                setattr(room, field, value)
        
        room.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(room)
        
        return room
    
    def delete_room(self, room_id: int, current_user: User) -> bool:
        """Delete room"""
        # Only admin can delete rooms
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền xóa phòng"
            )
        
        room = self.get_room_by_id(room_id)
        
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy phòng"
            )
        
        # Check if room has active bookings
        active_bookings = self.db.query(Booking).filter(
            and_(
                Booking.room_id == room_id,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
                Booking.check_out_date > datetime.utcnow().date()
            )
        ).count()
        
        if active_bookings > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa phòng vì vẫn có booking đang hoạt động"
            )
        
        self.db.delete(room)
        self.db.commit()
        
        return True
    
    def _get_room_images(self, room_id: int) -> List[str]:
        """Get room images from media directory"""
        parent = os.getenv("GDRIVE_PARENT_ROOMS") or get_or_create_root("Rooms")
        try:
            folder_id = ensure_folder(str(room_id), parent)
            files = list_files(folder_id)
            return [f["link"] for f in files]
        except Exception as e:
            print(f"⚠️ Drive error get_room_images: {e}")
            return []
    
    def check_room_availability(
        self,
        room_id: int,
        check_in_date: date,
        check_out_date: date,
        exclude_booking_id: int | None = None,
    ) -> bool:
        """Check if room is available for specific dates"""
        if check_in_date >= check_out_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ngày check-in phải trước ngày check-out"
            )
        
        room = self.get_room_by_id(room_id)
        
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy phòng"
            )
        
        if not room.is_available:
            return False
        
        # Build base conditions
        base_conditions = [
            Booking.room_id == room_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING])
        ]

        # Exclude a specific booking if provided (dùng khi xác nhận booking chính nó)
        if exclude_booking_id is not None:
            base_conditions.append(Booking.id != exclude_booking_id)

        # Overlap conditions
        overlap_conditions = or_(
            and_(
                Booking.check_in_date <= check_in_date,
                Booking.check_out_date > check_in_date
            ),
            and_(
                Booking.check_in_date < check_out_date,
                Booking.check_out_date >= check_out_date
            ),
            and_(
                Booking.check_in_date >= check_in_date,
                Booking.check_out_date <= check_out_date
            )
        )

        conflicting_bookings = self.db.query(Booking).filter(and_(*base_conditions, overlap_conditions)).count()
        
        return conflicting_bookings == 0
    
    def set_room_maintenance(self, room_id: int, is_maintenance: bool, current_user: User) -> Room:
        """Set room maintenance status"""
        # Only admin can set maintenance status
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền thay đổi trạng thái bảo trì"
            )
        
        room = self.get_room_by_id(room_id)
        
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy phòng"
            )
        
        room.is_available = not is_maintenance
        room.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(room)
        
        return room
    
    def search_rooms(self, search_params: dict) -> List[Room]:
        """Advanced room search"""
        query = self.db.query(Room).options(joinedload(Room.hotel))
        
        # Location search (via hotel)
        if search_params.get("location"):
            location = f"%{search_params['location']}%"
            query = query.join(Hotel).filter(
                or_(
                    Hotel.city.ilike(location),
                    Hotel.country.ilike(location),
                    Hotel.address.ilike(location),
                    Hotel.name.ilike(location)
                )
            )
        
        # Price range
        if search_params.get("min_price"):
            query = query.filter(Room.price_per_night >= search_params["min_price"])
        
        if search_params.get("max_price"):
            query = query.filter(Room.price_per_night <= search_params["max_price"])
        
        # Room type
        if search_params.get("room_type"):
            query = query.filter(Room.room_type == search_params["room_type"])
        
        # Capacity
        if search_params.get("capacity"):
            query = query.filter(Room.capacity >= search_params["capacity"])
        
        # Amenities
        if search_params.get("amenities"):
            for amenity in search_params["amenities"]:
                query = query.filter(Room.amenities.ilike(f"%{amenity}%"))
        
        # Available only
        if search_params.get("available_only", True):
            query = query.filter(Room.is_available == True)
        
        return query.all()
    
    def get_room_stats(self, hotel_id: Optional[int] = None) -> dict:
        """Get room statistics"""
        query = self.db.query(Room)
        
        if hotel_id:
            query = query.filter(Room.hotel_id == hotel_id)
        
        total_rooms = query.count()
        available_rooms = query.filter(Room.is_available == True).count()
        
        # Count by room type
        room_types = {}
        for room_type in RoomType:
            count = query.filter(Room.room_type == room_type).count()
            room_types[room_type.value] = count
        
        return {
            "total_rooms": total_rooms,
            "available_rooms": available_rooms,
            "maintenance_rooms": total_rooms - available_rooms,
            "room_types": room_types
        } 
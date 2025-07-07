from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime
import os
from pathlib import Path

from utils.gdrive import ensure_folder, list_files
from models import Hotel, User, Room
from schemas import HotelCreate, HotelUpdate, HotelResponse
from utils.gdrive import get_or_create_root


class HotelService:
    """Service layer for hotel operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_hotel(self, hotel_data: HotelCreate, current_user: User) -> Hotel:
        """Create a new hotel"""
        # Only admin can create hotels
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền tạo khách sạn"
            )
        
        # Check if hotel name already exists in the same city
        existing_hotel = self.db.query(Hotel).filter(
            and_(
                Hotel.name == hotel_data.name,
                Hotel.city == hotel_data.city
            )
        ).first()
        
        if existing_hotel:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Khách sạn '{hotel_data.name}' đã tồn tại tại {hotel_data.city}"
            )
        
        # Create hotel
        db_hotel = Hotel(
            name=hotel_data.name,
            description=hotel_data.description,
            address=hotel_data.address,
            city=hotel_data.city,
            country=hotel_data.country,
            phone=hotel_data.phone,
            email=hotel_data.email,
            website=hotel_data.website,
            star_rating=hotel_data.star_rating,
            amenities=hotel_data.amenities
        )
        
        self.db.add(db_hotel)
        self.db.commit()
        self.db.refresh(db_hotel)
        
        return db_hotel
    
    def get_hotel_by_id(self, hotel_id: int) -> Optional[Hotel]:
        """Get hotel by ID"""
        hotel = self.db.query(Hotel).filter(Hotel.id == hotel_id).first()
        if hotel:
            # Add images to hotel object
            hotel.images = self._get_hotel_images(hotel_id)
        return hotel
    
    def get_hotels(
        self, 
        skip: int = 0, 
        limit: int = 100,
        city: Optional[str] = None,
        country: Optional[str] = None,
        min_rating: Optional[int] = None,
        search: Optional[str] = None
    ) -> List[Hotel]:
        """Get list of hotels with filtering and pagination"""
        query = self.db.query(Hotel)
        
        # Apply filters
        if city:
            query = query.filter(Hotel.city.ilike(f"%{city}%"))
        
        if country:
            query = query.filter(Hotel.country.ilike(f"%{country}%"))
        
        if min_rating:
            query = query.filter(Hotel.star_rating >= min_rating)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Hotel.name.ilike(search_term),
                    Hotel.description.ilike(search_term),
                    Hotel.city.ilike(search_term),
                    Hotel.address.ilike(search_term)
                )
            )
        
        hotels = query.order_by(Hotel.id.desc()).offset(skip).limit(limit).all()
        
        # Add images to each hotel
        for hotel in hotels:
            hotel.images = self._get_hotel_images(hotel.id)
        
        return hotels
    
    def update_hotel(self, hotel_id: int, hotel_data: HotelUpdate, current_user: User) -> Hotel:
        """Update hotel information"""
        # Only admin can update hotels
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền cập nhật thông tin khách sạn"
            )
        
        hotel = self.get_hotel_by_id(hotel_id)
        
        if not hotel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khách sạn"
            )
        
        # Check if name is being changed and not already taken
        if hotel_data.name and hotel_data.name != hotel.name:
            city_to_check = hotel_data.city if hotel_data.city else hotel.city
            existing_hotel = self.db.query(Hotel).filter(
                and_(
                    Hotel.name == hotel_data.name,
                    Hotel.city == city_to_check,
                    Hotel.id != hotel_id
                )
            ).first()
            
            if existing_hotel:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Khách sạn '{hotel_data.name}' đã tồn tại tại {city_to_check}"
                )
        
        # Update fields
        update_data = hotel_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(hotel, field) and value is not None:
                setattr(hotel, field, value)
        
        hotel.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(hotel)
        
        return hotel
    
    def delete_hotel(self, hotel_id: int, current_user: User) -> bool:
        """Delete hotel"""
        # Only admin can delete hotels
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền xóa khách sạn"
            )
        
        hotel = self.get_hotel_by_id(hotel_id)
        
        if not hotel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khách sạn"
            )
        
        # Check if hotel has rooms
        rooms_count = self.db.query(Room).filter(Room.hotel_id == hotel_id).count()
        
        if rooms_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa khách sạn vì vẫn còn phòng. Hãy xóa tất cả phòng trước."
            )
        
        self.db.delete(hotel)
        self.db.commit()
        
        return True
    
    def _get_hotel_images(self, hotel_id: int) -> List[str]:
        """Get hotel images from media directory"""
        parent = os.getenv("GDRIVE_PARENT_HOTELS") or get_or_create_root("Hotels")
        try:
            folder_id = ensure_folder(str(hotel_id), parent)
            files = list_files(folder_id)
            return [f["link"] for f in files]
        except Exception as e:
            print(f"⚠️ Drive error get_hotel_images: {e}")
            return []
    
    def get_hotel_rooms(self, hotel_id: int, skip: int = 0, limit: int = 100) -> List[Room]:
        """Get all rooms of a hotel"""
        hotel = self.get_hotel_by_id(hotel_id)
        
        if not hotel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khách sạn"
            )
        
        return self.db.query(Room).filter(
            Room.hotel_id == hotel_id
        ).offset(skip).limit(limit).all()
    
    def get_hotel_stats(self, hotel_id: Optional[int] = None) -> dict:
        """Get hotel statistics"""
        if hotel_id:
            # Stats for specific hotel
            hotel = self.get_hotel_by_id(hotel_id)
            if not hotel:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Không tìm thấy khách sạn"
                )
            
            total_rooms = self.db.query(Room).filter(Room.hotel_id == hotel_id).count()
            available_rooms = self.db.query(Room).filter(
                and_(Room.hotel_id == hotel_id, Room.is_available == True)
            ).count()
            
            return {
                "hotel_id": hotel_id,
                "hotel_name": hotel.name,
                "total_rooms": total_rooms,
                "available_rooms": available_rooms,
                "occupied_rooms": total_rooms - available_rooms
            }
        else:
            # Overall stats
            total_hotels = self.db.query(Hotel).count()
            total_rooms = self.db.query(Room).count()
            available_rooms = self.db.query(Room).filter(Room.is_available == True).count()
            
            return {
                "total_hotels": total_hotels,
                "total_rooms": total_rooms,
                "available_rooms": available_rooms,
                "occupied_rooms": total_rooms - available_rooms
            }
    
    def search_hotels(self, search_params: dict) -> List[Hotel]:
        """Advanced hotel search"""
        query = self.db.query(Hotel)
        
        # Location search
        if search_params.get("location"):
            location = f"%{search_params['location']}%"
            query = query.filter(
                or_(
                    Hotel.city.ilike(location),
                    Hotel.country.ilike(location),
                    Hotel.address.ilike(location)
                )
            )
        
        # Rating filter
        if search_params.get("min_rating"):
            query = query.filter(Hotel.star_rating >= search_params["min_rating"])
        
        # Amenities filter
        if search_params.get("amenities"):
            for amenity in search_params["amenities"]:
                query = query.filter(Hotel.amenities.ilike(f"%{amenity}%"))
        
        return query.all() 
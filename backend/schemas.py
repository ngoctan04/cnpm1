from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from models import UserRole, RoomType, BookingStatus, PaymentStatus


# Base schemas
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# User schemas
class UserBase(BaseSchema):
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.GUEST


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseSchema):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserLogin(BaseSchema):
    username: str
    password: str


# Hotel schemas
class HotelBase(BaseSchema):
    name: str
    description: Optional[str] = None
    address: str
    city: str
    country: str
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    star_rating: int = 3
    amenities: Optional[str] = None


class HotelCreate(HotelBase):
    pass


class HotelUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    star_rating: Optional[int] = None
    amenities: Optional[str] = None


class HotelResponse(HotelBase):
    id: int
    images: Optional[List[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# Room schemas
class RoomBase(BaseSchema):
    hotel_id: int
    room_number: str
    room_type: RoomType
    capacity: int = 2
    price_per_night: float
    description: Optional[str] = None
    amenities: Optional[str] = None
    is_available: bool = True
    area_sqm: Optional[float] = None
    bed_type: Optional[str] = None


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseSchema):
    hotel_id: Optional[int] = None
    room_number: Optional[str] = None
    room_type: Optional[RoomType] = None
    capacity: Optional[int] = None
    price_per_night: Optional[float] = None
    description: Optional[str] = None
    amenities: Optional[str] = None
    is_available: Optional[bool] = None
    area_sqm: Optional[float] = None
    bed_type: Optional[str] = None


class RoomResponse(RoomBase):
    id: int
    images: Optional[List[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# Booking schemas
class BookingBase(BaseSchema):
    user_id: int
    room_id: int
    check_in_date: datetime
    check_out_date: datetime
    guest_count: int = 1
    special_requests: Optional[str] = None


class BookingCreate(BaseSchema):
    room_id: int
    check_in_date: str  # Accept date string from frontend
    check_out_date: str  # Accept date string from frontend
    guest_count: int = 1
    special_requests: Optional[str] = None


class BookingUpdate(BaseSchema):
    check_in_date: Optional[datetime] = None
    check_out_date: Optional[datetime] = None
    guest_count: Optional[int] = None
    special_requests: Optional[str] = None
    status: Optional[BookingStatus] = None


class BookingResponse(BookingBase):
    id: int
    total_nights: int
    total_price: float
    status: BookingStatus
    booking_reference: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# Payment schemas
class PaymentBase(BaseSchema):
    booking_id: int
    amount: float
    payment_method: str
    currency: str = "USD"
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseSchema):
    amount: Optional[float] = None
    payment_method: Optional[str] = None
    payment_status: Optional[PaymentStatus] = None
    transaction_id: Optional[str] = None
    payment_date: Optional[datetime] = None
    currency: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(PaymentBase):
    id: int
    payment_status: PaymentStatus
    transaction_id: Optional[str] = None
    payment_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# Authentication schemas
class Token(BaseSchema):
    access_token: str
    token_type: str


class LoginResponse(BaseSchema):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseSchema):
    username: Optional[str] = None


# Search and filter schemas
class RoomSearchFilters(BaseSchema):
    hotel_id: Optional[int] = None
    room_type: Optional[RoomType] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    capacity: Optional[int] = None
    is_available: Optional[bool] = True
    check_in_date: Optional[datetime] = None
    check_out_date: Optional[datetime] = None


class BookingSearchFilters(BaseSchema):
    user_id: Optional[int] = None
    room_id: Optional[int] = None
    status: Optional[BookingStatus] = None
    check_in_date_from: Optional[datetime] = None
    check_in_date_to: Optional[datetime] = None


# Password Change Request Schema
class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, description="Mật khẩu mới phải có ít nhất 8 ký tự")


# API Response schemas
class ApiResponse(BaseSchema):
    code: int
    message: str
    data: Optional[dict] = None


class HotelListResponse(BaseSchema):
    code: int
    message: str
    data: List[HotelResponse]


class HotelDetailResponse(BaseSchema):
    code: int
    message: str
    data: HotelResponse


class RoomListResponse(BaseSchema):
    code: int
    message: str
    data: List[RoomResponse]


class RoomDetailResponse(BaseSchema):
    code: int
    message: str
    data: RoomResponse


class BookingListResponse(BaseSchema):
    code: int
    message: str
    data: List[BookingResponse]


class BookingDetailResponse(BaseSchema):
    code: int
    message: str
    data: BookingResponse


class PaymentListResponse(BaseSchema):
    code: int
    message: str
    data: List[PaymentResponse]


class PaymentDetailResponse(BaseSchema):
    code: int
    message: str
    data: PaymentResponse 
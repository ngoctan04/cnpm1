from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()


class UserRole(enum.Enum):
    GUEST = "guest"
    ADMIN = "admin"


class RoomType(enum.Enum):
    SINGLE = "single"
    DOUBLE = "double"
    SUITE = "suite"
    DELUXE = "deluxe"


class BookingStatus(enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class PaymentStatus(enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(enum.Enum):
    CREDIT_CARD = "credit_card"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    PAYPAL = "paypal"
    MOMO = "momo"


class Hotel(Base):
    """Hotel information table"""
    __tablename__ = "hotels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    phone = Column(String(20))
    email = Column(String(255))
    website = Column(String(255))
    star_rating = Column(Integer, default=3)  # 1-5 stars
    amenities = Column(Text)  # JSON string of amenities
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    rooms = relationship("Room", back_populates="hotel")


class User(Base):
    """User accounts table"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    role = Column(Enum(UserRole), default=UserRole.GUEST)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    bookings = relationship("Booking", back_populates="user")


class Room(Base):
    """Hotel rooms table"""
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    room_number = Column(String(10), nullable=False)
    room_type = Column(Enum(RoomType), nullable=False)
    capacity = Column(Integer, nullable=False, default=2)
    price_per_night = Column(Float, nullable=False)
    description = Column(Text)
    amenities = Column(Text)  # JSON string of room amenities
    is_available = Column(Boolean, default=True)
    area_sqm = Column(Float)  # Room area in square meters
    bed_type = Column(String(100))  # King, Queen, Twin, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    hotel = relationship("Hotel", back_populates="rooms")
    bookings = relationship("Booking", back_populates="room")


class Booking(Base):
    """Hotel bookings table"""
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    check_in_date = Column(DateTime, nullable=False)
    check_out_date = Column(DateTime, nullable=False)
    total_nights = Column(Integer, nullable=False)
    total_price = Column(Float, nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING)
    guest_count = Column(Integer, nullable=False, default=1)
    special_requests = Column(Text)
    booking_reference = Column(String(50), unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking")


class Payment(Base):
    """Payment transactions table"""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    transaction_id = Column(String(255), unique=True)
    payment_date = Column(DateTime)
    currency = Column(String(3), default="USD")
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    booking = relationship("Booking", back_populates="payments") 
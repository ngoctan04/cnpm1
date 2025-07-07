"""
Seed data script để tạo dữ liệu mẫu cho hệ thống Hotel Booking
"""

from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from decimal import Decimal

from database import get_db, engine
from models import (
    User, Hotel, Room, Booking, Payment,
    UserRole, RoomType, BookingStatus, PaymentStatus, PaymentMethod
)
from auth import get_password_hash


def create_sample_users(db: Session):
    """Tạo người dùng mẫu"""
    users = [
        User(
            email="admin@hotel.com",
            username="admin",
            hashed_password=get_password_hash("admin123"),
            first_name="Admin",
            last_name="System",
            phone="0123456789",
            role=UserRole.ADMIN,
            is_active=True
        ),
        User(
            email="guest1@email.com",
            username="guest1",
            hashed_password=get_password_hash("guest123"),
            first_name="Nguyễn",
            last_name="Văn A",
            phone="0987654321",
            role=UserRole.GUEST,
            is_active=True
        ),
        User(
            email="guest2@email.com",
            username="guest2",
            hashed_password=get_password_hash("guest123"),
            first_name="Trần",
            last_name="Thị B",
            phone="0987654322",
            role=UserRole.GUEST,
            is_active=True
        ),
        User(
            email="guest3@email.com",
            username="guest3",
            hashed_password=get_password_hash("guest123"),
            first_name="Lê",
            last_name="Văn C",
            phone="0987654323",
            role=UserRole.GUEST,
            is_active=True
        )
    ]
    
    for user in users:
        db.add(user)
    
    db.commit()
    print("✅ Tạo người dùng mẫu thành công")
    return users


def create_sample_hotels(db: Session):
    """Tạo khách sạn mẫu"""
    hotels = [
        Hotel(
            name="Khách sạn Quê Hương",
            description="Khách sạn 4 sao sang trọng tại trung tâm thành phố với đầy đủ tiện nghi hiện đại",
            address="123 Đường Nguyễn Huệ, Quận 1",
            city="Hồ Chí Minh",
            country="Việt Nam",
            phone="028-3829-5678",
            email="info@quehuong.com",
            website="https://quehuong.com",
            star_rating=4,
            amenities="WiFi miễn phí, Hồ bơi, Phòng gym, Spa, Nhà hàng, Bar, Dịch vụ phòng 24/7"
        ),
        Hotel(
            name="Grand Hotel Hanoi",
            description="Khách sạn boutique ở Hà Nội với kiến trúc Pháp cổ điển",
            address="15 Phố Nha Tho, Hoàn Kiếm",
            city="Hà Nội",
            country="Việt Nam",
            phone="024-3928-5678",
            email="info@grandhanoi.com",
            website="https://grandhanoi.com",
            star_rating=5,
            amenities="WiFi miễn phí, Spa cao cấp, Nhà hàng fine dining, Bar rooftop, Concierge"
        ),
        Hotel(
            name="Beachfront Resort",
            description="Resort nghỉ dưỡng bên bờ biển Nha Trang",
            address="Đường Trần Phú, Bãi biển Nha Trang",
            city="Nha Trang",
            country="Việt Nam",
            phone="0258-3829-1234",
            email="info@beachfront.com",
            website="https://beachfront.com",
            star_rating=5,
            amenities="Bãi biển riêng, Hồ bơi infinity, Spa, Tennis court, Khu vui chơi trẻ em"
        )
    ]
    
    for hotel in hotels:
        db.add(hotel)
    
    db.commit()
    print("✅ Tạo khách sạn mẫu thành công")
    return hotels


def create_sample_rooms(db: Session, hotels):
    """Tạo phòng mẫu"""
    rooms = []
    
    # Tạo phòng mẫu
    rooms_data = [
        {
            "hotel_id": 1,  # Khách sạn Quê Hương
            "room_number": "101",
            "room_type": RoomType.SINGLE,
            "price_per_night": 500000,
            "capacity": 1,
            "description": "Phòng đơn sang trọng với view thành phố",
            "amenities": "WiFi miễn phí, Điều hòa, TV màn hình phẳng, Minibar",
            "is_available": True
        },
        {
            "hotel_id": 1,  # Khách sạn Quê Hương
            "room_number": "201",
            "room_type": RoomType.DOUBLE,
            "price_per_night": 800000,
            "capacity": 2,
            "description": "Phòng đôi cao cấp với giường king-size",
            "amenities": "WiFi miễn phí, Điều hòa, TV 55 inch, Bồn tắm jacuzzi, Ban công",
            "is_available": True
        },
        {
            "hotel_id": 1,  # Khách sạn Quê Hương
            "room_number": "301",
            "room_type": RoomType.SUITE,
            "price_per_night": 1500000,
            "capacity": 4,
            "description": "Phòng suite sang trọng với phòng khách riêng",
            "amenities": "WiFi miễn phí, Điều hòa, TV 65 inch, Bồn tắm jacuzzi, Ban công view sông, Minibar, Sejour riêng",
            "is_available": True
        },
        {
            "hotel_id": 2,  # Grand Hotel Hanoi
            "room_number": "102",
            "room_type": RoomType.DELUXE,
            "price_per_night": 1200000,
            "capacity": 3,
            "description": "Phòng deluxe với thiết kế cổ điển Hà Nội",
            "amenities": "WiFi miễn phí, Điều hòa, TV 50 inch, Bồn tắm đá cẩm thạch, View hồ Hoàn Kiếm",
            "is_available": True
        },
        {
            "hotel_id": 2,  # Grand Hotel Hanoi
            "room_number": "202",
            "room_type": RoomType.DOUBLE,
            "price_per_night": 900000,
            "capacity": 2,
            "description": "Phòng đôi với phong cách Đông Dương",
            "amenities": "WiFi miễn phí, Điều hòa, TV màn hình phẳng, Minibar, Bàn làm việc",
            "is_available": False
        },
        {
            "hotel_id": 3,  # Beachfront Resort Nha Trang
            "room_number": "A101",
            "room_type": RoomType.SUITE,
            "price_per_night": 2000000,
            "capacity": 4,
            "description": "Villa hướng biển với hồ bơi riêng",
            "amenities": "WiFi miễn phí, Điều hòa, TV 75 inch, Bồn tắm jacuzzi, Hồ bơi riêng, Bếp nhỏ, Direct beach access",
            "is_available": True
        },
        {
            "hotel_id": 3,  # Beachfront Resort Nha Trang
            "room_number": "B205",
            "room_type": RoomType.DOUBLE,
            "price_per_night": 1100000,
            "capacity": 2,
            "description": "Phòng đôi view biển tuyệt đẹp",
            "amenities": "WiFi miễn phí, Điều hòa, TV 55 inch, Ban công view biển, Minibar",
            "is_available": True
        }
    ]

    for room_info in rooms_data:
        # Kiểm tra room đã tồn tại chưa
        existing_room = db.query(Room).filter(
            Room.hotel_id == room_info["hotel_id"],
            Room.room_number == room_info["room_number"]
        ).first()
        
        if not existing_room:
            room = Room(**room_info)
            db.add(room)
            print(f"✅ Tạo phòng {room_info['room_number']} tại hotel {room_info['hotel_id']}")
    
    db.commit()
    print("✅ Tạo phòng mẫu thành công")
    return rooms


def create_sample_bookings(db: Session, users, rooms):
    """Tạo booking mẫu"""
    bookings = []
    
    # Booking trong quá khứ (đã hoàn thành)
    past_booking = Booking(
        user_id=users[1].id,  # guest1
        room_id=rooms[0].id,  # Phòng 101 Quê Hương
        check_in_date=date.today() - timedelta(days=10),
        check_out_date=date.today() - timedelta(days=8),
        guest_count=2,
        total_price=Decimal("1600000"),  # 2 nights * 800k
        status=BookingStatus.COMPLETED,
        special_requests="Giường đôi, tầng cao"
    )
    
    # Booking hiện tại (đã xác nhận)
    current_booking = Booking(
        user_id=users[2].id,  # guest2
        room_id=rooms[1].id,  # Phòng 201 Quê Hương
        check_in_date=date.today() - timedelta(days=1),
        check_out_date=date.today() + timedelta(days=2),
        guest_count=2,
        total_price=Decimal("3600000"),  # 3 nights * 1.2M
        status=BookingStatus.CONFIRMED,
        special_requests="Honeymoon package"
    )
    
    # Booking tương lai (pending)
    future_booking = Booking(
        user_id=users[3].id,  # guest3
        room_id=rooms[4].id,  # Suite Hanoi
        check_in_date=date.today() + timedelta(days=5),
        check_out_date=date.today() + timedelta(days=7),
        guest_count=3,
        total_price=Decimal("6000000"),  # 2 nights * 3M
        status=BookingStatus.PENDING,
        special_requests="Late check-in, airport transfer"
    )
    
    # Booking cancelled
    cancelled_booking = Booking(
        user_id=users[1].id,  # guest1
        room_id=rooms[6].id,  # Villa beach
        check_in_date=date.today() + timedelta(days=15),
        check_out_date=date.today() + timedelta(days=18),
        guest_count=4,
        total_price=Decimal("15000000"),  # 3 nights * 5M
        status=BookingStatus.CANCELLED,
        special_requests="Family vacation"
    )
    
    bookings = [past_booking, current_booking, future_booking, cancelled_booking]
    
    for booking in bookings:
        db.add(booking)
    
    db.commit()
    print("✅ Tạo booking mẫu thành công")
    return bookings


def create_sample_payments(db: Session, bookings):
    """Tạo thanh toán mẫu"""
    payments = []
    
    # Payment for past booking (completed)
    past_payment = Payment(
        booking_id=bookings[0].id,
        amount=bookings[0].total_price,
        payment_method=PaymentMethod.CREDIT_CARD,
        status=PaymentStatus.COMPLETED,
        payment_reference="PAY-ABCD1234",
        paid_at=datetime.utcnow() - timedelta(days=12),
        notes="Thanh toán thẻ tín dụng"
    )
    
    # Payment for current booking (completed)
    current_payment = Payment(
        booking_id=bookings[1].id,
        amount=bookings[1].total_price,
        payment_method=PaymentMethod.BANK_TRANSFER,
        status=PaymentStatus.COMPLETED,
        payment_reference="PAY-EFGH5678",
        paid_at=datetime.utcnow() - timedelta(days=2),
        notes="Chuyển khoản ngân hàng"
    )
    
    # Partial payment for future booking (pending)
    future_payment1 = Payment(
        booking_id=bookings[2].id,
        amount=Decimal("3000000"),  # 50% deposit
        payment_method=PaymentMethod.CASH,
        status=PaymentStatus.COMPLETED,
        payment_reference="PAY-IJKL9012",
        paid_at=datetime.utcnow() - timedelta(days=1),
        notes="Đặt cọc 50%"
    )
    
    # Remaining payment for future booking (pending)
    future_payment2 = Payment(
        booking_id=bookings[2].id,
        amount=Decimal("3000000"),  # Remaining 50%
        payment_method=PaymentMethod.CREDIT_CARD,
        status=PaymentStatus.PENDING,
        payment_reference="PAY-MNOP3456",
        notes="Thanh toán phần còn lại"
    )
    
    payments = [past_payment, current_payment, future_payment1, future_payment2]
    
    for payment in payments:
        db.add(payment)
    
    db.commit()
    print("✅ Tạo thanh toán mẫu thành công")
    return payments


def seed_database():
    """Chạy seed data cho toàn bộ database"""
    print("🌱 Bắt đầu seed data...")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Tạo dữ liệu mẫu theo thứ tự
        users = create_sample_users(db)
        hotels = create_sample_hotels(db)
        rooms = create_sample_rooms(db, hotels)
        bookings = create_sample_bookings(db, users, rooms)
        payments = create_sample_payments(db, bookings)
        
        print("\n🎉 Seed data hoàn thành!")
        print("\n📋 Dữ liệu đã tạo:")
        print(f"  - {len(users)} người dùng")
        print(f"  - {len(hotels)} khách sạn")
        print(f"  - {len(rooms)} phòng")
        print(f"  - {len(bookings)} booking")
        print(f"  - {len(payments)} thanh toán")
        
        print("\n🔐 Tài khoản test:")
        print("  Admin: admin / admin123")
        print("  Guest 1: guest1 / guest123")
        print("  Guest 2: guest2 / guest123")
        print("  Guest 3: guest3 / guest123")
        
    except Exception as e:
        print(f"❌ Lỗi khi seed data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database() 
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from contextlib import asynccontextmanager
import uvicorn
from fastapi.staticfiles import StaticFiles
import os

from database import engine, get_db
from models import Base
from routers import users, hotels, rooms, bookings, payments


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Khởi động ứng dụng Hotel Booking API...")
    
    # Tạo tất cả bảng trong database (auto-migration)
    print("📊 Tạo/cập nhật bảng database...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database đã sẵn sàng!")
    
    # Tùy chọn: Chạy seed data nếu database trống
    try:
        db = next(get_db())
        from models import User
        user_count = db.query(User).count()
        
        if user_count == 0:
            print("🌱 Database trống, đang chạy seed data...")
            from seed_data import seed_database
            seed_database()
        else:
            print(f"📋 Database đã có {user_count} người dùng")
            
        db.close()
    except Exception as e:
        print(f"⚠️ Không thể kiểm tra/seed data: {e}")
    
    print("✅ Khởi động hoàn tất!")
    
    yield
    
    # Shutdown
    print("🛑 Đang tắt ứng dụng...")


# Tạo FastAPI app với metadata tiếng Việt
app = FastAPI(
    title="🏨 Hotel Booking API",
    description="""
    ## Hệ thống đặt phòng khách sạn toàn diện

    API hoàn chỉnh cho việc quản lý khách sạn và đặt phòng với các tính năng:

    ### 🔐 **Xác thực & Phân quyền**
    - Đăng ký, đăng nhập người dùng
    - JWT token authentication  
    - Phân quyền Admin/Guest

    ### 🏨 **Quản lý Khách sạn**
    - CRUD khách sạn
    - Tìm kiếm theo địa điểm, đánh giá
    - Quản lý tiện nghi

    ### 🛏️ **Quản lý Phòng**
    - CRUD phòng theo khách sạn
    - Kiểm tra tình trạng còn trống
    - Lọc theo loại, giá, sức chứa
    - Quản lý bảo trì

    ### 📅 **Đặt phòng**
    - Tạo, sửa, hủy booking
    - Kiểm tra xung đột lịch trình
    - Tính toán giá tự động
    - Theo dõi trạng thái

    ### 💳 **Thanh toán**
    - Tạo và xử lý thanh toán
    - Hỗ trợ nhiều phương thức
    - Theo dõi trạng thái thanh toán
    - Báo cáo doanh thu

    ### 📊 **Báo cáo & Thống kê**
    - Dashboard admin
    - Thống kê booking, doanh thu
    - Báo cáo theo khách sạn

    ---

    **🔑 Tài khoản test:**
    - **Admin:** `admin` / `admin123`
    - **Guest:** `guest1` / `guest123`

    **🌐 Base URL:** `/api/v1`
    """,
    version="1.0.0",
    contact={
        "name": "Hotel Booking Team",
        "email": "support@hotelbooking.com",
    },
    license_info={
        "name": "MIT",
    },
    lifespan=lifespan
)

# Mount static files for media
MEDIA_ROOT = os.getenv("MEDIA_ROOT", "media")
os.makedirs(MEDIA_ROOT, exist_ok=True)

# Custom media endpoint with CORS headers
@app.get("/media/{file_path:path}")
async def serve_media(file_path: str):
    """Serve media files with CORS headers"""
    file_path = os.path.join(MEDIA_ROOT, file_path)
    if os.path.exists(file_path):
        return FileResponse(
            file_path,
            headers={
                "Access-Control-Allow-Origin": "http://localhost:3000",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    raise HTTPException(status_code=404, detail="File not found")

# Test endpoint for CORS
@app.get("/test-cors")
async def test_cors():
    """Test CORS endpoint"""
    return {"message": "CORS test successful"}

# Mount static files for backward compatibility
app.mount("/media", StaticFiles(directory=MEDIA_ROOT), name="media")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Xử lý lỗi toàn cục"""
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "message": "Lỗi hệ thống không xác định",
            "detail": str(exc) if app.debug else "Liên hệ admin để được hỗ trợ"
        }
    )

# Health check endpoint
@app.get("/", tags=["Health"])
async def root():
    """
    Health check endpoint - Kiểm tra tình trạng API
    """
    return {
        "code": 200,
        "message": "🏨 Hotel Booking API đang hoạt động bình thường!",
        "data": {
            "status": "healthy",
            "version": "1.0.0",
            "docs": "/docs",
            "endpoints": {
                "users": "/api/v1/users",
                "hotels": "/api/v1/hotels", 
                "rooms": "/api/v1/rooms",
                "bookings": "/api/v1/bookings",
                "payments": "/api/v1/payments"
            }
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Endpoint kiểm tra sức khỏe chi tiết
    """
    try:
        # Test database connection
        db = next(get_db())
        from models import User
        db.query(User).count()
        db.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "code": 200,
        "message": "Kiểm tra sức khỏe hệ thống",
        "data": {
            "api": "healthy",
            "database": db_status,
            "timestamp": "2024-01-01T00:00:00Z"
        }
    }

# Include routers with Vietnamese prefixes
app.include_router(
    users.router, 
    prefix="/api/v1/users", 
    tags=["👥 Người dùng"],
    responses={
        401: {"description": "Chưa xác thực"},
        403: {"description": "Không có quyền truy cập"},
        404: {"description": "Không tìm thấy"},
        500: {"description": "Lỗi server"}
    }
)

# Backward compatibility endpoints (without /api/v1 prefix)
app.include_router(
    users.router, 
    prefix="/users", 
    tags=["👥 Người dùng (Legacy)"],
    responses={
        401: {"description": "Chưa xác thực"},
        403: {"description": "Không có quyền truy cập"},
        404: {"description": "Không tìm thấy"},
        500: {"description": "Lỗi server"}
    }
)

app.include_router(
    hotels.router, 
    prefix="/api/v1/hotels", 
    tags=["🏨 Khách sạn"],
    responses={
        401: {"description": "Chưa xác thực"},
        403: {"description": "Không có quyền truy cập"},
        404: {"description": "Không tìm thấy khách sạn"},
        500: {"description": "Lỗi server"}
    }
)

# Backward compatibility endpoints (without /api/v1 prefix)
app.include_router(
    hotels.router, 
    prefix="/hotels", 
    tags=["🏨 Khách sạn (Legacy)"],
    responses={
        401: {"description": "Chưa xác thực"},
        403: {"description": "Không có quyền truy cập"},
        404: {"description": "Không tìm thấy khách sạn"},
        500: {"description": "Lỗi server"}
    }
)

app.include_router(
    rooms.router, 
    prefix="/api/v1/rooms", 
    tags=["🛏️ Phòng"],
    responses={
        401: {"description": "Chưa xác thực"},
        403: {"description": "Không có quyền truy cập"},
        404: {"description": "Không tìm thấy phòng"},
        500: {"description": "Lỗi server"}
    }
)

# Backward compatibility endpoints (without /api/v1 prefix)
app.include_router(
    rooms.router, 
    prefix="/rooms", 
    tags=["🛏️ Phòng (Legacy)"],
    responses={
        401: {"description": "Chưa xác thực"},
        403: {"description": "Không có quyền truy cập"},
        404: {"description": "Không tìm thấy phòng"},
        500: {"description": "Lỗi server"}
    }
)

app.include_router(
    bookings.router, 
    prefix="/api/v1/bookings", 
    tags=["📅 Đặt phòng"],
    responses={
        401: {"description": "Chưa xác thực"},
        403: {"description": "Không có quyền truy cập"},
        404: {"description": "Không tìm thấy booking"},
        500: {"description": "Lỗi server"}
    }
)

# Backward compatibility endpoints (without /api/v1 prefix)
app.include_router(
    bookings.router, 
    prefix="/bookings", 
    tags=["📅 Đặt phòng (Legacy)"],
    responses={
        401: {"description": "Chưa xác thực"},
        403: {"description": "Không có quyền truy cập"},
        404: {"description": "Không tìm thấy booking"},
        500: {"description": "Lỗi server"}
    }
)

app.include_router(
    payments.router, 
    prefix="/api/v1/payments", 
    tags=["💳 Thanh toán"],
    responses={
        401: {"description": "Chưa xác thực"},
        403: {"description": "Không có quyền truy cập"},
        404: {"description": "Không tìm thấy thanh toán"},
        500: {"description": "Lỗi server"}
    }
)

# Backward compatibility endpoints (without /api/v1 prefix)
app.include_router(
    payments.router, 
    prefix="/payments", 
    tags=["💳 Thanh toán (Legacy)"],
    responses={
        401: {"description": "Chưa xác thực"},
        403: {"description": "Không có quyền truy cập"},
        404: {"description": "Không tìm thấy thanh toán"},
        500: {"description": "Lỗi server"}
    }
)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 
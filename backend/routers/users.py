from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from models import User
from schemas import (
    UserCreate, UserUpdate, UserResponse, 
    UserLogin, Token, LoginResponse, PasswordChangeRequest
)
from auth import get_current_user, create_access_token, verify_password
from services.user_service import UserService

router = APIRouter()
security = HTTPBearer()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Đăng ký người dùng mới
    """
    service = UserService(db)
    try:
        user = service.create_user(user_data)
        return UserResponse.model_validate(user)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi hệ thống khi tạo tài khoản"
        )

@router.post("/login", response_model=LoginResponse)
async def login_user(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Đăng nhập người dùng
    """
    service = UserService(db)
    user = service.authenticate_user(user_data.username, user_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không đúng"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản đã bị vô hiệu hóa"
        )
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Lấy thông tin profile người dùng hiện tại
    """
    return UserResponse.model_validate(current_user)

@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách người dùng (chỉ admin)
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền xem danh sách người dùng"
        )
    
    service = UserService(db)
    users = service.get_users(skip=skip, limit=limit, active_only=active_only)
    return [UserResponse.model_validate(user) for user in users]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy thông tin người dùng theo ID
    """
    # Users can only see their own profile, admins can see all
    if current_user.role.value != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền xem thông tin người dùng này"
        )
    
    service = UserService(db)
    user = service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng"
        )
    
    return UserResponse.model_validate(user)

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cập nhật thông tin người dùng
    """
    service = UserService(db)
    user = service.update_user(user_id, user_data, current_user)
    return UserResponse.model_validate(user)

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Xóa người dùng (chỉ admin)
    """
    service = UserService(db)
    success = service.delete_user(user_id, current_user)
    
    if success:
        return {"message": "Xóa người dùng thành công"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể xóa người dùng"
        )

@router.post("/{user_id}/change-password")
async def change_password(
    user_id: int,
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Thay đổi mật khẩu người dùng
    """
    service = UserService(db)
    success = service.change_password(
        user_id, 
        password_data.old_password, 
        password_data.new_password,
        current_user
    )
    
    if success:
        return {"message": "Thay đổi mật khẩu thành công"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể thay đổi mật khẩu"
        )

@router.get("/stats/overview")
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy thống kê người dùng (chỉ admin)
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền xem thống kê"
        )
    
    service = UserService(db)
    stats = service.get_user_stats()
    return {"code": 200, "message": "Thành công", "data": stats} 
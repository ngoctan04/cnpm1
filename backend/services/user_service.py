from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime

from models import User, UserRole
from schemas import UserCreate, UserUpdate, UserResponse
from auth import get_password_hash, verify_password


class UserService:
    """Service layer for user operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        # Check if email or username already exists
        existing_user = self.db.query(User).filter(
            or_(User.email == user_data.email, User.username == user_data.username)
        ).first()
        
        if existing_user:
            if existing_user.email == user_data.email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email đã được sử dụng"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tên đăng nhập đã được sử dụng"
                )
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user
        db_user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            role=user_data.role,
            is_active=True
        )
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        
        return db_user
    
    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate user with username/email and password"""
        user = self.db.query(User).filter(
            or_(User.username == username, User.email == username)
        ).first()
        
        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        return user
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username or email"""
        return self.db.query(User).filter(
            or_(User.username == username, User.email == username)
        ).first()
    
    def get_users(self, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[User]:
        """Get list of users with pagination"""
        query = self.db.query(User)
        
        if active_only:
            query = query.filter(User.is_active == True)
        
        return query.offset(skip).limit(limit).all()
    
    def update_user(self, user_id: int, user_data: UserUpdate, current_user: User) -> User:
        """Update user information"""
        user = self.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng"
            )
        
        # Check permissions
        if current_user.role.value != "admin" and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền chỉnh sửa thông tin người dùng này"
            )
        
        # Check if email is being changed and not already taken
        if user_data.email and user_data.email != user.email:
            existing_user = self.db.query(User).filter(
                and_(User.email == user_data.email, User.id != user_id)
            ).first()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email đã được sử dụng"
                )
        
        # Update fields
        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(user, field) and value is not None:
                setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def delete_user(self, user_id: int, current_user: User) -> bool:
        """Delete/deactivate user"""
        if current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ admin mới có quyền xóa người dùng"
            )
        
        user = self.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng"
            )
        
        # Don't delete admin users
        if user.role.value == "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa tài khoản admin"
            )
        
        # Soft delete by deactivating
        user.is_active = False
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return True
    
    def change_password(self, user_id: int, old_password: str, new_password: str, current_user: User) -> bool:
        """Change user password"""
        if current_user.id != user_id and current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền thay đổi mật khẩu"
            )
        
        user = self.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng"
            )
        
        # Verify old password (except for admin)
        if current_user.role.value != "admin":
            if not verify_password(old_password, user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mật khẩu cũ không đúng"
                )
        
        # Update password
        user.hashed_password = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return True
    
    def get_user_stats(self) -> dict:
        """Get user statistics for admin dashboard"""
        total_users = self.db.query(User).count()
        active_users = self.db.query(User).filter(User.is_active == True).count()
        admin_users = self.db.query(User).filter(User.role == UserRole.ADMIN).count()
        guest_users = self.db.query(User).filter(User.role == UserRole.GUEST).count()
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": total_users - active_users,
            "admin_users": admin_users,
            "guest_users": guest_users
        } 
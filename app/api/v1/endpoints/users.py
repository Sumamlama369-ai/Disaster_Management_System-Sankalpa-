"""
User API Endpoints
Routes for user profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user import User
from app.schemas.auth import UserResponse
from app.api.v1.dependencies.auth import (
    get_current_user,
    get_current_officer,
    get_current_admin
)


router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Get current user's profile
    
    Requires: Valid JWT token
    """
    return UserResponse(
        id=current_user.id,  # type: ignore
        email=current_user.email,  # type: ignore
        name=current_user.name,  # type: ignore
        role=current_user.role.value,
        profile_picture=current_user.profile_picture  # type: ignore
    )


@router.get("/profile/{user_id}", response_model=UserResponse)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get any user's profile
    
    Citizens: Can only view their own profile
    Officers: Can view any profile
    Admins: Can view any profile
    """
    # Citizens can only view their own profile
    if current_user.role.value == "citizen" and current_user.id != user_id:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user.id,  # type: ignore
        email=user.email,  # type: ignore
        name=user.name,  # type: ignore
        role=user.role.value,
        profile_picture=user.profile_picture  # type: ignore
    )


@router.get("/all")
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Only admins
):
    """
    Get all users (Admin only)
    
    Supports pagination
    """
    users = db.query(User).offset(skip).limit(limit).all()
    
    return {
        "total": db.query(User).count(),
        "users": [
            {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
                "is_verified": user.is_verified,
                "is_active": user.is_active,
                "created_at": user.created_at
            }
            for user in users
        ]
    }


@router.delete("/delete/{user_id}")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Only admins
):
    """
    Deactivate user account (Admin only)
    
    Soft delete - user is marked as inactive
    """
    if current_user.id == user_id:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    setattr(user, 'is_active', False)
    db.commit()
    
    return {"success": True, "message": f"User {user.email} deactivated"}
"""
Authentication Dependencies
Middleware for protecting routes and getting current user.
Supports both JWT Bearer token AND session cookie authentication.
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user import User
from app.core.security import decode_token
from app.services.session_service import session_service
from app.core.config import settings
from typing import Optional


# Security scheme for Swagger UI (optional — won't block cookie-based auth)
security = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user.

    Checks in order:
    1. JWT Bearer token (Authorization header) — for API/Swagger/WebSocket
    2. Session cookie — for browser-based requests

    If both are present, Bearer token takes priority.
    """
    user = None

    # --- Method 1: JWT Bearer token ---
    if credentials and credentials.credentials:
        token = credentials.credentials
        payload = decode_token(token)
        if payload:
            user_id = payload.get('user_id')
            user = db.query(User).filter(User.id == user_id).first()

    # --- Method 2: Session cookie (fallback) ---
    if not user:
        session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
        if session_id:
            user = session_service.validate_session(db, session_id)

    # --- Neither method worked ---
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token/session"
        )

    if user.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


def require_role(*allowed_roles: str):
    """
    Require specific roles to access route

    Usage:
        @app.get("/admin-only")
        def admin_route(current_user: User = Depends(require_role("admin"))):
            return {"message": "Admin access granted"}
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user

    return role_checker


# Convenience role checkers
def get_current_citizen(current_user: User = Depends(get_current_user)) -> User:
    """Require citizen role"""
    if current_user.role.value not in ["citizen", "officer", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user


def get_current_officer(current_user: User = Depends(get_current_user)) -> User:
    """Require officer or admin role"""
    if current_user.role.value not in ["officer", "admin"]:
        raise HTTPException(status_code=403, detail="Officer access required")
    return current_user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role"""
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

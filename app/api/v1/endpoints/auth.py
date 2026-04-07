"""
Authentication API Endpoints
Routes for registration, login, OTP verification
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Cookie
from sqlalchemy.orm import Session
import asyncio
from typing import Optional
from app.database.database import get_db
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    LoginRequest, LoginResponse,
    VerifyOTPRequest, ResendOTPRequest,
    MessageResponse
)
from app.services.auth_service import auth_service
from app.services.otp_service import otp_service
from app.services.gmail_service import gmail_service
from app.services.ws_manager import ws_manager
from app.services.session_service import session_service
from app.models.user import User
from app.core.config import settings


router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register new user with Google OAuth
    
    Flow:
    1. User authenticates with Google (frontend)
    2. Frontend sends Google token + role selection
    3. Backend verifies token, creates user, sends OTP
    4. User verifies OTP to complete registration
    
    Roles:
    - citizen: No code needed
    - officer: Requires valid organization_code
    - admin: Requires valid master_admin_code
    """
    result = auth_service.register_user(
        db=db,
        google_token=request.google_token,
        role=request.role.value,
        organization_code=request.organization_code,
        master_admin_code=request.master_admin_code
    )
    
    if not result['success']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result['message']
        )
    
    return RegisterResponse(
        success=True,
        message=result['message'],
        email=result['email']
    )


@router.post("/verify-otp", response_model=LoginResponse)
def verify_otp(
    request: VerifyOTPRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Verify OTP and complete registration/login

    After successful verification:
    - User is marked as verified
    - JWT token is generated
    - Session cookie is set
    - User can access the system
    """
    result = auth_service.verify_otp_and_login(
        db=db,
        email=request.email,
        otp_code=request.otp_code
    )

    if not result['success']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result['message']
        )

    # Create server-side session and set cookie
    sid = session_service.create_session(db, result['user']['id'])
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=sid,
        max_age=settings.SESSION_EXPIRE_MINUTES * 60,
        httponly=True,       # JS cannot access this cookie
        samesite="lax",      # CSRF protection
        secure=False,        # Set True in production (HTTPS)
    )

    # Notify WebSocket subscribers that user data has changed
    asyncio.create_task(ws_manager.notify("users", "new_user"))
    asyncio.create_task(ws_manager.notify("citizens", "new_user"))

    return LoginResponse(
        success=True,
        message=result['message'],
        access_token=result['access_token'],
        user=result['user']
    )


@router.post("/resend-otp", response_model=MessageResponse)
def resend_otp(
    request: ResendOTPRequest,
    db: Session = Depends(get_db)
):
    """
    Resend OTP to user's email
    
    Rate limit: 5 requests per hour per email
    """
    # Check if user exists
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate new OTP
    otp_code = otp_service.create_otp(db, request.email)
    
    # Send email
    sent = gmail_service.send_otp_email(request.email, otp_code, str(user.name))
    
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP email"
        )
    
    return MessageResponse(
        success=True,
        message="OTP resent successfully"
    )


@router.post("/login", response_model=LoginResponse)
def login_user(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Login existing user with Google OAuth

    Flow:
    1. User clicks "Login with Google" (frontend)
    2. Frontend sends Google token
    3. Backend verifies token and checks user status
    4. If verified: Returns JWT token + sets session cookie
    5. If not verified: Sends OTP for verification
    """
    result = auth_service.login_user(
        db=db,
        google_token=request.google_token
    )

    # If needs verification, return specific response
    if result.get('needs_verification'):
        return LoginResponse(
            success=False,
            message=result['message'],
            email=result['email'],
            needs_verification=True
        )

    if not result['success']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result['message']
        )

    # Create server-side session and set cookie
    sid = session_service.create_session(db, result['user']['id'])
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=sid,
        max_age=settings.SESSION_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=False,        # Set True in production (HTTPS)
    )

    return LoginResponse(
        success=True,
        message=result['message'],
        access_token=result['access_token'],
        user=result['user']
    )


@router.post("/logout", response_model=MessageResponse)
def logout(
    request_obj: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Logout user by destroying server-side session and clearing cookie
    """
    session_id = request_obj.cookies.get(settings.SESSION_COOKIE_NAME)

    if session_id:
        session_service.destroy_session(db, session_id)

    # Clear the session cookie
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        httponly=True,
        samesite="lax",
    )

    return MessageResponse(success=True, message="Logged out successfully")


@router.get("/session-check")
def check_session(
    request_obj: Request,
    db: Session = Depends(get_db)
):
    """
    Check if the current session cookie is still valid.
    Returns user info if valid, 401 if expired/invalid.
    Useful for frontend to verify session on page load.
    """
    session_id = request_obj.cookies.get(settings.SESSION_COOKIE_NAME)

    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No session cookie found"
        )

    user = session_service.validate_session(db, session_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )

    return {
        "valid": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "profile_picture": user.profile_picture,
            "phone": user.phone,
            "district": user.district,
        }
    }


@router.get("/check-email/{email}")
def check_email_exists(email: str, db: Session = Depends(get_db)):
    """
    Check if email is already registered

    Useful for frontend to show appropriate message
    """
    user = db.query(User).filter(User.email == email).first()

    return {
        "exists": user is not None,
        "is_verified": user.is_verified if user else False
    }
"""
Authentication Schemas
Pydantic models for API request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum


class UserRoleEnum(str, Enum):
    """User role options"""
    CITIZEN = "citizen"
    OFFICER = "officer"
    ADMIN = "admin"


# ============ Registration Schemas ============

class RegisterRequest(BaseModel):
    """User registration request"""
    google_token: str = Field(..., description="Google OAuth ID token")
    role: UserRoleEnum = Field(..., description="User role")
    organization_code: Optional[str] = Field(None, description="Required for officer role")
    master_admin_code: Optional[str] = Field(None, description="Required for admin role")
    
    class Config:
        json_schema_extra = {
            "example": {
                "google_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
                "role": "officer",
                "organization_code": "NDRF2024"
            }
        }


class RegisterResponse(BaseModel):
    """Registration response"""
    success: bool
    message: str
    email: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "OTP sent to your email",
                "email": "user@example.com"
            }
        }


# ============ OTP Verification Schemas ============

class VerifyOTPRequest(BaseModel):
    """OTP verification request"""
    email: EmailStr = Field(..., description="User email")
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "otp_code": "123456"
            }
        }


class ResendOTPRequest(BaseModel):
    """Resend OTP request"""
    email: EmailStr = Field(..., description="User email")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com"
            }
        }


# ============ Login Schemas ============

class LoginRequest(BaseModel):
    """User login request"""
    google_token: str = Field(..., description="Google OAuth ID token")
    
    class Config:
        json_schema_extra = {
            "example": {
                "google_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
            }
        }


# ============ User Response Schema ============

class UserResponse(BaseModel):
    """User information response"""
    id: int
    email: str
    name: str
    role: str
    profile_picture: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "email": "user@example.com",
                "name": "John Doe",
                "role": "officer",
                "profile_picture": "https://lh3.googleusercontent.com/..."
            }
        }


class LoginResponse(BaseModel):
    """Login response with token"""
    success: bool
    message: str
    access_token: Optional[str] = None
    user: Optional[UserResponse] = None
    email: Optional[str] = None
    needs_verification: Optional[bool] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Login successful",
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "user": {
                    "id": 1,
                    "email": "user@example.com",
                    "name": "John Doe",
                    "role": "officer",
                    "profile_picture": "https://..."
                }
            }
        }


# ============ Generic Response ============

class MessageResponse(BaseModel):
    """Generic message response"""
    success: bool
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Operation successful"
            }
        }
"""
Configuration settings loaded from .env file
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    
    # Gmail
    SENDER_EMAIL: str
    
    # OTP
    OTP_EXPIRY_MINUTES: int = 10
    OTP_LENGTH: int = 6
    MAX_OTP_ATTEMPTS: int = 3
    
    # Organization Codes
    ORG_CODE_NDRF: str
    ORG_CODE_FIRE: str
    ORG_CODE_POLICE: str
    
    # Master Admin Code
    MASTER_ADMIN_CODE: str
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Create single instance
settings = Settings()  # type: ignore
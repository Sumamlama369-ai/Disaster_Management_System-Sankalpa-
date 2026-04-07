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
    SESSION_EXPIRE_MINUTES: int = 60
    SESSION_COOKIE_NAME: str = "session_id"
    
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

    # Aakash SMS API
    AAKASH_SMS_AUTH_TOKEN: str = ""

    # Hugging Face
    HF_API_TOKEN: str = ""

    # Background Tasks
    ENABLE_REDDIT_FETCHING: bool = False

    # YOLO / Real-Time Detection
    YOLO_MODEL_PATH: str = "yolov8n.pt"
    YOLO_CONFIDENCE: float = 0.45
    YOLO_TARGET_FPS: int = 15
    IP_CAM_URL: str = "http://192.168.1.100:8080/video"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# Create single instance
settings = Settings()  # type: ignore
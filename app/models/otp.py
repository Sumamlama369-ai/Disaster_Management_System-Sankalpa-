"""
OTP model - stores one-time passwords for email verification
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from datetime import datetime, timedelta
from app.database.database import Base
from app.core.config import settings


class OTP(Base):
    """OTP table"""
    __tablename__ = "otp"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp_code = Column(String, nullable=False)
    attempts = Column(Integer, default=0)
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    @staticmethod
    def calculate_expiry():
        """Calculate OTP expiration time"""
        return datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
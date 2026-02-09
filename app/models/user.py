"""
User model - stores user information
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from app.database.database import Base
import enum
from sqlalchemy.orm import relationship


class UserRole(str, enum.Enum):
    """User roles"""
    CITIZEN = "citizen"
    OFFICER = "officer"
    ADMIN = "admin"


class User(Base):
    """User table"""
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    google_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CITIZEN)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    profile_picture = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    organization_code = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships - ADD foreign_keys parameter
    drone_permits = relationship(
        "DronePermit", 
        back_populates="user",
        lazy="dynamic"  # ADD THIS
    )
    
    video_analyses = relationship(
        "VideoAnalysis", 
        back_populates="user",
        lazy="dynamic"  # ADD THIS
    )
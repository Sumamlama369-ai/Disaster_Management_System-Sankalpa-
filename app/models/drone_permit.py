"""
Drone Permit model - stores permit requests
"""
from sqlalchemy import Column, ForeignKey, Integer, String, Boolean, DateTime, Text, Float, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base
import enum


class PermitStatus(str, enum.Enum):
    """Permit status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class RegistrationType(str, enum.Enum):
    """Registration type"""
    INDIVIDUAL = "individual"
    COMPANY = "company"


class DronePermit(Base):
    """Drone permit requests table"""
    __tablename__ = "drone_permit"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # User Reference
    user_id = Column(Integer, ForeignKey("user.id", name="drone_permit_user_id_fkey"), nullable=False)
    user_email = Column(String, nullable=False)
    
    # Drone Technical Specifications
    manufacturer = Column(String, nullable=False)
    model = Column(String, nullable=False)
    serial_number = Column(String, nullable=False)
    manufactured_year = Column(Integer, nullable=False)
    drone_type = Column(String, nullable=False)
    max_payload = Column(Float, nullable=False)
    color = Column(String, nullable=False)
    retailer_name = Column(String, nullable=False)
    
    # Documents (file paths)
    purpose_letter = Column(String, nullable=False)  # PDF path
    purchase_bill = Column(String, nullable=False)   # PDF path
    drone_image = Column(String, nullable=False)     # Image path
    citizenship_doc = Column(String, nullable=False) # PDF path
    
    # Operator Information
    registration_type = Column(SQLEnum(RegistrationType), nullable=False)
    full_name = Column(String, nullable=False)
    citizenship_passport_no = Column(String, nullable=False)
    date_of_birth = Column(DateTime, nullable=False)
    phone_number = Column(String, nullable=False)
    email_address = Column(String, nullable=False)
    username = Column(String, nullable=False)
    
    # Address Information
    country = Column(String, nullable=False)
    province = Column(String, nullable=False)
    district = Column(String, nullable=False)
    municipality = Column(String, nullable=False)
    ward_no = Column(String, nullable=False)
    
    # Agreement
    agrees_to_rules = Column(Boolean, default=False, nullable=False)
    
    # Status
    status = Column(SQLEnum(PermitStatus), default=PermitStatus.PENDING, nullable=False)
    
    # Officer Review Details (filled when approved/rejected)
    reviewed_by_officer_id = Column(Integer, nullable=True)
    officer_name = Column(String, nullable=True)
    officer_designation = Column(String, nullable=True)
    officer_organization = Column(String, nullable=True)
    officer_email = Column(String, nullable=True)
    review_remarks = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="drone_permits")

    
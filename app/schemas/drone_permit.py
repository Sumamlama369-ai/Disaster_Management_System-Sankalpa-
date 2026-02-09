"""
Drone Permit Schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, date


class DronePermitCreate(BaseModel):
    """Create drone permit request"""
    # Drone specs
    manufacturer: str
    model: str
    serial_number: str
    manufactured_year: int
    drone_type: str
    max_payload: float
    color: str
    retailer_name: str
    
    # Operator
    registration_type: str  # individual/company
    full_name: str
    citizenship_passport_no: str
    date_of_birth: date
    phone_number: str
    email_address: EmailStr
    username: str
    
    # Address
    country: str
    province: str
    district: str
    municipality: str
    ward_no: str
    
    # Agreement
    agrees_to_rules: bool


class OfficerReview(BaseModel):
    """Officer review decision"""
    permit_id: int
    status: str  # approved/rejected
    officer_name: str
    officer_designation: str
    officer_organization: str
    officer_email: EmailStr
    review_remarks: Optional[str] = None


class PermitResponse(BaseModel):
    """Permit response with ALL fields"""
    id: int
    user_id: int
    user_email: str
    
    # Drone specs
    manufacturer: str
    model: str
    serial_number: str
    manufactured_year: int
    drone_type: str
    max_payload: float
    color: str
    retailer_name: str
    
    # Documents
    purpose_letter: str
    purchase_bill: str
    drone_image: str
    citizenship_doc: str
    
    # Operator
    registration_type: str
    full_name: str
    citizenship_passport_no: str
    date_of_birth: datetime
    phone_number: str
    email_address: str
    username: str
    
    # Address
    country: str
    province: str
    district: str
    municipality: str
    ward_no: str
    
    # Agreement
    agrees_to_rules: bool
    
    # Status
    status: str
    created_at: datetime
    
    # Officer details (if reviewed)
    officer_name: Optional[str] = None
    officer_designation: Optional[str] = None
    officer_organization: Optional[str] = None
    officer_email: Optional[str] = None
    review_remarks: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
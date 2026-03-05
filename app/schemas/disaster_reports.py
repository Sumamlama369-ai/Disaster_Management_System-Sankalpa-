"""
Disaster Reports Models
Pydantic schemas for disaster reporting system
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class DisasterReportCreate(BaseModel):
    """Schema for creating a new disaster report"""
    disaster_type: str = Field(..., min_length=1, max_length=100)
    severity: str = Field(..., pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    description: str = Field(..., min_length=10, max_length=5000)
    latitude: Decimal = Field(..., ge=-90, le=90)
    longitude: Decimal = Field(..., ge=-180, le=180)
    location_accuracy: Optional[Decimal] = Field(None, ge=0)
    reporter_name: Optional[str] = Field("Anonymous", max_length=255)
    reporter_contact: Optional[str] = Field(None, max_length=50)
    
    @validator('disaster_type')
    def validate_disaster_type(cls, v):
        valid_types = ['fire', 'flood', 'earthquake', 'landslide', 'storm', 'other']
        if v.lower() not in valid_types and len(v) > 3:  # Allow custom types if >3 chars
            return v
        return v.lower()
    
    class Config:
        json_schema_extra = {
            "example": {
                "disaster_type": "flood",
                "severity": "HIGH",
                "description": "Severe flooding in residential area. Water level rising rapidly.",
                "latitude": 27.7172,
                "longitude": 85.3240,
                "location_accuracy": 15.5,
                "reporter_name": "Ram Kumar",
                "reporter_contact": "+977-9841234567"
            }
        }


class DisasterReportUpdate(BaseModel):
    """Schema for updating disaster report (officer actions)"""
    status: Optional[str] = Field(None, pattern="^(PENDING|REVIEWING|DISPATCHED|RESCUING|RESOLVED|REJECTED)$")
    assigned_officer_id: Optional[int] = None
    officer_notes: Optional[str] = None
    response_notes: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "DISPATCHED",
                "officer_notes": "Rescue team dispatched to location",
                "assigned_officer_id": 2
            }
        }


class DisasterReportImageCreate(BaseModel):
    """Schema for adding images to disaster report"""
    report_id: int
    image_data: str  # Base64 encoded image
    mime_type: Optional[str] = "image/jpeg"
    
    class Config:
        json_schema_extra = {
            "example": {
                "report_id": 1,
                "image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
                "mime_type": "image/jpeg"
            }
        }


class DisasterReportImageResponse(BaseModel):
    """Schema for disaster report image response"""
    id: int
    report_id: int
    image_url: str
    thumbnail_url: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    uploaded_at: datetime
    display_order: int
    
    class Config:
        from_attributes = True


class DisasterReportResponse(BaseModel):
    """Schema for disaster report response"""
    id: int
    user_id: Optional[int] = None
    reporter_name: str
    reporter_contact: Optional[str] = None
    disaster_type: str
    severity: str
    description: str
    latitude: Decimal
    longitude: Decimal
    location_accuracy: Optional[Decimal] = None
    address: Optional[str] = None
    status: str
    priority: int
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    assigned_officer_id: Optional[int] = None
    assigned_at: Optional[datetime] = None
    officer_notes: Optional[str] = None
    response_notes: Optional[str] = None
    
    # Additional fields from joins
    image_count: Optional[int] = 0
    images: Optional[List[DisasterReportImageResponse]] = []
    
    class Config:
        from_attributes = True


class DisasterReportListResponse(BaseModel):
    """Schema for paginated disaster report list"""
    reports: List[DisasterReportResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class StatusHistoryCreate(BaseModel):
    """Schema for creating status history entry"""
    report_id: int
    previous_status: Optional[str] = None
    new_status: str
    change_notes: Optional[str] = None


class StatusHistoryResponse(BaseModel):
    """Schema for status history response"""
    id: int
    report_id: int
    previous_status: Optional[str] = None
    new_status: str
    changed_by_user_id: Optional[int] = None
    changed_by_name: Optional[str] = None
    changed_by_role: Optional[str] = None
    change_notes: Optional[str] = None
    changed_at: datetime
    
    class Config:
        from_attributes = True


class DroneDeploymentCreate(BaseModel):
    """Schema for creating drone deployment"""
    report_id: int
    drone_id: str = Field(..., min_length=1, max_length=100)
    drone_name: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "report_id": 1,
                "drone_id": "DRONE_001",
                "drone_name": "Rescue Drone Alpha"
            }
        }


class DroneDeploymentUpdate(BaseModel):
    """Schema for updating drone deployment"""
    mission_status: Optional[str] = Field(
        None, 
        pattern="^(DEPLOYED|EN_ROUTE|ON_SITE|RETURNING|COMPLETED|ABORTED)$"
    )
    last_known_latitude: Optional[Decimal] = None
    last_known_longitude: Optional[Decimal] = None
    mission_notes: Optional[str] = None
    distance_traveled: Optional[Decimal] = None
    flight_duration: Optional[int] = None


class DroneDeploymentResponse(BaseModel):
    """Schema for drone deployment response"""
    id: int
    report_id: int
    drone_id: str
    drone_name: Optional[str] = None
    deployed_by_officer_id: Optional[int] = None
    deployed_at: datetime
    mission_status: str
    last_known_latitude: Optional[Decimal] = None
    last_known_longitude: Optional[Decimal] = None
    last_sync_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    mission_notes: Optional[str] = None
    distance_traveled: Optional[Decimal] = None
    flight_duration: Optional[int] = None
    
    class Config:
        from_attributes = True


class DisasterStatistics(BaseModel):
    """Schema for disaster statistics"""
    total_reports: int
    pending_reports: int
    resolved_reports: int
    critical_reports: int
    reports_by_type: dict
    reports_by_severity: dict
    avg_response_time_hours: Optional[float] = None
    active_drones: int


class MapMarker(BaseModel):
    """Schema for map marker (simplified for frontend)"""
    id: int
    type: str  # "report" or "drone"
    latitude: Decimal
    longitude: Decimal
    title: str
    status: str
    severity: Optional[str] = None
    created_at: datetime
    metadata: dict = {}
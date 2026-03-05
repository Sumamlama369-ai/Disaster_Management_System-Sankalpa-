"""
Disaster Reports Database Models
SQLAlchemy ORM models for disaster management
"""
from sqlalchemy import Column, Integer, String, Text, DECIMAL, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base


class DisasterReport(Base):
    """Citizen disaster reports table"""
    __tablename__ = "disaster_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User Information
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=True, index=True)
    reporter_name = Column(String(255), default="Anonymous")
    reporter_contact = Column(String(50), nullable=True)
    
    # Disaster Details
    disaster_type = Column(String(100), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    description = Column(Text, nullable=False)
    
    # Location Data
    latitude = Column(DECIMAL(10, 8), nullable=False)
    longitude = Column(DECIMAL(11, 8), nullable=False)
    location_accuracy = Column(DECIMAL(10, 2), nullable=True)
    address = Column(Text, nullable=True)
    
    # Status Tracking
    status = Column(String(20), default="PENDING", index=True)
    priority = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Officer Assignment
    assigned_officer_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    
    # Notes
    officer_notes = Column(Text, nullable=True)
    response_notes = Column(Text, nullable=True)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')", name="check_severity"),
        CheckConstraint("status IN ('PENDING', 'REVIEWING', 'DISPATCHED', 'RESOLVED', 'REJECTED')", name="check_status"),
    )
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="disaster_reports")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id])
    images = relationship("DisasterReportImage", back_populates="report", cascade="all, delete-orphan")
    status_history = relationship("DisasterReportStatusHistory", back_populates="report", cascade="all, delete-orphan")
    drone_deployments = relationship("DroneDeployment", back_populates="report", cascade="all, delete-orphan")


class DisasterReportImage(Base):
    """Images attached to disaster reports"""
    __tablename__ = "disaster_report_images"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("disaster_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Image Details
    image_path = Column(String(500), nullable=False)
    image_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=True)
    
    # Metadata
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(50), nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    
    # Timestamps
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Ordering
    display_order = Column(Integer, default=0)
    
    # Relationships
    report = relationship("DisasterReport", back_populates="images")


class DisasterReportStatusHistory(Base):
    """Audit trail for status changes"""
    __tablename__ = "disaster_report_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("disaster_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Status Change
    previous_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=False)
    
    # Changed By
    changed_by_user_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    changed_by_name = Column(String(255), nullable=True)
    changed_by_role = Column(String(50), nullable=True)
    
    # Notes
    change_notes = Column(Text, nullable=True)
    
    # Timestamp
    changed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    report = relationship("DisasterReport", back_populates="status_history")
    changed_by = relationship("User")


class DroneDeployment(Base):
    """Drone deployment records (links to Firebase for real-time GPS)"""
    __tablename__ = "drone_deployments"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("disaster_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Drone Details
    drone_id = Column(String(100), nullable=False, index=True)
    drone_name = Column(String(255), nullable=True)
    
    # Deployment Info
    deployed_by_officer_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    deployed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Mission Status
    mission_status = Column(String(50), default="DEPLOYED", index=True)
    
    # Location Tracking (synced from Firebase)
    last_known_latitude = Column(DECIMAL(10, 8), nullable=True)
    last_known_longitude = Column(DECIMAL(11, 8), nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    
    # Mission Results
    arrived_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    mission_notes = Column(Text, nullable=True)
    
    # Metrics
    distance_traveled = Column(DECIMAL(10, 2), nullable=True)
    flight_duration = Column(Integer, nullable=True)
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "mission_status IN ('DEPLOYED', 'EN_ROUTE', 'ON_SITE', 'RETURNING', 'COMPLETED', 'ABORTED')",
            name="check_mission_status"
        ),
    )
    
    # Relationships
    report = relationship("DisasterReport", back_populates="drone_deployments")
    deployed_by = relationship("User")


# ═══════════════════════════════════════════════════════════════
# Update User model to add relationships
# ═══════════════════════════════════════════════════════════════

# Add this to your existing User model in app/models/user.py:
"""
# Add these relationships to User model:

disaster_reports = relationship("DisasterReport", foreign_keys="DisasterReport.user_id", back_populates="user")
assigned_reports = relationship("DisasterReport", foreign_keys="DisasterReport.assigned_officer_id")
deployed_drones = relationship("DroneDeployment", back_populates="deployed_by")
"""
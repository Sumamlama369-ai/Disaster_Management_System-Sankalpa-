from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class VideoAnalysis(Base):
    """Main video analysis table"""
    __tablename__ = "video_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    
    # File information
    original_filename = Column(String(255), nullable=False)
    original_filepath = Column(String(512), nullable=False)
    original_size_mb = Column(Float)
    processed_filepath = Column(String(512))
    
    detection_output_path = Column(String(512))
    segmentation_output_path = Column(String(512))
    
    # Video metadata
    video_duration_seconds = Column(Float)
    total_frames = Column(Integer)
    fps = Column(Integer)
    resolution = Column(String(50))  # e.g., "1280x720"
    
    # Processing status
    processing_status = Column(String(50), default='uploading')  # uploading, processing, completed, failed
    processing_progress = Column(Integer, default=0)  # 0-100
    error_message = Column(Text, nullable=True)
    
    # Analysis results
    overall_severity_score = Column(Float)
    risk_level = Column(String(50))  # low, medium, high, critical
    
    # Timestamps
    upload_timestamp = Column(DateTime, default=datetime.now)
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="video_analyses")
    frame_analyses = relationship("FrameAnalysis", back_populates="video", cascade="all, delete-orphan")
    statistics = relationship("VideoStatistics", back_populates="video", uselist=False, cascade="all, delete-orphan")


class FrameAnalysis(Base):
    """Frame-by-frame analysis results"""
    __tablename__ = "frame_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("video_analysis.id"), nullable=False)
    
    frame_number = Column(Integer, nullable=False)
    timestamp_seconds = Column(Float, nullable=False)
    
    # Detection results (JSON)
    # Example: {"fire": 3, "person": 5, "ambulance": 1, "injured_people": 2}
    detections = Column(JSON, default={})
    detection_confidence = Column(Float)
    detection_boxes = Column(JSON, default=[])  # Bounding box coordinates
    
    # Segmentation results (JSON)
    # Example: {"fire_area": 23.5, "building_area": 12.3, "road_area": 45.2}
    segmentation = Column(JSON, default={})
    segmentation_confidence = Column(Float)
    segmentation_masks = Column(JSON, default=[])  # Mask data (optional, can be large)
    
    # Metrics
    severity_score = Column(Float)
    total_objects = Column(Integer)
    affected_area_percent = Column(Float)
    
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationship
    video = relationship("VideoAnalysis", back_populates="frame_analyses")


class VideoStatistics(Base):
    """Summary statistics for entire video"""
    __tablename__ = "video_statistics"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("video_analysis.id"), nullable=False, unique=True)
    
    # Overall detection counts (JSON)
    # Example: {"fire": 450, "person": 1200, "ambulance": 15, "injured_people": 89}
    total_detections = Column(JSON, default={})
    avg_detection_confidence = Column(Float)
    max_detection_confidence = Column(Float)
    
    # Overall segmentation data (JSON)
    # Example: {"avg_fire_area": 15.3, "max_fire_area": 45.2, "avg_building_area": 30.1}
    avg_affected_area = Column(Float)
    max_affected_area = Column(Float)
    avg_segmentation_confidence = Column(Float)
    max_segmentation_confidence = Column(Float)
    segmentation_summary = Column(JSON, default={})
    
    # Severity analysis
    avg_severity_score = Column(Float)
    max_severity_score = Column(Float)
    peak_severity_frame = Column(Integer)
    peak_severity_timestamp = Column(Float)
    
    # Frame distribution (JSON)
    # Example: {"low": 120, "medium": 450, "high": 890, "critical": 340}
    risk_level_distribution = Column(JSON, default={})
    
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationship
    video = relationship("VideoAnalysis", back_populates="statistics")


# Update User model to include video relationship
# Add this to app/models/user.py:
# video_analyses = relationship("VideoAnalysis", back_populates="user")
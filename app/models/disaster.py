"""
Disaster monitoring models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from datetime import datetime
from app.database.database import Base


class DisasterPost(Base):
    """Reddit posts related to disasters"""
    __tablename__ = "disaster_post"
    
    id = Column(String, primary_key=True)  # Reddit post ID
    title = Column(Text, nullable=False)
    text = Column(Text, nullable=True)
    timestamp = Column(DateTime, nullable=False)
    location = Column(String, nullable=True)
    source_subreddit = Column(String, nullable=False)
    score = Column(Integer, default=0)
    num_comments = Column(Integer, default=0)
    created_utc = Column(Integer, nullable=True)
    url = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class DisasterInsight(Base):
    """Processed disaster insights with NLP"""
    __tablename__ = "disaster_insight"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(String, ForeignKey('disaster_post.id'), unique=True, nullable=False)
    disaster_type = Column(String, nullable=False, index=True)
    severity_score = Column(Integer, nullable=False, index=True)
    sentiment = Column(Float, nullable=False)
    location = Column(String, nullable=True, index=True)
    date_time = Column(String, nullable=True)
    request_offer = Column(String, nullable=True)
    trending_keywords = Column(Text, nullable=True)
    urgency_level = Column(String, nullable=False, index=True)  # low, medium, high, critical
    confidence_score = Column(Float, default=0.0)
    affected_population = Column(String, nullable=True)
    damage_estimate = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class DisasterStats(Base):
    """Live statistics for dashboard"""
    __tablename__ = "disaster_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    total_incidents = Column(Integer, default=0)
    urgent_incidents = Column(Integer, default=0)
    avg_sentiment = Column(Float, default=0.0)
    top_disaster_type = Column(String, nullable=True)
    top_location = Column(String, nullable=True)
    hourly_count = Column(Integer, default=0)
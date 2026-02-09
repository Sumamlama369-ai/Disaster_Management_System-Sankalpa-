"""
Disaster monitoring API endpoints
"""
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from app.database.database import get_db
from app.models.disaster import DisasterPost, DisasterInsight, DisasterStats
from app.models.user import User
from app.api.v1.dependencies.auth import get_current_user
import json
import asyncio


router = APIRouter()


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass


manager = ConnectionManager()


@router.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overall statistics for dashboard"""
    
    # Get latest stats
    latest_stats = db.query(DisasterStats).order_by(
        desc(DisasterStats.timestamp)
    ).first()
    
    if not latest_stats:
        return {
            "total_incidents": 0,
            "urgent_incidents": 0,
            "avg_sentiment": 0.0,
            "top_disaster_type": None,
            "top_location": None,
            "hourly_count": 0
        }
    
    return {
        "total_incidents": latest_stats.total_incidents,
        "urgent_incidents": latest_stats.urgent_incidents,
        "avg_sentiment": latest_stats.avg_sentiment,
        "top_disaster_type": latest_stats.top_disaster_type,
        "top_location": latest_stats.top_location,
        "hourly_count": latest_stats.hourly_count,
        "last_updated": latest_stats.timestamp.isoformat()
    }


@router.get("/dashboard/recent-disasters")
def get_recent_disasters(
    limit: int = 20,
    urgency: Optional[str] = None,
    disaster_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent disaster incidents with filters"""
    
    query = db.query(DisasterInsight).join(DisasterPost)
    
    # Apply filters
    if urgency:
        query = query.filter(DisasterInsight.urgency_level == urgency)
    
    if disaster_type:
        query = query.filter(DisasterInsight.disaster_type == disaster_type)
    
    # Get results
    insights = query.order_by(desc(DisasterPost.timestamp)).limit(limit).all()
    
    results = []
    for insight in insights:
        post = db.query(DisasterPost).filter(DisasterPost.id == insight.post_id).first()
        if post:
            results.append({
                "id": insight.id,
                "title": post.title,
                "disaster_type": insight.disaster_type,
                "location": insight.location,
                "urgency_level": insight.urgency_level,
                "severity_score": insight.severity_score,
                "sentiment": insight.sentiment,
                "timestamp": post.timestamp.isoformat(),
                "source": post.source_subreddit,
                "affected_population": insight.affected_population,
                "damage_estimate": insight.damage_estimate,
                "keywords": insight.trending_keywords
            })
    
    return results


@router.get("/dashboard/disaster-types")
def get_disaster_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get distribution of disaster types"""
    
    results = db.query(
        DisasterInsight.disaster_type,
        func.count(DisasterInsight.id).label('count')
    ).group_by(
        DisasterInsight.disaster_type
    ).order_by(
        desc('count')
    ).all()
    
    return [
        {"disaster_type": r[0], "count": r[1]}
        for r in results
    ]


@router.get("/dashboard/urgency-distribution")
def get_urgency_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get distribution by urgency level"""
    
    results = db.query(
        DisasterInsight.urgency_level,
        func.count(DisasterInsight.id).label('count')
    ).group_by(
        DisasterInsight.urgency_level
    ).all()
    
    return [
        {"urgency_level": r[0], "count": r[1]}
        for r in results
    ]


@router.get("/dashboard/location-hotspots")
def get_location_hotspots(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get top locations with most incidents"""
    
    results = db.query(
        DisasterInsight.location,
        func.count(DisasterInsight.id).label('count')
    ).filter(
        DisasterInsight.location.isnot(None)
    ).group_by(
        DisasterInsight.location
    ).order_by(
        desc('count')
    ).limit(limit).all()
    
    return [
        {"location": r[0], "count": r[1]}
        for r in results
    ]


@router.get("/dashboard/timeline")
def get_disaster_timeline(
    hours: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get disaster timeline for last N hours"""
    
    cutoff = datetime.now() - timedelta(hours=hours)
    
    results = db.query(
        func.date_trunc('hour', DisasterPost.timestamp).label('hour'),
        func.count(DisasterInsight.id).label('count')
    ).join(
        DisasterInsight
    ).filter(
        DisasterPost.timestamp >= cutoff
    ).group_by(
        'hour'
    ).order_by(
        'hour'
    ).all()
    
    return [
        {
            "timestamp": r[0].isoformat(),
            "count": r[1]
        }
        for r in results
    ]


@router.websocket("/dashboard/live")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Send latest stats every 30 seconds
            latest_stats = db.query(DisasterStats).order_by(
                desc(DisasterStats.timestamp)
            ).first()
            
            if latest_stats:
                data = {
                    "type": "stats_update",
                    "data": {
                        "total_incidents": latest_stats.total_incidents,
                        "urgent_incidents": latest_stats.urgent_incidents,
                        "avg_sentiment": latest_stats.avg_sentiment,
                        "top_disaster_type": latest_stats.top_disaster_type,
                        "top_location": latest_stats.top_location,
                        "hourly_count": latest_stats.hourly_count,
                        "timestamp": datetime.now().isoformat()
                    }
                }
                
                await websocket.send_json(data)
            
            await asyncio.sleep(30)  # Update every 30 seconds
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

    
@router.get("/system/status")
def get_system_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get system status and background task info"""
    from app.services.background_tasks import background_tasks
    
    # Get database stats
    from sqlalchemy import func
    total_posts = db.query(func.count(DisasterPost.id)).scalar()
    total_insights = db.query(func.count(DisasterInsight.id)).scalar()
    
    # Get latest post timestamp
    latest_post = db.query(DisasterPost).order_by(
        desc(DisasterPost.timestamp)
    ).first()
    
    return {
        "background_tasks_running": background_tasks.running,
        "last_data_collection": background_tasks.last_collection.isoformat() if background_tasks.last_collection else None,
        "total_posts": total_posts,
        "total_insights": total_insights,
        "latest_post_time": latest_post.timestamp.isoformat() if latest_post else None,
        "database_connected": True
    }
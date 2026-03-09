"""
Disaster Reports API Endpoints
Real-time disaster reporting and officer command center
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
import base64
import threading
import os
from pathlib import Path

from app.database.database import get_db
from app.api.v1.dependencies.auth import get_current_user
from app.models.user import User
from app.models.disaster_reports import (
    DisasterReport,
    DisasterReportImage,
    DisasterReportStatusHistory,
    DroneDeployment
)
from app.schemas.disaster_reports import (
    DisasterReportCreate,
    DisasterReportUpdate,
    DisasterReportResponse,
    DisasterReportListResponse,
    DisasterReportImageCreate,
    DisasterReportImageResponse,
    StatusHistoryResponse,
    DroneDeploymentCreate,
    DroneDeploymentUpdate,
    DroneDeploymentResponse,
    DisasterStatistics,
    MapMarker
)
from app.services.gmail_service import gmail_service

router = APIRouter()

# ═══════════════════════════════════════════════════════════════
# CITIZEN ENDPOINTS - Report Disasters
# ═══════════════════════════════════════════════════════════════

@router.post("/reports", response_model=DisasterReportResponse, status_code=201)
async def create_disaster_report(
    report: DisasterReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new disaster report (Citizen)
    
    - Captures GPS location automatically
    - Sends real-time notification to officers
    - Calculates priority based on severity
    """
    try:
        # Create disaster report
        db_report = DisasterReport(
            user_id=current_user.id,
            reporter_name=report.reporter_name or current_user.name or "Anonymous",
            reporter_contact=report.reporter_contact,
            disaster_type=report.disaster_type,
            severity=report.severity,
            description=report.description,
            latitude=report.latitude,
            longitude=report.longitude,
            location_accuracy=report.location_accuracy,
            status="PENDING"
        )
        
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        
        # Create status history entry
        status_history = DisasterReportStatusHistory(
            report_id=db_report.id,
            previous_status=None,
            new_status="PENDING",
            changed_by_user_id=current_user.id,
            changed_by_name=current_user.name or current_user.email,
            changed_by_role=current_user.role,
            change_notes="Initial report submitted"
        )
        db.add(status_history)
        db.commit()
        
        print(f"✓ Disaster report created: ID={db_report.id}, Type={db_report.disaster_type}, Severity={db_report.severity}")
        
        # TODO: Send real-time notification to officers via WebSocket
        
        return db_report
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error creating disaster report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create disaster report: {str(e)}")


ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
ALLOWED_MEDIA_TYPES = ALLOWED_IMAGE_TYPES + ALLOWED_VIDEO_TYPES


@router.post("/reports/{report_id}/media", response_model=DisasterReportImageResponse)
async def upload_disaster_media(
    report_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload image or video evidence for a disaster report
    
    - Images: JPEG, PNG, WebP (max 10MB)
    - Videos: MP4, WebM, MOV, AVI (max 50MB)
    """
    try:
        report = db.query(DisasterReport).filter(
            DisasterReport.id == report_id,
            DisasterReport.user_id == current_user.id
        ).first()
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        if file.content_type not in ALLOWED_MEDIA_TYPES:
            raise HTTPException(status_code=400, detail="Invalid file format. Use JPEG, PNG, WebP for images or MP4, WebM, MOV for videos.")
        
        contents = await file.read()
        file_size = len(contents)
        
        is_video = file.content_type in ALLOWED_VIDEO_TYPES
        max_size = 50 * 1024 * 1024 if is_video else 10 * 1024 * 1024
        
        if file_size > max_size:
            limit_str = "50MB" if is_video else "10MB"
            raise HTTPException(status_code=400, detail=f"File too large. Max size: {limit_str}")
        
        upload_dir = Path("uploads/disaster_images")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        ext = Path(file.filename or ("video.mp4" if is_video else "image.jpg")).suffix
        filename = f"report_{report_id}_{timestamp}{ext}"
        file_path = upload_dir / filename
        
        with open(file_path, "wb") as f:
            f.write(contents)
        
        db_image = DisasterReportImage(
            report_id=report_id,
            image_path=str(file_path),
            image_url=f"/uploads/disaster_images/{filename}",
            file_size=file_size,
            mime_type=file.content_type,
            display_order=db.query(func.count(DisasterReportImage.id)).filter(
                DisasterReportImage.report_id == report_id
            ).scalar() or 0
        )
        
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
        
        media_type = "Video" if is_video else "Image"
        print(f"✓ {media_type} uploaded for report {report_id}: {filename}")
        
        return db_image
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"✗ Error uploading media: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload media: {str(e)}")


# Keep legacy endpoint for backwards compatibility
@router.post("/reports/{report_id}/images", response_model=DisasterReportImageResponse)
async def upload_disaster_image(
    report_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Legacy endpoint - redirects to media upload"""
    return await upload_disaster_media(report_id, file, db, current_user)


@router.get("/reports/{report_id}/media", response_model=List[DisasterReportImageResponse])
async def get_report_media(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all media (images/videos) for a specific report
    """
    report = db.query(DisasterReport).filter(DisasterReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if current_user.role == "citizen" and report.user_id != current_user.id:  # type: ignore[arg-type]
        raise HTTPException(status_code=403, detail="Access denied")
    
    media = db.query(DisasterReportImage).filter(
        DisasterReportImage.report_id == report_id
    ).order_by(DisasterReportImage.display_order).all()
    
    return media


@router.get("/reports/my-reports", response_model=DisasterReportListResponse)
async def get_my_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's disaster reports
    
    - Paginated list
    - Filter by status
    - Includes image count
    """
    query = db.query(DisasterReport).filter(DisasterReport.user_id == current_user.id)
    
    if status:
        query = query.filter(DisasterReport.status == status)
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    reports = query.order_by(DisasterReport.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    # Add image counts
    for report in reports:
        report.image_count = db.query(func.count(DisasterReportImage.id)).filter(
            DisasterReportImage.report_id == report.id
        ).scalar() or 0
    
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "reports": reports,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ═══════════════════════════════════════════════════════════════
# OFFICER ENDPOINTS - Command Center
# ═══════════════════════════════════════════════════════════════

@router.get("/reports", response_model=DisasterReportListResponse)
async def get_all_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    disaster_type: Optional[str] = None,
    assigned_to_me: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all disaster reports (Officers only)
    
    - View all citizen reports
    - Filter by status, severity, type
    - View assigned reports
    """
    # Check if user is officer
    if current_user.role not in ["officer", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Officers only.")
    
    query = db.query(DisasterReport)
    
    # Filters
    if status:
        query = query.filter(DisasterReport.status == status)
    
    if severity:
        query = query.filter(DisasterReport.severity == severity)
    
    if disaster_type:
        query = query.filter(DisasterReport.disaster_type == disaster_type)
    
    if assigned_to_me:
        query = query.filter(DisasterReport.assigned_officer_id == current_user.id)
    
    # Get total count
    total = query.count()
    
    # Get paginated results (ordered by priority and time)
    reports = query.order_by(
        DisasterReport.priority.desc(),
        DisasterReport.created_at.desc()
    ).offset((page - 1) * page_size).limit(page_size).all()
    
    # Add image counts
    for report in reports:
        report.image_count = db.query(func.count(DisasterReportImage.id)).filter(
            DisasterReportImage.report_id == report.id
        ).scalar() or 0
    
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "reports": reports,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/reports/{report_id}", response_model=DisasterReportResponse)
async def get_report_details(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific report
    
    - Full report details
    - All uploaded images
    - Status history
    """
    report = db.query(DisasterReport).filter(DisasterReport.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check access: citizens can only see their own reports, officers can see all
    if current_user.role == "citizen" and report.user_id != current_user.id:  # type: ignore[arg-type]
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get images
    images = db.query(DisasterReportImage).filter(
        DisasterReportImage.report_id == report_id
    ).order_by(DisasterReportImage.display_order).all()
    
    report.images = images
    report.image_count = len(images)
    
    return report


@router.patch("/reports/{report_id}", response_model=DisasterReportResponse)
async def update_report_status(
    report_id: int,
    update: DisasterReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update disaster report status (Officers only)
    
    - Change status
    - Assign to officer
    - Add notes
    """
    # Check if user is officer
    if current_user.role not in ["officer", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Officers only.")
    
    report = db.query(DisasterReport).filter(DisasterReport.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    previous_status = report.status
    
    # Update fields
    if update.status:
        report.status = update.status  # type: ignore[assignment]
        if update.status == "RESOLVED":
            report.resolved_at = datetime.utcnow()  # type: ignore[assignment]
    
    if update.assigned_officer_id is not None:
        report.assigned_officer_id = update.assigned_officer_id  # type: ignore[assignment]
        report.assigned_at = datetime.utcnow()  # type: ignore[assignment]
    
    if update.officer_notes:
        report.officer_notes = update.officer_notes  # type: ignore[assignment]
    
    if update.response_notes:
        report.response_notes = update.response_notes  # type: ignore[assignment]
    
    db.commit()
    db.refresh(report)
    
    # Create status history if status changed
    if update.status and update.status != previous_status:
        status_history = DisasterReportStatusHistory(
            report_id=report_id,
            previous_status=previous_status,
            new_status=update.status,
            changed_by_user_id=current_user.id,
            changed_by_name=current_user.name or current_user.email,
            changed_by_role=current_user.role,
            change_notes=update.officer_notes or f"Status changed to {update.status}"
        )
        db.add(status_history)
        db.commit()

        # Send email notification to the reporting citizen
        if report.user_id:  # type: ignore[arg-type]
            reporter = db.query(User).filter(User.id == report.user_id).first()
            if reporter and reporter.email:  # type: ignore[arg-type]
                _email = str(reporter.email)
                _name = str(reporter.name or report.reporter_name or "Citizen")
                _dtype = str(report.disaster_type)
                _status = str(update.status)
                _notes = str(update.officer_notes or update.response_notes or "")
                def _send_notification():
                    try:
                        gmail_service.send_report_status_email(
                            to_email=_email,
                            name=_name,
                            report_id=report_id,
                            disaster_type=_dtype,
                            new_status=_status,
                            officer_notes=_notes
                        )
                    except Exception as e:
                        print(f"⚠️ Failed to send notification email: {e}")
                threading.Thread(target=_send_notification, daemon=True).start()
    
    print(f"✓ Report {report_id} updated by officer {current_user.id}")
    
    return report


@router.get("/reports/{report_id}/history", response_model=List[StatusHistoryResponse])
async def get_report_history(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get status change history for a report
    """
    # Verify report exists
    report = db.query(DisasterReport).filter(DisasterReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check access
    if current_user.role == "citizen" and report.user_id != current_user.id:  # type: ignore[arg-type]
        raise HTTPException(status_code=403, detail="Access denied")
    
    history = db.query(DisasterReportStatusHistory).filter(
        DisasterReportStatusHistory.report_id == report_id
    ).order_by(DisasterReportStatusHistory.changed_at.desc()).all()
    
    return history


# ═══════════════════════════════════════════════════════════════
# MAP ENDPOINTS - Real-time Visualization
# ═══════════════════════════════════════════════════════════════

@router.get("/map/markers", response_model=List[MapMarker])
async def get_map_markers(
    status_filter: Optional[str] = Query(None, description="Filter by status: PENDING, DISPATCHED, etc."),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all active disaster reports as map markers (Officers only)
    
    - Returns latitude, longitude, and metadata for each report
    - Used to display citizen help requests on map
    """
    if current_user.role not in ["officer", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Officers only.")
    
    query = db.query(DisasterReport).filter(
        DisasterReport.status.in_(["PENDING", "REVIEWING", "DISPATCHED"])
    )
    
    if status_filter:
        query = query.filter(DisasterReport.status == status_filter)
    
    reports = query.all()
    
    markers = []
    for report in reports:
        markers.append(MapMarker(
            id=report.id,  # type: ignore[arg-type]
            type="report",
            latitude=report.latitude,  # type: ignore[arg-type]
            longitude=report.longitude,  # type: ignore[arg-type]
            title=f"{report.disaster_type.upper()} - {report.reporter_name}",
            status=report.status,  # type: ignore[arg-type]
            severity=report.severity,  # type: ignore[arg-type]
            created_at=report.created_at,  # type: ignore[arg-type]
            metadata={
                "disaster_type": report.disaster_type,
                "description": str(report.description)[:100] + "..." if len(str(report.description)) > 100 else str(report.description),
                "full_description": str(report.description),
                "reporter_name": report.reporter_name,
                "reporter_contact": report.reporter_contact,
                "priority": report.priority,
                "officer_notes": report.officer_notes,
                "response_notes": report.response_notes,
                "user_id": report.user_id,
                "media_count": db.query(func.count(DisasterReportImage.id)).filter(
                    DisasterReportImage.report_id == report.id
                ).scalar() or 0,
            }
        ))
    
    return markers


# ═══════════════════════════════════════════════════════════════
# DRONE DEPLOYMENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.post("/drones/deploy", response_model=DroneDeploymentResponse, status_code=201)
async def deploy_drone(
    deployment: DroneDeploymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deploy a drone to a disaster location (Officers only)
    
    - Links drone to report
    - Tracks deployment time
    - Drone GPS updates will be in Firebase
    """
    if current_user.role not in ["officer", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Officers only.")
    
    # Verify report exists
    report = db.query(DisasterReport).filter(DisasterReport.id == deployment.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Create drone deployment record
    db_deployment = DroneDeployment(
        report_id=deployment.report_id,
        drone_id=deployment.drone_id,
        drone_name=deployment.drone_name,
        deployed_by_officer_id=current_user.id,
        mission_status="DEPLOYED"
    )
    
    db.add(db_deployment)
    
    # Update report status
    if report.status == "PENDING":  # type: ignore[arg-type]
        report.status = "DISPATCHED"  # type: ignore[assignment]
    
    db.commit()
    db.refresh(db_deployment)
    
    print(f"✓ Drone {deployment.drone_id} deployed to report {deployment.report_id}")
    
    # TODO: Send command to drone via Firebase
    
    return db_deployment


@router.get("/drones/active", response_model=List[DroneDeploymentResponse])
async def get_active_drones(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all active drone deployments (Officers only)
    
    - Returns drones currently on mission
    - Includes last known location (synced from Firebase)
    """
    if current_user.role not in ["officer", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Officers only.")
    
    deployments = db.query(DroneDeployment).filter(
        DroneDeployment.mission_status.in_(["DEPLOYED", "EN_ROUTE", "ON_SITE", "RETURNING"])
    ).all()
    
    return deployments


# ═══════════════════════════════════════════════════════════════
# STATISTICS ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/statistics", response_model=DisasterStatistics)
async def get_disaster_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get disaster reporting statistics (Officers only)
    
    - Total reports, pending, resolved
    - Breakdown by type and severity
    - Average response time
    """
    if current_user.role not in ["officer", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Officers only.")
    
    total_reports = db.query(func.count(DisasterReport.id)).scalar() or 0
    pending_reports = db.query(func.count(DisasterReport.id)).filter(
        DisasterReport.status == "PENDING"
    ).scalar() or 0
    resolved_reports = db.query(func.count(DisasterReport.id)).filter(
        DisasterReport.status == "RESOLVED"
    ).scalar() or 0
    critical_reports = db.query(func.count(DisasterReport.id)).filter(
        DisasterReport.severity == "CRITICAL"
    ).scalar() or 0
    
    # Reports by type
    reports_by_type_query = db.query(
        DisasterReport.disaster_type,
        func.count(DisasterReport.id).label('count')
    ).group_by(DisasterReport.disaster_type).all()
    
    reports_by_type = {row.disaster_type: row.count for row in reports_by_type_query}
    
    # Reports by severity
    reports_by_severity_query = db.query(
        DisasterReport.severity,
        func.count(DisasterReport.id).label('count')
    ).group_by(DisasterReport.severity).all()
    
    reports_by_severity = {row.severity: row.count for row in reports_by_severity_query}
    
    # Average response time (resolved reports only)
    avg_response_time = db.query(
        func.avg(
            func.extract('epoch', DisasterReport.resolved_at - DisasterReport.created_at) / 3600
        )
    ).filter(DisasterReport.resolved_at.isnot(None)).scalar()
    
    # Active drones
    active_drones = db.query(func.count(DroneDeployment.id)).filter(
        DroneDeployment.mission_status.in_(["DEPLOYED", "EN_ROUTE", "ON_SITE", "RETURNING"])
    ).scalar() or 0
    
    return DisasterStatistics(
        total_reports=total_reports,
        pending_reports=pending_reports,
        resolved_reports=resolved_reports,
        critical_reports=critical_reports,
        reports_by_type=reports_by_type,
        reports_by_severity=reports_by_severity,
        avg_response_time_hours=float(avg_response_time) if avg_response_time else None,
        active_drones=active_drones
    )
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from datetime import datetime

from app.database.database import get_db
from app.models.user import User
from app.models.video import VideoAnalysis, FrameAnalysis, VideoStatistics
from app.api.v1.dependencies.auth import get_current_user
from app.services.video_processor import VideoProcessor

router = APIRouter()

# Initialize video processor (singleton)
video_processor = VideoProcessor()

# Allowed video formats
ALLOWED_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB


@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload video for analysis
    
    Process:
    1. Validate file
    2. Save to uploads/original
    3. Create database record
    4. Start background processing
    """
    
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()  # type: ignore
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Create unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_filename = file.filename
    safe_filename = f"{current_user.id}_{timestamp}_{original_filename}"
    original_filepath = f"uploads/original/{safe_filename}"
    
    try:
        # Save uploaded file
        with open(original_filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size
        file_size_mb = os.path.getsize(original_filepath) / (1024 * 1024)
        
        # Validate file size
        if file_size_mb > 500:
            os.remove(original_filepath)
            raise HTTPException(
                status_code=400,
                detail=f"File too large ({file_size_mb:.1f} MB). Max: 500 MB"
            )
        
        # Create database record
        video = VideoAnalysis(
            user_id=current_user.id,
            original_filename=original_filename,
            original_filepath=original_filepath,
            original_size_mb=round(file_size_mb, 2),
            processing_status='uploading',
            processing_progress=0
        )
        
        db.add(video)
        db.commit()
        db.refresh(video)
        
        # Start background processing
        background_tasks.add_task(
            video_processor.process_video,
            video.id,  # type: ignore
            db
        )
        
        return {
            "success": True,
            "message": "Video uploaded successfully. Processing started.",
            "video_id": video.id,
            "filename": original_filename,
            "size_mb": file_size_mb,
            "status": "processing"
        }
        
    except Exception as e:
        # Cleanup on error
        if os.path.exists(original_filepath):
            os.remove(original_filepath)
        
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/status/{video_id}")
async def get_video_status(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get video processing status"""
    
    video = db.query(VideoAnalysis).filter(
        VideoAnalysis.id == video_id,
        VideoAnalysis.user_id == current_user.id
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return {
        "video_id": video.id,
        "filename": video.original_filename,
        "status": video.processing_status,
        "progress": video.processing_progress,
        "error_message": video.error_message,
        "upload_timestamp": video.upload_timestamp,
        "processing_started_at": video.processing_started_at,
        "processing_completed_at": video.processing_completed_at,
    }


@router.get("/list")
async def list_videos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 10
):
    """List user's videos"""
    
    videos = db.query(VideoAnalysis).filter(
        VideoAnalysis.user_id == current_user.id
    ).order_by(
        VideoAnalysis.upload_timestamp.desc()
    ).offset(skip).limit(limit).all()
    
    return {
        "videos": [
            {
                "id": v.id,
                "filename": v.original_filename,
                "status": v.processing_status,
                "upload_timestamp": v.upload_timestamp,
                "duration_seconds": v.video_duration_seconds,
                "severity_score": v.overall_severity_score,
                "risk_level": v.risk_level,
            }
            for v in videos
        ]
    }


@router.get("/analysis/{video_id}")
async def get_video_analysis(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get complete video analysis results"""
    
    video = db.query(VideoAnalysis).filter(
        VideoAnalysis.id == video_id,
        VideoAnalysis.user_id == current_user.id
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if video.processing_status != 'completed':  # type: ignore
        raise HTTPException(
            status_code=400,
            detail=f"Video processing not completed. Status: {video.processing_status}"
        )
    
    # Get statistics
    stats = db.query(VideoStatistics).filter(
        VideoStatistics.video_id == video_id
    ).first()
    
    # Get frame analyses (sample every 10th frame for performance)
    frame_analyses = db.query(FrameAnalysis).filter(
        FrameAnalysis.video_id == video_id,
        FrameAnalysis.frame_number % 10 == 0  # Sample frames
    ).order_by(FrameAnalysis.frame_number).all()
    
    # IMPORTANT: Convert file paths to web-accessible URLs
    # Remove 'uploads/' prefix if present and normalize path separators
    detection_path = video.detection_output_path.replace('\\', '/')  # type: ignore
    segmentation_path = video.segmentation_output_path.replace('\\', '/')  # type: ignore
    
    # Ensure paths start with /uploads/
    if not detection_path.startswith('/uploads/'):
        if detection_path.startswith('uploads/'):
            detection_path = '/' + detection_path
        else:
            detection_path = '/uploads/' + detection_path
    if not segmentation_path.startswith('/uploads/'):
        if segmentation_path.startswith('uploads/'):
            segmentation_path = '/' + segmentation_path
        else:
            segmentation_path = '/uploads/' + segmentation_path
    
    return {
        "video_info": {
            "id": video.id,
            "filename": video.original_filename,
            "duration_seconds": video.video_duration_seconds,
            "total_frames": video.total_frames,
            "fps": video.fps,
            "resolution": video.resolution,
            "severity_score": video.overall_severity_score,
            "risk_level": video.risk_level,
        },
        "statistics": {
            "total_detections": stats.total_detections if stats else {},
            "avg_detection_confidence": stats.avg_detection_confidence if stats else 0,
            "avg_affected_area": stats.avg_affected_area if stats else 0,
            "max_affected_area": stats.max_affected_area if stats else 0,
            "segmentation_summary": stats.segmentation_summary if stats else {},
            "avg_severity_score": stats.avg_severity_score if stats else 0,
            "max_severity_score": stats.max_severity_score if stats else 0,
            "peak_severity_frame": stats.peak_severity_frame if stats else 0,
            "risk_level_distribution": stats.risk_level_distribution if stats else {},
        },
        "frame_timeline": [
            {
                "frame_number": f.frame_number,
                "timestamp_seconds": f.timestamp_seconds,
                "detections": f.detections,
                "segmentation": f.segmentation,
                "severity_score": f.severity_score,
                "total_objects": f.total_objects,
                "affected_area_percent": f.affected_area_percent,
            }
            for f in frame_analyses
        ],
        "video_urls": {
            "detection_output": detection_path,      # e.g., /uploads/detection_output/video_4_detection.mp4
            "segmentation_output": segmentation_path  # e.g., /uploads/segmentation_output/video_4_segmentation.mp4
        }
    }


@router.get("/stream/{video_id}/{output_type}")
async def stream_video(
    video_id: int,
    output_type: str,  # 'detection' or 'segmentation'
    db: Session = Depends(get_db)
):
    """
    Stream processed video
    
    Note: No authentication required for streaming since <video> tags 
    cannot send Authorization headers. Videos are only accessible if 
    you know the video_id.
    """
    
    # Find video (removed user_id check)
    video = db.query(VideoAnalysis).filter(
        VideoAnalysis.id == video_id
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if video.processing_status != 'completed':  # type: ignore
        raise HTTPException(status_code=400, detail="Video processing not completed")
    
    # Get video path based on type
    if output_type == 'detection':
        video_path = video.detection_output_path
    elif output_type == 'segmentation':
        video_path = video.segmentation_output_path
    else:
        raise HTTPException(status_code=400, detail="Invalid output type. Use 'detection' or 'segmentation'")
    
    if not video_path or not os.path.exists(video_path):  # type: ignore
        raise HTTPException(status_code=404, detail="Output video not found")
    
    from fastapi.responses import FileResponse
    
    return FileResponse(
        video_path,  # type: ignore
        media_type="video/mp4",
        filename=f"{output_type}_{video.original_filename}"
    )


@router.delete("/delete/{video_id}")
async def delete_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete video and all associated files"""
    
    video = db.query(VideoAnalysis).filter(
        VideoAnalysis.id == video_id,
        VideoAnalysis.user_id == current_user.id
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Delete files
    files_to_delete = [
        video.original_filepath,
        video.processed_filepath,
        video.detection_output_path,
        video.segmentation_output_path
    ]
    
    for file_path in files_to_delete:
        if file_path and os.path.exists(file_path):  # type: ignore
            os.remove(file_path)  # type: ignore
    
    # Delete database records (cascade will handle frame_analysis and statistics)
    db.delete(video)
    db.commit()
    
    return {
        "success": True,
        "message": "Video deleted successfully"
    }
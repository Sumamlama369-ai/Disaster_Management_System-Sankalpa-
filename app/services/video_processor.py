import cv2
import os
import threading
from typing import Dict, Callable
from datetime import datetime
from sqlalchemy.orm import Session

from app.services.yolo_detector import YOLODetector
from app.services.yolo_segmenter import YOLOSegmenter
from app.utils.video_converter import VideoConverter
from app.utils.severity_calculator import SeverityCalculator
from app.models.video import VideoAnalysis, FrameAnalysis, VideoStatistics

class VideoProcessor:
    """Main video processing pipeline"""
    
    def __init__(
        self, 
        detection_model_path: str = "models/best_multiclass_detect.pt",
        segmentation_model_path: str = "models/best_multiclass_seg.pt"
    ):
        """Initialize video processor with YOLO models"""
        self.detector = YOLODetector(detection_model_path)
        self.segmenter = YOLOSegmenter(segmentation_model_path)
        self.converter = VideoConverter()
        self.severity_calc = SeverityCalculator()
        
        # Create output directories
        os.makedirs("uploads/original", exist_ok=True)
        os.makedirs("uploads/processed", exist_ok=True)
        os.makedirs("uploads/detection_output", exist_ok=True)
        os.makedirs("uploads/segmentation_output", exist_ok=True)
        
        print("✓ Video processor initialized")
    
    def process_video(
        self, 
        video_id: int,
        db: Session,
        progress_callback: Callable[[int], None] = None  # type: ignore
    ):
        """
        Process video with detection and segmentation
        
        Args:
            video_id: Database ID of video to process
            db: Database session
            progress_callback: Optional callback for progress updates (0-100)
        """
        try:
            # Get video record
            video = db.query(VideoAnalysis).filter(VideoAnalysis.id == video_id).first()
            
            if not video:
                raise ValueError(f"Video {video_id} not found")
            
            print(f"\n{'='*60}")
            print(f"🎬 Processing Video ID: {video_id}")
            print(f"{'='*60}")
            
            # Update status
            video.processing_status = 'processing'  # type: ignore
            video.processing_started_at = datetime.now()  # type: ignore
            db.commit()
            
            # Step 1: Convert video
            if progress_callback:
                progress_callback(5)
            
            print("\n📹 Step 1: Converting video to 720p @ 15fps...")
            processed_path = f"uploads/processed/video_{video_id}_720p.mp4"
            
            success, message = self.converter.convert_to_720p(
                video.original_filepath,  # type: ignore
                processed_path,
                target_fps=15
            )
            
            if not success:
                raise Exception(f"Video conversion failed: {message}")
            
            print(f"✓ {message}")
            video.processed_filepath = processed_path  # type: ignore
            db.commit()
            
            # Get video info
            video_info = self.converter.get_video_info(processed_path)
            video.total_frames = video_info['frame_count']  # type: ignore
            video.fps = video_info['fps']  # type: ignore
            video.resolution = f"{video_info['width']}x{video_info['height']}"  # type: ignore
            video.video_duration_seconds = video_info['duration']  # type: ignore
            db.commit()
            
            if progress_callback:
                progress_callback(10)
            
            # Step 2: Process frames
            print("\n🔍 Step 2: Processing frames with YOLO models...")
            
            detection_output_path = f"uploads/detection_output/video_{video_id}_detection.mp4"
            segmentation_output_path = f"uploads/segmentation_output/video_{video_id}_segmentation.mp4"
            
            frame_results = self._process_frames(
                processed_path,
                detection_output_path,
                segmentation_output_path,
                video_id,
                db,
                progress_callback
            )
            
            video.detection_output_path = detection_output_path  # type: ignore
            video.segmentation_output_path = segmentation_output_path  # type: ignore
            db.commit()
            
            # Step 3: Calculate statistics
            if progress_callback:
                progress_callback(95)
            
            print("\n📊 Step 3: Calculating overall statistics...")
            self._calculate_statistics(video_id, frame_results, db)
            
            # Step 4: Finalize
            if progress_callback:
                progress_callback(100)
            
            video.processing_status = 'completed'  # type: ignore
            video.processing_completed_at = datetime.now()  # type: ignore
            db.commit()
            
            print(f"\n✅ Video processing completed successfully!")
            print(f"{'='*60}\n")
            
        except Exception as e:
            print(f"\n❌ Error processing video: {e}")
            
            # Update status
            video = db.query(VideoAnalysis).filter(VideoAnalysis.id == video_id).first()
            if video:
                video.processing_status = 'failed'  # type: ignore
                video.error_message = str(e)  # type: ignore
                db.commit()
            
            raise e
    
    def _process_frames(
        self,
        video_path: str,
        detection_output_path: str,
        segmentation_output_path: str,
        video_id: int,
        db: Session,
        progress_callback: Callable[[int], None] = None  # type: ignore
    ) -> list:
        """Process all frames and save annotated videos"""
        
        import cv2
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        
        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"📹 Video properties: {width}x{height} @ {fps}fps, {total_frames} frames")
        
        # Use X264 codec for better compatibility
        fourcc = cv2.VideoWriter_fourcc(*'X264')  # type: ignore
        
        # Create video writers
        detection_writer = cv2.VideoWriter(
            detection_output_path, 
            fourcc, 
            fps, 
            (width, height)
        )
        
        segmentation_writer = cv2.VideoWriter(
            segmentation_output_path, 
            fourcc, 
            fps, 
            (width, height)
        )
        
        # Verify writers opened successfully
        if not detection_writer.isOpened():
            print("⚠️ X264 failed, trying mp4v...")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # type: ignore
            detection_writer = cv2.VideoWriter(detection_output_path, fourcc, fps, (width, height))
            segmentation_writer = cv2.VideoWriter(segmentation_output_path, fourcc, fps, (width, height))
        
        if not detection_writer.isOpened() or not segmentation_writer.isOpened():
            raise ValueError("❌ Failed to create video writers")
        
        print(f"✓ Video writers created successfully")
        
        frame_results = []
        frame_number = 0
        frames_written = 0
        
        print(f"Processing {total_frames} frames...")
        
        while True:
            ret, frame = cap.read()
            
            if not ret:
                break
            
            # Verify frame is valid
            if frame is None or frame.size == 0:
                print(f"⚠️ Warning: Empty frame at {frame_number}, skipping")
                frame_number += 1
                continue
            
            try:
                # Process frame with both models
                detections = self.detector.detect(frame)
                segmentation = self.segmenter.segment(frame)
                
                # Calculate severity
                severity_score = self.severity_calc.calculate_combined_score(detections, segmentation)
                affected_area = segmentation.get('total_area_percent', 0.0)
                
                # Convert NumPy types to Python types
                frame_analysis = FrameAnalysis(
                    video_id=video_id,
                    frame_number=frame_number,
                    timestamp_seconds=round(frame_number / fps, 2),
                    detections=detections['counts'],
                    detection_confidence=float(detections['avg_confidence']),
                    segmentation=segmentation['areas'],
                    segmentation_confidence=float(segmentation['avg_confidence']),
                    severity_score=float(severity_score),
                    total_objects=int(detections['total']),
                    affected_area_percent=float(affected_area)
                )
                
                db.add(frame_analysis)
                
                if frame_number % 100 == 0:
                    db.commit()
                
                frame_results.append({
                    'frame_number': frame_number,
                    'severity_score': float(severity_score),
                    'detections': detections,
                    'segmentation': segmentation,
                })
                
                # Draw annotations on COPIES of the frame
                detection_frame = self.detector.draw_detections(frame.copy(), detections)
                segmentation_frame = self.segmenter.draw_segmentation(frame.copy(), segmentation)
                
                # Ensure frames are valid BGR images
                if detection_frame is None or detection_frame.size == 0:
                    detection_frame = frame.copy()
                
                if segmentation_frame is None or segmentation_frame.size == 0:
                    segmentation_frame = frame.copy()
                
                # Ensure correct color format (BGR)
                if len(detection_frame.shape) == 2:  # Grayscale
                    detection_frame = cv2.cvtColor(detection_frame, cv2.COLOR_GRAY2BGR)
                
                if len(segmentation_frame.shape) == 2:  # Grayscale
                    segmentation_frame = cv2.cvtColor(segmentation_frame, cv2.COLOR_GRAY2BGR)
                
                # Ensure correct dimensions
                if detection_frame.shape[:2] != (height, width):
                    detection_frame = cv2.resize(detection_frame, (width, height))
                
                if segmentation_frame.shape[:2] != (height, width):
                    segmentation_frame = cv2.resize(segmentation_frame, (width, height))
                
                # Write frames
                detection_writer.write(detection_frame)
                segmentation_writer.write(segmentation_frame)
                frames_written += 1
                
                # Update progress
                if progress_callback and frame_number % 10 == 0:
                    progress_percent = int(10 + (frame_number / total_frames) * 85)
                    progress_callback(progress_percent)
                
                # Print progress
                if frame_number % 100 == 0:
                    print(f"  Processed {frame_number}/{total_frames} frames ({(frame_number/total_frames)*100:.1f}%)")
            
            except Exception as e:
                print(f"⚠️ Error processing frame {frame_number}: {e}")
                # Continue with next frame instead of failing
            
            frame_number += 1
        
        # Final commit
        db.commit()
        
        # Release resources
        cap.release()
        detection_writer.release()
        segmentation_writer.release()
        
        print(f"✓ Processed {frame_number} frames, wrote {frames_written} frames")
        print(f"✓ Detection video: {detection_output_path}")
        print(f"✓ Segmentation video: {segmentation_output_path}")
        
        # Verify output files exist and have size
        import os
        if os.path.exists(detection_output_path):
            size_mb = os.path.getsize(detection_output_path) / (1024 * 1024)
            print(f"✓ Detection video size: {size_mb:.2f} MB")
        else:
            print(f"❌ Detection video not created!")
        
        if os.path.exists(segmentation_output_path):
            size_mb = os.path.getsize(segmentation_output_path) / (1024 * 1024)
            print(f"✓ Segmentation video size: {size_mb:.2f} MB")
        else:
            print(f"❌ Segmentation video not created!")
        
        # Re-encode for browser compatibility (optional - requires FFmpeg)
        print("📹 Attempting to re-encode videos for browser compatibility...")
        
        # Check if FFmpeg is available
        if self._is_ffmpeg_available():
            temp_det = detection_output_path + '.temp.mp4'
            temp_seg = segmentation_output_path + '.temp.mp4'
            
            # Rename originals to temp
            os.rename(detection_output_path, temp_det)
            os.rename(segmentation_output_path, temp_seg)
            
            # Re-encode detection video
            if self._reencode_video(temp_det, detection_output_path):
                os.remove(temp_det)
            else:
                # Restore original if re-encoding failed
                os.rename(temp_det, detection_output_path)
                print("⚠️ Using original detection video (not re-encoded)")
            
            # Re-encode segmentation video
            if self._reencode_video(temp_seg, segmentation_output_path):
                os.remove(temp_seg)
            else:
                # Restore original if re-encoding failed
                os.rename(temp_seg, segmentation_output_path)
                print("⚠️ Using original segmentation video (not re-encoded)")
        else:
            print("⚠️ FFmpeg not found. Videos may not play in browser.")
            print("   Install FFmpeg and add to PATH for better compatibility.")
        
        return frame_results
    
    def _is_ffmpeg_available(self) -> bool:
        """Check if FFmpeg is available in the system PATH"""
        import subprocess
        import shutil
        
        # Try shutil.which first (faster)
        if shutil.which('ffmpeg'):
            return True
        
        # Try running ffmpeg
        try:
            subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def _reencode_video(self, input_path: str, output_path: str):
        """Re-encode video using FFmpeg for better compatibility"""
        import subprocess
        
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-y',  # Overwrite output
            output_path
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            print(f"✓ Re-encoded: {output_path}")
            return True
        except Exception as e:
            print(f"❌ Re-encode failed: {e}")
            return False
    
    def _calculate_statistics(self, video_id: int, frame_results: list, db: Session):
        """Calculate and store overall video statistics"""
        
        # Aggregate detection counts
        total_detections = {}
        detection_confidences = []
        
        # Aggregate segmentation areas
        segmentation_areas = {}
        segmentation_confidences = []
        
        # Severity scores
        severity_scores = []
        
        for frame in frame_results:
            # Detections
            for class_name, count in frame['detections']['counts'].items():
                if class_name not in total_detections:
                    total_detections[class_name] = 0
                total_detections[class_name] += count
            
            if frame['detections']['avg_confidence'] > 0:
                detection_confidences.append(float(frame['detections']['avg_confidence']))
            
            # Segmentation
            for class_name, area in frame['segmentation']['areas'].items():
                if class_name not in segmentation_areas:
                    segmentation_areas[class_name] = []
                segmentation_areas[class_name].append(float(area))
            
            if frame['segmentation']['avg_confidence'] > 0:
                segmentation_confidences.append(float(frame['segmentation']['avg_confidence']))
            
            # Severity
            severity_scores.append(float(frame['severity_score']))
        
        # Calculate averages
        import numpy as np
        
        # Convert all NumPy results to Python types
        avg_detection_conf = float(np.mean(detection_confidences)) if detection_confidences else 0.0
        max_detection_conf = float(np.max(detection_confidences)) if detection_confidences else 0.0
        
        avg_segmentation_conf = float(np.mean(segmentation_confidences)) if segmentation_confidences else 0.0
        max_segmentation_conf = float(np.max(segmentation_confidences)) if segmentation_confidences else 0.0
        
        # Segmentation summary
        seg_summary = {}
        total_affected_areas = []
        
        for class_name, areas in segmentation_areas.items():
            seg_summary[f'avg_{class_name}_area'] = float(np.mean(areas))
            seg_summary[f'max_{class_name}_area'] = float(np.max(areas))
            total_affected_areas.extend(areas)
        
        avg_affected_area = float(np.mean(total_affected_areas)) if total_affected_areas else 0.0
        max_affected_area = float(np.max(total_affected_areas)) if total_affected_areas else 0.0
        
        # Overall severity
        overall_severity = self.severity_calc.calculate_overall_severity(severity_scores)
        
        # Convert overall severity values to Python types
        avg_severity = float(overall_severity['avg_severity'])
        max_severity = float(overall_severity['max_severity'])
        peak_frame = int(overall_severity['peak_frame'])
        
        # Create statistics record
        stats = VideoStatistics(
            video_id=video_id,
            total_detections=total_detections,
            avg_detection_confidence=round(avg_detection_conf, 3),
            max_detection_confidence=round(max_detection_conf, 3),
            avg_affected_area=round(avg_affected_area, 2),
            max_affected_area=round(max_affected_area, 2),
            avg_segmentation_confidence=round(avg_segmentation_conf, 3),
            max_segmentation_confidence=round(max_segmentation_conf, 3),
            segmentation_summary=seg_summary,
            avg_severity_score=avg_severity,
            max_severity_score=max_severity,
            peak_severity_frame=peak_frame,
            peak_severity_timestamp=round(peak_frame / 15, 2),  # Assuming 15 fps
            risk_level_distribution=overall_severity['risk_distribution']
        )
        
        db.add(stats)
        
        # Update video record - CONVERT NumPy types here too!
        video = db.query(VideoAnalysis).filter(VideoAnalysis.id == video_id).first()
        video.overall_severity_score = float(avg_severity)  # type: ignore
        video.risk_level = self.severity_calc.get_risk_level(avg_severity)  # type: ignore
        
        db.commit()
        
        print(f"✓ Statistics calculated and stored")
        print(f"  Average Severity: {avg_severity}/10")
        print(f"  Risk Level: {video.risk_level.upper()}")  # type: ignore
        print(f"  Total Detections: {sum(total_detections.values())}")
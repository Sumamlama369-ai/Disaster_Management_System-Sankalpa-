import cv2
import os
from typing import Tuple

class VideoConverter:
    """Convert and optimize videos for processing"""
    
    @staticmethod
    def get_video_info(video_path: str) -> dict:
        """Get video metadata"""
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        
        info = {
            'fps': int(cap.get(cv2.CAP_PROP_FPS)),
            'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'duration': 0.0,
        }
        
        if info['fps'] > 0:
            info['duration'] = info['frame_count'] / info['fps']
        
        cap.release()
        return info
    
    @staticmethod
    def convert_to_720p(input_path: str, output_path: str, target_fps: int = 15) -> Tuple[bool, str]:
        """
        Convert video to 720p @ 15fps for efficient processing
        
        Args:
            input_path: Path to input video
            output_path: Path to output video
            target_fps: Target FPS (default: 15)
        
        Returns:
            Tuple of (success, message)
        """
        try:
            # Open input video
            cap = cv2.VideoCapture(input_path)
            
            if not cap.isOpened():
                return False, f"Cannot open video: {input_path}"
            
            # Get original properties
            original_fps = int(cap.get(cv2.CAP_PROP_FPS))
            original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            # Calculate target dimensions (720p = 1280x720)
            target_height = 720
            aspect_ratio = original_width / original_height
            target_width = int(target_height * aspect_ratio)
            
            # Ensure even dimensions (required by some codecs)
            target_width = target_width - (target_width % 2)
            target_height = target_height - (target_height % 2)
            
            # Create video writer
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # type: ignore
            out = cv2.VideoWriter(output_path, fourcc, target_fps, (target_width, target_height))
            
            if not out.isOpened():
                return False, f"Cannot create output video: {output_path}"
            
            # Calculate frame skip ratio
            frame_skip = max(1, original_fps // target_fps)
            
            frame_count = 0
            written_count = 0
            
            while True:
                ret, frame = cap.read()
                
                if not ret:
                    break
                
                # Skip frames to reduce FPS
                if frame_count % frame_skip == 0:
                    # Resize frame
                    resized_frame = cv2.resize(frame, (target_width, target_height))
                    
                    # Write frame
                    out.write(resized_frame)
                    written_count += 1
                
                frame_count += 1
            
            # Release resources
            cap.release()
            out.release()
            
            return True, f"Converted: {frame_count} frames → {written_count} frames @ {target_fps} fps"
            
        except Exception as e:
            return False, f"Conversion error: {str(e)}"
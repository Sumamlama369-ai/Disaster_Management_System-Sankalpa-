from ultralytics import YOLO  # type: ignore
import cv2
import numpy as np
from typing import Dict
import os

class YOLOSegmenter:
    """YOLOv8 Instance Segmentation Wrapper"""
    
    def __init__(self, model_path: str = "models/best_multiclass_seg.pt"):
        """Initialize YOLO segmentation model"""
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Segmentation model not found at {model_path}")
        
        self.model = YOLO(model_path)
        
        # Class names (update based on your trained model)
        self.class_names = [
            'ambulance', 'boat', 'building', 'fire', 
            'fire_and_smoke', 'person', 'road'
        ]
        
        # Colors for masks (BGR format)
        self.colors = {
            'ambulance': (0, 255, 255),       # Yellow
            'boat': (255, 144, 30),            # Blue
            'building': (128, 128, 128),       # Gray
            'fire': (0, 0, 255),               # Red
            'fire_and_smoke': (0, 69, 255),    # Dark Orange
            'person': (255, 0, 255),           # Magenta
            'road': (64, 64, 64),              # Dark Gray
        }
        
        print(f"✓ Segmentation model loaded from {model_path}")
    
    def segment(self, frame: np.ndarray, conf_threshold: float = 0.25) -> Dict:
        """
        Segment objects in a frame
        
        Args:
            frame: Input frame (numpy array)
            conf_threshold: Confidence threshold (0-1)
        
        Returns:
            Dictionary with segmentation results
        """
        # Run segmentation
        results = self.model(frame, conf=conf_threshold, verbose=False)
        
        segmentation = {
            'masks': [],
            'classes': [],
            'confidences': [],
            'areas': {},
            'total_area_percent': 0.0,
        }
        
        # Initialize areas for all classes
        for class_name in self.class_names:
            segmentation['areas'][class_name] = 0.0
        
        # Get frame dimensions
        frame_height, frame_width = frame.shape[:2]
        total_pixels = frame_height * frame_width
        
        # Process results
        if len(results) > 0:
            result = results[0]
            
            if result.masks is not None:
                masks = result.masks.data.cpu().numpy()
                boxes = result.boxes
                
                for i, mask in enumerate(masks):
                    # Get class and confidence
                    cls_id = int(boxes.cls[i].cpu().numpy())
                    confidence = float(boxes.conf[i].cpu().numpy())
                    
                    # Get class name
                    class_name = self.model.names[cls_id] if cls_id < len(self.model.names) else 'unknown'
                    
                    # Resize mask to frame size
                    mask_resized = cv2.resize(mask, (frame_width, frame_height))
                    
                    # Calculate area
                    mask_pixels = np.sum(mask_resized > 0.5)
                    area_percent = (mask_pixels / total_pixels) * 100
                    
                    # Store segmentation
                    segmentation['masks'].append(mask_resized)
                    segmentation['classes'].append(class_name)
                    segmentation['confidences'].append(confidence)
                    
                    # Update areas
                    if class_name in segmentation['areas']:
                        segmentation['areas'][class_name] += area_percent
                    else:
                        segmentation['areas'][class_name] = area_percent
                    
                    segmentation['total_area_percent'] += area_percent
        
        # Calculate average confidence
        segmentation['avg_confidence'] = (
            np.mean(segmentation['confidences']) if segmentation['confidences'] else 0.0
        )
        
        return segmentation
    
    def draw_segmentation(self, frame: np.ndarray, segmentation: Dict, alpha: float = 0.5) -> np.ndarray:
        """
        Draw segmentation masks on frame
        
        Args:
            frame: Input frame
            segmentation: Segmentation results from segment()
            alpha: Transparency (0-1)
        
        Returns:
            Annotated frame
        """
        annotated_frame = frame.copy()
        overlay = frame.copy()
        
        # Draw each mask
        for i, mask in enumerate(segmentation['masks']):
            class_name = segmentation['classes'][i]
            confidence = segmentation['confidences'][i]
            
            # Get color
            color = self.colors.get(class_name, (255, 255, 255))
            
            # Create colored mask
            colored_mask = np.zeros_like(frame)
            colored_mask[mask > 0.5] = color
            
            # Blend with overlay
            overlay = cv2.addWeighted(overlay, 1, colored_mask, alpha, 0)
        
        # Blend overlay with original frame
        annotated_frame = cv2.addWeighted(annotated_frame, 1 - alpha, overlay, alpha, 0)
        
        # Draw legend
        y_offset = 30
        for class_name, area_percent in segmentation['areas'].items():
            if area_percent > 0:
                color = self.colors.get(class_name, (255, 255, 255))
                text = f"{class_name}: {area_percent:.1f}%"
                
                # Draw colored box
                cv2.rectangle(annotated_frame, (10, y_offset - 15), (30, y_offset), color, -1)
                
                # Draw text
                cv2.putText(
                    annotated_frame,
                    text,
                    (35, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 255, 255),
                    1
                )
                
                y_offset += 25
        
        # Draw total affected area
        total_text = f"Total Affected: {segmentation['total_area_percent']:.1f}%"
        cv2.putText(
            annotated_frame,
            total_text,
            (10, frame.shape[0] - 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )
        
        return annotated_frame
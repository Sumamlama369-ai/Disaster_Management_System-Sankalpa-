from ultralytics import YOLO  # type: ignore
import cv2
import numpy as np
from typing import List, Dict, Tuple
import os

class YOLODetector:
    """YOLOv8 Object Detection Wrapper"""
    
    def __init__(self, model_path: str = "models/best_multiclass_detect.pt"):
        """Initialize YOLO detection model"""
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Detection model not found at {model_path}")
        
        self.model = YOLO(model_path)
        
        # Class names (update based on your trained model)
        self.class_names = [
            'ambulance', 'boat', 'fire', 'forest', 
            'injured_people', 'landslide', 'person', 'tent'
        ]
        
        # Colors for visualization (BGR format)
        self.colors = {
            'ambulance': (0, 255, 255),      # Yellow
            'boat': (255, 144, 30),           # Blue
            'fire': (0, 0, 255),              # Red
            'forest': (0, 255, 0),            # Green
            'injured_people': (0, 140, 255),  # Orange
            'landslide': (139, 69, 19),       # Brown
            'person': (255, 0, 255),          # Magenta
            'tent': (203, 192, 255),          # Pink
        }
        
        print(f"✓ Detection model loaded from {model_path}")
    
    def detect(self, frame: np.ndarray, conf_threshold: float = 0.25) -> Dict:
        """
        Detect objects in a frame
        
        Args:
            frame: Input frame (numpy array)
            conf_threshold: Confidence threshold (0-1)
        
        Returns:
            Dictionary with detection results
        """
        # Run detection
        results = self.model(frame, conf=conf_threshold, verbose=False)
        
        detections = {
            'boxes': [],
            'classes': [],
            'confidences': [],
            'counts': {},
            'total': 0,
        }
        
        # Initialize counts for all classes
        for class_name in self.class_names:
            detections['counts'][class_name] = 0
        
        # Process results
        if len(results) > 0:
            result = results[0]
            boxes = result.boxes
            
            for box in boxes:
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                
                # Get class and confidence
                cls_id = int(box.cls[0].cpu().numpy())
                confidence = float(box.conf[0].cpu().numpy())
                
                # Get class name
                class_name = self.model.names[cls_id] if cls_id < len(self.model.names) else 'unknown'
                
                # Store detection
                detections['boxes'].append([int(x1), int(y1), int(x2), int(y2)])
                detections['classes'].append(class_name)
                detections['confidences'].append(confidence)
                
                # Update counts
                if class_name in detections['counts']:
                    detections['counts'][class_name] += 1
                else:
                    detections['counts'][class_name] = 1
                
                detections['total'] += 1
        
        # Calculate average confidence
        detections['avg_confidence'] = (
            np.mean(detections['confidences']) if detections['confidences'] else 0.0
        )
        
        return detections
    
    def draw_detections(self, frame: np.ndarray, detections: Dict) -> np.ndarray:
        """
        Draw bounding boxes on frame
        
        Args:
            frame: Input frame
            detections: Detection results from detect()
        
        Returns:
            Annotated frame
        """
        annotated_frame = frame.copy()
        
        for i, box in enumerate(detections['boxes']):
            x1, y1, x2, y2 = box
            class_name = detections['classes'][i]
            confidence = detections['confidences'][i]
            
            # Get color
            color = self.colors.get(class_name, (255, 255, 255))
            
            # Draw rectangle
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            
            # Draw label background
            label = f"{class_name}: {confidence:.2f}"
            (label_width, label_height), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(
                annotated_frame, 
                (x1, y1 - label_height - 10), 
                (x1 + label_width, y1), 
                color, 
                -1
            )
            
            # Draw label text
            cv2.putText(
                annotated_frame, 
                label, 
                (x1, y1 - 5), 
                cv2.FONT_HERSHEY_SIMPLEX, 
                0.5, 
                (0, 0, 0), 
                1
            )
        
        # Draw summary info
        summary_text = f"Objects: {detections['total']} | Conf: {detections['avg_confidence']:.2f}"
        cv2.putText(
            annotated_frame,
            summary_text,
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )
        
        return annotated_frame
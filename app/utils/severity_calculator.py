from typing import Dict

class SeverityCalculator:
    """Calculate disaster severity scores from detection and segmentation results"""
    
    # Severity weights for each disaster class
    DETECTION_WEIGHTS = {
        'fire': 2.0,
        'injured_people': 1.8,
        'landslide': 1.7,
        'ambulance': 1.2,
        'tent': 0.8,
        'boat': 0.6,
        'person': 0.4,
        'forest': 0.2,
    }
    
    SEGMENTATION_WEIGHTS = {
        'fire': 2.5,
        'fire_and_smoke': 2.3,
        'building': 1.5,
        'road': 0.8,
        'boat': 0.5,
        'ambulance': 1.0,
        'person': 0.3,
    }
    
    @staticmethod
    def calculate_detection_score(detections: Dict) -> float:
        """
        Calculate severity score from detection results
        
        Args:
            detections: Detection counts dict (e.g., {'fire': 3, 'person': 5})
        
        Returns:
            Severity score (0-10)
        """
        score = 0.0
        
        detection_counts = detections.get('counts', {})
        
        for class_name, count in detection_counts.items():
            weight = SeverityCalculator.DETECTION_WEIGHTS.get(class_name, 0.5)
            
            # Score increases with count, but with diminishing returns
            # Formula: weight * log2(count + 1)
            if count > 0:
                import math
                score += weight * math.log2(count + 1)
        
        # Normalize to 0-10 range
        # Max expected score ~20, so divide by 2
        normalized_score = min(score / 2, 10.0)
        
        return round(normalized_score, 2)
    
    @staticmethod
    def calculate_segmentation_score(segmentation: Dict) -> float:
        """
        Calculate severity score from segmentation results
        
        Args:
            segmentation: Segmentation areas dict (e.g., {'fire_area': 23.5, 'building_area': 12.3})
        
        Returns:
            Severity score (0-10)
        """
        score = 0.0
        
        areas = segmentation.get('areas', {})
        
        for class_name, area_percent in areas.items():
            weight = SeverityCalculator.SEGMENTATION_WEIGHTS.get(class_name, 0.5)
            
            # Score based on affected area percentage
            # Formula: weight * (area_percent / 10)
            # 100% area = weight * 10
            score += weight * (area_percent / 10)
        
        # Normalize to 0-10 range
        normalized_score = min(score, 10.0)
        
        return round(normalized_score, 2)
    
    @staticmethod
    def calculate_combined_score(
        detections: Dict, 
        segmentation: Dict, 
        detection_weight: float = 0.4,
        segmentation_weight: float = 0.6
    ) -> float:
        """
        Calculate combined severity score
        
        Args:
            detections: Detection results
            segmentation: Segmentation results
            detection_weight: Weight for detection score (default: 0.4)
            segmentation_weight: Weight for segmentation score (default: 0.6)
        
        Returns:
            Combined severity score (0-10)
        """
        detection_score = SeverityCalculator.calculate_detection_score(detections)
        segmentation_score = SeverityCalculator.calculate_segmentation_score(segmentation)
        
        combined = (
            detection_score * detection_weight + 
            segmentation_score * segmentation_weight
        )
        
        return round(combined, 2)
    
    @staticmethod
    def get_risk_level(severity_score: float) -> str:
        """
        Get risk level from severity score
        
        Args:
            severity_score: Severity score (0-10)
        
        Returns:
            Risk level: 'low', 'medium', 'high', or 'critical'
        """
        if severity_score >= 7.5:
            return 'critical'
        elif severity_score >= 5.0:
            return 'high'
        elif severity_score >= 2.5:
            return 'medium'
        else:
            return 'low'
    
    @staticmethod
    def calculate_overall_severity(frame_severities: list) -> Dict:
        """
        Calculate overall video severity from frame severities
        
        Args:
            frame_severities: List of severity scores for each frame
        
        Returns:
            Dict with avg, max, peak_frame, risk_distribution
        """
        if not frame_severities:
            return {
                'avg_severity': 0.0,
                'max_severity': 0.0,
                'peak_frame': 0,
                'risk_distribution': {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
            }
        
        import numpy as np
        
        # Convert NumPy results to Python types
        avg_severity = float(np.mean(frame_severities))
        max_severity = float(np.max(frame_severities))
        peak_frame = int(np.argmax(frame_severities))
        
        # Calculate risk distribution
        risk_distribution = {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
        
        for score in frame_severities:
            risk_level = SeverityCalculator.get_risk_level(float(score))
            risk_distribution[risk_level] += 1
        
        return {
            'avg_severity': round(avg_severity, 2),
            'max_severity': round(max_severity, 2),
            'peak_frame': peak_frame,
            'risk_distribution': risk_distribution
        }
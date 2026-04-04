"""
YOLO Object Detection Service
Real-time object detection using YOLOv8 with IP camera streaming.
"""
import cv2
import asyncio
import logging
from typing import Optional
from ultralytics import YOLO
from app.core.config import settings

logger = logging.getLogger(__name__)

# Global YOLO model instance (loaded once)
_yolo_model = None


def load_yolo_model():
    """Load YOLOv8 model once and cache it."""
    global _yolo_model
    if _yolo_model is None:
        model_path = settings.YOLO_MODEL_PATH
        logger.info(f"Loading YOLO model: {model_path}")
        _yolo_model = YOLO(model_path)
        logger.info("YOLO model loaded successfully.")
    return _yolo_model


class IPCameraStream:
    """Manages connection to IP webcam or device webcam with auto-reconnect."""

    def __init__(self, source):
        """source: URL string for IP camera, or int (0) for device webcam."""
        self.source = source
        self.cap = None
        self.connected = False

    def connect(self) -> bool:
        if self.cap:
            self.cap.release()

        if isinstance(self.source, int):
            logger.info(f"Opening device webcam index: {self.source}")
        else:
            logger.info(f"Connecting to IP camera: {self.source}")

        self.cap = cv2.VideoCapture(self.source)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        if self.cap.isOpened():
            self.connected = True
            logger.info("Camera connected successfully.")
            return True

        self.connected = False
        logger.error("Failed to connect to camera.")
        return False

    def read_frame(self):
        if not self.cap or not self.connected:
            return None

        ret, frame = self.cap.read()
        if not ret:
            self.connected = False
            return None

        return frame

    def release(self):
        if self.cap:
            self.cap.release()
            self.connected = False


async def stream_yolo_detections(websocket, confidence: Optional[float] = None, ip_cam_url: Optional[str] = None, use_webcam: bool = False):
    """Stream YOLO detections to a WebSocket client."""
    if confidence is None:
        confidence = settings.YOLO_CONFIDENCE

    # Determine camera source: device webcam (index 0) or IP camera URL
    if use_webcam:
        cam_source = 0  # device webcam
    else:
        cam_source = ip_cam_url or settings.IP_CAM_URL

    model = load_yolo_model()
    camera = IPCameraStream(cam_source)

    if not camera.connect():
        source_label = "device webcam" if use_webcam else f"IP camera ({cam_source})"
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to connect to {source_label}."
        })
        return

    await websocket.send_json({
        "type": "connected",
        "message": "Surveillance stream started",
        "confidence": confidence
    })

    frame_delay = 1.0 / settings.YOLO_TARGET_FPS
    frame_count = 0

    try:
        while True:
            frame = camera.read_frame()

            if frame is None:
                logger.warning("Stream lost, attempting reconnect...")
                await websocket.send_json({
                    "type": "warning",
                    "message": "Stream lost, reconnecting..."
                })

                await asyncio.sleep(2)
                if not camera.connect():
                    break
                continue

            results = model(frame, conf=confidence, verbose=False)[0]
            annotated_frame = results.plot()

            _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            frame_bytes = buffer.tobytes()

            # Build per-detection details
            det_details = []
            class_counts = {}
            conf_sum = 0.0
            for box in results.boxes:
                cls_id = int(box.cls[0])
                cls_name = model.names.get(cls_id, f"class_{cls_id}")
                conf = float(box.conf[0])
                det_details.append({"class": cls_name, "confidence": round(conf, 3)})
                class_counts[cls_name] = class_counts.get(cls_name, 0) + 1
                conf_sum += conf

            num_det = len(results.boxes)
            await websocket.send_json({
                "type": "frame",
                "frame_id": frame_count,
                "detections": num_det,
                "size": len(frame_bytes),
                "details": det_details,
                "class_counts": class_counts,
                "avg_confidence": round(conf_sum / num_det, 3) if num_det > 0 else 0,
            })

            await websocket.send_bytes(frame_bytes)

            frame_count += 1
            await asyncio.sleep(frame_delay)

    except Exception as e:
        logger.error(f"Streaming error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })
    finally:
        camera.release()
        logger.info("Stream ended, camera released.")

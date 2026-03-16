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
    """Manages connection to IP webcam with auto-reconnect."""

    def __init__(self, url: str):
        self.url = url
        self.cap = None
        self.connected = False

    def connect(self) -> bool:
        if self.cap:
            self.cap.release()

        logger.info(f"Connecting to IP camera: {self.url}")
        self.cap = cv2.VideoCapture(self.url)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        if self.cap.isOpened():
            self.connected = True
            logger.info("IP camera connected successfully.")
            return True

        self.connected = False
        logger.error("Failed to connect to IP camera.")
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


async def stream_yolo_detections(websocket, confidence: Optional[float] = None, ip_cam_url: Optional[str] = None):
    """Stream YOLO detections to a WebSocket client."""
    if confidence is None:
        confidence = settings.YOLO_CONFIDENCE

    cam_url = ip_cam_url or settings.IP_CAM_URL
    model = load_yolo_model()
    camera = IPCameraStream(cam_url)

    if not camera.connect():
        await websocket.send_json({
            "type": "error",
            "message": "Failed to connect to IP camera. Check IP_CAM_URL in .env"
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

            await websocket.send_json({
                "type": "frame",
                "frame_id": frame_count,
                "detections": len(results.boxes),
                "size": len(frame_bytes)
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

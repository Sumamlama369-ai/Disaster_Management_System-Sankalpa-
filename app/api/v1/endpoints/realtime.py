"""
Real-Time YOLO Object Detection WebSocket Endpoint
Streams annotated video frames with detection metadata.
"""
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database.database import SessionLocal
from app.models.user import User
from app.services.yolo_service import stream_yolo_detections

logger = logging.getLogger(__name__)
router = APIRouter()


def _authenticate_ws_token(token: str) -> Optional[dict]:
    """
    Validate a JWT token for WebSocket connections.
    Returns the payload dict if valid, None otherwise.

    WebSockets cannot use the standard HTTPBearer dependency,
    so the token is passed as a query parameter instead.
    """
    payload = decode_token(token)
    if not payload:
        return None

    # Verify user exists and is active in the database
    user_id = payload.get("user_id")
    if not user_id:
        return None

    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.is_active is False:
            return None
        payload["_user_email"] = user.email
        payload["_user_role"] = user.role.value if user.role is not None else None
    finally:
        db.close()

    return payload


@router.websocket("/detect")
async def realtime_detect(
    websocket: WebSocket,
    token: str = Query(...),
    confidence: float = Query(default=0.45, ge=0.1, le=0.95),
    ip_cam_url: Optional[str] = Query(default=None),
):
    """
    WebSocket endpoint for real-time YOLO object detection.

    Connect with: ws://<host>/api/v1/realtime/detect?token=<jwt>&confidence=0.45

    Streams alternating messages:
      1. JSON metadata  {"type": "frame", "frame_id": N, "detections": D, "size": S}
      2. Binary JPEG bytes of the annotated frame
    """
    await websocket.accept()

    try:
        # Validate JWT passed as query param
        payload = _authenticate_ws_token(token)
        if not payload:
            await websocket.send_json({
                "type": "error",
                "message": "Invalid or expired token."
            })
            await websocket.close(code=4001)
            return

        user_id = payload.get("user_id")
        logger.info(f"Surveillance stream started for user: {user_id}")

        # Start streaming detections
        await stream_yolo_detections(websocket, confidence=confidence, ip_cam_url=ip_cam_url)

    except WebSocketDisconnect:
        logger.info("Client disconnected from surveillance stream.")
    except Exception as e:
        logger.error(f"Surveillance stream error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

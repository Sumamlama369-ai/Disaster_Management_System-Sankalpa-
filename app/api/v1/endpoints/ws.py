"""
WebSocket endpoint for real-time data change notifications.

Clients connect and subscribe to channels. When data changes on the backend,
a lightweight notification is pushed so the frontend can re-fetch via REST.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import List, Optional
import json

from app.services.ws_manager import ws_manager

router = APIRouter()


@router.websocket("/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    channels: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for data change notifications.

    Connect with query param: ?channels=reports,disasters,citizens
    Or send a subscribe message after connecting:
      {"action": "subscribe", "channels": ["reports", "disasters"]}
    """
    await websocket.accept()

    # Subscribe to channels from query param
    initial_channels = []
    if channels:
        initial_channels = [ch.strip() for ch in channels.split(",") if ch.strip()]

    if initial_channels:
        await ws_manager.subscribe(websocket, initial_channels)

    try:
        while True:
            # Listen for subscribe/unsubscribe messages from client
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action")
                ch_list = msg.get("channels", [])

                if action == "subscribe" and ch_list:
                    await ws_manager.subscribe(websocket, ch_list)
                    await websocket.send_text(json.dumps({
                        "type": "subscribed",
                        "channels": ch_list
                    }))
                elif action == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except (json.JSONDecodeError, KeyError):
                pass

    except WebSocketDisconnect:
        await ws_manager.unsubscribe(websocket)
    except Exception:
        await ws_manager.unsubscribe(websocket)

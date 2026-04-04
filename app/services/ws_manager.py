"""
Centralized WebSocket Manager for real-time data push notifications.

Instead of frontend polling the database at intervals, this manager
broadcasts "data changed" notifications to connected WebSocket clients.
Each client subscribes to channels (e.g., "reports", "disasters", "citizens").
When backend mutations occur, they call notify() to push updates.
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
import json
import asyncio


class WebSocketManager:
    """
    Manages WebSocket connections organized by channels.

    Channels:
      - "reports"    : disaster reports, statistics, map markers
      - "disasters"  : NLP disaster data (stats, recent, types, urgency, hotspots, timeline)
      - "citizens"   : citizen registry changes
      - "video:{id}" : specific video processing status
      - "users"      : user list changes
      - "permits"    : permit changes
    """

    def __init__(self):
        # channel_name -> set of WebSocket connections
        self.channels: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, websocket: WebSocket, channels: List[str]):
        """Subscribe a WebSocket connection to one or more channels."""
        async with self._lock:
            for channel in channels:
                if channel not in self.channels:
                    self.channels[channel] = set()
                self.channels[channel].add(websocket)

    async def unsubscribe(self, websocket: WebSocket):
        """Remove a WebSocket from all channels."""
        async with self._lock:
            for channel in list(self.channels.keys()):
                self.channels[channel].discard(websocket)
                if not self.channels[channel]:
                    del self.channels[channel]

    async def notify(self, channel: str, event: str = "update"):
        """
        Notify all subscribers of a channel that data has changed.
        Sends a lightweight JSON message: {"channel": "...", "event": "..."}
        The frontend then re-fetches data via existing REST endpoints.
        """
        if channel not in self.channels:
            return

        message = json.dumps({"channel": channel, "event": event})
        dead_connections = set()

        for ws in self.channels.get(channel, set()).copy():
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.add(ws)

        # Clean up dead connections
        if dead_connections:
            async with self._lock:
                for ws in dead_connections:
                    for ch in list(self.channels.keys()):
                        self.channels[ch].discard(ws)
                        if not self.channels[ch]:
                            del self.channels[ch]


# Global singleton instance
ws_manager = WebSocketManager()

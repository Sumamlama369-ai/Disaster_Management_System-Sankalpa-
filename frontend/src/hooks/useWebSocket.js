import { useEffect, useRef, useCallback } from 'react';

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace(/^http/, 'ws');

/**
 * Hook to subscribe to backend WebSocket data-change notifications.
 *
 * When the backend mutates data for a channel, it pushes a lightweight
 * notification. This hook calls your `onNotify` callback so you can
 * re-fetch the data through existing REST endpoints.
 *
 * @param {string[]} channels - Channels to subscribe to (e.g., ["reports", "disasters"])
 * @param {(channel: string, event: string) => void} onNotify - Called when a channel has new data
 * @param {object} [options]
 * @param {boolean} [options.enabled=true] - Whether the connection should be active
 */
export default function useWebSocket(channels, onNotify, options = {}) {
  const { enabled = true } = options;
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const onNotifyRef = useRef(onNotify);
  const channelsRef = useRef(channels);

  // Keep refs up to date without re-triggering the effect
  useEffect(() => { onNotifyRef.current = onNotify; }, [onNotify]);
  useEffect(() => { channelsRef.current = channels; }, [channels]);

  const connect = useCallback(() => {
    if (!enabled || channelsRef.current.length === 0) return;

    // Build URL with channels query param
    const channelParam = channelsRef.current.join(',');
    const url = `${WS_BASE}/api/v1/ws/notifications?channels=${encodeURIComponent(channelParam)}`;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        // Clear any pending reconnect
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.channel && onNotifyRef.current) {
            onNotifyRef.current(msg.channel, msg.event || 'update');
          }
        } catch {
          // ignore non-JSON messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        // Auto-reconnect after 3 seconds
        if (enabled) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        // onclose will fire after this, triggering reconnect
      };

      wsRef.current = ws;
    } catch {
      // Retry connection after 3 seconds
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, [enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}

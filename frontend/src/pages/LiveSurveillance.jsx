import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

// ─── Chart colors for detected classes ────────────────────────────
const CLASS_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#78716c',
];
const MAX_HISTORY = 30;

export default function LiveSurveillance() {
  const { token } = useAuth();
  const [streaming, setStreaming] = useState(false);
  const [confidence, setConfidence] = useState(0.45);
  const [ipCamUrl, setIpCamUrl] = useState('');
  const [fps, setFps] = useState(0);
  const [detections, setDetections] = useState(0);
  const [frameId, setFrameId] = useState(0);
  const [status, setStatus] = useState('offline');
  const [showSettings, setShowSettings] = useState(false);

  // ─── Analytics state ─────────────────────────────────────────────
  const [classCounts, setClassCounts] = useState({});
  const [avgConfidence, setAvgConfidence] = useState(0);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [classHistory, setClassHistory] = useState({});
  const [confidenceHistory, setConfidenceHistory] = useState([]);
  const [detectionDetails, setDetectionDetails] = useState([]);
  const [totalDetected, setTotalDetected] = useState(0);

  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const fpsTimestamps = useRef([]);

  const updateFps = useCallback(() => {
    const now = performance.now();
    fpsTimestamps.current.push(now);
    if (fpsTimestamps.current.length > 30) fpsTimestamps.current.shift();
    const stamps = fpsTimestamps.current;
    if (stamps.length >= 2) {
      const elapsed = (stamps[stamps.length - 1] - stamps[0]) / 1000;
      setFps(Math.round((stamps.length - 1) / elapsed));
    }
  }, []);

  const drawFrame = useCallback((blob) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(blob);
  }, []);

  const startStream = useCallback(() => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    let wsUrl = `${WS_BASE}/api/v1/realtime/detect?token=${token}&confidence=${confidence}`;
    if (ipCamUrl.trim()) {
      wsUrl += `&ip_cam_url=${encodeURIComponent(ipCamUrl.trim())}`;
    } else {
      wsUrl += `&use_webcam=true`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setStatus('connecting');

    ws.onopen = () => {
      setStatus('connected');
      setStreaming(true);
      fpsTimestamps.current = [];
    };

    ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        drawFrame(event.data);
        updateFps();
      } else {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'frame') {
            setDetections(msg.detections);
            setFrameId(msg.frame_id);
            // Analytics data
            if (msg.class_counts) setClassCounts(msg.class_counts);
            if (msg.avg_confidence !== undefined) setAvgConfidence(msg.avg_confidence);
            if (msg.details) setDetectionDetails(msg.details);
            setTotalDetected(prev => prev + msg.detections);
            // Time-series history
            const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setDetectionHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), { time: ts, count: msg.detections }]);
            setConfidenceHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), { time: ts, value: msg.avg_confidence || 0 }]);
            if (msg.class_counts) {
              setClassHistory(prev => {
                const next = { ...prev };
                Object.keys(msg.class_counts).forEach(cls => {
                  if (!next[cls]) next[cls] = [];
                  next[cls] = [...(next[cls] || []).slice(-(MAX_HISTORY - 1)), msg.class_counts[cls]];
                });
                return next;
              });
            }
          } else if (msg.type === 'connected') {
            toast.success('Surveillance stream active');
          } else if (msg.type === 'warning') {
            toast(msg.message, { icon: '!' });
          } else if (msg.type === 'error') {
            toast.error(msg.message);
            setStatus('error');
          }
        } catch {
          // binary handled above
        }
      }
    };

    ws.onerror = () => {
      toast.error('Connection error');
      setStatus('error');
    };

    ws.onclose = () => {
      setStreaming(false);
      setStatus('offline');
      setFps(0);
    };
  }, [confidence, ipCamUrl, drawFrame, updateFps, token]);

  const stopStream = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStreaming(false);
    setStatus('offline');
    setFps(0);
    setClassCounts({});
    setAvgConfidence(0);
    setDetectionHistory([]);
    setClassHistory({});
    setConfidenceHistory([]);
    setDetectionDetails([]);
    setTotalDetected(0);
  }, []);

  useEffect(() => {
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  const statusColor = status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-400' : status === 'error' ? 'bg-red-500' : 'bg-gray-400';
  const statusText = status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting...' : status === 'error' ? 'Error' : 'Offline';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <CameraIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Live Surveillance</h1>
                <p className="text-white/60 text-sm">Real-time object detection via IP camera feed</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 ${status === 'connected' ? 'bg-emerald-500/20' : 'bg-white/10'} backdrop-blur-sm px-4 py-2 rounded-lg`}>
                <span className={`w-2.5 h-2.5 rounded-full ${statusColor} ${status === 'connected' || status === 'connecting' ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-semibold">{statusText}</span>
              </div>
              {streaming && (
                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold tabular-nums">{fps}</div>
                    <div className="text-[10px] text-white/50 uppercase">FPS</div>
                  </div>
                  <div className="h-6 w-px bg-white/20" />
                  <div className="text-center">
                    <div className="text-lg font-bold tabular-nums">{detections}</div>
                    <div className="text-[10px] text-white/50 uppercase">Objects</div>
                  </div>
                  <div className="h-6 w-px bg-white/20" />
                  <div className="text-center">
                    <div className="text-lg font-bold tabular-nums font-mono">{frameId}</div>
                    <div className="text-[10px] text-white/50 uppercase">Frame</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Controls Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-800">Stream Controls</h2>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1.5 transition"
            >
              <SettingsIcon className="w-4 h-4" />
              {showSettings ? 'Hide Settings' : 'Camera Settings'}
            </button>
          </div>

          <div className="px-6 py-5">
            <div className="flex flex-col lg:flex-row items-start lg:items-end gap-6">
              {/* Confidence */}
              <div className="flex-1 w-full">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Detection Confidence
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.1"
                    max="0.95"
                    step="0.05"
                    value={confidence}
                    onChange={(e) => setConfidence(parseFloat(e.target.value))}
                    disabled={streaming}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
                  />
                  <span className="text-lg font-bold text-emerald-600 tabular-nums w-14 text-right">{(confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Higher values = fewer but more accurate detections</p>
              </div>

              {/* Action Button */}
              <button
                onClick={streaming ? stopStream : startStream}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg ${
                  streaming
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:shadow-red-200'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-emerald-200'
                }`}
              >
                {streaming ? (
                  <><StopIcon className="w-4 h-4" /> Stop Stream</>
                ) : (
                  <><PlayIcon className="w-4 h-4" /> Start Stream</>
                )}
              </button>
            </div>
          </div>

          {/* Expandable Settings */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">IP Camera URL</label>
                  <input
                    type="text"
                    value={ipCamUrl}
                    onChange={(e) => setIpCamUrl(e.target.value)}
                    disabled={streaming}
                    placeholder="e.g., http://192.168.1.100:8080/video (leave empty to use server default)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition disabled:opacity-50 disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Use an Android IP Webcam app or any MJPEG/H.264 stream URL</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Video Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
        >
          <div className="aspect-video bg-gray-900 relative flex items-center justify-center">
            {streaming ? (
              <>
                <canvas ref={canvasRef} className="w-full h-full object-contain" />
                {/* Live indicator overlay */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Live</span>
                </div>
                {/* Detection count overlay */}
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <span className="text-sm font-bold text-white tabular-nums">{detections} objects detected</span>
                </div>
              </>
            ) : (
              <div className="text-center p-8 max-w-lg">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gray-800 flex items-center justify-center">
                  <CameraOffIcon className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">Surveillance Feed Offline</h3>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                  Connect your IP camera and start the surveillance stream to begin
                  real-time YOLOv8 object detection monitoring.
                </p>

                <div className="text-left bg-gray-800/80 border border-gray-700 rounded-xl p-5">
                  <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                    <InfoIcon className="w-4 h-4" /> Setup Instructions
                  </h4>
                  <ol className="text-sm text-gray-400 space-y-2.5">
                    <li className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                      <span>Install <strong className="text-gray-300">IP Webcam</strong> app on your Android device</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                      <span>Open the app and tap <strong className="text-gray-300">"Start server"</strong></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                      <span>Note the IP address shown (e.g., <code className="bg-gray-700 px-1.5 py-0.5 rounded text-emerald-300 text-xs">http://192.168.x.x:8080</code>)</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                      <span>Enter the camera URL in <strong className="text-gray-300">Camera Settings</strong> above, or update <code className="bg-gray-700 px-1.5 py-0.5 rounded text-emerald-300 text-xs">IP_CAM_URL</code> in the server config</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">5</span>
                      <span>Click <strong className="text-gray-300">"Start Stream"</strong> to begin detection</span>
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Cards - show when streaming */}
        <AnimatePresence>
          {streaming && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 md:grid-cols-5 gap-4"
            >
              <StatCard label="Frame Rate" value={`${fps}`} unit="FPS" color="emerald" />
              <StatCard label="Objects Detected" value={`${detections}`} unit="current" color="teal" />
              <StatCard label="Frames Processed" value={`${frameId}`} unit="total" color="cyan" />
              <StatCard label="Avg Confidence" value={`${(avgConfidence * 100).toFixed(0)}%`} unit="score" color="violet" />
              <StatCard label="Total Detections" value={`${totalDetected}`} unit="cumulative" color="gray" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Real-Time Analytics Dashboard ─────────────────────────── */}
        <AnimatePresence>
          {streaming && detectionHistory.length > 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Row 1: Detection Timeline + Class Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Detection Count Timeline */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Detection Timeline</h3>
                      <p className="text-[10px] text-gray-300 mt-0.5">Objects per frame (last {MAX_HISTORY} frames)</p>
                    </div>
                    <span className="text-xl font-black text-emerald-600 tabular-nums">{detections}</span>
                  </div>
                  <div className="flex items-end gap-[3px] h-28">
                    {detectionHistory.map((d, i) => {
                      const max = Math.max(...detectionHistory.map(h => h.count), 1);
                      const pct = (d.count / max) * 100;
                      return (
                        <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${Math.max(pct, 3)}%` }}
                          transition={{ duration: 0.2 }}
                          className="flex-1 rounded-t-sm min-w-[4px]"
                          style={{ background: d.count > 0 ? `linear-gradient(to top, #10b981, #34d399)` : '#e5e7eb' }}
                          title={`${d.time}: ${d.count} objects`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] text-gray-300 font-mono">{detectionHistory[0]?.time || ''}</span>
                    <span className="text-[9px] text-gray-300 font-mono">{detectionHistory[detectionHistory.length - 1]?.time || ''}</span>
                  </div>
                </div>

                {/* Class Distribution (horizontal bars) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Class Distribution</h3>
                      <p className="text-[10px] text-gray-300 mt-0.5">Current frame breakdown</p>
                    </div>
                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-blue-50 text-blue-500 border border-blue-100">
                      {Object.keys(classCounts).length} classes
                    </span>
                  </div>
                  <div className="space-y-2.5 max-h-[120px] overflow-y-auto">
                    {Object.entries(classCounts).length === 0 ? (
                      <p className="text-xs text-gray-300 text-center py-6">No detections</p>
                    ) : (
                      Object.entries(classCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cls, count], i) => {
                          const maxCount = Math.max(...Object.values(classCounts));
                          const pct = (count / maxCount) * 100;
                          const color = CLASS_COLORS[i % CLASS_COLORS.length];
                          return (
                            <div key={cls} className="flex items-center gap-3">
                              <span className="w-20 text-[11px] font-semibold text-gray-600 capitalize truncate">{cls}</span>
                              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.4 }}
                                  className="h-full rounded-full flex items-center justify-end pr-2"
                                  style={{ background: `linear-gradient(90deg, ${color}90, ${color})` }}>
                                  {pct > 30 && <span className="text-[9px] font-bold text-white">{count}</span>}
                                </motion.div>
                              </div>
                              {pct <= 30 && <span className="text-[11px] font-bold text-gray-500 w-6 text-right">{count}</span>}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Confidence Trend + Live Detection Log */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Confidence Trend */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confidence Trend</h3>
                      <p className="text-[10px] text-gray-300 mt-0.5">Average detection confidence over time</p>
                    </div>
                    <span className={`text-xl font-black tabular-nums ${avgConfidence >= 0.7 ? 'text-emerald-600' : avgConfidence >= 0.4 ? 'text-amber-600' : 'text-red-500'}`}>
                      {(avgConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="relative h-28">
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map(v => (
                      <div key={v} className="absolute w-full border-t border-dashed border-gray-100" style={{ bottom: `${v}%` }}>
                        <span className="absolute -top-2 -left-0 text-[8px] text-gray-300">{v}%</span>
                      </div>
                    ))}
                    {/* Area + line */}
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${confidenceHistory.length} 100`}>
                      {confidenceHistory.length > 1 && (
                        <>
                          <defs>
                            <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
                            </linearGradient>
                          </defs>
                          <path
                            d={`M0,${100 - confidenceHistory[0].value * 100} ${confidenceHistory.map((d, i) => `L${i},${100 - d.value * 100}`).join(' ')} L${confidenceHistory.length - 1},100 L0,100 Z`}
                            fill="url(#confGrad)" />
                          <polyline
                            points={confidenceHistory.map((d, i) => `${i},${100 - d.value * 100}`).join(' ')}
                            fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round" />
                        </>
                      )}
                    </svg>
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] text-gray-300 font-mono">{confidenceHistory[0]?.time || ''}</span>
                    <span className="text-[9px] text-gray-300 font-mono">{confidenceHistory[confidenceHistory.length - 1]?.time || ''}</span>
                  </div>
                </div>

                {/* Live Detection Log */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Detection Feed</h3>
                      <p className="text-[10px] text-gray-300 mt-0.5">Real-time object detections</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-500 font-bold uppercase">Live</span>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-[128px] overflow-y-auto">
                    {detectionDetails.length === 0 ? (
                      <p className="text-xs text-gray-300 text-center py-6">Waiting for detections...</p>
                    ) : (
                      detectionDetails.slice(0, 12).map((det, i) => {
                        const confPct = (det.confidence * 100).toFixed(0);
                        const color = CLASS_COLORS[Object.keys(classCounts).indexOf(det.class) % CLASS_COLORS.length] || '#6b7280';
                        return (
                          <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-xs font-semibold text-gray-700 capitalize flex-1 truncate">{det.class}</span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${confPct}%`, background: color }} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 tabular-nums w-9 text-right">{confPct}%</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Per-Class Sparklines */}
              {Object.keys(classHistory).length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Per-Class Activity</h3>
                    <p className="text-[10px] text-gray-300 mt-0.5">Detection count trend per object class</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(classHistory)
                      .sort((a, b) => (b[1][b[1].length - 1] || 0) - (a[1][a[1].length - 1] || 0))
                      .slice(0, 8)
                      .map(([cls, history], ci) => {
                        const color = CLASS_COLORS[ci % CLASS_COLORS.length];
                        const latest = history[history.length - 1] || 0;
                        const max = Math.max(...history, 1);
                        return (
                          <div key={cls} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                                <span className="text-[11px] font-bold text-gray-600 capitalize">{cls}</span>
                              </div>
                              <span className="text-sm font-black tabular-nums" style={{ color }}>{latest}</span>
                            </div>
                            <svg className="w-full h-8" preserveAspectRatio="none" viewBox={`0 0 ${history.length} ${max}`}>
                              <defs>
                                <linearGradient id={`sg-${ci}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              {history.length > 1 && (
                                <>
                                  <path
                                    d={`M0,${max - history[0]} ${history.map((v, i) => `L${i},${max - v}`).join(' ')} L${history.length - 1},${max} L0,${max} Z`}
                                    fill={`url(#sg-${ci})`} />
                                  <polyline
                                    points={history.map((v, i) => `${i},${max - v}`).join(' ')}
                                    fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
                                </>
                              )}
                            </svg>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* Sub-components */

function StatCard({ label, value, unit, color }) {
  const colors = {
    emerald: 'from-emerald-500 to-teal-600',
    teal: 'from-teal-500 to-cyan-600',
    cyan: 'from-cyan-500 to-blue-600',
    gray: 'from-gray-600 to-gray-700',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors[color]}`} />
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-extrabold text-gray-800 tabular-nums">{value}</span>
        <span className="text-xs text-gray-400 font-medium">{unit}</span>
      </div>
    </div>
  );
}

/* SVG Icons */
function CameraIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>; }
function CameraOffIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m13.5 0V7.5a2.25 2.25 0 0 0-2.25-2.25H5.25m0 0L2.25 2.25m3 3L18.75 18.75" /></svg>; }
function SettingsIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>; }
function PlayIcon({ className }) { return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>; }
function StopIcon({ className }) { return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>; }
function InfoIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>; }

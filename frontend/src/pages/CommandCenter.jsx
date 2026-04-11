import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import nepalBorderData from '../data/map.json';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import useWebSocket from '../hooks/useWebSocket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const SEV_COLOR = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#0284c7' };
const SEV_BG = { CRITICAL: '#fee2e2', HIGH: '#fff7ed', MEDIUM: '#fffbeb', LOW: '#e0f2fe' };

const STATUS_CONFIG = {
  PENDING:    { label: 'Pending',    color: '#d97706', dot: 'bg-amber-400',   bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  REVIEWING:  { label: 'Reviewing',  color: '#2563eb', dot: 'bg-blue-400',    bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  DISPATCHED: { label: 'Dispatched', color: '#0891b2', dot: 'bg-cyan-400',    bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  RESCUING:   { label: 'Rescuing',   color: '#ea580c', dot: 'bg-orange-400',  bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  RESOLVED:   { label: 'Resolved',   color: '#0369a1', dot: 'bg-sky-500',     bg: 'bg-sky-50 text-sky-700 border-sky-200' },
  REJECTED:   { label: 'Rejected',   color: '#dc2626', dot: 'bg-red-400',     bg: 'bg-red-50 text-red-700 border-red-200' },
};

const TILE_LAYERS = {
  positron: { name: 'Positron',  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attribution: '&copy; CartoDB' },
  street:    { name: 'Street',    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap' },
  satellite: { name: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri' },
  terrain:   { name: 'Terrain',   url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenTopoMap' },
  dark:      { name: 'Dark',      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; CartoDB' },
};

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

function calcDist(a, b) {
  if (!a || !b) return null;
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLon = (b[1] - a[1]) * toR;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLon / 2) ** 2;
  return (2 * R * Math.asin(Math.sqrt(s))).toFixed(2);
}

// Inject CSS animations for radar-style markers
if (typeof document !== 'undefined' && !document.getElementById('cmd-map-pulse-css')) {
  const style = document.createElement('style');
  style.id = 'cmd-map-pulse-css';
  style.textContent = `
    @keyframes cmdRadar { 0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.7; } 100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; } }
    @keyframes cmdGlow { 0%, 100% { box-shadow: 0 0 6px rgba(220,38,38,0.5); } 50% { box-shadow: 0 0 16px rgba(220,38,38,0.8); } }
  `;
  document.head.appendChild(style);
}

const incidentIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;top:50%;left:50%;width:32px;height:32px;border:2px solid #dc2626;border-radius:50%;animation:cmdRadar 2s ease-out infinite;"></div>
    <div style="position:absolute;top:50%;left:50%;width:32px;height:32px;border:2px solid #dc2626;border-radius:50%;animation:cmdRadar 2s ease-out 1s infinite;"></div>
    <div style="position:relative;z-index:2;width:20px;height:20px;background:#dc2626;border-radius:50%;border:3px solid #fff;animation:cmdGlow 2s ease-in-out infinite;"></div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});


function FlyToTarget({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target.center, target.zoom, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function DynamicTileLayer({ tileKey }) {
  const map = useMap();
  const layerRef = useRef(null);
  useEffect(() => {
    if (layerRef.current) map.removeLayer(layerRef.current);
    const cfg = TILE_LAYERS[tileKey] || TILE_LAYERS.street;
    layerRef.current = L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: 19 }).addTo(map);
    return () => { if (layerRef.current) map.removeLayer(layerRef.current); };
  }, [tileKey, map]);
  return null;
}

function OpenSelectedPopup({ selectedReport, markerRefs }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedReport || !markerRefs.current) return;
    const marker = markerRefs.current[selectedReport.id];
    if (marker) {
      setTimeout(() => marker.openPopup(), 400);
    }
  }, [selectedReport, map]);
  return null;
}

export default function CommandCenter() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [drone, setDrone] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const markerRefs = useRef({});
  const [statistics, setStatistics] = useState({
    totalReports: 0, pendingReports: 0, resolvedReports: 0,
    criticalReports: 0, activeDrones: 0,
  });
  const [flyTarget, setFlyTarget] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [tileKey, setTileKey] = useState('positron');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [officerNotes, setOfficerNotes] = useState('');
  const [tileMenuOpen, setTileMenuOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchReports();
    fetchStatistics();
  }, [token]);

  // WebSocket: re-fetch when backend notifies data changed
  const handleWsNotify = useCallback((channel) => {
    if (channel === 'reports') {
      fetchReports();
      fetchStatistics();
    }
  }, [token]);

  useWebSocket(['reports'], handleWsNotify, { enabled: !!token });

  useEffect(() => {
    const droneRef = ref(db, 'drone');
    const unsubscribe = onValue(
      droneRef,
      (snapshot) => {
        const d = snapshot.val();
        if (d?.latitude && d.latitude !== 'Not Fixed') {
          setDrone(d);
        }
      },
      (err) => console.error('Firebase drone error:', err)
    );
    return () => unsubscribe();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/disaster-reports/map/markers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(res.data);
    } catch (e) { console.error('Error fetching reports:', e); }
  };

  const fetchStatistics = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/disaster-reports/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = res.data;
      setStatistics({
        totalReports: d.total_reports ?? d.totalReports ?? 0,
        pendingReports: d.pending_reports ?? d.pendingReports ?? 0,
        resolvedReports: d.resolved_reports ?? d.resolvedReports ?? 0,
        criticalReports: d.critical_reports ?? d.criticalReports ?? 0,
        activeDrones: d.active_drones ?? d.activeDrones ?? 0,
      });
    } catch (e) { console.error('Error fetching statistics:', e); }
  };

  const updateReportStatus = async (reportId, newStatus, notes = '') => {
    setUpdatingStatus(true);
    try {
      await axios.patch(
        `${API_URL}/api/v1/disaster-reports/reports/${reportId}`,
        { status: newStatus, officer_notes: notes || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}. SMS notification sent to citizen.`);
      setSelectedReport((prev) => prev ? { ...prev, status: newStatus } : prev);
      setOfficerNotes('');
      fetchReports();
      fetchStatistics();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const navigateToReport = (report) => {
    setSelectedReport(report);
    if (report.latitude && report.longitude) {
      setFlyTarget({ center: [parseFloat(report.latitude), parseFloat(report.longitude)], zoom: 14, ts: Date.now() });
    }
  };

  const centerMap = () => setFlyTarget({ center: [28.3949, 84.124], zoom: 7, ts: Date.now() });

  const dronePos = drone?.latitude && drone.latitude !== 'Not Fixed'
    ? [parseFloat(drone.latitude), parseFloat(drone.longitude)] : null;
  const selectedPos = selectedReport
    ? [parseFloat(selectedReport.latitude), parseFloat(selectedReport.longitude)] : null;
  const distance = calcDist(dronePos, selectedPos);

  const filteredReports = filterSeverity === 'ALL'
    ? reports
    : reports.filter((r) => r.severity === filterSeverity);

  const clockStr = clock.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-sky-50 via-blue-50/40 to-sky-100/60">
      <Navbar />
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />

      {/* Header + Stats */}
      <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-600 text-white shadow-lg flex-shrink-0">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <CommandIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
                <p className="text-white/60 text-sm">Real-time Disaster Response & Drone Operations</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-4">
                {[
                  { val: statistics.totalReports, label: 'Total', cls: '' },
                  { val: statistics.criticalReports, label: 'Critical', cls: 'text-red-200' },
                  { val: statistics.pendingReports, label: 'Pending', cls: 'text-amber-200' },
                  { val: statistics.resolvedReports, label: 'Resolved', cls: 'text-sky-200' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className={`text-2xl font-bold ${s.cls}`}>{s.val}</div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
                <span className={`w-2.5 h-2.5 rounded-full ${drone ? 'bg-cyan-300 animate-pulse shadow-[0_0_6px_rgba(103,232,249,0.8)]' : 'bg-gray-400'}`} />
                <span className="text-sm font-semibold">{drone ? 'Drone Online' : 'Drone Offline'}</span>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
                  Live
                </div>
                <div className="text-lg font-bold font-mono tabular-nums">{clockStr}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="flex-1 max-w-[1920px] w-full mx-auto p-4">
        <div className="flex gap-4" style={{ height: 'calc(100vh - 180px)' }}>

          {/* Left sidebar: Reports */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-[380px] flex-shrink-0 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Active Reports</h2>
                <p className="text-sm text-gray-500">{filteredReports.length} incidents found</p>
              </div>
              <span className="px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-sm font-bold border border-sky-200">{reports.length}</span>
            </div>

            {/* Severity filter */}
            <div className="flex gap-1.5 px-4 py-3 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button key={sev} onClick={() => setFilterSeverity(sev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    filterSeverity === sev
                      ? 'bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-200'
                      : 'bg-sky-50/60 text-slate-500 hover:bg-sky-100'
                  }`}
                >
                  {sev === 'ALL' ? 'All' : sev}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <AnimatePresence>
                {filteredReports.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-16 text-gray-400">
                    <InboxIcon className="w-12 h-12 text-gray-300" />
                    <span className="text-base font-medium">No reports found</span>
                    <span className="text-sm text-gray-300">Try a different filter</span>
                  </motion.div>
                ) : (
                  filteredReports.map((r, idx) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => navigateToReport(r)}
                      className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:border-sky-300 hover:bg-sky-50/40 hover:-translate-y-[1px] hover:shadow-md ${
                        selectedReport?.id === r.id
                          ? 'border-sky-400 bg-sky-50 shadow-lg ring-2 ring-sky-200'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                        style={{ background: SEV_COLOR[r.severity] || '#94a3b8' }} />

                      <div className="flex justify-between items-start mb-2 ml-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <DisasterTypeIcon type={r.metadata?.disaster_type} className="w-4.5 h-4.5 text-gray-500" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-gray-900 capitalize block">
                              {capitalize(r.metadata?.disaster_type || 'Unknown')}
                            </span>
                            <span className="text-xs text-gray-400">#{r.id}</span>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          STATUS_CONFIG[r.status]?.bg || 'bg-gray-100 text-gray-600 border-gray-300'
                        }`}>
                          {STATUS_CONFIG[r.status]?.label || r.status}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 ml-2 mb-2 line-clamp-2 leading-relaxed">
                        {r.metadata?.description || 'No description'}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-400 ml-2">
                        <span>{r.metadata?.reporter_name || 'Anonymous'}</span>
                        <span>{new Date(r.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 ml-2">
                        <span className="text-xs text-gray-400 font-mono">
                          {parseFloat(r.latitude).toFixed(5)}, {parseFloat(r.longitude).toFixed(5)}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          r.severity === 'CRITICAL' ? 'bg-red-50 text-red-600 border-red-200' :
                          r.severity === 'HIGH' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                          r.severity === 'MEDIUM' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                          'bg-sky-50 text-sky-600 border-sky-200'
                        }`}>{r.severity}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Center: Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex-1 relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center px-5 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-sm shadow-sky-200">
                  <CommandIcon className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-800">Live Command Map</h2>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[2px]">{reports.length} incidents{drone ? ' • drone online' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={centerMap}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition">
                  <CrosshairIcon className="w-3.5 h-3.5" />Reset
                </button>
              </div>
            </div>

            <MapContainer
              center={[28.3949, 84.124]}
              zoom={7}
              scrollWheelZoom={true}
              zoomControl={false}
              minZoom={6}
              maxZoom={18}
              className="flex-1 w-full z-0"
            >
              <DynamicTileLayer tileKey={tileKey} />
              <FlyToTarget target={flyTarget} />

              {nepalBorderData?.features && (
                <GeoJSON data={nepalBorderData} style={{ color: '#94a3b8', weight: 2, opacity: 0.6, fillColor: '#94a3b8', fillOpacity: 0.03 }} />
              )}

              <OpenSelectedPopup selectedReport={selectedReport} markerRefs={markerRefs} />

              {filteredReports.map((r) => (
                <Marker
                  key={r.id}
                  ref={(ref) => { if (ref) markerRefs.current[r.id] = ref; }}
                  position={[parseFloat(r.latitude), parseFloat(r.longitude)]}
                  icon={incidentIcon}
                  eventHandlers={{ click: () => navigateToReport(r) }}
                >
                  <Popup minWidth={260}>
                    <div style={{ fontFamily: 'Inter,sans-serif', minWidth: 230 }}>
                      <strong style={{ fontSize: 15, textTransform: 'capitalize' }}>
                        {capitalize(r.metadata?.disaster_type || 'Unknown')}
                      </strong>
                      <div style={{ margin: '8px 0 6px', fontSize: 13 }}>
                        <span style={{ color: '#94a3b8' }}>Severity: </span>
                        <span style={{
                          background: (SEV_COLOR[r.severity] || '#64748b') + '20',
                          color: SEV_COLOR[r.severity] || '#64748b',
                          padding: '3px 10px', borderRadius: 100, fontWeight: 700, fontSize: 12,
                        }}>{r.severity}</span>
                      </div>
                      <div style={{ margin: '6px 0', fontSize: 13 }}>
                        <span style={{ color: '#94a3b8' }}>Status: </span>
                        <span style={{ fontWeight: 600, color: STATUS_CONFIG[r.status]?.color || '#64748b' }}>
                          {STATUS_CONFIG[r.status]?.label || r.status}
                        </span>
                      </div>
                      {r.metadata?.reporter_name && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>Reporter: {r.metadata.reporter_name}</div>
                      )}
                      {r.metadata?.description && (
                        <div style={{ fontSize: 13, color: '#475569', marginTop: 6, lineHeight: '1.5' }}>
                          {r.metadata.description.length > 120
                            ? r.metadata.description.slice(0, 120) + '...'
                            : r.metadata.description}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

            </MapContainer>

            {/* Layer Switcher (weather-page style) */}
            <div className="absolute top-16 left-3 z-[500]">
              <button
                onClick={() => setTileMenuOpen(!tileMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all text-xs font-medium text-gray-600"
              >
                <LayersIcon className="w-3.5 h-3.5" />
                Map Style
              </button>
              {tileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-10 left-0 bg-white/98 backdrop-blur-sm rounded-xl border border-gray-200 shadow-xl py-1.5 min-w-[150px]"
                >
                  {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                    <button key={key} onClick={() => { setTileKey(key); setTileMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-medium transition-all ${
                        tileKey === key ? 'bg-sky-50 text-sky-600 font-bold' : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                      {layer.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-5 shadow-lg text-xs text-gray-600 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.5)]" />
                Incidents
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-400 opacity-50 border-2 border-gray-300" />
                Nepal Border
              </div>
            </div>
          </motion.div>
        </div>

        {/* INCIDENT DETAILS SECTION (BELOW 3-COL LAYOUT) */}
        <AnimatePresence mode="wait">
          {selectedReport ? (
            <motion.div
              key={`details-${selectedReport.id}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.3 }}
              className="mt-4 bg-white rounded-2xl shadow-xl shadow-sky-200/40 border border-sky-100 overflow-hidden"
            >
              {/* Header */}
              <div className="relative flex items-center justify-between px-6 py-5 bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-600 text-white overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)] pointer-events-none" />
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center ring-1 ring-white/25 shadow-lg shadow-sky-900/20">
                    <DisasterTypeIcon type={selectedReport.metadata?.disaster_type} className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold capitalize tracking-tight drop-shadow-sm">
                      {capitalize(selectedReport.metadata?.disaster_type || 'Unknown')} &mdash; Report #{selectedReport.id}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider"
                        style={{
                          background: SEV_COLOR[selectedReport.severity] + '35',
                          color: '#fff',
                          border: `1px solid ${SEV_COLOR[selectedReport.severity]}90`,
                        }}>
                        {selectedReport.severity}
                      </span>
                      <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm border border-white/25 uppercase tracking-wider">
                        {STATUS_CONFIG[selectedReport.status]?.label || selectedReport.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/25 text-white transition ring-1 ring-white/20"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 bg-gradient-to-b from-sky-50/30 to-white">
                {/* LEFT: Report Info */}
                <div className="lg:border-r border-sky-100 p-6">
                  <h3 className="text-[11px] font-extrabold text-sky-700/80 uppercase tracking-[0.14em] mb-4">Report Information</h3>
                  <div className="space-y-3">
                    <InfoItem label="Reporter" value={selectedReport.metadata?.reporter_name || 'Anonymous'} />
                    <InfoItem label="Contact" value={selectedReport.metadata?.reporter_contact || 'N/A'} />
                    <InfoItem label="Submitted" value={new Date(selectedReport.created_at).toLocaleString()} />
                    <InfoItem label="Coordinates"
                      value={`${parseFloat(selectedReport.latitude).toFixed(6)}, ${parseFloat(selectedReport.longitude).toFixed(6)}`}
                      mono />
                    {distance && (
                      <InfoItem label="Drone Distance" value={`${distance} km`} highlight />
                    )}
                  </div>

                  <div className="mt-5 p-4 bg-gradient-to-br from-sky-50 to-blue-50/50 border border-sky-100 rounded-xl shadow-sm shadow-sky-100/50">
                    <span className="block text-[11px] text-sky-700/70 uppercase tracking-[0.12em] font-extrabold mb-2">Description</span>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {selectedReport.metadata?.full_description || selectedReport.metadata?.description || 'No description provided'}
                    </p>
                  </div>

                  <a href={`https://maps.google.com/?q=${selectedReport.latitude},${selectedReport.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-sky-500 via-sky-600 to-cyan-600 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-sky-200 transition-all">
                    <MapPinIcon className="w-4 h-4" /> Open in Google Maps
                  </a>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const params = new URLSearchParams({
                          lat: selectedReport.latitude,
                          lng: selectedReport.longitude,
                          reported_at: selectedReport.created_at,
                          disaster_type: selectedReport.metadata?.disaster_type || 'Unknown',
                          report_id: selectedReport.id,
                          severity: selectedReport.severity || '',
                          address: selectedReport.metadata?.address || '',
                        });
                        navigate(`/incident-weather?${params.toString()}`);
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 bg-white border border-sky-200 text-sky-700 text-xs font-bold rounded-xl hover:bg-sky-50 hover:border-sky-300 hover:shadow-md hover:shadow-sky-100 transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
                      Weather
                    </button>
                    <button
                      onClick={() => navigate('/drone-visualization')}
                      className="flex items-center justify-center gap-2 py-2.5 bg-white border border-cyan-200 text-cyan-700 text-xs font-bold rounded-xl hover:bg-cyan-50 hover:border-cyan-300 hover:shadow-md hover:shadow-cyan-100 transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                      Live Drone
                    </button>
                  </div>
                </div>

                {/* CENTER: Officer Actions */}
                <div className="lg:border-r border-sky-100 p-6 border-t lg:border-t-0">
                  <h3 className="text-[11px] font-extrabold text-sky-700/80 uppercase tracking-[0.14em] mb-4">Officer Actions</h3>

                  <div className="flex gap-3 mb-5">
                    <button
                      disabled={updatingStatus || selectedReport.status === 'RESOLVED'}
                      onClick={() => updateReportStatus(selectedReport.id, 'RESOLVED', officerNotes)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                        selectedReport.status === 'RESOLVED'
                          ? 'bg-sky-100 text-sky-700 border-2 border-sky-400 ring-2 ring-sky-200'
                          : 'bg-gradient-to-r from-sky-500 via-sky-600 to-cyan-600 text-white hover:shadow-lg hover:shadow-sky-200'
                      } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <CheckCircleIcon className="w-4 h-4" /> Approve / Resolve
                    </button>
                    <button
                      disabled={updatingStatus || selectedReport.status === 'REJECTED'}
                      onClick={() => updateReportStatus(selectedReport.id, 'REJECTED', officerNotes)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                        selectedReport.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700 border-2 border-red-400 ring-2 ring-red-200'
                          : 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:shadow-lg hover:shadow-red-200'
                      } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <XCircleIcon className="w-4 h-4" /> Reject
                    </button>
                  </div>

                  <div className="mb-5">
                    <label className="block text-[11px] font-extrabold text-sky-700/80 uppercase tracking-[0.12em] mb-2">Officer Notes (sent to citizen)</label>
                    <textarea
                      value={officerNotes}
                      onChange={(e) => setOfficerNotes(e.target.value)}
                      placeholder="Add notes for the citizen (reason for rejection, instructions, etc.)..."
                      rows={3}
                      className="w-full px-4 py-3 bg-sky-50/30 border border-sky-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-200 focus:border-sky-400 focus:bg-white outline-none resize-none transition"
                    />
                  </div>

                  <h4 className="text-[11px] font-extrabold text-sky-700/60 uppercase tracking-[0.12em] mb-3">All Status Options</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        disabled={updatingStatus || selectedReport.status === key}
                        onClick={() => updateReportStatus(selectedReport.id, key, officerNotes)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          selectedReport.status === key
                            ? 'border-sky-400 bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50/40 hover:shadow-sm'
                        } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT: Report Summary */}
                <div className="p-6 border-t lg:border-t-0 border-sky-100">
                  <h3 className="text-[11px] font-extrabold text-sky-700/80 uppercase tracking-[0.14em] mb-4">Report Summary</h3>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-slate-50 to-sky-50/40 rounded-xl border border-slate-200 shadow-sm">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                        <DisasterTypeIcon type={selectedReport.metadata?.disaster_type} className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Disaster Type</span>
                        <span className="text-sm font-bold text-slate-900 capitalize">{capitalize(selectedReport.metadata?.disaster_type || 'Unknown')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border shadow-sm"
                      style={{ background: SEV_BG[selectedReport.severity] || '#f8fafc', borderColor: (SEV_COLOR[selectedReport.severity] || '#94a3b8') + '40' }}>
                      <div className="w-9 h-9 rounded-lg bg-white border flex items-center justify-center shadow-sm" style={{ borderColor: (SEV_COLOR[selectedReport.severity] || '#94a3b8') + '40' }}>
                        <SeverityIcon className="w-4 h-4" style={{ color: SEV_COLOR[selectedReport.severity] }} />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Severity Level</span>
                        <span className="text-sm font-bold" style={{ color: SEV_COLOR[selectedReport.severity] }}>{selectedReport.severity}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border shadow-sm"
                      style={{ background: (STATUS_CONFIG[selectedReport.status]?.color || '#64748b') + '0d', borderColor: (STATUS_CONFIG[selectedReport.status]?.color || '#64748b') + '33' }}>
                      <div className="w-9 h-9 rounded-lg bg-white border flex items-center justify-center shadow-sm" style={{ borderColor: (STATUS_CONFIG[selectedReport.status]?.color || '#64748b') + '33' }}>
                        <span className={`w-3 h-3 rounded-full ${STATUS_CONFIG[selectedReport.status]?.dot || 'bg-gray-400'}`} />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Current Status</span>
                        <span className="text-sm font-bold" style={{ color: STATUS_CONFIG[selectedReport.status]?.color }}>{STATUS_CONFIG[selectedReport.status]?.label || selectedReport.status}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-sky-50 to-cyan-50/60 rounded-xl border border-sky-200 shadow-sm">
                      <div className="w-9 h-9 rounded-lg bg-white border border-sky-200 flex items-center justify-center shadow-sm">
                        <MapPinIcon className="w-4 h-4 text-sky-600" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Priority</span>
                        <span className="text-sm font-bold text-sky-800">{selectedReport.metadata?.priority || 0}</span>
                      </div>
                    </div>
                  </div>

                  {selectedReport.metadata?.officer_notes && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                      <span className="block text-[10px] text-amber-600 uppercase tracking-wider font-extrabold mb-1">Officer Notes</span>
                      <p className="text-sm text-amber-800">{selectedReport.metadata.officer_notes}</p>
                    </div>
                  )}

                  {selectedReport.metadata?.response_notes && (
                    <div className="mt-3 p-4 bg-gradient-to-br from-sky-50 to-blue-50/60 border border-sky-200 rounded-xl shadow-sm">
                      <span className="block text-[10px] text-sky-600 uppercase tracking-wider font-extrabold mb-1">Response Notes</span>
                      <p className="text-sm text-sky-800">{selectedReport.metadata.response_notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Media Gallery */}
              <MediaGallery reportId={selectedReport.id} token={token} />
            </motion.div>
          ) : (
            <motion.div
              key="empty-details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 bg-white/60 rounded-2xl border border-dashed border-gray-300 flex items-center justify-center py-12"
            >
              <div className="text-center text-gray-400">
                <MapPinIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <span className="text-base font-medium">Select a report from the list or map to view full details</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes incPulse { 0%{transform:translate(-50%,-60%) scale(0.6);opacity:0.6} 100%{transform:translate(-50%,-60%) scale(1.4);opacity:0} }
        @keyframes dronePulse { 0%{transform:scale(0.6);opacity:0.7} 100%{transform:scale(1.4);opacity:0} }
        @keyframes droneFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>
    </div>
  );
}

/* Sub-components */

function InfoItem({ label, value, mono = false, highlight = false }) {
  return (
    <div className={`flex items-center justify-between ${highlight ? 'bg-gradient-to-r from-cyan-50 to-sky-50 px-3 py-2 rounded-lg border border-cyan-200 shadow-sm' : ''}`}>
      <span className={`text-[10px] ${highlight ? 'text-cyan-700' : 'text-slate-400'} uppercase tracking-[0.12em] font-bold`}>{label}</span>
      <span className={`text-sm font-semibold text-right max-w-[200px] truncate ${mono ? 'font-mono text-sky-600 text-xs' : 'text-slate-800'} ${highlight ? 'text-cyan-800' : ''}`}>{value}</span>
    </div>
  );
}

function MediaGallery({ reportId, token }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/v1/disaster-reports/reports/${reportId}/media`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMedia(res.data);
      } catch (e) {
        console.error('Failed to load media:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId, token]);

  if (loading) return (
    <div className="px-6 py-4 border-t border-gray-200 text-center text-sm text-gray-400">Loading media...</div>
  );
  if (!media.length) return null;

  return (
    <div className="px-6 py-5 border-t border-gray-200">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Evidence Media ({media.length})</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {media.map((m) => {
          const isVideo = m.mime_type?.startsWith('video/');
          const url = m.image_url?.startsWith('http') ? m.image_url : `${API_URL}${m.image_url}`;
          return (
            <div
              key={m.id}
              className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setLightbox({ url, isVideo })}
            >
              {isVideo ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <PlayIcon className="w-8 h-8 text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 mt-1">VIDEO</span>
                </div>
              ) : (
                <img src={url} alt="Evidence" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute -top-3 -right-3 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-red-500 transition">
              <XIcon className="w-5 h-5" />
            </button>
            {lightbox.isVideo ? (
              <video src={lightbox.url} controls autoPlay className="w-full max-h-[85vh] rounded-xl" />
            ) : (
              <img src={lightbox.url} alt="Evidence" className="w-full max-h-[85vh] object-contain rounded-xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════════════════ */

function DisasterTypeIcon({ type, className, style }) {
  switch (type) {
    case 'fire': return <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z" /></svg>;
    case 'flood': return <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M2 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M9 3v8M15 3v8M7 7h10" /></svg>;
    case 'earthquake': return <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h3l2-3 3 6 3-9 2 6h7" /></svg>;
    case 'landslide': return <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18M5 20l4-8 3 4 4-10 3 14" /></svg>;
    case 'storm': return <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
    default: return <AlertIcon className={className} style={style} />;
  }
}

function AlertIcon({ className, style }) { return <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>; }
function CommandIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>; }
function XIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>; }
function CheckCircleIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function XCircleIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function MapPinIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>; }
function CrosshairIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 2v4m0 12v4m10-10h-4M6 12H2" /></svg>; }
function InboxIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.399 0V6.108c0-1.135.845-2.098 1.976-2.192a48.424 48.424 0 0113.048 0c1.131.094 1.976 1.057 1.976 2.192V13.5" /></svg>; }
function LayersIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>; }
function PlayIcon({ className }) { return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>; }
function SeverityIcon({ className, style }) { return <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>; }

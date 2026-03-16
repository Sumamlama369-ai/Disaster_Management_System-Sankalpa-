import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const SEV_COLOR = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#059669' };
const SEV_BG = { CRITICAL: '#fee2e2', HIGH: '#fff7ed', MEDIUM: '#fffbeb', LOW: '#ecfdf5' };

const STATUS_CONFIG = {
  PENDING:    { label: 'Pending',    color: '#d97706', dot: 'bg-amber-400',   bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  REVIEWING:  { label: 'Reviewing',  color: '#2563eb', dot: 'bg-blue-400',    bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  DISPATCHED: { label: 'Dispatched', color: '#7c3aed', dot: 'bg-violet-400',  bg: 'bg-violet-50 text-violet-700 border-violet-200' },
  RESCUING:   { label: 'Rescuing',   color: '#ea580c', dot: 'bg-orange-400',  bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  RESOLVED:   { label: 'Resolved',   color: '#059669', dot: 'bg-emerald-400', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED:   { label: 'Rejected',   color: '#dc2626', dot: 'bg-red-400',     bg: 'bg-red-50 text-red-700 border-red-200' },
};

const TILE_LAYERS = {
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

function hdopInfo(hdop) {
  const v = parseFloat(hdop);
  if (!v || isNaN(v)) return { label: '\u2014', color: '#94a3b8', quality: 'Unknown' };
  if (v < 1) return { label: `${v.toFixed(2)} (Ideal)`, color: '#059669', quality: 'Excellent' };
  if (v < 2) return { label: `${v.toFixed(2)} (Excellent)`, color: '#059669', quality: 'Excellent' };
  if (v < 5) return { label: `${v.toFixed(2)} (Good)`, color: '#d97706', quality: 'Good' };
  if (v < 10) return { label: `${v.toFixed(2)} (Moderate)`, color: '#ea580c', quality: 'Moderate' };
  return { label: `${v.toFixed(2)} (Poor)`, color: '#dc2626', quality: 'Poor' };
}

const incidentIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:48px;height:56px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-60%);width:40px;height:40px;border:2px solid #dc2626;border-radius:50%;opacity:.4;animation:incPulse 2s ease-out infinite;"></div>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-60%);width:40px;height:40px;border:2px solid #dc2626;border-radius:50%;opacity:.4;animation:incPulse 2s ease-out 1s infinite;"></div>
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;">
      <div style="width:36px;height:36px;background:linear-gradient(135deg,#dc2626,#b91c1c);border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(220,38,38,.5);">
        <svg style="transform:rotate(45deg);" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
      </div>
      <div style="width:3px;height:8px;background:#b91c1c;margin-top:-2px;border-radius:0 0 2px 2px;"></div>
    </div>
  </div>`,
  iconSize: [48, 56],
  iconAnchor: [24, 50],
});

const droneMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;inset:0;border:2px solid #2563eb;border-radius:50%;animation:dronePulse 2s ease-out infinite;"></div>
    <div style="position:absolute;inset:0;border:2px solid #2563eb;border-radius:50%;animation:dronePulse 2s ease-out 1s infinite;"></div>
    <div style="position:relative;z-index:2;width:40px;height:40px;background:linear-gradient(135deg,#2563eb,#0891b2);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(37,99,235,.5);animation:droneFloat 3s ease-in-out infinite;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><circle cx="12" cy="12" r="2"/><path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M4.93 19.07l4.24-4.24"/><circle cx="12" cy="12" r="8"/></svg>
    </div>
  </div>`,
  iconSize: [52, 52],
  iconAnchor: [26, 26],
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

export default function CommandCenter() {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [drone, setDrone] = useState(null);
  const [droneTrail, setDroneTrail] = useState([]);
  const trailRef = useRef([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [statistics, setStatistics] = useState({
    totalReports: 0, pendingReports: 0, resolvedReports: 0,
    criticalReports: 0, activeDrones: 0,
  });
  const [flyTarget, setFlyTarget] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [tileKey, setTileKey] = useState('street');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [officerNotes, setOfficerNotes] = useState('');

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchReports();
    fetchStatistics();
    const interval = setInterval(() => { fetchReports(); fetchStatistics(); }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const droneRef = ref(db, 'drone');
    const unsubscribe = onValue(
      droneRef,
      (snapshot) => {
        const d = snapshot.val();
        if (d?.latitude && d.latitude !== 'Not Fixed') {
          setDrone(d);
          const pos = [parseFloat(d.latitude), parseFloat(d.longitude)];
          trailRef.current = [...trailRef.current.slice(-99), pos];
          setDroneTrail([...trailRef.current]);
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
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}. Notification sent to citizen.`);
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
  const hInfo = hdopInfo(drone?.hdop);

  const filteredReports = filterSeverity === 'ALL'
    ? reports
    : reports.filter((r) => r.severity === filterSeverity);

  const clockStr = clock.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />

      {/* Header + Stats */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg flex-shrink-0">
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
                  { val: statistics.resolvedReports, label: 'Resolved', cls: 'text-green-200' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className={`text-2xl font-bold ${s.cls}`}>{s.val}</div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
                <span className={`w-2.5 h-2.5 rounded-full ${drone ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm font-semibold">{drone ? 'Drone Online' : 'Drone Offline'}</span>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
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
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold border border-emerald-200">{reports.length}</span>
            </div>

            {/* Severity filter */}
            <div className="flex gap-1.5 px-4 py-3 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button key={sev} onClick={() => setFilterSeverity(sev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    filterSeverity === sev
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                      className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50/30 hover:-translate-y-[1px] hover:shadow-md ${
                        selectedReport?.id === r.id
                          ? 'border-emerald-400 bg-emerald-50 shadow-lg ring-2 ring-emerald-200'
                          : 'border-gray-200 bg-gray-50/50'
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
                          'bg-green-50 text-green-600 border-green-200'
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
            <div className="flex justify-between items-center px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Live Command Map</h2>
                <p className="text-sm text-gray-500">{reports.length} active incidents{drone ? ' \u2022 Drone tracking' : ''}</p>
              </div>
              <div className="flex gap-1.5">
                {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                  <button key={key} onClick={() => setTileKey(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tileKey === key
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {layer.name}
                  </button>
                ))}
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

              {droneTrail.length > 1 && (
                <Polyline positions={droneTrail} pathOptions={{ color: '#2563eb', weight: 2, dashArray: '6,8', opacity: 0.6 }} />
              )}

              {filteredReports.map((r) => (
                <Marker
                  key={r.id}
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

              {dronePos && (
                <Marker position={dronePos} icon={droneMarkerIcon}>
                  <Popup minWidth={230}>
                    <div style={{ fontFamily: 'Inter,sans-serif' }}>
                      <strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>Live Drone</strong>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: '#94a3b8' }}>Status: </span>
                        <span style={{ fontWeight: 600, color: '#059669' }}>{drone.status || 'Active'}</span>
                      </div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Alt: {parseFloat(drone.altitude).toFixed(1)}m</div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Speed: {parseFloat(drone.speed).toFixed(2)} km/h</div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Satellites: {drone.satellites}</div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>HDOP: {hInfo.label}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                        Updated: {drone.time} &middot; {drone.date}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {dronePos && selectedPos && (
                <Polyline positions={[dronePos, selectedPos]} pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '8,6', opacity: 0.8 }} />
              )}
            </MapContainer>

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl px-5 py-3 flex items-center gap-6 shadow-lg text-sm text-gray-600 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.5)]" />
                Incidents
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.5)]" />
                Drone
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 border-t-2 border-dashed border-blue-500" />
                Trail
              </div>
              {distance && (
                <span className="bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full font-bold border border-cyan-200 text-xs">
                  {distance} km
                </span>
              )}
              <button onClick={centerMap}
                className="ml-1 px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 font-semibold hover:bg-emerald-100 transition text-sm">
                <CrosshairIcon className="w-4 h-4 inline-block mr-1" />Reset
              </button>
            </div>
          </motion.div>

          {/* Right sidebar: Drone Telemetry */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="w-[380px] flex-shrink-0 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-y-auto flex flex-col"
          >
            <div className="flex-shrink-0">
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <DroneIcon className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-bold text-gray-800">Drone Telemetry</h2>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                  drone ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${drone ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                  {drone ? 'Online' : 'Offline'}
                </span>
              </div>

              {drone ? (
                <>
                  <div className="grid grid-cols-2 gap-3 p-4">
                    <TeleCard icon={<GlobeIcon className="w-4 h-4 text-blue-500" />} label="Latitude" value={parseFloat(drone.latitude).toFixed(5)} cls="bg-blue-50 border-blue-200" />
                    <TeleCard icon={<GlobeIcon className="w-4 h-4 text-blue-500" />} label="Longitude" value={parseFloat(drone.longitude).toFixed(5)} cls="bg-blue-50 border-blue-200" />
                    <TeleCard icon={<AltitudeIcon className="w-4 h-4 text-cyan-500" />} label="Altitude" value={`${parseFloat(drone.altitude).toFixed(1)}m`} cls="bg-cyan-50 border-cyan-200" />
                    <TeleCard icon={<SpeedIcon className="w-4 h-4 text-emerald-500" />} label="Speed" value={`${parseFloat(drone.speed).toFixed(2)} km/h`} cls="bg-emerald-50 border-emerald-200" />
                    <TeleCard icon={<SatelliteIcon className="w-4 h-4 text-violet-500" />} label="Satellites" value={drone.satellites} cls="bg-violet-50 border-violet-200" />
                    <TeleCard icon={<SignalIcon className="w-4 h-4 text-gray-500" />} label="HDOP" value={hInfo.label} cls="bg-gray-50 border-gray-200" valueColor={hInfo.color} />
                  </div>

                  <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <span className="text-sm text-gray-500 flex-1">Signal Strength</span>
                    <div className="flex items-end gap-1 h-6">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i}
                          className={`w-2 rounded-sm transition-colors ${drone.satellites >= i * 2 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gray-200'}`}
                          style={{ height: `${i * 5}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{drone.satellites} sats</span>
                  </div>

                  <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-400">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span className="flex-1">Last Update</span>
                    <span className="font-mono font-medium text-gray-600">{drone.time} &middot; {drone.date}</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                    <SignalIcon className="w-7 h-7 text-gray-300" />
                  </div>
                  <span className="text-base font-medium">No drone connected</span>
                  <span className="text-sm text-gray-300">Waiting for signal...</span>
                </div>
              )}
            </div>

            {/* Selected report quick summary */}
            {selectedReport && (
              <div className="border-t border-gray-200 flex-1 overflow-y-auto">
                <div className="px-5 py-3 bg-emerald-50/50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                      <DisasterTypeIcon type={selectedReport.metadata?.disaster_type} className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 capitalize">{capitalize(selectedReport.metadata?.disaster_type || 'Unknown')}</div>
                      <div className="text-xs text-gray-400">Report #{selectedReport.id}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${STATUS_CONFIG[selectedReport.status]?.bg || 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                      {STATUS_CONFIG[selectedReport.status]?.label || selectedReport.status}
                    </span>
                  </div>
                </div>

                <div className="px-5 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Severity</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: SEV_BG[selectedReport.severity], color: SEV_COLOR[selectedReport.severity] }}>
                      {selectedReport.severity || 'Unknown'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Description</span>
                    <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">{selectedReport.metadata?.description || 'No description'}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Reporter</span>
                    <span className="text-xs font-medium text-gray-700">{selectedReport.metadata?.reporter_name || 'Anonymous'}</span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Location</span>
                    <span className="text-xs font-mono text-blue-600">
                      {parseFloat(selectedReport.latitude).toFixed(5)}, {parseFloat(selectedReport.longitude).toFixed(5)}
                    </span>
                  </div>

                  {distance && (
                    <div className="flex items-center justify-between bg-cyan-50 rounded-lg px-3 py-2 border border-cyan-200">
                      <span className="text-xs text-cyan-600">Drone Distance</span>
                      <span className="text-sm font-bold text-cyan-800">{distance} km</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Submitted</span>
                    <span className="text-xs text-gray-600">{new Date(selectedReport.created_at).toLocaleString()}</span>
                  </div>

                  {selectedReport.metadata?.officer_notes && (
                    <div className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                      <span className="text-xs text-amber-600 font-bold block mb-0.5">Officer Notes</span>
                      <p className="text-xs text-amber-800 line-clamp-2">{selectedReport.metadata.officer_notes}</p>
                    </div>
                  )}
                </div>

                <div className="px-5 py-2 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                    <ChevronDownIcon className="w-3 h-3" /> Full details below
                  </p>
                </div>
              </div>
            )}
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
              className="mt-4 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <DisasterTypeIcon type={selectedReport.metadata?.disaster_type} className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold capitalize">
                      {capitalize(selectedReport.metadata?.disaster_type || 'Unknown')} &mdash; Report #{selectedReport.id}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-bold px-3 py-1 rounded-lg"
                        style={{
                          background: SEV_COLOR[selectedReport.severity] + '30',
                          color: '#fff',
                          border: `1px solid ${SEV_COLOR[selectedReport.severity]}80`,
                        }}>
                        {selectedReport.severity}
                      </span>
                      <span className="text-xs font-bold px-3 py-1 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20">
                        {STATUS_CONFIG[selectedReport.status]?.label || selectedReport.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                {/* LEFT: Report Info */}
                <div className="lg:border-r border-gray-200 p-6">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Report Information</h3>
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

                  <div className="mt-5 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <span className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Description</span>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedReport.metadata?.full_description || selectedReport.metadata?.description || 'No description provided'}
                    </p>
                  </div>

                  <a href={`https://maps.google.com/?q=${selectedReport.latitude},${selectedReport.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-200 transition-all">
                    <MapPinIcon className="w-4 h-4" /> Open in Google Maps
                  </a>
                </div>

                {/* CENTER: Officer Actions */}
                <div className="lg:border-r border-gray-200 p-6 border-t lg:border-t-0">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Officer Actions</h3>

                  <div className="flex gap-3 mb-5">
                    <button
                      disabled={updatingStatus || selectedReport.status === 'RESOLVED'}
                      onClick={() => updateReportStatus(selectedReport.id, 'RESOLVED', officerNotes)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                        selectedReport.status === 'RESOLVED'
                          ? 'bg-green-100 text-green-700 border-2 border-green-400 ring-2 ring-green-200'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-200'
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
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Officer Notes (sent to citizen)</label>
                    <textarea
                      value={officerNotes}
                      onChange={(e) => setOfficerNotes(e.target.value)}
                      placeholder="Add notes for the citizen (reason for rejection, instructions, etc.)..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none resize-none transition"
                    />
                  </div>

                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">All Status Options</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        disabled={updatingStatus || selectedReport.status === key}
                        onClick={() => updateReportStatus(selectedReport.id, key, officerNotes)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          selectedReport.status === key
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:shadow-sm'
                        } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT: Report Summary */}
                <div className="p-6 border-t lg:border-t-0">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Report Summary</h3>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                        <DisasterTypeIcon type={selectedReport.metadata?.disaster_type} className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block">Disaster Type</span>
                        <span className="text-sm font-bold text-gray-900 capitalize">{capitalize(selectedReport.metadata?.disaster_type || 'Unknown')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{ background: SEV_BG[selectedReport.severity] || '#f8fafc', borderColor: (SEV_COLOR[selectedReport.severity] || '#94a3b8') + '40' }}>
                      <div className="w-9 h-9 rounded-lg bg-white border flex items-center justify-center" style={{ borderColor: (SEV_COLOR[selectedReport.severity] || '#94a3b8') + '40' }}>
                        <SeverityIcon className="w-4 h-4" style={{ color: SEV_COLOR[selectedReport.severity] }} />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block">Severity Level</span>
                        <span className="text-sm font-bold" style={{ color: SEV_COLOR[selectedReport.severity] }}>{selectedReport.severity}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{ background: (STATUS_CONFIG[selectedReport.status]?.color || '#64748b') + '08', borderColor: (STATUS_CONFIG[selectedReport.status]?.color || '#64748b') + '30' }}>
                      <div className="w-9 h-9 rounded-lg bg-white border flex items-center justify-center" style={{ borderColor: (STATUS_CONFIG[selectedReport.status]?.color || '#64748b') + '30' }}>
                        <span className={`w-3 h-3 rounded-full ${STATUS_CONFIG[selectedReport.status]?.dot || 'bg-gray-400'}`} />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block">Current Status</span>
                        <span className="text-sm font-bold" style={{ color: STATUS_CONFIG[selectedReport.status]?.color }}>{STATUS_CONFIG[selectedReport.status]?.label || selectedReport.status}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="w-9 h-9 rounded-lg bg-white border border-emerald-200 flex items-center justify-center">
                        <MapPinIcon className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block">Priority</span>
                        <span className="text-sm font-bold text-emerald-800">{selectedReport.metadata?.priority || 0}</span>
                      </div>
                    </div>
                  </div>

                  {selectedReport.metadata?.officer_notes && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="block text-xs text-amber-600 uppercase tracking-wider font-bold mb-1">Officer Notes</span>
                      <p className="text-sm text-amber-800">{selectedReport.metadata.officer_notes}</p>
                    </div>
                  )}

                  {selectedReport.metadata?.response_notes && (
                    <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="block text-xs text-emerald-600 uppercase tracking-wider font-bold mb-1">Response Notes</span>
                      <p className="text-sm text-emerald-800">{selectedReport.metadata.response_notes}</p>
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

function TeleCard({ icon, label, value, cls, valueColor }) {
  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-1.5 transition-transform hover:scale-[1.02] ${cls}`}>
      {icon}
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-base font-bold text-gray-900 leading-tight" style={valueColor ? { color: valueColor } : {}}>{value}</span>
    </div>
  );
}

function InfoItem({ label, value, mono = false, highlight = false }) {
  return (
    <div className={`flex items-center justify-between ${highlight ? 'bg-cyan-50 px-3 py-2 rounded-lg border border-cyan-200' : ''}`}>
      <span className={`text-xs ${highlight ? 'text-cyan-600' : 'text-gray-400'} uppercase tracking-wide`}>{label}</span>
      <span className={`text-sm font-semibold text-right max-w-[200px] truncate ${mono ? 'font-mono text-blue-600 text-xs' : 'text-gray-800'} ${highlight ? 'text-cyan-700' : ''}`}>{value}</span>
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
function DroneIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="2" /><path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M4.93 19.07l4.24-4.24" /><circle cx="12" cy="12" r="8" /></svg>; }
function GlobeIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9 9 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>; }
function AltitudeIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" /></svg>; }
function SpeedIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>; }
function SatelliteIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>; }
function XIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>; }
function CheckCircleIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function XCircleIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function MapPinIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>; }
function CrosshairIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 2v4m0 12v4m10-10h-4M6 12H2" /></svg>; }
function InboxIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.399 0V6.108c0-1.135.845-2.098 1.976-2.192a48.424 48.424 0 0113.048 0c1.131.094 1.976 1.057 1.976 2.192V13.5" /></svg>; }
function PlayIcon({ className }) { return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>; }
function SignalIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>; }
function ClockIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function ChevronDownIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>; }
function SeverityIcon({ className, style }) { return <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>; }

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

const TYPE_EMOJI = {
  fire: '\u{1F525}', flood: '\u{1F30A}', earthquake: '\u{1F30D}', landslide: '\u26F0\uFE0F', storm: '\u{1F32A}\uFE0F',
  cyclone: '\u{1F300}', tsunami: '\u{1F30A}', drought: '\u2600\uFE0F', volcano: '\u{1F30B}',
};

const STATUS_CONFIG = {
  PENDING:    { label: 'Pending',    color: '#d97706', bg: 'bg-amber-100 text-amber-800 border-amber-300',    icon: '\u23F3' },
  REVIEWING:  { label: 'Reviewing',  color: '#2563eb', bg: 'bg-blue-100 text-blue-800 border-blue-300',       icon: '\u{1F50D}' },
  DISPATCHED: { label: 'Dispatched', color: '#7c3aed', bg: 'bg-violet-100 text-violet-800 border-violet-300', icon: '\u{1F69C}' },
  RESCUING:   { label: 'Rescuing',   color: '#ea580c', bg: 'bg-orange-100 text-orange-800 border-orange-300', icon: '\u{1F6DF}' },
  RESOLVED:   { label: 'Resolved',   color: '#059669', bg: 'bg-green-100 text-green-800 border-green-300',    icon: '\u2705' },
  REJECTED:   { label: 'Rejected',   color: '#dc2626', bg: 'bg-red-100 text-red-800 border-red-300',          icon: '\u274C' },
};

const TILE_LAYERS = {
  street:    { name: 'Street',    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                           attribution: '\u00A9 OpenStreetMap' },
  satellite: { name: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '\u00A9 Esri' },
  terrain:   { name: 'Terrain',   url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                             attribution: '\u00A9 OpenTopoMap' },
  dark:      { name: 'Dark',      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                                attribution: '\u00A9 CartoDB' },
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
        <span style="transform:rotate(45deg);font-size:16px;">\u{1F6A8}</span>
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
    <div style="position:relative;z-index:2;width:40px;height:40px;background:linear-gradient(135deg,#2563eb,#0891b2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 14px rgba(37,99,235,.5);animation:droneFloat 3s ease-in-out infinite;">\u{1F681}</div>
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
      setStatistics(res.data);
    } catch (e) { console.error('Error fetching statistics:', e); }
  };

  const updateReportStatus = async (reportId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await axios.patch(
        `${API_URL}/api/v1/disaster-reports/reports/${reportId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      setSelectedReport((prev) => prev ? { ...prev, status: newStatus } : prev);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <Navbar />
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />

      {/* Header + Stats */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white shadow-xl flex-shrink-0">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-white/20">
                <span className="text-2xl font-bold text-white">{'\u{1F3AF}'}</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Command Center</h1>
                <p className="text-slate-300 text-sm">Real-time Disaster Response & Drone Operations</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <div className="text-3xl font-bold">{statistics.totalReports}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Total</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400">{statistics.criticalReports}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-400">{statistics.pendingReports}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{statistics.resolvedReports}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Resolved</div>
              </div>
              <div className="h-10 w-px bg-slate-600" />
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${drone ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-sm font-semibold">{drone ? 'Drone Online' : 'Drone Offline'}</span>
              </div>
              <div className="h-10 w-px bg-slate-600" />
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Live</div>
                <div className="text-lg font-bold font-mono tabular-nums">{clockStr}</div>
              </div>
            </div>
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard icon={'\u{1F4CA}'} value={statistics.totalReports} label="Total Reports" gradient="from-blue-500 to-blue-600" />
            <StatCard icon={'\u{1F6A8}'} value={statistics.criticalReports} label="Critical" gradient="from-red-500 to-red-600" />
            <StatCard icon={'\u23F3'} value={statistics.pendingReports} label="Pending" gradient="from-amber-500 to-orange-500" />
            <StatCard icon={'\u2705'} value={statistics.resolvedReports} label="Resolved" gradient="from-green-500 to-emerald-600" />
            <StatCard icon={'\u{1F681}'} value={drone ? 1 : 0} label="Drones" gradient={drone ? 'from-cyan-500 to-teal-500' : 'from-gray-400 to-gray-500'} />
            <StatCard icon={'\u{1F6F0}\uFE0F'} value={drone?.satellites || 0} label="Satellites" gradient="from-purple-500 to-violet-600" />
            {distance && <StatCard icon={'\u{1F4CF}'} value={`${distance} km`} label="Drone Dist." gradient="from-teal-500 to-cyan-600" />}
          </div>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="flex-1 max-w-[1920px] w-full mx-auto p-4">
        <div className="flex gap-4" style={{ height: 'calc(100vh - 280px)' }}>

          {/* Left sidebar: Reports */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-[380px] flex-shrink-0 bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{'\u{1F4CB}'} Active Reports</h2>
                <p className="text-sm text-gray-500">{filteredReports.length} incidents found</p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">{reports.length}</span>
            </div>

            {/* Severity filter */}
            <div className="flex gap-1.5 px-4 py-3 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button key={sev} onClick={() => setFilterSeverity(sev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    filterSeverity === sev
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                    <span className="text-5xl">{'\u{1F4ED}'}</span>
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
                      className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/50 hover:-translate-y-[1px] hover:shadow-md ${
                        selectedReport?.id === r.id
                          ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                          : 'border-gray-200 bg-gray-50/50'
                      }`}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                        style={{ background: SEV_COLOR[r.severity] || '#94a3b8' }} />

                      <div className="flex justify-between items-start mb-2 ml-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{TYPE_EMOJI[r.metadata?.disaster_type] || '\u26A0\uFE0F'}</span>
                          <div>
                            <span className="text-base font-bold text-gray-900 capitalize block">
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
                        <span>{'\u{1F464}'} {r.metadata?.reporter_name || 'Anonymous'}</span>
                        <span>{'\u{1F552}'} {new Date(r.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 ml-2">
                        <span className="text-xs text-blue-500/70 font-mono">
                          {'\u{1F4CD}'} {parseFloat(r.latitude).toFixed(5)}, {parseFloat(r.longitude).toFixed(5)}
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
            className="flex-1 relative bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{'\u{1F5FA}\uFE0F'} Live Command Map</h2>
                <p className="text-sm text-gray-500">{reports.length} active incidents{drone ? ' \u2022 Drone tracking' : ''}</p>
              </div>
              {/* Map Mode Selector */}
              <div className="flex gap-1.5">
                {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                  <button key={key} onClick={() => setTileKey(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tileKey === key
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
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
                      <strong style={{ fontSize: 15 }}>
                        {TYPE_EMOJI[r.metadata?.disaster_type] || '\u26A0\uFE0F'}{' '}
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
                      <strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>{'\u{1F681}'} Live Drone</strong>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: '#94a3b8' }}>Status: </span>
                        <span style={{ fontWeight: 600, color: '#059669' }}>{drone.status || 'Active'}</span>
                      </div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Alt: {parseFloat(drone.altitude).toFixed(1)}m</div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Speed: {parseFloat(drone.speed).toFixed(2)} km/h</div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Satellites: {drone.satellites}</div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>HDOP: {hInfo.label}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                        Updated: {drone.time} {'\u2022'} {drone.date}
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
                  {'\u{1F4CF}'} {distance} km
                </span>
              )}
              <button onClick={centerMap}
                className="ml-1 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 font-semibold hover:bg-blue-100 transition text-sm">
                {'\u{1F3AF}'} Reset
              </button>
            </div>
          </motion.div>

          {/* Right sidebar: Details + Telemetry */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="w-[380px] flex-shrink-0 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-y-auto flex flex-col"
          >
            {/* Drone telemetry */}
            <div className="flex-shrink-0 border-b border-gray-200">
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">{'\u{1F681}'} Drone Telemetry</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  drone ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}>
                  {drone ? '\u25CF Online' : '\u25CB Offline'}
                </span>
              </div>

              {drone ? (
                <>
                  <div className="grid grid-cols-2 gap-3 p-4">
                    <TeleCard icon={'\u{1F310}'} label="Latitude" value={parseFloat(drone.latitude).toFixed(5)} cls="bg-blue-50 border-blue-200" />
                    <TeleCard icon={'\u{1F310}'} label="Longitude" value={parseFloat(drone.longitude).toFixed(5)} cls="bg-blue-50 border-blue-200" />
                    <TeleCard icon={'\u2B06\uFE0F'} label="Altitude" value={`${parseFloat(drone.altitude).toFixed(1)}m`} cls="bg-cyan-50 border-cyan-200" />
                    <TeleCard icon={'\u{1F4A8}'} label="Speed" value={`${parseFloat(drone.speed).toFixed(2)} km/h`} cls="bg-green-50 border-green-200" />
                    <TeleCard icon={'\u{1F6F0}\uFE0F'} label="Satellites" value={drone.satellites} cls="bg-purple-50 border-purple-200" />
                    <TeleCard icon={'\u{1F3AF}'} label="HDOP" value={hInfo.label} cls="bg-gray-50 border-gray-200" valueColor={hInfo.color} />
                  </div>

                  <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <span className="text-sm text-gray-500 flex-1">Signal Strength</span>
                    <div className="flex items-end gap-1 h-6">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i}
                          className={`w-2 rounded-sm transition-colors ${drone.satellites >= i * 2 ? 'bg-gradient-to-t from-green-600 to-green-400' : 'bg-gray-200'}`}
                          style={{ height: `${i * 5}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-green-600">{drone.satellites} sats</span>
                  </div>

                  <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-400">
                    <span className="flex-1">{'\u{1F550}'} Last Update</span>
                    <span className="font-mono font-medium text-gray-600">{drone.time} {'\u2022'} {drone.date}</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
                  <span className="text-4xl">{'\u{1F4E1}'}</span>
                  <span className="text-base font-medium">No drone connected</span>
                  <span className="text-sm text-gray-300">Waiting for signal...</span>
                </div>
              )}
            </div>

            {/* Selected report details */}
            <AnimatePresence mode="wait">
              {selectedReport ? (
                <motion.div
                  key={selectedReport.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25 }}
                  className="flex-1 overflow-y-auto"
                >
                  <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-bold text-gray-800">{'\u{1F4C4}'} Incident Details</h2>
                    <button onClick={() => setSelectedReport(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition text-lg">
                      {'\u2715'}
                    </button>
                  </div>

                  {/* Type header */}
                  <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                    <div className="w-14 h-14 bg-white rounded-xl shadow-md flex items-center justify-center text-3xl border border-gray-100">
                      {TYPE_EMOJI[selectedReport.metadata?.disaster_type] || '\u26A0\uFE0F'}
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-900 capitalize">
                        {capitalize(selectedReport.metadata?.disaster_type || 'Unknown')}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg border"
                          style={{ background: SEV_BG[selectedReport.severity], color: SEV_COLOR[selectedReport.severity], borderColor: SEV_COLOR[selectedReport.severity] + '40' }}>
                          {selectedReport.severity}
                        </span>
                        <span className="text-sm text-gray-400">#{selectedReport.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Update Buttons */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">{'\u{1F504}'} Update Status</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <button
                          key={key}
                          disabled={updatingStatus || selectedReport.status === key}
                          onClick={() => updateReportStatus(selectedReport.id, key)}
                          className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                            selectedReport.status === key
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200 shadow-md'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:shadow-sm'
                          } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className="text-lg">{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Detail rows */}
                  <div className="mx-4 my-4 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      <DetailRow label="Report ID" value={`#${selectedReport.id}`} />
                      <DetailRow label="Current Status"
                        value={STATUS_CONFIG[selectedReport.status]?.label || selectedReport.status}
                        valueStyle={{ color: STATUS_CONFIG[selectedReport.status]?.color || '#64748b', fontWeight: 700 }} />
                      <DetailRow label="Reporter" value={selectedReport.metadata?.reporter_name || 'Anonymous'} />
                      <DetailRow label="Contact" value={selectedReport.metadata?.reporter_contact || 'N/A'} />
                      <DetailRow label="Time" value={new Date(selectedReport.created_at).toLocaleString()} />
                      <DetailRow label="Coordinates"
                        value={`${parseFloat(selectedReport.latitude).toFixed(6)}, ${parseFloat(selectedReport.longitude).toFixed(6)}`}
                        valueStyle={{ color: '#2563eb', fontFamily: 'monospace' }} />
                      {distance && (
                        <DetailRow label="Drone Distance" value={`${'\u{1F4CF}'} ${distance} km`}
                          valueStyle={{ color: '#0891b2', fontWeight: 800 }} highlight />
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mx-4 mb-4 bg-gray-50 border border-gray-200 rounded-xl p-5">
                    <span className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Description</span>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {selectedReport.metadata?.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Google Maps */}
                  <div className="mx-4 mb-4">
                    <a href={`https://maps.google.com/?q=${selectedReport.latitude},${selectedReport.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="block w-full text-center py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all">
                      {'\u{1F5FA}\uFE0F'} Open in Google Maps
                    </a>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400"
                >
                  <span className="text-5xl">{'\u{1F4CD}'}</span>
                  <span className="text-base font-medium">Select a report</span>
                  <span className="text-sm text-gray-300">Click a report or map marker</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
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

function StatCard({ icon, value, label, gradient }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-br ${gradient} text-white rounded-xl shadow-lg p-3 relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-full -mr-6 -mt-6" />
      <div className="relative flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-xl flex-shrink-0">{icon}</div>
        <div>
          <div className="text-2xl font-extrabold leading-none">{value}</div>
          <div className="text-xs text-white/80 font-medium mt-0.5">{label}</div>
        </div>
      </div>
    </motion.div>
  );
}

function DetailRow({ label, value, valueStyle = {}, highlight = false }) {
  return (
    <div className={`flex justify-between items-center px-5 py-3 text-sm ${highlight ? 'bg-cyan-50/50' : ''}`}>
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-800 text-right max-w-[180px] truncate" style={valueStyle}>{value}</span>
    </div>
  );
}

function TeleCard({ icon, label, value, cls, valueColor }) {
  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-1.5 transition-transform hover:scale-[1.02] ${cls}`}>
      <span className="text-lg">{icon}</span>
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-base font-bold text-gray-900 leading-tight" style={valueColor ? { color: valueColor } : {}}>{value}</span>
    </div>
  );
}

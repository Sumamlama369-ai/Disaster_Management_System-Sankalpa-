import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── SVG Icons ────────────────────────────────────────────────
const AlertTriangleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const SendIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);
const UsersIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const PhoneIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
);
const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const CheckCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const XCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);
const SearchIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const RadioIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M13.06 7.9a14.88 14.88 0 0 1 8 3.9"/><path d="M2 12.95a10.94 10.94 0 0 1 5-3.4"/><path d="M5.72 7.9a14.88 14.88 0 0 0-3.72 2.2"/><circle cx="12" cy="17" r="1"/><path d="M9.34 14.24a4 4 0 0 1 5.32 0"/></svg>
);
const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const ShieldIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const ZapIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);
const MapPinIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
);
const ExpandIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);
const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
);

// ─── Alert Type Definitions ──────────────────────────────────
// SVG icon components for alert types (no emojis)
const FloodIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 11c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>
);
const QuakeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 12 5 9 8 13 11 7 14 15 17 10 20 14 22 12"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
);
const LandslideIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20L10 4l4 8 6-6v14H4z"/><circle cx="8" cy="16" r="1.5"/><circle cx="14" cy="14" r="1"/></svg>
);
const FireIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c-4.97 0-9-2.69-9-6 0-4 5-11 9-14 4 3 9 10 9 14 0 3.31-4.03 6-9 6z"/><path d="M12 22c-1.66 0-3-1.12-3-2.5 0-2 2-5 3-6.5 1 1.5 3 4.5 3 6.5 0 1.38-1.34 2.5-3 2.5z"/></svg>
);
const StormIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>
);
const EditPenIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);

const ALERT_TYPE_ICONS = { Flood: FloodIcon, Earthquake: QuakeIcon, Landslide: LandslideIcon, Fire: FireIcon, Storm: StormIcon, Custom: EditPenIcon };

const ALERT_TYPES = [
  { name: 'Flood',      gradient: 'from-blue-500 to-cyan-400',    bg: 'bg-blue-50',    border: 'border-blue-300',   text: 'text-blue-700',    ring: 'ring-blue-200',    dot: 'bg-blue-500',   iconColor: 'text-blue-500',   template: 'FLOOD WARNING: High water levels detected in your area. Please evacuate low-lying areas immediately. Move to higher ground. Avoid rivers and streams. Emergency: 100' },
  { name: 'Earthquake', gradient: 'from-orange-500 to-amber-400', bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', ring: 'ring-orange-200', dot: 'bg-orange-500', iconColor: 'text-orange-500', template: 'EARTHQUAKE ALERT: Strong tremors detected near your area. Drop, Cover, Hold On. Move to open spaces away from buildings and power lines. Emergency: 1166' },
  { name: 'Landslide',  gradient: 'from-amber-600 to-yellow-400', bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-700',  ring: 'ring-amber-200',  dot: 'bg-amber-500',  iconColor: 'text-amber-500',  template: 'LANDSLIDE WARNING: High risk of landslide in your area due to heavy rainfall. Evacuate immediately to safer ground. Avoid steep slopes and river banks. Emergency: 100' },
  { name: 'Fire',       gradient: 'from-red-500 to-orange-400',   bg: 'bg-red-50',     border: 'border-red-300',    text: 'text-red-700',     ring: 'ring-red-200',    dot: 'bg-red-500',    iconColor: 'text-red-500',    template: 'FIRE ALERT: Fire reported in your vicinity. Keep safe distance from the area. Close all windows and doors if indoors. Call fire brigade: 101' },
  { name: 'Storm',      gradient: 'from-indigo-500 to-purple-400', bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', ring: 'ring-indigo-200', dot: 'bg-indigo-500', iconColor: 'text-indigo-500', template: 'STORM WARNING: Severe weather approaching in the next few hours. Stay indoors, avoid travel, and secure loose outdoor objects. Emergency: 100' },
  { name: 'Custom',     gradient: 'from-gray-500 to-gray-400',  bg: 'bg-gray-50',    border: 'border-gray-300',   text: 'text-gray-700',    ring: 'ring-gray-200',   dot: 'bg-gray-500',   iconColor: 'text-gray-500',   template: '' },
];

const SEVERITY_LEVELS = [
  { name: 'Low',      color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200', pulse: false },
  { name: 'Medium',   color: 'bg-yellow-500',  light: 'bg-yellow-50 text-yellow-700 border-yellow-200',   pulse: false },
  { name: 'High',     color: 'bg-orange-500',  light: 'bg-orange-50 text-orange-700 border-orange-200',   pulse: false },
  { name: 'Critical', color: 'bg-red-500',     light: 'bg-red-50 text-red-700 border-red-200',           pulse: true },
];

const EMERGENCY_NUMBERS = [
  { name: 'Nepal Police', number: '100' },
  { name: 'Fire Brigade', number: '101' },
  { name: 'Ambulance', number: '102' },
  { name: 'NDRF', number: '1166' },
];

// ─── LocalStorage Keys ───────────────────────────────────────
const STORAGE_KEY_HISTORY = 'sankalpa_sms_history';
const STORAGE_KEY_STATS = 'sankalpa_sms_stats';

// ─── Helpers ─────────────────────────────────────────────────
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}
function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Animated Counter ────────────────────────────────────────
function AnimatedCount({ value, className = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === display) return;
    const step = value > display ? 1 : -1;
    const speed = Math.max(10, 60 - Math.abs(value - display) * 2);
    const timer = setInterval(() => {
      setDisplay(prev => {
        if (prev === value) { clearInterval(timer); return prev; }
        return prev + step;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [value]);
  return <span className={className}>{display}</span>;
}

// ─── Confirmation Modal ──────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, title, message, detail, severity, sending, recipientCount, smsCredits }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div className={`h-1.5 ${severity === 'Critical' ? 'bg-gradient-to-r from-red-500 to-rose-500' : severity === 'High' ? 'bg-gradient-to-r from-orange-500 to-amber-500' : severity === 'Medium' ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-green-400'}`} />
          <div className="p-6">
            <div className="flex items-center justify-center mb-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${severity === 'Critical' ? 'bg-red-100' : 'bg-amber-100'}`}>
                <AlertTriangleIcon className={`w-8 h-8 ${severity === 'Critical' ? 'text-red-500' : 'text-amber-500'}`} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center">{title}</h3>
            <p className="text-base text-gray-500 text-center mt-2 leading-relaxed">{message}</p>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-6 mt-4 py-3 bg-gray-50 rounded-xl">
              <div className="text-center">
                <div className="text-xs text-gray-400 font-medium">Recipients</div>
                <div className="text-lg font-bold text-gray-900">{recipientCount}</div>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <div className="text-xs text-gray-400 font-medium">SMS Credits</div>
                <div className="text-lg font-bold text-amber-600">{smsCredits}</div>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <div className="text-xs text-gray-400 font-medium">Severity</div>
                <div className={`text-lg font-bold ${severity === 'Critical' ? 'text-red-500' : severity === 'High' ? 'text-orange-500' : severity === 'Medium' ? 'text-yellow-600' : 'text-emerald-500'}`}>{severity}</div>
              </div>
            </div>

            {detail && (
              <div className="mt-4 bg-gray-50 rounded-xl p-3.5 border border-gray-100 max-h-24 overflow-y-auto">
                <p className="text-xs text-gray-600 leading-relaxed">{detail}</p>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button onClick={onClose} disabled={sending} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={onConfirm} disabled={sending} className={`flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all ${severity === 'Critical' ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600' : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'}`}>
                {sending ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg> : <SendIcon className="w-4 h-4" />}
                {sending ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Success Animation ───────────────────────────────────────
function SuccessOverlay({ show, count }) {
  if (!show) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
      <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.1, 1] }} transition={{ duration: 0.5 }} className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center border border-emerald-100">
        <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.1, duration: 0.5 }} className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
        </motion.div>
        <p className="text-2xl font-bold text-gray-900">Alert Dispatched!</p>
        <p className="text-base text-gray-500 mt-1">{count > 1 ? `${count} recipients notified` : 'Recipient notified successfully'}</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function DisasterAlertSMS() {
  const location = useLocation();
  const [sendMode, setSendMode] = useState('single');
  const [selectedType, setSelectedType] = useState(null);
  const [severity, setSeverity] = useState('High');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [citizens, setCitizens] = useState([]);
  const [loadingCitizens, setLoadingCitizens] = useState(false);
  const [selectedCitizens, setSelectedCitizens] = useState([]);
  const [citizenSearch, setCitizenSearch] = useState('');
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [districtFilter, setDistrictFilter] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const recipientRef = useRef(null);
  const messageRef = useRef(null);

  // ─── Persistent State: Load from localStorage ───
  const [history, setHistory] = useState(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY_HISTORY); return saved ? JSON.parse(saved) : []; }
    catch { return []; }
  });
  const [stats, setStats] = useState(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY_STATS); return saved ? JSON.parse(saved) : { totalSent: 0, totalDelivered: 0, totalFailed: 0 }; }
    catch { return { totalSent: 0, totalDelivered: 0, totalFailed: 0 }; }
  });

  // Persist history & stats to localStorage
  useEffect(() => { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats)); }, [stats]);

  const lastAlertTime = history.length > 0 ? history[0].timestamp : null;

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load citizens + auto-refresh every 30s
  useEffect(() => {
    fetchCitizens();
    const interval = setInterval(fetchCitizens, 30000);
    return () => clearInterval(interval);
  }, []);

  // Outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (recipientRef.current && !recipientRef.current.contains(e.target)) setShowRecipientList(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-fill from Weather Intel page alert draft
  useEffect(() => {
    const wa = location.state?.weatherAlert;
    if (!wa) return;

    // Set alert type
    const alertType = ALERT_TYPES.find(a => a.name === wa.alertType);
    if (alertType) {
      setSelectedType(alertType.name);
    }

    // Set severity
    setSeverity(wa.severity || 'High');

    // Set send mode to broadcast for district-wide alerts
    setSendMode('broadcast');

    // Build a context-rich message
    const sevPrefix = wa.severity !== 'Low' ? `[${(wa.severity || 'HIGH').toUpperCase()}] ` : '';
    const riskDetails = [
      wa.riskFlood !== 'low' ? `Flood risk: ${wa.riskFlood}` : '',
      wa.riskLandslide !== 'low' ? `Landslide risk: ${wa.riskLandslide}` : '',
      wa.riskStorm !== 'low' ? `Storm risk: ${wa.riskStorm}` : '',
    ].filter(Boolean).join(', ');
    const weatherInfo = [
      wa.precip ? `Rainfall: ${wa.precip}mm` : '',
      wa.wind ? `Wind: ${wa.wind}km/h` : '',
    ].filter(Boolean).join(', ');

    const baseTemplate = alertType?.template || '';
    const customMsg = `${sevPrefix}${wa.alertType?.toUpperCase()} WARNING for ${wa.district} District (${wa.province}): ${riskDetails}. ${weatherInfo ? `Current: ${weatherInfo}. ` : ''}${baseTemplate ? baseTemplate.split(': ').slice(1).join(': ') : 'Take precautions and follow local authority instructions. Emergency: 100'}`;

    setMessage(customMsg.slice(0, 480));

    // Set district filter if navigating to bulk mode later
    if (wa.district) setDistrictFilter(wa.district);

    // Clear the location state so refreshing doesn't re-trigger
    window.history.replaceState({}, document.title);
  }, [location.state]);

  const fetchCitizens = async () => {
    setLoadingCitizens(true);
    try {
      const res = await api.get('/sms/citizens-with-phone');
      setCitizens(res.data.citizens || []);
    } catch { setCitizens([]); }
    finally { setLoadingCitizens(false); }
  };

  const handleSelectType = (at) => {
    setSelectedType(at.name);
    if (at.template) {
      const prefix = severity !== 'Low' ? `[${severity.toUpperCase()}] ` : '';
      setMessage(prefix + at.template);
    } else { setMessage(''); }
    if (messageRef.current) messageRef.current.focus();
  };

  const handleSeverity = (sev) => {
    setSeverity(sev);
    if (selectedType && selectedType !== 'Custom') {
      const t = ALERT_TYPES.find(a => a.name === selectedType);
      if (t?.template) {
        const prefix = sev !== 'Low' ? `[${sev.toUpperCase()}] ` : '';
        setMessage(prefix + t.template);
      }
    }
  };

  const handlePhone = (e) => {
    const v = e.target.value.replace(/\D/g, '');
    if (v.length <= 10) setPhone(v);
  };

  const toggleCitizen = (citizen) => {
    setSelectedCitizens(prev => prev.find(c => c.id === citizen.id) ? prev.filter(c => c.id !== citizen.id) : [...prev, citizen]);
  };

  const selectAllCitizens = () => {
    const filtered = getFilteredCitizens();
    const allSelected = filtered.every(c => selectedCitizens.find(s => s.id === c.id));
    if (allSelected) {
      const ids = new Set(filtered.map(c => c.id));
      setSelectedCitizens(prev => prev.filter(c => !ids.has(c.id)));
    } else {
      setSelectedCitizens(prev => {
        const existing = new Set(prev.map(c => c.id));
        return [...prev, ...filtered.filter(c => !existing.has(c.id))];
      });
    }
  };

  const getFilteredCitizens = () => {
    let filtered = citizens;
    if (districtFilter) {
      filtered = filtered.filter(c => c.district === districtFilter);
    }
    if (citizenSearch.trim()) {
      const q = citizenSearch.toLowerCase();
      filtered = filtered.filter(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q));
    }
    return filtered;
  };

  const availableDistricts = [...new Set(citizens.map(c => c.district).filter(Boolean))].sort();

  const charPercent = Math.min((message.length / 160) * 100, 100);
  const charColor = message.length > 160 ? 'text-red-500' : message.length > 130 ? 'text-amber-500' : 'text-gray-400';
  const barColor = message.length > 160 ? 'bg-red-500' : message.length > 130 ? 'bg-amber-500' : 'bg-emerald-500';
  const smsCount = Math.ceil(message.length / 160) || 0;
  const recipientCount = sendMode === 'single' ? (phone.length === 10 ? 1 : 0) : sendMode === 'bulk' ? selectedCitizens.length : citizens.length;
  const totalCredits = smsCount * recipientCount;

  const canSend = () => {
    if (!message.trim()) return false;
    if (sendMode === 'single' && phone.length < 10) return false;
    if (sendMode === 'bulk' && selectedCitizens.length === 0) return false;
    return true;
  };

  const handleSendClick = () => {
    if (!canSend()) return;
    if (sendMode === 'broadcast' || (sendMode === 'bulk' && selectedCitizens.length > 3)) {
      setShowConfirm(true);
    } else { executeSend(); }
  };

  const executeSend = async () => {
    if (!canSend()) return;
    setSending(true);
    try {
      let response;
      const timestamp = new Date().toISOString();

      if (sendMode === 'single') {
        response = await api.post('/sms/send', { phone, message, alert_type: selectedType || 'Custom' });
        const result = response.data;
        const entry = { phones: [phone], message, type: selectedType || 'Custom', severity, time: formatTime(new Date()), date: formatDate(new Date()), timestamp, status: result.success ? 'sent' : 'failed', messageId: result.message_id, error: result.error, count: 1 };
        setHistory(prev => [entry, ...prev].slice(0, 100));
        setStats(prev => ({ totalSent: prev.totalSent + 1, totalDelivered: prev.totalDelivered + (result.success ? 1 : 0), totalFailed: prev.totalFailed + (result.success ? 0 : 1) }));
        if (result.success) { toast.success(`SMS sent to +977 ${phone}`); setSuccessCount(1); setShowSuccess(true); setTimeout(() => setShowSuccess(false), 2200); }
        else { toast.error(result.error || 'Failed to send SMS'); }

      } else if (sendMode === 'bulk') {
        const phoneNumbers = selectedCitizens.map(c => { let p = c.phone?.trim() || ''; if (p.startsWith('+977')) p = p.slice(4); else if (p.startsWith('977')) p = p.slice(3); return p; });
        response = await api.post('/sms/send-bulk', { phone_numbers: phoneNumbers, message, alert_type: selectedType || 'Custom' });
        const bulk = response.data;
        const entry = { phones: phoneNumbers, message, type: selectedType || 'Custom', severity, time: formatTime(new Date()), date: formatDate(new Date()), timestamp, status: bulk.failed === 0 ? 'sent' : bulk.sent === 0 ? 'failed' : 'partial', count: bulk.total, sent: bulk.sent, failed: bulk.failed };
        setHistory(prev => [entry, ...prev].slice(0, 100));
        setStats(prev => ({ totalSent: prev.totalSent + bulk.total, totalDelivered: prev.totalDelivered + bulk.sent, totalFailed: prev.totalFailed + bulk.failed }));
        if (bulk.sent > 0) { toast.success(`${bulk.sent}/${bulk.total} SMS sent`); setSuccessCount(bulk.sent); setShowSuccess(true); setTimeout(() => setShowSuccess(false), 2200); }
        if (bulk.failed > 0) toast.error(`${bulk.failed}/${bulk.total} SMS failed`);

      } else if (sendMode === 'broadcast') {
        response = await api.post('/sms/broadcast', null, { params: { message, alert_type: selectedType || 'Custom' } });
        const bulk = response.data;
        const entry = { phones: ['All Citizens'], message, type: selectedType || 'Custom', severity, time: formatTime(new Date()), date: formatDate(new Date()), timestamp, status: bulk.failed === 0 ? 'sent' : bulk.sent === 0 ? 'failed' : 'partial', count: bulk.total, sent: bulk.sent, failed: bulk.failed, broadcast: true };
        setHistory(prev => [entry, ...prev].slice(0, 100));
        setStats(prev => ({ totalSent: prev.totalSent + bulk.total, totalDelivered: prev.totalDelivered + bulk.sent, totalFailed: prev.totalFailed + bulk.failed }));
        if (bulk.sent > 0) { toast.success(`Broadcast sent to ${bulk.sent} citizens`); setSuccessCount(bulk.sent); setShowSuccess(true); setTimeout(() => setShowSuccess(false), 2200); }
        if (bulk.failed > 0) toast.error(`${bulk.failed} broadcasts failed`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Network error. Check connection.');
    } finally { setSending(false); setShowConfirm(false); }
  };

  const clearHistory = () => { setHistory([]); setStats({ totalSent: 0, totalDelivered: 0, totalFailed: 0 }); };
  const filteredCitizens = getFilteredCitizens();
  const selectedAlertType = ALERT_TYPES.find(a => a.name === selectedType);
  const deliveryRate = stats.totalSent > 0 ? Math.round((stats.totalDelivered / stats.totalSent) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <Navbar />

      {/* ─── HEADER ─── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-900/90 to-slate-900" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                  <RadioIcon className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border-2 border-slate-900"></span></span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Disaster Alert System</h1>
                <p className="text-xs text-red-300/70 font-medium">Emergency SMS Broadcast Console</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              {lastAlertTime && <div className="flex items-center gap-1.5 text-xs text-white/40"><ClockIcon className="w-3 h-3" /> Last: {timeAgo(lastAlertTime)}</div>}
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white/60 font-mono">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Registered Citizens', value: citizens.length, icon: <UsersIcon className="w-4 h-4" />, color: 'text-white', live: true },
              { label: 'Alerts Dispatched', value: stats.totalSent, icon: <SendIcon className="w-4 h-4" />, color: 'text-white', live: false },
              { label: 'Delivered', value: stats.totalDelivered, icon: <CheckCircleIcon className="w-4 h-4" />, color: 'text-emerald-400', live: false },
              { label: 'Failed', value: stats.totalFailed, icon: <XCircleIcon className="w-4 h-4" />, color: 'text-red-400', live: false },
              { label: 'Delivery Rate', value: deliveryRate, icon: <ZapIcon className="w-4 h-4" />, color: 'text-amber-400', suffix: '%', live: false },
            ].map((s, i) => (
              <div key={i} className="bg-white/[0.06] backdrop-blur-md rounded-xl px-4 py-3 border border-white/[0.08] hover:bg-white/[0.1] transition-colors group">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-white/25 group-hover:text-white/40 transition-colors">{s.icon}</span>
                  <span className="text-xs text-white/35 font-semibold uppercase tracking-wider">{s.label}</span>
                  {s.live && <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />}
                </div>
                <div className="flex items-baseline gap-1">
                  <AnimatedCount value={s.value} className={`text-2xl font-bold ${s.color}`} />
                  {s.suffix && <span className={`text-sm font-semibold ${s.color} opacity-60`}>{s.suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MAIN ─── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── LEFT: Compose ── */}
          <div className="lg:col-span-5 space-y-5">
            {/* Step 1: Mode */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white">1</div>
                <h2 className="text-base font-semibold text-gray-800">Delivery Mode</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'single', label: 'Direct SMS', desc: 'One number', icon: <PhoneIcon className="w-5 h-5" />, count: null },
                    { id: 'bulk', label: 'Bulk Select', desc: 'Pick citizens', icon: <UsersIcon className="w-5 h-5" />, count: selectedCitizens.length > 0 ? selectedCitizens.length : null },
                    { id: 'broadcast', label: 'Broadcast', desc: 'All citizens', icon: <RadioIcon className="w-5 h-5" />, count: citizens.length },
                  ].map(mode => (
                    <button key={mode.id} onClick={() => setSendMode(mode.id)} className={`relative p-3.5 rounded-xl border-2 transition-all text-left ${sendMode === mode.id ? 'border-red-400 bg-gradient-to-br from-red-50 to-rose-50 shadow-sm shadow-red-50' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'}`}>
                      <div className={`mb-2 transition-colors ${sendMode === mode.id ? 'text-red-500' : 'text-gray-300'}`}>{mode.icon}</div>
                      <div className={`text-sm font-bold ${sendMode === mode.id ? 'text-red-700' : 'text-gray-700'}`}>{mode.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{mode.desc}</div>
                      {mode.count !== null && <span className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sendMode === mode.id ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{mode.count}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Step 2: Recipient — NO overflow-hidden here */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white">2</div>
                  <h2 className="text-base font-semibold text-gray-800">{sendMode === 'single' ? 'Recipient' : sendMode === 'bulk' ? 'Select Recipients' : 'Broadcast'}</h2>
                </div>
                {sendMode === 'bulk' && selectedCitizens.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{selectedCitizens.length} selected</span>
                    <button onClick={() => setSelectedCitizens([])} className="text-xs text-gray-400 hover:text-red-500">Clear</button>
                  </div>
                )}
              </div>

              <div className="p-4">
                {sendMode === 'single' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 shrink-0">
                        <span className="text-sm font-bold text-gray-600">NP</span> +977
                      </div>
                      <div className="relative flex-1">
                        <input type="tel" value={phone} onChange={handlePhone} placeholder="98XXXXXXXX" maxLength={10} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all font-mono tracking-[0.2em]" />
                        {phone.length === 10 && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2"><CheckCircleIcon className="w-5 h-5 text-emerald-500" /></motion.div>}
                      </div>
                    </div>
                    {phone.length > 0 && phone.length < 10 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden"><motion.div className="h-full bg-amber-400 rounded-full" animate={{ width: `${(phone.length / 10) * 100}%` }} /></div>
                        <span className="text-xs text-amber-500 font-semibold shrink-0">{10 - phone.length} left</span>
                      </div>
                    )}
                  </>
                )}

                {sendMode === 'bulk' && (
                  <>
                    {selectedCitizens.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {selectedCitizens.slice(0, 6).map(c => (
                          <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-100">
                            <div className="w-3.5 h-3.5 rounded-full bg-red-200 flex items-center justify-center text-[7px] font-bold text-red-600">{c.name?.charAt(0)}</div>
                            {c.name?.split(' ')[0]}
                            <button onClick={() => toggleCitizen(c)} className="text-red-400 hover:text-red-700">&times;</button>
                          </span>
                        ))}
                        {selectedCitizens.length > 6 && <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium">+{selectedCitizens.length - 6}</span>}
                      </div>
                    )}

                    {/* District Filter */}
                    {availableDistricts.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Filter by District</span>
                          {districtFilter && (
                            <button onClick={() => setDistrictFilter('')} className="text-[10px] text-red-400 hover:text-red-600 font-semibold ml-auto">Clear</button>
                          )}
                        </div>
                        <select
                          value={districtFilter}
                          onChange={e => { setDistrictFilter(e.target.value); setSelectedCitizens([]); }}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all text-gray-700"
                        >
                          <option value="">All Districts ({citizens.length} citizens)</option>
                          {availableDistricts.map(d => (
                            <option key={d} value={d}>{d} ({citizens.filter(c => c.district === d).length})</option>
                          ))}
                        </select>
                        {districtFilter && (
                          <p className="text-[10px] text-gray-400 mt-1 ml-1">
                            {getFilteredCitizens().length} citizen{getFilteredCitizens().length !== 1 ? 's' : ''} in {districtFilter}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Dropdown with proper z-index, positioned relative to this container */}
                    <div ref={recipientRef} className="relative z-30">
                      <div className="relative">
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={citizenSearch} onChange={e => setCitizenSearch(e.target.value)} onFocus={() => setShowRecipientList(true)} placeholder="Search citizens by name, email, or phone..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all" />
                      </div>

                      <AnimatePresence>
                        {showRecipientList && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl shadow-gray-200/50" style={{ maxHeight: '320px' }}>
                            {loadingCitizens ? (
                              <div className="p-6 text-center"><svg className="w-5 h-5 animate-spin text-gray-300 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" /></svg><p className="text-xs text-gray-400">Loading...</p></div>
                            ) : filteredCitizens.length === 0 ? (
                              <div className="p-6 text-center"><UsersIcon className="w-5 h-5 text-gray-300 mx-auto mb-1.5" /><p className="text-xs text-gray-400">No citizens found</p></div>
                            ) : (
                              <>
                                <button onClick={selectAllCitizens} className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-red-600 bg-red-50/70 hover:bg-red-100 border-b border-gray-100 transition-colors flex items-center justify-between sticky top-0 z-10">
                                  <span>{filteredCitizens.every(c => selectedCitizens.find(s => s.id === c.id)) ? 'Deselect all' : `Select all (${filteredCitizens.length})`}</span>
                                  <span className="text-red-400">{selectedCitizens.length}/{citizens.length}</span>
                                </button>
                                <div className="overflow-y-auto" style={{ maxHeight: '270px' }}>
                                  {filteredCitizens.map(c => {
                                    const isSelected = selectedCitizens.find(s => s.id === c.id);
                                    return (
                                      <button key={c.id} onClick={() => toggleCitizen(c)} className={`w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${isSelected ? 'bg-red-50/30' : ''}`}>
                                        <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-red-500 border-red-500' : 'border-gray-300'}`} style={{ width: '18px', height: '18px' }}>
                                          {isSelected && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>}
                                        </div>
                                        {c.profile_picture ? (
                                          <img src={c.profile_picture} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-gray-100" />
                                        ) : (
                                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500">{c.name?.charAt(0)}</div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-semibold text-gray-800 truncate">{c.name}</div>
                                          <div className="text-xs text-gray-400 truncate">{c.phone} &middot; {c.email}{c.district ? ` \u00B7 ${c.district}` : ''}</div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}

                {sendMode === 'broadcast' && (
                  <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 rounded-xl p-4 border border-amber-200/40">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-200">
                        <AlertTriangleIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Emergency Broadcast</h3>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">Send to <span className="font-bold text-red-600">{citizens.length} citizens</span> with verified phone numbers. Use for critical emergencies only.</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-gray-500"><UsersIcon className="w-3 h-3 text-red-400" />{citizens.length} recipients</span>
                          <span className="flex items-center gap-1 text-xs text-gray-500"><ZapIcon className="w-3 h-3 text-amber-500" />{smsCount * citizens.length || 0} credits</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Step 3: Alert Config */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white">3</div>
                <h2 className="text-base font-semibold text-gray-800">Alert Configuration</h2>
              </div>
              <div className="p-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">Disaster Type</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ALERT_TYPES.map(at => (
                    <button key={at.name} onClick={() => handleSelectType(at)} className={`relative p-2.5 rounded-xl border-2 text-center transition-all group ${selectedType === at.name ? `${at.border} ${at.bg} shadow-sm ring-2 ${at.ring}` : 'border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200'}`}>
                      {(() => { const Icon = ALERT_TYPE_ICONS[at.name]; return <Icon className={`w-6 h-6 block mx-auto mb-1.5 transition-transform group-hover:scale-110 ${selectedType === at.name ? at.iconColor : 'text-gray-400'}`} />; })()}
                      <span className={`text-[11px] font-bold block leading-tight ${selectedType === at.name ? at.text : 'text-gray-500'}`}>{at.name}</span>
                      {selectedType === at.name && <motion.div layoutId="type-dot" className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${at.dot} border-2 border-white shadow-sm`} />}
                    </button>
                  ))}
                </div>

                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 mt-4 block">Severity Level</label>
                <div className="flex gap-2">
                  {SEVERITY_LEVELS.map(s => (
                    <button key={s.name} onClick={() => handleSeverity(s.name)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold border transition-all ${severity === s.name ? s.light + ' shadow-sm' : 'border-gray-100 bg-white text-gray-400 hover:bg-gray-50'}`}>
                      <span className={`w-2 h-2 rounded-full ${s.color} ${s.pulse && severity === s.name ? 'animate-pulse' : ''}`} />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── CENTER: Message ── */}
          <div className="lg:col-span-4 space-y-5">
            {/* Step 4: Message */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white">4</div>
                  <h2 className="text-base font-semibold text-gray-800">Compose Message</h2>
                </div>
                <div className="flex items-center gap-2">
                  {smsCount > 1 && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-bold border border-amber-100">{smsCount} SMS</span>}
                  <span className={`text-xs font-bold tabular-nums ${charColor}`}>{message.length}/160</span>
                </div>
              </div>
              <div className="p-4">
                <textarea ref={messageRef} value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your alert message or select a disaster type for a pre-built template..." rows={7} className="w-full px-3.5 py-3 bg-gray-50/70 border border-gray-200 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 focus:bg-white transition-all resize-none" />
                <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div className={`h-full rounded-full transition-colors ${barColor}`} animate={{ width: `${Math.min(charPercent, 100)}%` }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                </div>

                {/* Quick phrases */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {[
                    { text: 'Police: 100' }, { text: 'Ambulance: 102' },
                    { text: 'Fire: 101' }, { text: 'NDRF: 1166' },
                    { text: 'Stay indoors' }, { text: 'Evacuate now' },
                    { text: 'Move to higher ground' },
                  ].map(q => (
                    <button key={q.text} onClick={() => setMessage(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + q.text)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
                      + {q.text}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Send Button */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
              <button onClick={handleSendClick} disabled={sending || !canSend()} className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all relative overflow-hidden ${canSend() && !sending ? 'bg-gradient-to-r from-red-500 via-red-500 to-rose-500 text-white hover:from-red-600 hover:via-red-600 hover:to-rose-600 shadow-lg shadow-red-200/60 hover:shadow-red-300/60 active:scale-[0.99]' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}>
                {canSend() && !sending && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-shimmer" />}
                {sending ? (
                  <><svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>Dispatching Alert...</>
                ) : (
                  <>
                    <SendIcon className="w-5 h-5" />
                    {sendMode === 'broadcast' ? `Broadcast to ${citizens.length} Citizens` : sendMode === 'bulk' ? `Send to ${selectedCitizens.length} Recipient${selectedCitizens.length !== 1 ? 's' : ''}` : 'Send Alert SMS'}
                    {canSend() && totalCredits > 0 && <span className="text-white/50 text-xs ml-1">({totalCredits} credit{totalCredits !== 1 ? 's' : ''})</span>}
                  </>
                )}
              </button>
            </motion.div>

            {/* Phone Preview */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Live Preview</h3>
              <div className="mx-auto max-w-[240px]">
                <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-[1.75rem] p-2.5 shadow-xl">
                  <div className="flex justify-center mb-1.5"><div className="w-16 h-4 bg-black rounded-full" /></div>
                  <div className="bg-white rounded-2xl overflow-hidden" style={{ minHeight: '200px' }}>
                    <div className="bg-gray-50 px-3 py-1.5 flex items-center justify-between border-b border-gray-100">
                      <span className="text-[9px] font-bold text-gray-500">Sankalpa Alert</span>
                      <span className="text-[10px] text-gray-400">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    </div>
                    {message ? (
                      <div className="p-3">
                        {selectedType && (
                          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold mb-2 ${selectedAlertType?.bg} ${selectedAlertType?.text} border ${selectedAlertType?.border}`}>
                            {selectedType} {severity && `- ${severity}`}
                          </div>
                        )}
                        <p className="text-[11px] text-gray-700 leading-[1.55] break-words">{message}</p>
                        <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[8px] text-gray-300">Aakash SMS</span>
                          <span className="text-[8px] text-gray-300">{smsCount} SMS</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 px-3">
                        <SendIcon className="w-4 h-4 text-gray-200 mb-1.5" />
                        <p className="text-xs text-gray-300 text-center">Compose a message</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center mt-1.5"><div className="w-20 h-1 bg-gray-600 rounded-full" /></div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT: History & Info ── */}
          <div className="lg:col-span-3 space-y-5">
            {/* History */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alert Log</h3>
                  {history.length > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">{history.length}</span>}
                </div>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
                    <TrashIcon className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>

              <div className="p-3">
                {history.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 mx-auto flex items-center justify-center mb-2.5">
                      <SendIcon className="w-5 h-5 text-gray-200" />
                    </div>
                    <p className="text-sm font-medium text-gray-400">No alerts dispatched</p>
                    <p className="text-xs text-gray-300 mt-0.5">History persists across sessions</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-0.5">
                    <AnimatePresence mode="popLayout">
                      {history.map((item, i) => {
                        const isExpanded = expandedHistory === i;
                        const alertDef = ALERT_TYPES.find(a => a.name === item.type);
                        return (
                          <motion.div key={`${item.timestamp}-${i}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="rounded-xl border border-gray-100 bg-gray-50/40 hover:border-gray-200 transition-all">
                            <button onClick={() => setExpandedHistory(isExpanded ? null : i)} className="w-full p-2.5 text-left">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  {(() => { const Icon = ALERT_TYPE_ICONS[item.type] || AlertTriangleIcon; return <Icon className={`w-4 h-4 ${alertDef?.iconColor || 'text-gray-400'}`} />; })()}
                                  <span className="text-xs font-bold text-gray-700">{item.type}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.severity === 'Critical' ? 'bg-red-100 text-red-600' : item.severity === 'High' ? 'bg-orange-100 text-orange-600' : item.severity === 'Medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-emerald-100 text-emerald-600'}`}>{item.severity}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${item.status === 'sent' ? 'bg-emerald-50 text-emerald-600' : item.status === 'partial' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                                    {item.status === 'sent' ? '\u2713' : item.status === 'partial' ? '\u25CF' : '\u2717'} {item.status}
                                  </span>
                                  <ExpandIcon className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{item.message}</p>
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
                                {item.broadcast ? <><RadioIcon className="w-2.5 h-2.5" /> All</> : item.count > 1 ? <><UsersIcon className="w-2.5 h-2.5" /> {item.count}</> : <><PhoneIcon className="w-2.5 h-2.5" /> {item.phones[0]}</>}
                                <span>&middot;</span>
                                <span>{item.time}</span>
                                {item.timestamp && <span>&middot;</span>}
                                {item.timestamp && <span>{timeAgo(item.timestamp)}</span>}
                              </div>
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="px-2.5 pb-2.5 pt-1 border-t border-gray-100">
                                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap mb-1.5">{item.message}</p>
                                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                                      <span>{item.date}</span>
                                      {item.messageId && <span>ID: {item.messageId}</span>}
                                      {item.sent !== undefined && <span className="text-emerald-500">{item.sent} delivered</span>}
                                      {item.failed > 0 && <span className="text-red-500">{item.failed} failed</span>}
                                      {item.error && <span className="text-red-500">{item.error}</span>}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Emergency Numbers */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldIcon className="w-3.5 h-3.5 text-red-500" />
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nepal Emergency</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {EMERGENCY_NUMBERS.map(num => (
                  <div key={num.number} className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 hover:border-red-200 hover:bg-red-50/40 transition-all group">
                    <div className="text-[11px] text-gray-400 font-medium">{num.name}</div>
                    <div className="text-lg font-bold text-gray-800 group-hover:text-red-600 mt-0.5 transition-colors">{num.number}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">System Info</h3>
              <div className="space-y-2">
                {[
                  { icon: 'globe', text: 'SMS via Aakash SMS to Nepal (+977)' },
                  { icon: 'alert', text: 'Messages over 160 chars use multiple credits' },
                  { icon: 'save', text: 'Alert history persists across sessions' },
                  { icon: 'refresh', text: 'Citizen list auto-refreshes every 30s' },
                ].map((info, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                      {info.icon === 'globe' && <MapPinIcon className="w-3 h-3 text-gray-400" />}
                      {info.icon === 'alert' && <AlertTriangleIcon className="w-3 h-3 text-gray-400" />}
                      {info.icon === 'save' && <ShieldIcon className="w-3 h-3 text-gray-400" />}
                      {info.icon === 'refresh' && <RefreshIcon className="w-3 h-3 text-gray-400" />}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{info.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-white mt-4">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400">Sankalpa Disaster Alert System</p>
            <span className="text-gray-200">|</span>
            <p className="text-xs text-gray-400">Powered by Aakash SMS</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5"><MapPinIcon className="w-3 h-3 text-gray-300" /><span className="text-xs text-gray-400">Nepal (+977)</span></div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
              <span className="text-xs text-gray-400">Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal open={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={executeSend} sending={sending} severity={severity} recipientCount={sendMode === 'broadcast' ? citizens.length : selectedCitizens.length} smsCredits={totalCredits} title={sendMode === 'broadcast' ? 'Confirm Emergency Broadcast' : `Send to ${selectedCitizens.length} Recipients`} message={sendMode === 'broadcast' ? `You are about to send an emergency ${selectedType || ''} alert to ALL ${citizens.length} registered citizens.` : `You are about to send an alert to ${selectedCitizens.length} selected citizens.`} detail={message} />
      <SuccessOverlay show={showSuccess} count={successCount} />

      <style>{`@keyframes shimmer{0%{transform:translateX(-100%) skewX(-12deg)}100%{transform:translateX(200%) skewX(-12deg)}}.animate-shimmer{animation:shimmer 3s infinite}`}</style>
    </div>
  );
}

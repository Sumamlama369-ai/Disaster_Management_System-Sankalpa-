import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import axios from "axios";
import Navbar from "../components/Navbar";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── SVG Icons ─────────────────────────────────────────────────
const FireIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z" />
  </svg>
);
const FloodIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 15c2-1 4 1 6 0s4-1 6 0 4 1 6 0" />
    <path d="M2 19c2-1 4 1 6 0s4-1 6 0 4 1 6 0" />
    <path d="M9 11V4l3 3 3-3v7" />
  </svg>
);
const EarthquakeIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h4l2-3 2 6 2-4 2 3 2-5 2 4 2-1h4" />
  </svg>
);
const LandslideIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 22L12 2l10 20H2z" />
    <path d="M7 17h10" />
    <path d="M9 13h6" />
  </svg>
);
const StormIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" />
    <polyline points="13 11 9 17 15 17 11 23" />
  </svg>
);
const WarningTriangleIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const MapPinIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const FileVideoIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    <polygon points="10 11 10 17 15 14 10 11" />
  </svg>
);
const SendIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const CheckCircleIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const ArrowRightIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const ClipboardListIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
  </svg>
);
const XIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const AlertCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const ShieldIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const CrosshairIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" />
  </svg>
);
const CameraIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

// ─── Tile Layers ──────────────────────────────────────────────
const TILE_LAYERS = {
  positron:  { name: "Positron",   url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" },
  street:    { name: "Street",     url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" },
  satellite: { name: "Satellite",  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" },
  terrain:   { name: "Terrain",    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" },
  dark:      { name: "Dark",       url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" },
};

const LayersIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
  </svg>
);

// ─── Custom Map Marker ────────────────────────────────────────
const createLocationIcon = () => {
  return L.divIcon({
    className: "custom-location-marker",
    html: `
      <div style="position:relative;width:40px;height:40px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.15);animation:pulse-ring 2s ease-out infinite;"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#06b6d4);border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// ─── Data ──────────────────────────────────────────────────────
const DISASTER_TYPES = [
  { value: "fire", label: "Fire", icon: FireIcon, color: "text-red-500", bg: "bg-red-50", border: "border-red-200", activeBg: "bg-red-100", activeBorder: "border-red-400", activeText: "text-red-700" },
  { value: "flood", label: "Flood", icon: FloodIcon, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200", activeBg: "bg-blue-100", activeBorder: "border-blue-400", activeText: "text-blue-700" },
  { value: "earthquake", label: "Earthquake", icon: EarthquakeIcon, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200", activeBg: "bg-orange-100", activeBorder: "border-orange-400", activeText: "text-orange-700" },
  { value: "landslide", label: "Landslide", icon: LandslideIcon, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", activeBg: "bg-amber-100", activeBorder: "border-amber-400", activeText: "text-amber-700" },
  { value: "storm", label: "Storm", icon: StormIcon, color: "text-sky-500", bg: "bg-sky-50", border: "border-sky-200", activeBg: "bg-sky-100", activeBorder: "border-sky-400", activeText: "text-sky-700" },
  { value: "other", label: "Other", icon: WarningTriangleIcon, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", activeBg: "bg-yellow-100", activeBorder: "border-yellow-400", activeText: "text-yellow-700" },
];

const SEVERITY = [
  { value: "LOW", label: "Low", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", activeBg: "bg-emerald-100", activeBorder: "border-emerald-500", dot: "bg-emerald-400" },
  { value: "MEDIUM", label: "Medium", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", activeBg: "bg-yellow-100", activeBorder: "border-yellow-500", dot: "bg-yellow-400" },
  { value: "HIGH", label: "High", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", activeBg: "bg-orange-100", activeBorder: "border-orange-500", dot: "bg-orange-400" },
  { value: "CRITICAL", label: "Critical", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", activeBg: "bg-red-100", activeBorder: "border-red-500", dot: "bg-red-500" },
];


// ─── Draggable Marker Component ───────────────────────────────
function DraggableMarker({ position, onPositionChange }) {
  const markerRef = useRef(null);
  const icon = useMemo(() => createLocationIcon(), []);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latlng = marker.getLatLng();
          onPositionChange({ lat: latlng.lat, lng: latlng.lng });
        }
      },
    }),
    [onPositionChange]
  );

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
      icon={icon}
    />
  );
}

// ─── Map click handler ────────────────────────────────────────
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// ─── Fly to position ──────────────────────────────────────────
function FlyToPosition({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], 16, { duration: 1.5 });
    }
  }, [position, map]);
  return null;
}

// ─── Component ─────────────────────────────────────────────────
export default function DisasterReport() {
  const { token } = useAuth();
  const [form, setForm] = useState({
    disasterType: "", otherType: "", description: "",
    severity: "", name: "", contact: "",
  });
  const [status, setStatus] = useState("idle");
  const [markerPosition, setMarkerPosition] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [flyTarget, setFlyTarget] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [reportId, setReportId] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [tileLayer, setTileLayer] = useState("positron");
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);

  // Nepal center default
  const defaultCenter = [28.3949, 84.1240];
  const defaultZoom = 7;

  const set_ = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMarkerPosition(newPos);
        setFlyTarget({ ...newPos, _ts: Date.now() });
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === 1) setLocationError("Location access denied. Please enable GPS permissions.");
        else if (err.code === 2) setLocationError("Location unavailable. Please try again.");
        else setLocationError("Location request timed out. Please try again.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleMarkerDrag = (newPos) => {
    setMarkerPosition(newPos);
  };

  const handleMapClick = (newPos) => {
    setMarkerPosition(newPos);
  };

  const handleSubmit = async () => {
    if (!form.disasterType || !form.description || !form.severity) {
      setErrorMsg("Please fill all required fields before submitting.");
      return;
    }
    if (form.disasterType === "other" && !form.otherType.trim()) {
      setErrorMsg("Please specify the type of incident.");
      return;
    }
    if (form.description.length < 10) {
      setErrorMsg("Description must be at least 10 characters.");
      return;
    }
    if (!markerPosition) {
      setErrorMsg("Please share your location or select a location on the map.");
      return;
    }
    setErrorMsg("");
    setStatus("sending");

    try {
      if (!token) {
        setStatus("error");
        setErrorMsg("Please login first to submit a report.");
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/v1/disaster-reports/reports`,
        {
          disaster_type:
            form.disasterType === "other"
              ? form.otherType.trim()
              : form.disasterType,
          description: form.description,
          severity: form.severity,
          latitude: markerPosition.lat,
          longitude: markerPosition.lng,
          location_accuracy: null,
          reporter_name: form.name || "Anonymous",
          reporter_contact: form.contact ? `+977${form.contact}` : null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setReportId(response.data.id);

      if (mediaFiles.length > 0) {
        setStatus("uploading");
        let uploaded = 0;
        for (const file of mediaFiles) {
          const formData = new FormData();
          formData.append("file", file);
          try {
            await axios.post(
              `${API_URL}/api/v1/disaster-reports/reports/${response.data.id}/media`,
              formData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "multipart/form-data",
                },
              }
            );
            uploaded++;
            setUploadProgress(`${uploaded}/${mediaFiles.length}`);
          } catch (err) {
            console.error("Media upload failed:", err);
          }
        }
      }

      setStatus("success");
    } catch (error) {
      console.error("Submission error:", error);
      setStatus("error");
      if (error.response?.status === 401) {
        setErrorMsg("Session expired. Please login again.");
      } else if (error.response?.status === 403) {
        setErrorMsg("You don't have permission to submit reports.");
      } else {
        setErrorMsg(
          error.response?.data?.detail ||
            "Submission failed. Please try again."
        );
      }
    }
  };

  const reset = () => {
    setForm({
      disasterType: "", otherType: "", description: "",
      severity: "", name: "", contact: "",
    });
    setStatus("idle");
    setMarkerPosition(null);
    setLocationLoading(false);
    setLocationError("");
    setFlyTarget(null);
    setErrorMsg("");
    setReportId(null);
    setMediaFiles([]);
    setUploadProgress(null);
  };

  // ─── Success Screen ─────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        {/* ── Centered Success Banner ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center pt-10 pb-8 border-b border-gray-100"
        >
          <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-200">
            <CheckCircleIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-2">Report Submitted Successfully</h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Your incident data has been logged with local authorities. We are monitoring
            the situation in your coordinates in real-time.
          </p>
        </motion.div>

        {/* ── Main Content ─────────────────────────────────── */}
        <div className="max-w-[1920px] mx-auto px-6 lg:px-10 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left Column ─────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Report Details Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Report Details</h2>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">REF: #{reportId}</span>
                </div>

                <div className="p-6">
                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-6">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Report ID</p>
                      <p className="text-sm font-semibold text-gray-800">#{reportId}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Incident Type</p>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const dtype = DISASTER_TYPES.find(d => d.value === form.disasterType);
                          if (dtype) {
                            const Icon = dtype.icon;
                            return <Icon className={`w-4 h-4 ${dtype.color}`} />;
                          }
                          return null;
                        })()}
                        <p className="text-sm font-semibold text-gray-800">
                          {form.disasterType === "other"
                            ? form.otherType
                            : form.disasterType.charAt(0).toUpperCase() + form.disasterType.slice(1)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Severity</p>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          form.severity === "CRITICAL" ? "bg-red-500"
                          : form.severity === "HIGH" ? "bg-orange-500"
                          : form.severity === "MEDIUM" ? "bg-yellow-500"
                          : "bg-blue-500"
                        }`} />
                        <p className={`text-sm font-bold ${
                          form.severity === "CRITICAL" ? "text-red-600"
                          : form.severity === "HIGH" ? "text-orange-600"
                          : form.severity === "MEDIUM" ? "text-yellow-600"
                          : "text-blue-600"
                        }`}>{form.severity}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Coordinates</p>
                      <p className="text-sm font-semibold text-gray-800 font-mono">
                        {markerPosition?.lat.toFixed(4)}&deg; N, {markerPosition?.lng.toFixed(4)}&deg; W
                      </p>
                    </div>
                  </div>

                  {/* Map Preview */}
                  {markerPosition && (
                    <div className="rounded-xl overflow-hidden border border-gray-200 h-52">
                      <MapContainer
                        center={[markerPosition.lat, markerPosition.lng]}
                        zoom={14}
                        scrollWheelZoom={false}
                        dragging={false}
                        zoomControl={false}
                        attributionControl={false}
                        className="w-full h-full"
                      >
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                        <Marker
                          position={[markerPosition.lat, markerPosition.lng]}
                          icon={createLocationIcon()}
                        />
                      </MapContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Safety Reminder Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <ShieldIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Safety Reminder</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Avoid moving water. High waters can be deceptive and hide dangerous debris or
                    structural failures. If power lines are down, treat them as live and stay at least 35 feet away.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ── Right Column ────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              {/* What Happens Next */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-900">What Happens Next</h3>
                </div>
                <div className="p-6 space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-white">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Report Review</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">Authorities are validating the data against current satellite feeds.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-white">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Team Dispatch</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">If verified, a response unit will be assigned to your sector.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-white">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Live Updates</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">You will receive SMS alerts for status changes in your area.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={reset}
                  className="w-full px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <SendIcon className="w-4 h-4" />
                  Submit Another Report
                </button>
                <a
                  href="/my-disaster-reports"
                  className="group w-full flex items-center justify-center gap-2 px-5 py-3.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  <ClipboardListIcon className="w-4 h-4 text-gray-500" />
                  Track My Reports
                </a>
              </div>

              {/* Emergency Contact */}
              <div className="bg-gray-900 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircleIcon className="w-4 h-4 text-red-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-red-400">Need Immediate Help?</h3>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  If you are in immediate danger and cannot wait for report processing, use the emergency channels below.
                </p>
                <a href="tel:911" className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-all">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  Call 911
                </a>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    );
  }

  // ─── Main Form ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/80">
      <Navbar />

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2); opacity: 0; }
        }
        .leaflet-container { border-radius: 12px; }
      `}</style>

      {/* Header */}
      <div className="max-w-[1920px] mx-auto px-6 lg:px-10 pt-8 pb-2">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Emergency Incident Report</h1>
              <p className="text-gray-400 text-sm mt-1 max-w-lg">
                Provide critical details to assist emergency response teams. Your timely report ensures rapid mobilization and resource allocation.
              </p>
            </div>
            <a
              href="/my-disaster-reports"
              className="group flex-shrink-0 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
            >
              <ClipboardListIcon className="w-4 h-4" />
              Track My Reports
              <ArrowRightIcon className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </motion.div>
      </div>

      {/* Form Content */}
      <div className="max-w-[1920px] mx-auto px-6 lg:px-10 py-6">
        <div className="space-y-6">

          {/* Row 1: Incident Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          >
            <SectionHeader num="01" title="Incident Type" required />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-5">
              {DISASTER_TYPES.map((d) => {
                const Icon = d.icon;
                const isActive = form.disasterType === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => set_("disasterType", d.value)}
                    className={`relative flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 ${
                      isActive
                        ? `${d.activeBg} ${d.activeBorder} shadow-md`
                        : `bg-white ${d.border} hover:shadow-sm`
                    }`}
                  >
                    <div className={`w-11 h-11 ${isActive ? d.activeBg : d.bg} rounded-xl flex items-center justify-center transition-colors`}>
                      <Icon className={`w-5 h-5 ${isActive ? d.activeText : d.color}`} />
                    </div>
                    <span className={`text-xs font-semibold ${isActive ? d.activeText : 'text-gray-600'}`}>
                      {d.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="typeCheck"
                        className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200"
                      >
                        <CheckCircleIcon className={`w-3.5 h-3.5 ${d.activeText}`} />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
            {form.disasterType === "other" && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Specify Incident Type *
                </label>
                <input
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-sm bg-gray-50"
                  placeholder="e.g. Gas leak, Building collapse..."
                  value={form.otherType}
                  onChange={(e) => set_("otherType", e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </motion.div>

          {/* Row 2: Severity + Description side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Severity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
            >
              <SectionHeader num="02" title="Severity" required />
              <div className="space-y-3 mt-5">
                {SEVERITY.map((s) => {
                  const isActive = form.severity === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => set_("severity", s.value)}
                      className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? `${s.activeBg} ${s.activeBorder} ${s.color} shadow-sm`
                          : `bg-white ${s.border} text-gray-500 hover:bg-gray-50`
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${isActive ? s.dot : 'bg-gray-300'} transition-colors flex-shrink-0`} />
                      <span className={`w-1 h-6 rounded-full ${isActive ? s.dot : 'bg-gray-200'} transition-colors flex-shrink-0`} />
                      {s.label}
                      {isActive && (
                        <CheckCircleIcon className={`w-4 h-4 ml-auto ${s.color}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
            >
              <SectionHeader num="03" title="Description" required />
              <textarea
                className="w-full mt-4 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-sm resize-none bg-gray-50"
                placeholder="Detail the emergency, number of people involved, and any immediate hazards..."
                value={form.description}
                onChange={(e) => set_("description", e.target.value)}
                rows={7}
              />
              <div className="flex items-center gap-2 mt-2">
                <AlertCircleIcon className="w-3.5 h-3.5 text-gray-300" />
                <p className="text-xs text-gray-400 uppercase tracking-wide">Avoid abbreviations. Be specific about the scene.</p>
              </div>
            </motion.div>
          </div>

          {/* Row 3: Location Capture + Evidence side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Location Capture with Map */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
            >
              <SectionHeader num="04" title="Location Capture" required />

              {/* Map */}
              <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 relative" style={{ height: "260px" }}>
                <MapContainer
                  center={defaultCenter}
                  zoom={defaultZoom}
                  style={{ height: "100%", width: "100%", zIndex: 1 }}
                  scrollWheelZoom={true}
                  attributionControl={false}
                >
                  <TileLayer
                    key={tileLayer}
                    url={TILE_LAYERS[tileLayer].url}
                  />
                  {markerPosition && (
                    <>
                      <DraggableMarker
                        position={markerPosition}
                        onPositionChange={handleMarkerDrag}
                      />
                      <FlyToPosition position={flyTarget} />
                    </>
                  )}
                  <MapClickHandler onMapClick={handleMapClick} />
                </MapContainer>

                {/* Map Style Switcher */}
                <div className="absolute top-2.5 left-2.5 z-[500]">
                  <button
                    onClick={() => setLayerMenuOpen(!layerMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all text-xs font-medium text-gray-600"
                  >
                    <LayersIcon className="w-3.5 h-3.5" />
                    Map Style
                  </button>
                  {layerMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-9 left-0 bg-white/98 backdrop-blur-sm rounded-xl border border-gray-200 shadow-xl py-1.5 min-w-[130px]"
                    >
                      {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                        <button
                          key={key}
                          onClick={() => { setTileLayer(key); setLayerMenuOpen(false); }}
                          className={`w-full text-left px-3.5 py-1.5 text-xs font-medium transition-all ${
                            tileLayer === key ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {layer.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Coordinate overlay on map */}
                {markerPosition && (
                  <div className="absolute bottom-2 left-2 z-[500] bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-gray-200">
                    <span className="text-xs font-mono font-semibold text-blue-600">
                      {markerPosition.lat.toFixed(4)}&deg; N, {markerPosition.lng.toFixed(4)}&deg; E
                    </span>
                  </div>
                )}
              </div>

              {/* Share Location Button */}
              <button
                onClick={handleShareLocation}
                disabled={locationLoading}
                className={`w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                  markerPosition
                    ? "bg-emerald-50 border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                    : "bg-blue-50 border-2 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300"
                } ${locationLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {locationLoading ? (
                  <>
                    <Spinner /> Detecting GPS Location...
                  </>
                ) : markerPosition ? (
                  <>
                    <CrosshairIcon className="w-4 h-4" />
                    Recalibrate GPS Location
                  </>
                ) : (
                  <>
                    <CrosshairIcon className="w-4 h-4" />
                    Share My Location
                  </>
                )}
              </button>

              {/* Location info */}
              {markerPosition && (
                <div className="mt-3 flex items-start gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <MapPinIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-700">Location Selected</p>
                    <p className="text-xs text-blue-600 font-mono mt-0.5">
                      {markerPosition.lat.toFixed(6)}&deg; N, {markerPosition.lng.toFixed(6)}&deg; E
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Drag the marker or click the map to adjust.</p>
                  </div>
                </div>
              )}

              {!markerPosition && !locationLoading && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Click "Share My Location" or tap on the map to set incident location.
                </p>
              )}

              {locationError && (
                <div className="mt-2 flex items-center gap-2 text-xs text-red-500 font-medium">
                  <AlertCircleIcon className="w-3.5 h-3.5" />
                  {locationError}
                </div>
              )}
            </motion.div>

            {/* Evidence Upload */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
            >
              <SectionHeader num="05" title="Evidence" optional />

              <label className="group flex flex-col items-center justify-center w-full h-40 mt-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-gray-100 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center mb-3 transition-colors">
                    <CameraIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-gray-600">Upload Photo or Video</span>
                  <span className="text-xs text-gray-400 mt-1">Max size 50MB. Drag and drop files here.</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setMediaFiles((prev) => [...prev, ...files].slice(0, 5));
                    e.target.value = "";
                  }}
                />
              </label>

              {/* File previews grid */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {mediaFiles.map((file, i) => {
                  const isVideo = file.type.startsWith("video/");
                  return (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {isVideo ? (
                        <video
                          src={URL.createObjectURL(file)}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => e.target.play()}
                          onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                        />
                      ) : (
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setMediaFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {mediaFiles.length < 5 && mediaFiles.length > 0 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                    <span className="text-2xl text-gray-300 font-light">+</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setMediaFiles((prev) => [...prev, ...files].slice(0, 5));
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </motion.div>
          </div>

          {/* Row 4: Reporter Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          >
            <SectionHeader num="06" title="Reporter Details" optional />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-sm bg-gray-50"
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={(e) => set_("name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3.5 py-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-100 text-sm font-semibold text-gray-600 select-none">
                    +977
                  </span>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-r-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-sm bg-gray-50"
                    placeholder="98XXXXXXXX"
                    value={form.contact}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                      set_("contact", val);
                    }}
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer: Secure notice + buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 pb-8">
            <div className="flex items-center gap-2">
              <ShieldIcon className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-xs font-semibold text-gray-700">Secure Submission</p>
                <p className="text-xs text-gray-400">Your data is encrypted and sent directly to emergency dispatch.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={reset}
                className="px-6 py-3 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={status !== "idle" && status !== "error"}
                className={`px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                  status === "idle" || status === "error"
                    ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200 cursor-pointer"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                }`}
              >
                {status === "idle" && (
                  <>
                    <SendIcon className="w-4 h-4" />
                    Submit Critical Report
                  </>
                )}
                {status === "sending" && (
                  <>
                    <Spinner /> Transmitting...
                  </>
                )}
                {status === "uploading" && (
                  <>
                    <Spinner /> Uploading media {uploadProgress || ""}...
                  </>
                )}
                {status === "error" && (
                  <>
                    <AlertCircleIcon className="w-4 h-4" />
                    Try Again
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 -mt-4 mb-4">
              <AlertCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────
function SectionHeader({ num, title, required, optional }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-blue-500 text-sm font-bold">{num}</span>
      <h3 className="text-base font-bold text-gray-900">
        {title}
        {required && <span className="text-red-500 ml-1">*</span>}
        {optional && (
          <span className="text-gray-300 text-xs font-normal ml-2">
            (Optional)
          </span>
        )}
      </h3>
    </div>
  );
}

function Row({ label, value, valueClass = "", icon }) {
  return (
    <div className="flex justify-between items-center px-5 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold text-gray-800 flex items-center gap-1.5 ${valueClass}`}>
        {icon}{value}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

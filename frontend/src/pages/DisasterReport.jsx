import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import axios from "axios";
import Navbar from "../components/Navbar";

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
const SatelliteIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 7L9 3 5 7l4 4" /><path d="M17 11l4 4-4 4-4-4" />
    <path d="M8 12l4 4" /><path d="M16 8l-4-4" />
    <path d="M3 21l4.34-4.34" /><circle cx="5.5" cy="18.5" r="1.5" />
  </svg>
);
const MapPinIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const UserIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const PhoneIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const UploadIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
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

const typeStyles = {
  fire: "bg-red-50 border-red-300 text-red-700",
  flood: "bg-blue-50 border-blue-300 text-blue-700",
  earthquake: "bg-orange-50 border-orange-300 text-orange-700",
  landslide: "bg-amber-50 border-amber-300 text-amber-700",
  storm: "bg-sky-50 border-sky-300 text-sky-700",
  other: "bg-yellow-50 border-yellow-300 text-yellow-700",
};

const severityStyles = {
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-300",
  MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-300",
  HIGH: "bg-orange-50 text-orange-700 border-orange-300",
  CRITICAL: "bg-red-50 text-red-700 border-red-300",
};

// ─── Component ─────────────────────────────────────────────────
export default function DisasterReport() {
  const { token } = useAuth();
  const [form, setForm] = useState({
    disasterType: "", otherType: "", description: "",
    severity: "", name: "", contact: "",
  });
  const [status, setStatus] = useState("idle");
  const [locationData, setLocationData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [reportId, setReportId] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);

  const set_ = (f, v) => setForm((p) => ({ ...p, [f]: v }));

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
    setErrorMsg("");
    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setLocationData(loc);
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
              latitude: loc.latitude,
              longitude: loc.longitude,
              location_accuracy: loc.accuracy,
              reporter_name: form.name || "Anonymous",
              reporter_contact: form.contact || null,
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
      },
      () => {
        setStatus("error");
        setErrorMsg(
          "Location access denied. Please enable GPS to submit a report."
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const reset = () => {
    setForm({
      disasterType: "", otherType: "", description: "",
      severity: "", name: "", contact: "",
    });
    setStatus("idle");
    setLocationData(null);
    setErrorMsg("");
    setReportId(null);
    setMediaFiles([]);
    setUploadProgress(null);
  };

  const selType = DISASTER_TYPES.find((d) => d.value === form.disasterType);

  // ─── Success Screen ─────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 text-center"
          >
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20" />
              <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                <CheckCircleIcon className="w-10 h-10 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              Report Submitted Successfully
            </h2>
            <p className="text-gray-500 mb-8">
              Your emergency report has been transmitted to the command center.
              Response teams have been notified.
            </p>

            <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-100 text-left mb-8">
              <Row label="Report ID" value={`#${reportId}`} />
              <Row
                label="Incident Type"
                value={
                  form.disasterType === "other"
                    ? form.otherType
                    : form.disasterType.charAt(0).toUpperCase() +
                      form.disasterType.slice(1)
                }
              />
              <Row
                label="Severity"
                value={form.severity}
                valueClass={
                  form.severity === "CRITICAL"
                    ? "text-red-600"
                    : form.severity === "HIGH"
                    ? "text-orange-600"
                    : "text-emerald-600"
                }
              />
              <Row
                label="Coordinates"
                value={`${locationData?.latitude.toFixed(6)}, ${locationData?.longitude.toFixed(6)}`}
                valueClass="text-blue-600 text-sm"
              />
              <Row
                label="Accuracy"
                value={`\u00B1${locationData?.accuracy.toFixed(0)}m`}
              />
              <Row
                label="Status"
                icon={<ClockIcon className="w-3.5 h-3.5 text-amber-500" />}
                value="Pending Response"
                valueClass="text-amber-600"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-left mb-8">
              <ShieldIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                Stay calm and move to a safe location. Do not return to the
                affected area until cleared by authorities.
              </p>
            </div>

            <button
              onClick={reset}
              className="w-full px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-sm"
            >
              Submit Another Report
            </button>
            <a
              href="/my-disaster-reports"
              className="group flex items-center justify-center gap-2 mt-3 px-8 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all text-center"
            >
              <ClipboardListIcon className="w-4.5 h-4.5" />
              Track My Reports
              <ArrowRightIcon className="w-3.5 h-3.5 opacity-50 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── Main Form ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-500 to-sky-400">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=1600&h=400&fit=crop&q=80"
            alt=""
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/90 via-sky-400/85 to-sky-300/80" />
        </div>
        <div className="absolute top-0 right-[15%] w-72 h-72 bg-white/10 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30">
                  <WarningTriangleIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                    Emergency Incident Report
                  </h1>
                  <p className="text-sky-100 text-sm mt-0.5">
                    Fill out this form to report a disaster. GPS coordinates are captured automatically.
                  </p>
                </div>
              </div>
              <a
                href="/my-disaster-reports"
                className="group flex-shrink-0 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
              >
                <ClipboardListIcon className="w-4 h-4" />
                Track My Reports
                <ArrowRightIcon className="w-3.5 h-3.5 opacity-50 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </motion.div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" className="w-full" preserveAspectRatio="none">
            <path d="M0 40L60 35C120 30 240 20 360 16.7C480 13.3 600 16.7 720 20C840 23.3 960 26.7 1080 25C1200 23.3 1320 16.7 1380 13.3L1440 10V40H0Z" fill="white"/>
          </svg>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">

            {/* Incident Type */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <SectionHeader num="01" title="Incident Type" required />
              <div className="grid grid-cols-3 gap-3 mt-5">
                {DISASTER_TYPES.map((d) => {
                  const Icon = d.icon;
                  const isActive = form.disasterType === d.value;
                  return (
                    <button
                      key={d.value}
                      onClick={() => set_("disasterType", d.value)}
                      className={`relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 ${
                        isActive
                          ? `${d.activeBg} ${d.activeBorder} shadow-md`
                          : `bg-white ${d.border} hover:shadow-sm`
                      }`}
                    >
                      <div className={`w-12 h-12 ${isActive ? d.activeBg : d.bg} rounded-xl flex items-center justify-center transition-colors`}>
                        <Icon className={`w-6 h-6 ${isActive ? d.activeText : d.color}`} />
                      </div>
                      <span className={`text-sm font-semibold ${isActive ? d.activeText : 'text-gray-600'}`}>
                        {d.label}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="typeCheck"
                          className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200"
                        >
                          <CheckCircleIcon className={`w-4 h-4 ${d.activeText}`} />
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

            {/* Severity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <SectionHeader num="02" title="Severity Level" required />
              <div className="grid grid-cols-4 gap-3 mt-5">
                {SEVERITY.map((s) => {
                  const isActive = form.severity === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => set_("severity", s.value)}
                      className={`relative py-3.5 px-2 rounded-xl border-2 text-sm font-bold tracking-wide transition-all duration-200 ${
                        isActive
                          ? `${s.activeBg} ${s.activeBorder} ${s.color} shadow-md`
                          : `bg-white ${s.border} text-gray-400 hover:text-gray-600 hover:shadow-sm`
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isActive ? s.dot : 'bg-gray-300'} transition-colors`} />
                        {s.label}
                      </div>
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
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <SectionHeader num="03" title="Description" required />
              <textarea
                className="w-full mt-4 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-sm resize-none bg-gray-50"
                placeholder="Describe the situation clearly — number of people affected, extent of damage, immediate dangers..."
                value={form.description}
                onChange={(e) => set_("description", e.target.value)}
                rows={5}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-300">Min 10 characters</p>
                <p className={`text-xs font-medium ${form.description.length >= 10 ? 'text-emerald-500' : 'text-gray-400'}`}>
                  {form.description.length} characters
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 space-y-6">

            {/* Reporter Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <SectionHeader num="04" title="Reporter Information" optional />
              <div className="space-y-4 mt-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    Full Name
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-sm bg-gray-50"
                    placeholder="Enter your full name..."
                    value={form.name}
                    onChange={(e) => set_("name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    Contact Number
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition text-sm bg-gray-50"
                    placeholder="Enter your phone number..."
                    value={form.contact}
                    onChange={(e) => set_("contact", e.target.value)}
                  />
                </div>
              </div>
            </motion.div>

            {/* Location Capture */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <SectionHeader num="05" title="Location Capture" />
              <div
                className={`mt-5 flex items-start gap-4 p-4 rounded-xl border-2 transition-all ${
                  locationData
                    ? "bg-emerald-50 border-emerald-300"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${locationData ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                  {locationData
                    ? <MapPinIcon className="w-5 h-5 text-emerald-600" />
                    : <SatelliteIcon className="w-5 h-5 text-blue-500" />
                  }
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  {locationData ? (
                    <>
                      <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircleIcon className="w-4 h-4" />
                        GPS Location Captured
                      </span>
                      <span className="text-sm text-gray-800 font-medium font-mono">
                        {locationData.latitude.toFixed(6)},{" "}
                        {locationData.longitude.toFixed(6)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Accuracy: {"\u00B1"}{locationData.accuracy.toFixed(0)} meters
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-blue-600">
                        Auto-capture on submit
                      </span>
                      <span className="text-xs text-gray-500 leading-relaxed">
                        Your precise GPS coordinates will be automatically
                        attached when you click Submit.
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Media Upload */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <SectionHeader num="06" title="Photo / Video Evidence" optional />
              <p className="text-xs text-gray-400 mt-2 mb-4">
                Images (JPEG, PNG, WebP — max 10MB) or videos (MP4, WebM, MOV — max 50MB)
              </p>
              <label className="group flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                <div className="flex flex-col items-center">
                  <div className="w-11 h-11 bg-gray-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center mb-2 transition-colors">
                    <UploadIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Click to add photos or videos</span>
                  <span className="text-xs text-gray-300 mt-0.5">Up to 5 files</span>
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
              {mediaFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {mediaFiles.map((file, i) => {
                    const isVideo = file.type.startsWith("video/");
                    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        {isVideo ? (
                          <div className="w-11 h-11 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileVideoIcon className="w-5 h-5 text-sky-500" />
                          </div>
                        ) : (
                          <img
                            src={URL.createObjectURL(file)}
                            alt=""
                            className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                          <p className="text-xs text-gray-400">{sizeMB} MB · {isVideo ? "Video" : "Image"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMediaFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="w-7 h-7 bg-gray-100 hover:bg-red-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Report Preview */}
            {(form.disasterType || form.severity) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border border-blue-200 rounded-2xl p-5"
              >
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">
                  Report Preview
                </p>
                <div className="flex flex-wrap gap-2">
                  {selType && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        typeStyles[selType.value]
                      }`}
                    >
                      <selType.icon className="w-3.5 h-3.5" />
                      {selType.label}
                    </span>
                  )}
                  {form.severity && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        severityStyles[form.severity]
                      }`}
                    >
                      {form.severity}
                    </span>
                  )}
                  {form.name && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                      <UserIcon className="w-3 h-3" />
                      {form.name}
                    </span>
                  )}
                  {mediaFiles.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-600 border border-sky-200">
                      <UploadIcon className="w-3 h-3" />
                      {mediaFiles.length} file{mediaFiles.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Error */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={status !== "idle" && status !== "error"}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-3 ${
                status === "idle" || status === "error"
                  ? "bg-slate-900 hover:bg-slate-800 text-white hover:-translate-y-0.5 hover:shadow-xl cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {status === "idle" && (
                <>
                  <SendIcon className="w-5 h-5" />
                  Submit Emergency Report
                </>
              )}
              {status === "locating" && (
                <>
                  <Spinner /> Acquiring GPS Location...
                </>
              )}
              {status === "sending" && (
                <>
                  <Spinner /> Transmitting to Command...
                </>
              )}
              {status === "uploading" && (
                <>
                  <Spinner /> Uploading media {uploadProgress || ""}...
                </>
              )}
              {status === "error" && (
                <>
                  <AlertCircleIcon className="w-5 h-5" />
                  Submission Failed — Try Again
                </>
              )}
            </button>

            {/* Legal Disclaimer */}
            <div className="flex items-start gap-2.5 px-1">
              <ShieldIcon className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400 leading-relaxed">
                Submitting false emergency reports is a criminal offence under
                Nepal law. Only submit genuine emergencies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────
function SectionHeader({ num, title, required, optional }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs font-bold">
        {num}
      </span>
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
      className="animate-spin h-5 w-5 text-current"
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

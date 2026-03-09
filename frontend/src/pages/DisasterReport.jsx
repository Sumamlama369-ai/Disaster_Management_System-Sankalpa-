import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import axios from "axios";
import Navbar from "../components/Navbar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DISASTER_TYPES = [
  { value: "fire", label: "Fire", emoji: "🔥" },
  { value: "flood", label: "Flood", emoji: "🌊" },
  { value: "earthquake", label: "Earthquake", emoji: "🌍" },
  { value: "landslide", label: "Landslide", emoji: "⛰️" },
  { value: "storm", label: "Storm", emoji: "🌪️" },
  { value: "other", label: "Other", emoji: "⚠️" },
];

const SEVERITY = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const severityStyles = {
  LOW: "bg-green-100 text-green-700 border-green-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-300",
  HIGH: "bg-orange-100 text-orange-700 border-orange-300",
  CRITICAL: "bg-red-100 text-red-700 border-red-300",
};

const typeStyles = {
  fire: "bg-red-50 border-red-300 text-red-700",
  flood: "bg-blue-50 border-blue-300 text-blue-700",
  earthquake: "bg-orange-50 border-orange-300 text-orange-700",
  landslide: "bg-amber-50 border-amber-300 text-amber-700",
  storm: "bg-purple-50 border-purple-300 text-purple-700",
  other: "bg-yellow-50 border-yellow-300 text-yellow-700",
};

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

          // Upload media files if any
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

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-10 text-center"
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-30" />
              <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                <span className="text-white text-4xl">{"✓"}</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">
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
                    : "text-green-600"
                }
              />
              <Row
                label="Coordinates"
                value={`${locationData?.latitude.toFixed(6)}, ${locationData?.longitude.toFixed(6)}`}
                valueClass="text-blue-600 text-sm"
              />
              <Row
                label="Accuracy"
                value={`±${locationData?.accuracy.toFixed(0)}m`}
              />
              <Row
                label="Status"
                value={"⏳ Pending Response"}
                valueClass="text-yellow-600"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700 mb-8">
              Stay calm and move to a safe location. Do not return to the
              affected area until cleared by authorities.
            </div>

            <button
              onClick={reset}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-200 transition-all"
            >
              Submit Another Report
            </button>
            <a
              href="/my-disaster-reports"
              className="block mt-3 px-8 py-3 border-2 border-blue-200 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all text-center"
            >
              📋 Track My Reports
            </a>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {"🚨"} Emergency Incident Report
                </h1>
                <p className="text-white/80 text-lg">
                  Fill out this form to report a disaster. Your GPS coordinates are
                  captured automatically on submission.
                </p>
              </div>
              <a
                href="/my-disaster-reports"
                className="flex-shrink-0 mt-1 px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/30 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
              >
                {"📋"} Track My Reports
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-md p-6"
            >
              <SectionHeader num="01" title="Incident Type" required />
              <div className="grid grid-cols-3 gap-3 mt-4">
                {DISASTER_TYPES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => set_("disasterType", d.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 ${
                      form.disasterType === d.value
                        ? `${typeStyles[d.value]} border-2 shadow-md`
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-3xl">{d.emoji}</span>
                    <span className="text-sm font-semibold text-gray-700">
                      {d.label}
                    </span>
                  </button>
                ))}
              </div>
              {form.disasterType === "other" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specify Incident Type *
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                    placeholder="e.g. Gas leak, Building collapse..."
                    value={form.otherType}
                    onChange={(e) => set_("otherType", e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl shadow-md p-6"
            >
              <SectionHeader num="02" title="Severity Level" required />
              <div className="grid grid-cols-4 gap-3 mt-4">
                {SEVERITY.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => set_("severity", s.value)}
                    className={`py-3 px-2 rounded-xl border-2 text-sm font-bold tracking-wide transition-all duration-200 ${
                      form.severity === s.value
                        ? `${severityStyles[s.value]} shadow-md`
                        : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {s.value}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-md p-6"
            >
              <SectionHeader num="03" title="Description" required />
              <textarea
                className="w-full mt-4 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm resize-none"
                placeholder="Describe the situation clearly — number of people affected, extent of damage, immediate dangers..."
                value={form.description}
                onChange={(e) => set_("description", e.target.value)}
                rows={5}
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {form.description.length} characters
              </p>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl shadow-md p-6"
            >
              <SectionHeader num="04" title="Reporter Information" optional />
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                    placeholder="Enter your full name..."
                    value={form.name}
                    onChange={(e) => set_("name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                    placeholder="Enter your phone number..."
                    value={form.contact}
                    onChange={(e) => set_("contact", e.target.value)}
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-md p-6"
            >
              <SectionHeader num="05" title="Location Capture" />
              <div
                className={`mt-4 flex items-start gap-4 p-4 rounded-xl border-2 ${
                  locationData
                    ? "bg-green-50 border-green-300"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <span className="text-2xl mt-0.5">
                  {locationData ? "📍" : "🛰️"}
                </span>
                <div className="flex flex-col gap-1 min-w-0">
                  {locationData ? (
                    <>
                      <span className="text-sm font-semibold text-green-700">
                        {"✓"} GPS Location Captured
                      </span>
                      <span className="text-sm text-gray-800 font-medium">
                        {locationData.latitude.toFixed(6)},{" "}
                        {locationData.longitude.toFixed(6)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Accuracy: {"±"}{locationData.accuracy.toFixed(0)} meters
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

            {/* Section 06: Media Upload */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-2xl shadow-md p-6"
            >
              <SectionHeader num="06" title="Photo / Video Evidence" optional />
              <p className="text-xs text-gray-500 mt-2 mb-4">
                Upload images (JPEG, PNG, WebP — max 10MB) or videos (MP4, WebM, MOV — max 50MB) to help responders assess the situation.
              </p>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                <div className="flex flex-col items-center">
                  <span className="text-3xl mb-1">📎</span>
                  <span className="text-sm font-medium text-gray-600">Click to add photos or videos</span>
                  <span className="text-xs text-gray-400 mt-0.5">Up to 5 files</span>
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
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        {isVideo ? (
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">🎬</span>
                          </div>
                        ) : (
                          <img
                            src={URL.createObjectURL(file)}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                          <p className="text-xs text-gray-400">{sizeMB} MB · {isVideo ? "Video" : "Image"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMediaFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-600 transition p-1"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {(form.disasterType || form.severity) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6"
              >
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">
                  Report Preview
                </p>
                <div className="flex flex-wrap gap-2">
                  {selType && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        typeStyles[selType.value]
                      }`}
                    >
                      {selType.emoji} {selType.label}
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
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                      {"👤"} {form.name}
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 font-medium">
                {"⚠"} {errorMsg}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={status !== "idle" && status !== "error"}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg ${
                status === "idle" || status === "error"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-200 cursor-pointer"
                  : "bg-gray-400 text-white cursor-not-allowed"
              }`}
            >
              {status === "idle" && (
                <>
                  <span className="text-xl">{"📡"}</span> Submit Emergency Report
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
              {status === "error" && "✗ Submission Failed — Try Again"}
            </button>

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              {"⚠"} Submitting false emergency reports is a criminal offence under
              Nepal law. Only submit genuine emergencies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ num, title, required, optional }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xs font-bold">
        {num}
      </span>
      <div>
        <h3 className="text-base font-bold text-gray-800">
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
          {optional && (
            <span className="text-gray-400 text-xs font-normal ml-2">
              (Optional)
            </span>
          )}
        </h3>
      </div>
    </div>
  );
}

function Row({ label, value, valueClass = "" }) {
  return (
    <div className="flex justify-between items-center px-5 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold text-gray-800 ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
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

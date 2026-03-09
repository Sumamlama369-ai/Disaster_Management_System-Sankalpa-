import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Navbar from "../components/Navbar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", icon: "⏳", color: "#d97706", bg: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  REVIEWING: { label: "Reviewing", icon: "🔍", color: "#2563eb", bg: "bg-blue-100 text-blue-700 border-blue-300" },
  DISPATCHED: { label: "Dispatched", icon: "🚁", color: "#7c3aed", bg: "bg-purple-100 text-purple-700 border-purple-300" },
  RESCUING: { label: "Rescuing", icon: "🛟", color: "#ea580c", bg: "bg-orange-100 text-orange-700 border-orange-300" },
  RESOLVED: { label: "Resolved", icon: "✅", color: "#059669", bg: "bg-green-100 text-green-700 border-green-300" },
  REJECTED: { label: "Rejected", icon: "❌", color: "#dc2626", bg: "bg-red-100 text-red-700 border-red-300" },
};

const SEV_STYLE = {
  LOW: "bg-green-100 text-green-700 border-green-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-300",
  HIGH: "bg-orange-100 text-orange-700 border-orange-300",
  CRITICAL: "bg-red-100 text-red-700 border-red-300",
};

const TYPE_EMOJI = {
  fire: "🔥", flood: "🌊", earthquake: "🌍", landslide: "⛰️", storm: "🌪️",
};

export default function MyDisasterReports() {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [history, setHistory] = useState({});
  const [media, setMedia] = useState({});
  const [statusFilter, setStatusFilter] = useState("");
  const [total, setTotal] = useState(0);

  const fetchReports = async () => {
    try {
      const params = { page: 1, page_size: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await axios.get(`${API_URL}/api/v1/disaster-reports/reports/my-reports`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setReports(res.data.reports);
      setTotal(res.data.total);
    } catch (e) {
      console.error("Failed to fetch reports:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReports();
  }, [token, statusFilter]);

  const toggleExpand = async (reportId) => {
    if (expandedId === reportId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(reportId);

    // Load history and media if not already loaded
    if (!history[reportId]) {
      try {
        const res = await axios.get(
          `${API_URL}/api/v1/disaster-reports/reports/${reportId}/history`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setHistory((prev) => ({ ...prev, [reportId]: res.data }));
      } catch (e) {
        console.error("Failed to load history:", e);
      }
    }
    if (!media[reportId]) {
      try {
        const res = await axios.get(
          `${API_URL}/api/v1/disaster-reports/reports/${reportId}/media`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMedia((prev) => ({ ...prev, [reportId]: res.data }));
      } catch (e) {
        console.error("Failed to load media:", e);
      }
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">📋 My Disaster Reports</h1>
            <p className="text-white/70 text-lg">Track the status and response for all your submitted reports.</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary + Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="text-sm text-gray-500 font-medium">{total} report{total !== 1 ? "s" : ""} found</div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter("")}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                !statusFilter ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              All
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  statusFilter === key ? `${cfg.bg} border-2` : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-gray-400">
            <div className="animate-spin w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-4" />
            Loading your reports...
          </div>
        )}

        {/* Empty state */}
        {!loading && reports.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-md">
            <span className="text-5xl block mb-4">📭</span>
            <h3 className="text-lg font-bold text-gray-700 mb-2">No Reports Found</h3>
            <p className="text-gray-400 text-sm">
              {statusFilter ? "No reports match this filter." : "You haven't submitted any disaster reports yet."}
            </p>
            <a
              href="/report-disaster"
              className="inline-block mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition"
            >
              🚨 Submit a Report
            </a>
          </div>
        )}

        {/* Report Cards */}
        <div className="space-y-4">
          {reports.map((report, idx) => {
            const sc = STATUS_CONFIG[report.status] || STATUS_CONFIG.PENDING;
            const isExpanded = expandedId === report.id;
            const reportHistory = history[report.id] || [];
            const reportMedia = media[report.id] || [];

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Card Header — always visible */}
                <button
                  onClick={() => toggleExpand(report.id)}
                  className="w-full text-left px-6 py-5 flex items-center gap-4"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {TYPE_EMOJI[report.disaster_type] || "⚠️"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-gray-900 capitalize">{report.disaster_type}</span>
                      <span className="text-xs text-gray-400">#{report.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${sc.bg}`}>
                        {sc.icon} {sc.label}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${SEV_STYLE[report.severity] || ""}`}>
                        {report.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">{report.description}</p>
                  </div>

                  {/* Time + expand */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-400">{timeAgo(report.created_at)}</div>
                    <div className="text-xs text-gray-300 mt-1">{isExpanded ? "▲" : "▼"}</div>
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 border-t border-gray-100 pt-5">
                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left: Report details */}
                          <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">📋 Report Details</h4>
                            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                              <DetailItem label="Description" value={report.description} />
                              <DetailItem label="Reporter" value={report.reporter_name || "Anonymous"} />
                              <DetailItem label="Contact" value={report.reporter_contact || "N/A"} />
                              <DetailItem
                                label="Location"
                                value={`${parseFloat(report.latitude).toFixed(6)}, ${parseFloat(report.longitude).toFixed(6)}`}
                                mono
                              />
                              <DetailItem label="Submitted" value={new Date(report.created_at).toLocaleString()} />
                              {report.resolved_at && (
                                <DetailItem label="Resolved" value={new Date(report.resolved_at).toLocaleString()} />
                              )}
                            </div>

                            {/* Officer Notes */}
                            {report.officer_notes && (
                              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <span className="block text-xs text-amber-600 uppercase tracking-wider font-bold mb-1">📝 Officer Notes</span>
                                <p className="text-sm text-amber-800 whitespace-pre-wrap">{report.officer_notes}</p>
                              </div>
                            )}

                            {/* Response Notes */}
                            {report.response_notes && (
                              <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                                <span className="block text-xs text-green-600 uppercase tracking-wider font-bold mb-1">💬 Response</span>
                                <p className="text-sm text-green-800 whitespace-pre-wrap">{report.response_notes}</p>
                              </div>
                            )}
                          </div>

                          {/* Right: Timeline */}
                          <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🕐 Status Timeline</h4>
                            {reportHistory.length > 0 ? (
                              <div className="relative pl-6 space-y-4">
                                {/* Timeline line */}
                                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
                                {reportHistory.map((entry, i) => {
                                  const entrySc = STATUS_CONFIG[entry.new_status] || STATUS_CONFIG.PENDING;
                                  return (
                                    <div key={entry.id} className="relative">
                                      {/* Dot */}
                                      <div
                                        className="absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                        style={{ background: entrySc.color }}
                                      />
                                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                                        <div className="flex items-center justify-between">
                                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${entrySc.bg}`}>
                                            {entrySc.icon} {entrySc.label}
                                          </span>
                                          <span className="text-xs text-gray-400">
                                            {new Date(entry.changed_at).toLocaleString()}
                                          </span>
                                        </div>
                                        {entry.changed_by_name && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            by <span className="font-semibold">{entry.changed_by_name}</span>
                                            {entry.changed_by_role && (
                                              <span className="text-gray-400"> ({entry.changed_by_role})</span>
                                            )}
                                          </div>
                                        )}
                                        {entry.change_notes && (
                                          <p className="text-xs text-gray-600 mt-2 bg-white rounded-lg p-2 border border-gray-100">
                                            {entry.change_notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl border border-gray-200 text-gray-400 text-sm">
                                No status updates yet
                              </div>
                            )}

                            {/* Visual step indicator */}
                            <div className="mt-5">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">📊 Progress</h4>
                              <ProgressSteps currentStatus={report.status} />
                            </div>
                          </div>
                        </div>

                        {/* Media Gallery */}
                        {reportMedia.length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">📷 Submitted Evidence ({reportMedia.length})</h4>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                              {reportMedia.map((m) => {
                                const isVideo = m.mime_type?.startsWith("video/");
                                const url = m.image_url?.startsWith("http") ? m.image_url : `${API_URL}${m.image_url}`;
                                return (
                                  <a key={m.id} href={url} target="_blank" rel="noopener noreferrer"
                                    className="aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100 hover:shadow-md transition block">
                                    {isVideo ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100">
                                        <span className="text-3xl">🎬</span>
                                        <span className="text-xs font-bold text-purple-600 mt-1">VIDEO</span>
                                      </div>
                                    ) : (
                                      <img src={url} alt="" className="w-full h-full object-cover" />
                                    )}
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────── */

function DetailItem({ label, value, mono = false }) {
  return (
    <div>
      <span className="text-xs text-gray-400 block">{label}</span>
      <span className={`text-sm font-medium text-gray-800 ${mono ? "font-mono text-blue-600" : ""}`}>{value}</span>
    </div>
  );
}

function ProgressSteps({ currentStatus }) {
  const steps = [
    { key: "PENDING", label: "Received", icon: "⏳" },
    { key: "REVIEWING", label: "Reviewing", icon: "🔍" },
    { key: "DISPATCHED", label: "Dispatched", icon: "🚁" },
    { key: "RESOLVED", label: "Resolved", icon: "✅" },
  ];
  const order = { PENDING: 0, REVIEWING: 1, DISPATCHED: 2, RESCUING: 2, RESOLVED: 3, REJECTED: -1 };
  const current = order[currentStatus] ?? -1;
  const isRejected = currentStatus === "REJECTED";

  return (
    <div className="flex items-center">
      {steps.map((step, i) => {
        const done = !isRejected && current >= i;
        const active = !isRejected && current === i;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-all ${
                  active
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-md"
                    : done
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {step.icon}
              </div>
              <span className={`text-[10px] mt-1 font-semibold ${done ? "text-gray-700" : "text-gray-300"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-1 rounded ${done && current > i ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
      {isRejected && (
        <div className="flex flex-col items-center ml-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-base bg-red-500 text-white ring-4 ring-red-100 shadow-md">
            ❌
          </div>
          <span className="text-[10px] mt-1 font-semibold text-red-600">Rejected</span>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Navbar from "../components/Navbar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "#f59e0b", text: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-400", border: "border-amber-200", ring: "ring-amber-100" },
  REVIEWING: { label: "In Review", color: "#3b82f6", text: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-400", border: "border-blue-200", ring: "ring-blue-100" },
  DISPATCHED: { label: "Dispatched", color: "#8b5cf6", text: "text-violet-700", bg: "bg-violet-50", dot: "bg-violet-400", border: "border-violet-200", ring: "ring-violet-100" },
  RESCUING: { label: "Rescuing", color: "#f97316", text: "text-orange-700", bg: "bg-orange-50", dot: "bg-orange-400", border: "border-orange-200", ring: "ring-orange-100" },
  RESOLVED: { label: "Resolved", color: "#10b981", text: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-400", border: "border-emerald-200", ring: "ring-emerald-100" },
  REJECTED: { label: "Rejected", color: "#ef4444", text: "text-red-700", bg: "bg-red-50", dot: "bg-red-400", border: "border-red-200", ring: "ring-red-100" },
};

const SEV_CONFIG = {
  LOW: { label: "Low", classes: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  MEDIUM: { label: "Medium", classes: "text-amber-700 bg-amber-50 border-amber-200" },
  HIGH: { label: "High", classes: "text-orange-700 bg-orange-50 border-orange-200" },
  CRITICAL: { label: "Critical", classes: "text-red-700 bg-red-50 border-red-200" },
};

const TYPE_COLOR = {
  fire: { bg: "bg-red-100", text: "text-red-600", accent: "#ef4444", gradient: "from-red-500 to-orange-500" },
  flood: { bg: "bg-blue-100", text: "text-blue-600", accent: "#3b82f6", gradient: "from-blue-500 to-cyan-500" },
  earthquake: { bg: "bg-amber-100", text: "text-amber-600", accent: "#f59e0b", gradient: "from-amber-500 to-yellow-500" },
  landslide: { bg: "bg-stone-100", text: "text-stone-600", accent: "#78716c", gradient: "from-stone-500 to-amber-600" },
  storm: { bg: "bg-indigo-100", text: "text-indigo-600", accent: "#6366f1", gradient: "from-indigo-500 to-purple-500" },
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
    if (expandedId === reportId) { setExpandedId(null); return; }
    setExpandedId(reportId);
    if (!history[reportId]) {
      try {
        const res = await axios.get(`${API_URL}/api/v1/disaster-reports/reports/${reportId}/history`, { headers: { Authorization: `Bearer ${token}` } });
        setHistory((prev) => ({ ...prev, [reportId]: res.data }));
      } catch (e) { console.error(e); }
    }
    if (!media[reportId]) {
      try {
        const res = await axios.get(`${API_URL}/api/v1/disaster-reports/reports/${reportId}/media`, { headers: { Authorization: `Bearer ${token}` } });
        setMedia((prev) => ({ ...prev, [reportId]: res.data }));
      } catch (e) { console.error(e); }
    }
  };

  const formatDateTime = (d) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const statusCounts = reports.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const activeCount = (statusCounts.PENDING || 0) + (statusCounts.REVIEWING || 0) + (statusCounts.DISPATCHED || 0) + (statusCounts.RESCUING || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <Navbar />

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <div className="py-8 lg:py-10">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-blue-600 to-indigo-600" />
                    <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">My Disaster Reports</h1>
                  </div>
                  <p className="text-gray-500 text-sm lg:text-base ml-[18px]">Monitor the real-time status and response progress of all your submitted disaster reports.</p>
                </div>
                <a href="/report-disaster" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-blue-200 transition-all self-start lg:self-auto">
                  <PlusIcon className="w-4 h-4" />
                  New Report
                </a>
              </div>
            </motion.div>

            {/* Stats */}
            {!loading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                <StatCard label="Total Reports" value={total} icon={<ClipboardListIcon />} color="blue" />
                <StatCard label="Active" value={activeCount} icon={<PulseIcon />} color="amber" />
                <StatCard label="Resolved" value={statusCounts.RESOLVED || 0} icon={<CheckCircleIcon />} color="emerald" />
                <StatCard label="Rejected" value={statusCounts.REJECTED || 0} icon={<XCircleIcon />} color="red" />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 p-1.5 flex items-center gap-1 overflow-x-auto mb-6 shadow-sm">
          <FilterChip active={!statusFilter} onClick={() => setStatusFilter("")} label="All" count={total} />
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <FilterChip key={key} active={statusFilter === key} onClick={() => setStatusFilter(key)} label={cfg.label} color={cfg.color} count={statusCounts[key]} />
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-32">
            <div className="w-10 h-10 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-5 font-medium">Loading your reports...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && reports.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-gray-200 text-center py-24 px-6">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <InboxIcon className="w-9 h-9 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Reports Found</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
              {statusFilter ? "No reports match the selected filter." : "You haven't submitted any disaster reports yet."}
            </p>
            <a href="/report-disaster" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-blue-200 transition-all">
              Submit a Report <ArrowRightIcon className="w-4 h-4" />
            </a>
          </motion.div>
        )}

        {/* ── Report List ───────────────────────────────── */}
        {!loading && reports.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              <div className="col-span-1">Type</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Severity</div>
              <div className="col-span-2">Submitted</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            <div className="divide-y divide-gray-100">
              {reports.map((report, idx) => {
                const sc = STATUS_CONFIG[report.status] || STATUS_CONFIG.PENDING;
                const sev = SEV_CONFIG[report.severity] || SEV_CONFIG.LOW;
                const tc = TYPE_COLOR[report.disaster_type] || { bg: "bg-gray-100", text: "text-gray-600", accent: "#6b7280", gradient: "from-gray-500 to-gray-600" };
                const isExpanded = expandedId === report.id;
                const reportHistory = history[report.id] || [];
                const reportMedia = media[report.id] || [];

                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    {/* Row */}
                    <button
                      onClick={() => toggleExpand(report.id)}
                      className={`w-full text-left px-6 py-4 lg:py-5 flex items-center gap-4 lg:grid lg:grid-cols-12 lg:gap-4 transition-colors ${isExpanded ? "bg-blue-50/40" : "hover:bg-gray-50/80"}`}
                    >
                      {/* Type Badge */}
                      <div className="col-span-1 flex-shrink-0">
                        <div className={`w-11 h-11 rounded-xl ${tc.bg} flex items-center justify-center`}>
                          <DisasterTypeIcon type={report.disaster_type} className={`w-5 h-5 ${tc.text}`} />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="col-span-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm lg:text-[15px] font-bold text-gray-900 capitalize">{report.disaster_type}</span>
                          <span className="text-[11px] text-gray-400 font-mono">#{report.id}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{report.description}</p>
                      </div>

                      {/* Status */}
                      <div className="col-span-2 hidden lg:flex items-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </div>

                      {/* Severity */}
                      <div className="col-span-1 hidden lg:flex items-center">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${sev.classes}`}>{sev.label}</span>
                      </div>

                      {/* Date */}
                      <div className="col-span-2 hidden lg:flex flex-col">
                        <span className="text-sm text-gray-700">{formatDateTime(report.created_at)}</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">{timeAgo(report.created_at)}</span>
                      </div>

                      {/* Action */}
                      <div className="col-span-2 flex items-center justify-end gap-3 flex-shrink-0">
                        {/* Mobile badges */}
                        <div className="flex lg:hidden items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 font-medium hidden sm:block lg:hidden">{timeAgo(report.created_at)}</span>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDownIcon className="w-4 h-4" />
                          </motion.div>
                        </div>
                      </div>
                    </button>

                    {/* ── Expanded Detail Panel ──────── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-gray-50/70">
                            {/* Color accent bar */}
                            <div className={`h-1 bg-gradient-to-r ${tc.gradient}`} />

                            {/* Progress Stepper */}
                            <div className="px-6 lg:px-10 py-6 border-b border-gray-200/70">
                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Response Progress</p>
                              <ProgressSteps currentStatus={report.status} />
                            </div>

                            {/* Detail Grid */}
                            <div className="px-6 lg:px-10 py-6">
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                                {/* Column 1: Report Details */}
                                <div className="lg:col-span-4">
                                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Report Details</p>
                                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <table className="w-full text-sm">
                                      <tbody className="divide-y divide-gray-100">
                                        <InfoRow label="Description" value={report.description} />
                                        <InfoRow label="Reporter" value={report.reporter_name || "Anonymous"} />
                                        <InfoRow label="Contact" value={report.reporter_contact || "N/A"} />
                                        <InfoRow label="Coordinates" value={`${parseFloat(report.latitude).toFixed(6)}, ${parseFloat(report.longitude).toFixed(6)}`} mono />
                                        <InfoRow label="Submitted" value={formatDateTime(report.created_at)} />
                                        {report.resolved_at && <InfoRow label="Resolved" value={formatDateTime(report.resolved_at)} />}
                                      </tbody>
                                    </table>
                                  </div>

                                  {report.officer_notes && (
                                    <div className="mt-4 bg-white rounded-xl border border-amber-200 p-4">
                                      <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-2">Officer Notes</p>
                                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{report.officer_notes}</p>
                                    </div>
                                  )}
                                  {report.response_notes && (
                                    <div className="mt-3 bg-white rounded-xl border border-emerald-200 p-4">
                                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest mb-2">Response Notes</p>
                                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{report.response_notes}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Column 2: Timeline */}
                                <div className="lg:col-span-4">
                                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Status Timeline</p>
                                  {reportHistory.length > 0 ? (
                                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                                      <div className="relative">
                                        <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200" />
                                        <div className="space-y-5">
                                          {reportHistory.map((entry) => {
                                            const esc = STATUS_CONFIG[entry.new_status] || STATUS_CONFIG.PENDING;
                                            return (
                                              <div key={entry.id} className="relative pl-7">
                                                <div className={`absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-[3px] border-white ${esc.dot}`} style={{ boxShadow: "0 0 0 1px #e5e7eb" }} />
                                                <div>
                                                  <div className="flex items-center justify-between gap-2">
                                                    <span className={`text-xs font-bold ${esc.text}`}>{esc.label}</span>
                                                    <span className="text-[11px] text-gray-400">{formatDateTime(entry.changed_at)}</span>
                                                  </div>
                                                  {entry.changed_by_name && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                      by <span className="font-semibold text-gray-700">{entry.changed_by_name}</span>
                                                      {entry.changed_by_role && <span className="text-gray-400"> &middot; {entry.changed_by_role}</span>}
                                                    </p>
                                                  )}
                                                  {entry.change_notes && (
                                                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg p-2.5 leading-relaxed border border-gray-100">{entry.change_notes}</p>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-white rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center py-14 text-gray-400">
                                      <ClockIcon className="w-6 h-6 mb-2 text-gray-300" />
                                      <span className="text-sm">No status updates yet</span>
                                    </div>
                                  )}
                                </div>

                                {/* Column 3: Evidence */}
                                <div className="lg:col-span-4">
                                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                                    Evidence {reportMedia.length > 0 && `(${reportMedia.length})`}
                                  </p>
                                  {reportMedia.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                      {reportMedia.map((m) => {
                                        const isVideo = m.mime_type?.startsWith("video/");
                                        const url = m.image_url?.startsWith("http") ? m.image_url : `${API_URL}${m.image_url}`;
                                        return (
                                          <a key={m.id} href={url} target="_blank" rel="noopener noreferrer" className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all block group">
                                            {isVideo ? (
                                              <div className="w-full h-full flex flex-col items-center justify-center bg-white">
                                                <PlayIcon className="w-8 h-8 text-gray-300 group-hover:text-gray-500 transition" />
                                                <span className="text-[10px] font-semibold text-gray-400 mt-1 uppercase tracking-wider">Video</span>
                                              </div>
                                            ) : (
                                              <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            )}
                                          </a>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="bg-white rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center py-14 text-gray-400">
                                      <ImageIcon className="w-6 h-6 mb-2 text-gray-300" />
                                      <span className="text-sm">No evidence uploaded</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function StatCard({ label, value, icon, color }) {
  const colorMap = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
    red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-100" },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4 lg:p-5 flex items-center justify-between`}>
      <div>
        <p className="text-2xl lg:text-3xl font-extrabold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 font-medium mt-1">{label}</p>
      </div>
      <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center ${c.text}`}>
        {icon}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, color, count }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
        active ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
      }`}
    >
      {color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: active ? "white" : color }} />}
      {label}
      {count > 0 && (
        <span className={`text-[11px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-md px-1.5 ${active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <tr>
      <td className="px-4 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider w-28 align-top whitespace-nowrap">{label}</td>
      <td className={`px-4 py-3 text-sm ${mono ? "font-mono text-xs text-blue-700" : "text-gray-800"} leading-relaxed`}>{value}</td>
    </tr>
  );
}

function ProgressSteps({ currentStatus }) {
  const steps = [
    { key: "PENDING", label: "Received" },
    { key: "REVIEWING", label: "In Review" },
    { key: "DISPATCHED", label: "Dispatched" },
    { key: "RESOLVED", label: "Resolved" },
  ];
  const order = { PENDING: 0, REVIEWING: 1, DISPATCHED: 2, RESCUING: 2, RESOLVED: 3, REJECTED: -1 };
  const current = order[currentStatus] ?? -1;
  const isRejected = currentStatus === "REJECTED";

  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => {
        const done = !isRejected && current >= i;
        const active = !isRejected && current === i;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                active ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100" :
                done ? "bg-emerald-500 border-emerald-500 text-white" :
                "bg-white border-gray-300 text-gray-400"
              }`}>
                {done && !active ? <CheckIcon className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[11px] mt-2 font-semibold ${active ? "text-blue-600" : done ? "text-emerald-600" : "text-gray-400"}`}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-3 bg-gray-200 rounded-full relative overflow-hidden">
                {done && current > i && (
                  <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5, delay: i * 0.12 }} className="absolute inset-0 bg-emerald-500 rounded-full" />
                )}
              </div>
            )}
          </div>
        );
      })}
      {isRejected && (
        <div className="flex flex-col items-center ml-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500 border-2 border-red-500 text-white ring-4 ring-red-100">
            <XMarkIcon className="w-4 h-4" />
          </div>
          <span className="text-[11px] mt-2 font-semibold text-red-600">Rejected</span>
        </div>
      )}
    </div>
  );
}

/* ── Disaster Type SVG Icons ────────────────────────────── */

function DisasterTypeIcon({ type, className }) {
  switch (type) {
    case "fire":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z" />
        </svg>
      );
    case "flood":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
          <path d="M2 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
          <path d="M9 3v8" /><path d="M15 3v8" /><path d="M7 7h10" />
        </svg>
      );
    case "earthquake":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12h3l2-3 3 6 3-9 2 6h7" />
        </svg>
      );
    case "landslide":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 20h18" /><path d="M5 20l4-8 3 4 4-10 3 14" />
        </svg>
      );
    case "storm":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    default:
      return <AlertTriangleIcon className={className} />;
  }
}

/* ── Generic SVG Icons ──────────────────────────────────── */

function ChevronDownIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>);
}
function CheckIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>);
}
function XMarkIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
}
function PlusIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);
}
function ArrowRightIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>);
}
function PlayIcon({ className }) {
  return (<svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>);
}
function ClockIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></svg>);
}
function InboxIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.399 0V6.108c0-1.135.845-2.098 1.976-2.192a48.424 48.424 0 0113.048 0c1.131.094 1.976 1.057 1.976 2.192V13.5" /></svg>);
}
function ImageIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>);
}
function AlertTriangleIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>);
}
function ClipboardListIcon() {
  return (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>);
}
function PulseIcon() {
  return (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3-9 4 18 3-9h4" /></svg>);
}
function CheckCircleIcon() {
  return (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
}
function XCircleIcon() {
  return (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
}

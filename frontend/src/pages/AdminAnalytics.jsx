import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import api from '../services/api';
import ReactECharts from 'echarts-for-react';

// Gradient helpers (plain objects work in all ECharts versions including v6)
const lg = (x, y, x2, y2, stops) => ({ type: 'linear', x, y, x2, y2, colorStops: stops });
const rg = (x, y, r, stops) => ({ type: 'radial', x, y, r, colorStops: stops });

// ─── SVG Icons ────────────────────────────────────────────────
const ChartBarIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
);
const UsersIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const ShieldIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const AlertIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const DroneIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0" fill="currentColor"/><path d="M12 12L5 5M12 12l7-7M12 12l-7 7M12 12l7 7"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/></svg>
);
const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);
const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const FileTextIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
);
const ActivityIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
);
const PieChartIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
);
const TargetIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);
const LayersIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
);
const GlobeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);
const TrendIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);
const VideoIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></svg>
);
const MapPinIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
);

// ─── Constants ────────────────────────────────────────────────
const SEVERITY_COLORS = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' };
const TYPE_COLORS = { fire: '#ef4444', flood: '#3b82f6', earthquake: '#f97316', landslide: '#d97706', storm: '#0ea5e9', conflict: '#8b5cf6', pandemic: '#ec4899', explosion: '#f43f5e', hurricane: '#06b6d4', drought: '#a855f7', tornado: '#14b8a6', volcano: '#e11d48', tsunami: '#2563eb', wildfire: '#ea580c', other: '#6b7280' };
const URGENCY_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };

// ─── Component ────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [countdown, setCountdown] = useState(60);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [radarTooltip, setRadarTooltip] = useState(null); // { index, x, y }
  const radarMetricInfoRef = useRef(null);
  const radarContainerRef = useRef(null);

  // Data stores — each from a DIFFERENT API
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [reportStats, setReportStats] = useState(null);
  const [nlpStats, setNlpStats] = useState(null);
  const [recentDisasters, setRecentDisasters] = useState([]);
  const [disasterTypes, setDisasterTypes] = useState([]);
  const [urgencyDist, setUrgencyDist] = useState([]);
  const [locationHotspots, setLocationHotspots] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [videos, setVideos] = useState([]);
  const [permits, setPermits] = useState([]);
  const [reports, setReports] = useState([]);

  // Filters for Users & Permits tab
  const [growthFilterYear, setGrowthFilterYear] = useState('all');
  const [growthFilterMonth, setGrowthFilterMonth] = useState('all');
  const [heatmapFilterYear, setHeatmapFilterYear] = useState('all');
  const [heatmapFilterMonth, setHeatmapFilterMonth] = useState('all');

  // Derived
  const citizens = users.filter(u => u.role === 'citizen');
  const officers = users.filter(u => u.role === 'officer');
  const admins = users.filter(u => u.role === 'admin');

  // Available years from all data sources (for filters)
  const availableYears = [...new Set([
    ...users.filter(u => u.created_at).map(u => new Date(u.created_at).getFullYear()),
    ...reports.filter(r => r.created_at || r.timestamp).map(r => new Date(r.created_at || r.timestamp).getFullYear()),
    ...recentDisasters.filter(d => d.timestamp).map(d => new Date(d.timestamp).getFullYear()),
  ])].sort((a, b) => b - a);
  const monthOptions = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [usersRes, statsRes, nlpRes, recentRes, typesRes, urgencyRes, hotspotsRes, timelineRes, sysRes, videosRes, permitsRes, reportsRes] = await Promise.allSettled([
        api.get('/users/all?skip=0&limit=500'),
        api.get('/disaster-reports/statistics'),
        api.get('/disasters/dashboard/stats'),
        api.get('/disasters/dashboard/recent-disasters?limit=100'),
        api.get('/disasters/dashboard/disaster-types'),
        api.get('/disasters/dashboard/urgency-distribution'),
        api.get('/disasters/dashboard/location-hotspots?limit=15'),
        api.get('/disasters/dashboard/timeline?hours=24'),
        api.get('/disasters/system/status'),
        api.get('/video/list?skip=0&limit=50'),
        api.get('/permits/pending'),
        api.get('/disaster-reports/reports?page=1&page_size=100'),
      ]);

      if (usersRes.status === 'fulfilled') { setUsers(usersRes.value.data.users || []); setTotalUsers(usersRes.value.data.total || 0); }
      if (statsRes.status === 'fulfilled') setReportStats(statsRes.value.data);
      if (nlpRes.status === 'fulfilled') setNlpStats(nlpRes.value.data);
      if (recentRes.status === 'fulfilled') setRecentDisasters(recentRes.value.data || []);
      if (typesRes.status === 'fulfilled') setDisasterTypes(typesRes.value.data || []);
      if (urgencyRes.status === 'fulfilled') setUrgencyDist(urgencyRes.value.data || []);
      if (hotspotsRes.status === 'fulfilled') setLocationHotspots(hotspotsRes.value.data || []);
      if (timelineRes.status === 'fulfilled') setTimeline(timelineRes.value.data || []);
      if (sysRes.status === 'fulfilled') setSystemStatus(sysRes.value.data);
      if (videosRes.status === 'fulfilled') setVideos(videosRes.value.data?.videos || videosRes.value.data || []);
      if (permitsRes.status === 'fulfilled') setPermits(permitsRes.value.data || []);
      if (reportsRes.status === 'fulfilled') setReports(reportsRes.value.data?.reports || reportsRes.value.data || []);

      setLastUpdate(new Date());
      setCountdown(60);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const t = setInterval(() => setCountdown(p => { if (p <= 1) { fetchData(true); return 60; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, []);

  // Radar chart mouse handler: detect closest point and show per-metric tooltip
  const handleRadarMouseMove = useCallback((e) => {
    const info = radarMetricInfoRef.current;
    if (!info || !radarContainerRef.current) return;
    const rect = radarContainerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = rect.width * 0.5;
    const cy = rect.height * 0.5;
    // Label positions are at the outer edge beyond the radar (radius ~80% of half-height for labels)
    const labelR = rect.height * 0.82 * 0.5;
    const n = info.vals.length;
    let closest = -1, minDist = Infinity;
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI / 2) + (2 * Math.PI * i / n);
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy - labelR * Math.sin(angle);
      const dist = Math.sqrt((mx - lx) ** 2 + (my - ly) ** 2);
      if (dist < minDist) { minDist = dist; closest = i; }
    }
    if (minDist < 55 && closest >= 0) {
      // Position tooltip near the label
      const angle = (Math.PI / 2) + (2 * Math.PI * closest / n);
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy - labelR * Math.sin(angle);
      setRadarTooltip({ index: closest, x: lx, y: ly });
    } else {
      setRadarTooltip(null);
    }
  }, []);

  const handleRadarMouseLeave = useCallback(() => setRadarTooltip(null), []);

  // ═══════════════════════════════════════════════════════════════
  // OVERVIEW CHARTS — System-wide bird's eye view
  // ═══════════════════════════════════════════════════════════════

  // 1. System Health Radar (7-axis, interactive with detailed hover tooltips)
  const getRadarOption = () => {
    const t = reportStats?.total_reports || 1;
    const resolvedPct = Math.min(100, ((reportStats?.resolved_reports || 0) / t) * 100);
    const speedPct = reportStats?.avg_response_time_hours ? Math.max(0, 100 - reportStats.avg_response_time_hours * 4) : 85;
    const userPct = Math.min(100, totalUsers * 4);
    const dronePct = Math.min(100, (reportStats?.active_drones || 0) * 25);
    const clearPct = Math.max(0, 100 - ((reportStats?.pending_reports || 0) / t) * 100);
    const nlpPct = Math.min(100, (nlpStats?.total_incidents || recentDisasters.length) * 2);
    const permitPct = permits.length > 0 ? Math.max(20, 100 - permits.length * 15) : 95;
    const vals = [resolvedPct, speedPct, userPct, dronePct, clearPct, nlpPct, permitPct].map(v => +v.toFixed(0));

    const metricInfo = [
      { label: 'Resolution Rate', desc: 'Percentage of disaster reports that have been resolved', detail: `${reportStats?.resolved_reports||0} of ${reportStats?.total_reports||0} reports resolved`, status: vals[0] >= 70 ? 'Good' : vals[0] >= 40 ? 'Needs Attention' : 'Critical' },
      { label: 'Response Speed', desc: 'How quickly reports are being responded to by officers', detail: `Avg response: ${reportStats?.avg_response_time_hours?.toFixed(1)||'N/A'} hours`, status: vals[1] >= 70 ? 'Fast' : vals[1] >= 40 ? 'Moderate' : 'Slow' },
      { label: 'User Adoption', desc: 'Platform user registration and growth rate', detail: `${totalUsers} total users (${citizens.length} citizens, ${officers.length} officers)`, status: vals[2] >= 70 ? 'Strong' : vals[2] >= 40 ? 'Growing' : 'Low' },
      { label: 'Drone Readiness', desc: 'Active surveillance drones currently deployed', detail: `${reportStats?.active_drones||0} drones currently in flight`, status: vals[3] >= 70 ? 'Operational' : vals[3] >= 40 ? 'Limited' : 'Insufficient' },
      { label: 'Report Clearance', desc: 'Rate at which incoming reports are processed', detail: `${reportStats?.pending_reports||0} reports still pending out of ${reportStats?.total_reports||0}`, status: vals[4] >= 70 ? 'Efficient' : vals[4] >= 40 ? 'Backlogged' : 'Overloaded' },
      { label: 'NLP Coverage', desc: 'Reddit disaster monitoring pipeline detection rate', detail: `${nlpStats?.total_incidents||recentDisasters.length} disasters detected via NLP`, status: vals[5] >= 70 ? 'Strong' : vals[5] >= 40 ? 'Moderate' : 'Low' },
      { label: 'Permit Efficiency', desc: 'Speed of drone permit review and processing', detail: `${permits.length} permits awaiting review`, status: vals[6] >= 70 ? 'Efficient' : vals[6] >= 40 ? 'Delayed' : 'Backlogged' },
    ];

    const indicators = metricInfo.map(m => ({ name: m.label.replace(' ', '\n'), max: 100 }));
    const statusColor = (s) => ['Good','Fast','Strong','Operational','Efficient'].includes(s) ? '#10b981' : ['Needs Attention','Moderate','Growing','Limited','Backlogged','Delayed'].includes(s) ? '#f59e0b' : '#ef4444';

    // Build per-point tooltip: store metricInfo & vals so onEvents can use them
    radarMetricInfoRef.current = { metricInfo, vals, statusColor, indicators };

    return {
      backgroundColor: 'transparent',
      tooltip: { show: false },
      radar: {
        indicator: indicators, shape: 'polygon', radius: '65%', center: ['50%', '50%'],
        axisName: {
          color: '#374151', fontSize: 10, fontWeight: '700', lineHeight: 14,
          rich: {
            a: { color: '#374151', fontSize: 11, fontWeight: 'bold', lineHeight: 18 },
            v: { color: '#0ea5e9', fontSize: 12, fontWeight: 'bold', padding: [2, 0, 0, 0] },
          },
          formatter: (name) => {
            const i = indicators.findIndex(ind => ind.name === name);
            if (i === -1) return name;
            return `{a|${metricInfo[i].label}}\n{v|${vals[i]}%}`;
          },
        },
        splitArea: { areaStyle: { color: ['rgba(14,165,233,0.01)', 'rgba(14,165,233,0.04)', 'rgba(14,165,233,0.07)', 'rgba(14,165,233,0.10)', 'rgba(14,165,233,0.14)'] } },
        splitLine: { lineStyle: { color: 'rgba(14,165,233,0.12)', width: 1 } },
        axisLine: { lineStyle: { color: 'rgba(14,165,233,0.15)' } },
      },
      series: [{ type: 'radar', emphasis: { lineStyle: { width: 4 }, areaStyle: { opacity: 0.65 } }, data: [
        {
          name: 'System Health', value: vals,
          areaStyle: { color: rg(0.5, 0.5, 1, [{ offset: 0, color: 'rgba(14,165,233,0.45)' }, { offset: 1, color: 'rgba(14,165,233,0.03)' }]) },
          lineStyle: { color: '#0ea5e9', width: 3, shadowBlur: 12, shadowColor: 'rgba(14,165,233,0.5)' },
          symbol: 'circle', symbolSize: 12, itemStyle: { color: '#0ea5e9', borderColor: '#fff', borderWidth: 3, shadowBlur: 6, shadowColor: 'rgba(14,165,233,0.4)' },
        },
      ] }],
      animationDuration: 1500, animationEasing: 'elasticOut',
    };
  };

  // 2. 24h Incident Timeline (area)
  const getTimelineOption = () => {
    const hours = timeline.map(t => { const d = new Date(t.timestamp); return `${String(d.getHours()).padStart(2, '0')}:00`; });
    const counts = timeline.map(t => t.count);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#1f2937' }, axisPointer: { type: 'line', lineStyle: { color: '#0ea5e9', width: 2 } } },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '8%', containLabel: true },
      xAxis: { type: 'category', data: hours, boundaryGap: false, axisLabel: { fontSize: 10, color: '#6b7280', interval: 2 }, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#9ca3af' }, splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } }, axisLine: { show: false } },
      series: [{
        type: 'line', data: counts, smooth: 0.4, showSymbol: false,
        lineStyle: { width: 3, color: lg(0, 0, 1, 0, [{ offset: 0, color: '#38bdf8' }, { offset: 1, color: '#0ea5e9' }]) },
        areaStyle: { color: lg(0, 0, 0, 1, [{ offset: 0, color: 'rgba(14,165,233,0.35)' }, { offset: 1, color: 'rgba(14,165,233,0.02)' }]) },
        markPoint: { data: [{ type: 'max', name: 'Peak' }], symbol: 'pin', symbolSize: 40, itemStyle: { color: '#ef4444' }, label: { color: '#fff', fontWeight: 'bold', fontSize: 10 } },
      }],
    };
  };

  // 3. Urgency Distribution — Pie
  const getUrgencyPieOption = () => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#1f2937' } },
    series: [{
      type: 'pie', radius: ['42%', '72%'], center: ['50%', '50%'],
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 4, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.06)' },
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 11, fontWeight: 'bold', color: '#374151' },
      labelLine: { length: 14, length2: 8, lineStyle: { width: 2 } },
      emphasis: { scale: true, scaleSize: 10 },
      data: urgencyDist.map(u => ({
        value: u.count, name: u.urgency_level?.charAt(0).toUpperCase() + u.urgency_level?.slice(1),
        itemStyle: { color: URGENCY_COLORS[u.urgency_level] || '#6b7280' },
      })),
    }],
  });

  // 4. NLP Sentiment Gauge
  const getSentimentGaugeOption = () => {
    const sentiment = nlpStats?.avg_sentiment || 0;
    const pct = ((sentiment + 1) / 2 * 100).toFixed(0); // normalize -1..1 to 0..100
    const color = pct > 60 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444';
    return {
      backgroundColor: 'transparent',
      series: [{
        type: 'gauge', startAngle: 200, endAngle: -20, min: 0, max: 100, radius: '88%',
        pointer: { show: true, length: '48%', width: 5, itemStyle: { color } },
        progress: { show: true, width: 22, roundCap: true, itemStyle: { color: lg(0, 0, 1, 0, [{ offset: 0, color: color + '99' }, { offset: 1, color }]) } },
        axisLine: { lineStyle: { width: 22, color: [[1, '#f1f5f9']] } },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        title: { show: true, offsetCenter: [0, '72%'], fontSize: 12, fontWeight: '600', color: '#6b7280' },
        detail: { valueAnimation: true, formatter: `${(sentiment * 100).toFixed(0)}%`, fontSize: 28, fontWeight: 'bold', color, offsetCenter: [0, '35%'] },
        data: [{ value: pct, name: 'Public Sentiment' }],
      }],
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // USERS & PERMITS TAB
  // ═══════════════════════════════════════════════════════════════

  // 5. Cumulative User Growth (stacked area)
  const getUserGrowthOption = () => {
    const filtered = users.filter(u => {
      if (!u.created_at) return false;
      const d = new Date(u.created_at);
      if (growthFilterYear !== 'all' && d.getFullYear() !== +growthFilterYear) return false;
      if (growthFilterMonth !== 'all' && d.getMonth() !== +growthFilterMonth) return false;
      return true;
    });
    const mMap = {};
    filtered.forEach(u => { const d = new Date(u.created_at); const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; if (!mMap[k]) mMap[k] = { citizen:0, officer:0, admin:0 }; mMap[k][u.role]++; });
    const months = Object.keys(mMap).sort();
    const labels = months.map(m => { const [y,mo] = m.split('-'); return new Date(y,mo-1).toLocaleString('en',{month:'short',year:'2-digit'}); });
    let cc=0,co=0,ca=0;
    const cum = months.map(m => { cc+=mMap[m].citizen; co+=mMap[m].officer; ca+=mMap[m].admin; return {c:cc,o:co,a:ca}; });
    const mkSeries = (name, data, c1, c2) => ({ name, type:'line', stack:'T', smooth:0.5, showSymbol:false, data, lineStyle:{width:0}, areaStyle:{ opacity:0.85, color: lg(0,0,0,1,[{offset:0,color:c1},{offset:1,color:c2}]) }, emphasis:{focus:'series'} });
    return {
      backgroundColor:'transparent',
      tooltip:{ trigger:'axis', backgroundColor:'rgba(255,255,255,0.98)', borderColor:'#e5e7eb', borderWidth:1, textStyle:{color:'#1f2937'}, axisPointer:{type:'cross',label:{backgroundColor:'#0ea5e9'}} },
      legend:{ data:['Citizens','Officers','Admins'], bottom:0, textStyle:{fontSize:11,fontWeight:'600'}, itemWidth:18, itemHeight:10, icon:'roundRect' },
      grid:{ left:'3%', right:'4%', bottom:'14%', top:'8%', containLabel:true },
      xAxis:{ type:'category', data:labels, boundaryGap:false, axisLabel:{fontSize:11,color:'#6b7280'}, axisLine:{lineStyle:{color:'#e5e7eb'}}, axisTick:{show:false} },
      yAxis:{ type:'value', axisLabel:{fontSize:11,color:'#6b7280'}, splitLine:{lineStyle:{color:'#f3f4f6',type:'dashed'}}, axisLine:{show:false} },
      series:[ mkSeries('Citizens', cum.map(d=>d.c), '#38bdf8', '#38bdf820'), mkSeries('Officers', cum.map(d=>d.o), '#34d399', '#34d39920'), mkSeries('Admins', cum.map(d=>d.a), '#f87171', '#f8717120') ],
    };
  };

  // 6. Platform Activity Heatmap (Registrations + Report Submissions with month/year in tooltip)
  const getHeatmapOption = () => {
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const hours = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);

    const heatmapDateFilter = (d) => {
      if (heatmapFilterYear !== 'all' && d.getFullYear() !== +heatmapFilterYear) return false;
      if (heatmapFilterMonth !== 'all' && d.getMonth() !== +heatmapFilterMonth) return false;
      return true;
    };

    // Collect individual timestamps per day+hour slot for month/year detail in tooltip
    const regDetails = {}; // key: "hour-day" -> array of {month, year}
    const rptDetails = {};
    const regAgg = {};
    const rptAgg = {};

    users.forEach(u => {
      if(!u.created_at) return;
      const d = new Date(u.created_at);
      if (!heatmapDateFilter(d)) return;
      const key = `${d.getHours()}-${d.getDay()}`;
      regAgg[key] = (regAgg[key] || 0) + 1;
      if(!regDetails[key]) regDetails[key] = {};
      const mk = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      regDetails[key][mk] = (regDetails[key][mk] || 0) + 1;
    });

    reports.forEach(r => {
      const ts = r.created_at || r.timestamp;
      if(!ts) return;
      const d = new Date(ts);
      if (!heatmapDateFilter(d)) return;
      const key = `${d.getHours()}-${d.getDay()}`;
      rptAgg[key] = (rptAgg[key] || 0) + 1;
      if(!rptDetails[key]) rptDetails[key] = {};
      const mk = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      rptDetails[key][mk] = (rptDetails[key][mk] || 0) + 1;
    });

    recentDisasters.forEach(rd => {
      if(!rd.timestamp) return;
      const d = new Date(rd.timestamp);
      if (!heatmapDateFilter(d)) return;
      const key = `${d.getHours()}-${d.getDay()}`;
      rptAgg[key] = (rptAgg[key] || 0) + 1;
      if(!rptDetails[key]) rptDetails[key] = {};
      const mk = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      rptDetails[key][mk] = (rptDetails[key][mk] || 0) + 1;
    });

    const regData = Object.entries(regAgg).map(([k,v])=>{const[h,d]=k.split('-').map(Number);return[h,d,v];});
    const rptData = Object.entries(rptAgg).map(([k,v])=>{const[h,d]=k.split('-').map(Number);return[h,d,v];});
    const allVals = [...regData.map(d=>d[2]), ...rptData.map(d=>d[2])];
    const max = Math.max(...allVals, 1);

    return {
      backgroundColor:'transparent',
      tooltip:{ backgroundColor:'rgba(255,255,255,0.98)', borderColor:'#e5e7eb', borderWidth:1, textStyle:{color:'#1f2937',fontSize:12},
        formatter:(p)=>{
          const dayName = dayNames[p.value[1]];
          const hour = hours[p.value[0]];
          const key = `${p.value[0]}-${p.value[1]}`;
          const isReg = p.seriesIndex === 0;
          const label = isReg ? 'Registrations' : 'Reports & NLP';
          const details = isReg ? regDetails[key] : rptDetails[key];
          let monthBreakdown = '';
          if (details) {
            const entries = Object.entries(details).sort((a,b) => b[1]-a[1]);
            monthBreakdown = '<br/><div style="margin-top:4px;border-top:1px solid #e5e7eb;padding-top:4px;font-size:11px">' +
              entries.map(([m,c]) => `<span style="color:#6b7280">${m}:</span> <b>${c}</b>`).join('<br/>') + '</div>';
          }
          return `<div style="padding:2px"><b>${dayName}</b> at <b>${hour}</b><br/><span style="color:${isReg?'#0ea5e9':'#f59e0b'}">${label}</span>: <b>${p.value[2]}</b>${monthBreakdown}</div>`;
        }
      },
      legend:{ data:['Registrations','Reports & NLP'], bottom:0, textStyle:{fontSize:10,fontWeight:'600'}, itemWidth:16, itemHeight:10, icon:'roundRect' },
      grid:[{left:'10%',right:'52%',bottom:'14%',top:'5%'},{left:'55%',right:'5%',bottom:'14%',top:'5%'}],
      xAxis:[
        {type:'category',data:hours,gridIndex:0,splitArea:{show:true},axisLabel:{fontSize:8,color:'#6b7280',interval:3},name:'Registrations (Day x Hour)',nameLocation:'center',nameGap:25,nameTextStyle:{fontSize:10,fontWeight:'bold',color:'#0ea5e9'}},
        {type:'category',data:hours,gridIndex:1,splitArea:{show:true},axisLabel:{fontSize:8,color:'#6b7280',interval:3},name:'Reports & NLP (Day x Hour)',nameLocation:'center',nameGap:25,nameTextStyle:{fontSize:10,fontWeight:'bold',color:'#f59e0b'}},
      ],
      yAxis:[
        {type:'category',data:dayNames,gridIndex:0,splitArea:{show:true},axisLabel:{fontSize:10,color:'#374151',fontWeight:'600'}},
        {type:'category',data:dayNames,gridIndex:1,splitArea:{show:true},axisLabel:{show:false}},
      ],
      visualMap:[
        {min:0,max,calculable:false,show:false,seriesIndex:0,inRange:{color:['#f0f9ff','#bae6fd','#38bdf8','#0284c7','#0c4a6e']}},
        {min:0,max,calculable:false,show:false,seriesIndex:1,inRange:{color:['#fffbeb','#fde68a','#fbbf24','#f59e0b','#d97706']}},
      ],
      series:[
        {name:'Registrations',type:'heatmap',data:regData,xAxisIndex:0,yAxisIndex:0,emphasis:{itemStyle:{shadowBlur:12,shadowColor:'rgba(0,0,0,0.2)'}},itemStyle:{borderColor:'#fff',borderWidth:2,borderRadius:4}},
        {name:'Reports & NLP',type:'heatmap',data:rptData,xAxisIndex:1,yAxisIndex:1,emphasis:{itemStyle:{shadowBlur:12,shadowColor:'rgba(0,0,0,0.2)'}},itemStyle:{borderColor:'#fff',borderWidth:2,borderRadius:4}},
      ],
    };
  };

  // 7. Permit Insights (drone type breakdown + wait time gauge)
  const getPermitBarOption = () => {
    const pending = permits.length;
    if (pending === 0) {
      return {
        backgroundColor:'transparent',
        graphic: [
          { type:'text', left:'center', top:'38%', style:{ text:'No Pending Permits', fontSize:18, fontWeight:'bold', fill:'#10b981' } },
          { type:'text', left:'center', top:'52%', style:{ text:'All permits have been reviewed', fontSize:12, fill:'#6b7280' } },
        ],
      };
    }
    // Group by drone_type
    const byType = {};
    const byManufacturer = {};
    let totalWaitDays = 0;
    let oldestWait = 0;
    permits.forEach(p => {
      const dt = p.drone_type || 'Unknown';
      const mf = p.manufacturer || 'Unknown';
      byType[dt] = (byType[dt] || 0) + 1;
      byManufacturer[mf] = (byManufacturer[mf] || 0) + 1;
      if (p.created_at) {
        const waitDays = Math.max(0, (Date.now() - new Date(p.created_at).getTime()) / 86400000);
        totalWaitDays += waitDays;
        if (waitDays > oldestWait) oldestWait = waitDays;
      }
    });
    const avgWait = pending > 0 ? (totalWaitDays / pending) : 0;
    const typeLabels = Object.keys(byType);
    const mfLabels = Object.keys(byManufacturer);
    const droneColors = ['#0ea5e9','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#6b7280'];
    return {
      backgroundColor:'transparent',
      tooltip:{ trigger:'item', backgroundColor:'rgba(255,255,255,0.98)', borderColor:'#e5e7eb', borderWidth:1, textStyle:{color:'#1f2937',fontSize:12} },
      title:[
        { text:`${pending} Pending`, subtext:`Avg wait: ${avgWait.toFixed(1)}d | Oldest: ${oldestWait.toFixed(0)}d`, left:'center', top:'2%', textStyle:{fontSize:16,fontWeight:'bold',color:'#f59e0b'}, subtextStyle:{fontSize:11,color:'#6b7280'} },
      ],
      series:[
        {
          name:'By Drone Type', type:'pie', radius:['30%','52%'], center:['30%','60%'],
          itemStyle:{borderRadius:6,borderColor:'#fff',borderWidth:3},
          label:{show:true,formatter:'{b}\n{c}',fontSize:10,fontWeight:'bold',color:'#374151'},
          labelLine:{length:8,length2:6},
          data:typeLabels.map((t,i)=>({value:byType[t],name:t,itemStyle:{color:droneColors[i%droneColors.length]}})),
        },
        {
          name:'By Manufacturer', type:'pie', radius:['30%','52%'], center:['72%','60%'],
          itemStyle:{borderRadius:6,borderColor:'#fff',borderWidth:3},
          label:{show:true,formatter:'{b}\n{c}',fontSize:10,fontWeight:'bold',color:'#374151'},
          labelLine:{length:8,length2:6},
          data:mfLabels.map((m,i)=>({value:byManufacturer[m],name:m,itemStyle:{color:droneColors[(i+3)%droneColors.length]}})),
        },
      ],
      graphic:[
        { type:'text', left:'18%', top:'35%', style:{text:'Drone Type',fontSize:10,fontWeight:'bold',fill:'#6b7280',textAlign:'center'} },
        { type:'text', left:'62%', top:'35%', style:{text:'Manufacturer',fontSize:10,fontWeight:'bold',fill:'#6b7280',textAlign:'center'} },
      ],
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // INCIDENTS TAB
  // ═══════════════════════════════════════════════════════════════

  // 8. Disaster Type Treemap
  const getTreemapOption = () => {
    const types = reportStats?.reports_by_type || {};
    const data = Object.entries(types).map(([type,count])=>({ name:type.charAt(0).toUpperCase()+type.slice(1), value:count, itemStyle:{color:TYPE_COLORS[type]||'#6b7280',borderColor:'#fff',borderWidth:4,borderRadius:6} }));
    return {
      backgroundColor:'transparent',
      tooltip:{ formatter:(p)=>`<div style="padding:6px"><strong style="color:${p.color};font-size:14px">${p.name}</strong><br/>Reports: <b>${p.value}</b></div>`, backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#e5e7eb',borderWidth:1,textStyle:{color:'#1f2937'} },
      series:[{type:'treemap',width:'95%',height:'85%',top:'5%',roam:false,nodeClick:false,breadcrumb:{show:false},label:{show:true,formatter:'{b}\n{c}',fontSize:15,fontWeight:'bold',color:'#fff',lineHeight:22},itemStyle:{borderColor:'#fff',borderWidth:4,gapWidth:4},emphasis:{itemStyle:{shadowBlur:20,shadowColor:'rgba(0,0,0,0.3)'}},data}],
    };
  };

  // 9. Severity Polar Bar
  const getSeverityPolarOption = () => {
    const sev = reportStats?.reports_by_severity || {};
    const data = ['LOW','MEDIUM','HIGH','CRITICAL'].map(k=>({ value:sev[k]||0, name:k, itemStyle:{color:lg(0,0,1,0,[{offset:0,color:SEVERITY_COLORS[k]+'cc'},{offset:1,color:SEVERITY_COLORS[k]}])} }));
    return {
      backgroundColor:'transparent',
      tooltip:{trigger:'item',backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#e5e7eb',borderWidth:1,textStyle:{color:'#1f2937'}},
      angleAxis:{type:'category',data:data.map(d=>d.name),axisLabel:{fontSize:12,fontWeight:'bold',color:'#374151'},axisLine:{lineStyle:{color:'#e5e7eb'}}},
      radiusAxis:{axisLabel:{fontSize:10,color:'#9ca3af'},splitLine:{lineStyle:{color:'#f3f4f6',type:'dashed'}},axisLine:{show:false}},
      polar:{radius:['12%','75%']},
      series:[{type:'bar',coordinateSystem:'polar',data,itemStyle:{borderRadius:6},label:{show:true,position:'middle',formatter:'{c}',fontSize:13,fontWeight:'bold',color:'#fff'}}],
    };
  };

  // 10. Location Hotspots — Horizontal Gradient Bars
  const getHotspotsBarOption = () => ({
    backgroundColor:'transparent',
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
    grid:{left:'22%',right:'8%',bottom:'5%',top:'5%',containLabel:true},
    xAxis:{type:'value',axisLabel:{fontSize:10,color:'#6b7280'},splitLine:{lineStyle:{type:'dashed',color:'#f3f4f6'}}},
    yAxis:{type:'category',data:locationHotspots.map(l=>l.location),inverse:true,axisLabel:{fontSize:11,fontWeight:'600',color:'#374151'},axisTick:{show:false}},
    series:[{type:'bar',data:locationHotspots.map((l,i)=>({value:l.count,itemStyle:{color:lg(0,0,1,0,[{offset:0,color:['#ef4444','#f97316','#fbbf24','#10b981','#3b82f6','#0ea5e9','#8b5cf6'][i%7]},{offset:1,color:['#dc2626','#ea580c','#f59e0b','#059669','#2563eb','#0284c7','#7c3aed'][i%7]}]),borderRadius:[0,8,8,0]}})),barWidth:'65%',label:{show:true,position:'right',formatter:'{c}',fontSize:11,fontWeight:'bold',color:'#374151'}}],
  });

  // 11. NLP Disaster Type Distribution (Nightingale Rose from Reddit)
  const getNlpRoseOption = () => ({
    backgroundColor:'transparent',
    tooltip:{ trigger:'item', backgroundColor:'rgba(255,255,255,0.98)', borderColor:'#e5e7eb', borderWidth:1, textStyle:{color:'#1f2937',fontSize:13}, formatter:(p)=>`<strong style="color:${p.color}">${p.name}</strong><br/>Incidents: <b>${p.value}</b> (${p.percent.toFixed(1)}%)` },
    series:[{
      type:'pie', radius:['20%','72%'], center:['50%','50%'], roseType:'area',
      itemStyle:{borderRadius:10,borderColor:'#fff',borderWidth:4,shadowBlur:12,shadowColor:'rgba(0,0,0,0.06)'},
      label:{show:true,formatter:'{b}\n{d}%',fontSize:11,fontWeight:'bold',color:'#374151'},
      labelLine:{length:14,length2:8,lineStyle:{width:2}},
      emphasis:{scale:true,scaleSize:10},
      data: disasterTypes.map(t=>({
        value:t.count,
        name:t.disaster_type?.charAt(0).toUpperCase()+t.disaster_type?.slice(1),
        itemStyle:{color: lg(0,0,0,1,[{offset:0,color:TYPE_COLORS[t.disaster_type]||'#6b7280'},{offset:1,color:(TYPE_COLORS[t.disaster_type]||'#6b7280')+'bb'}])}
      })),
    }],
  });

  // ═══════════════════════════════════════════════════════════════
  // ADVANCED TAB — NLP, Video, Drone data
  // ═══════════════════════════════════════════════════════════════

  // 12. NLP Stream Chart (disaster timeline by type over 24h)
  const getStreamOption = () => {
    const STREAM_FALLBACK_COLORS = ['#8b5cf6','#ec4899','#14b8a6','#f43f5e','#a855f7','#06b6d4','#ea580c','#2563eb','#84cc16','#e11d48'];
    const series = {};
    recentDisasters.forEach(d => { const h=new Date(d.timestamp).getHours(); const t=d.disaster_type; if(!series[t]) series[t]=new Array(24).fill(0); series[t][h]++; });
    const hours = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);
    let fallbackIdx = 0;
    const getColor = (type) => { if (TYPE_COLORS[type]) return TYPE_COLORS[type]; return STREAM_FALLBACK_COLORS[(fallbackIdx++) % STREAM_FALLBACK_COLORS.length]; };
    const typeColors = {};
    Object.keys(series).forEach(type => { typeColors[type] = getColor(type); });
    return {
      backgroundColor:'transparent',
      tooltip:{trigger:'axis',axisPointer:{type:'cross',label:{backgroundColor:'#0ea5e9'}},backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#e5e7eb',borderWidth:1,textStyle:{color:'#1f2937'}},
      legend:{data:Object.keys(series).map(t=>t.charAt(0).toUpperCase()+t.slice(1)),bottom:0,textStyle:{fontSize:10,fontWeight:'600'},itemWidth:18,itemHeight:10,icon:'roundRect'},
      grid:{left:'3%',right:'4%',bottom:'15%',top:'8%',containLabel:true},
      xAxis:{type:'category',boundaryGap:false,data:hours,axisLabel:{fontSize:10,color:'#6b7280',interval:2},axisLine:{lineStyle:{color:'#e5e7eb'}},axisTick:{show:false}},
      yAxis:{type:'value',axisLabel:{fontSize:10,color:'#6b7280'},splitLine:{lineStyle:{color:'#f3f4f6',type:'dashed'}},axisLine:{show:false}},
      series: Object.keys(series).map(type=>{
        const c = typeColors[type];
        return {
          name:type.charAt(0).toUpperCase()+type.slice(1), type:'line', stack:'T', smooth:0.4, emphasis:{focus:'series'},
          areaStyle:{opacity:0.75,color:lg(0,0,0,1,[{offset:0,color:c+'cc'},{offset:1,color:c+'22'}])},
          lineStyle:{width:0}, showSymbol:false, data:series[type], color:c,
        };
      }),
    };
  };

  // 13. Activity Scatter Bubble (hour × type × count)
  const getBubbleOption = () => {
    const hourly = {};
    recentDisasters.forEach(d => { const h=new Date(d.timestamp).getHours(); const t=d.disaster_type; if(!hourly[h]) hourly[h]={}; hourly[h][t]=(hourly[h][t]||0)+1; });
    const bubbleData = [];
    Object.keys(hourly).forEach(h => Object.keys(hourly[h]).forEach(t => bubbleData.push([+h, disasterTypes.findIndex(d=>d.disaster_type===t), hourly[h][t], t])));
    return {
      backgroundColor:'transparent',
      tooltip:{ formatter:(p)=>`<b>${p.data[3]?.charAt(0).toUpperCase()+p.data[3]?.slice(1)}</b><br/>Hour: ${p.data[0]}:00<br/>Count: ${p.data[2]}`, backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#e5e7eb',borderWidth:1,textStyle:{color:'#1f2937'} },
      grid:{left:'14%',right:'5%',bottom:'8%',top:'5%',containLabel:true},
      xAxis:{ type:'value', name:'Hour', min:0, max:23, interval:3, axisLabel:{fontSize:10,color:'#6b7280',formatter:v=>`${v}:00`}, splitLine:{lineStyle:{color:'#f3f4f6',type:'dashed'}}, axisLine:{lineStyle:{color:'#e5e7eb'}} },
      yAxis:{ type:'category', data:disasterTypes.map(t=>t.disaster_type?.charAt(0).toUpperCase()+t.disaster_type?.slice(1)), axisLabel:{fontSize:11,fontWeight:'600',color:'#374151'}, axisTick:{show:false} },
      series:[{
        type:'scatter', data:bubbleData, symbolSize:(d)=>Math.sqrt(d[2])*20,
        itemStyle:{color:(p)=>TYPE_COLORS[p.data[3]]||'#6b7280',opacity:0.8,shadowBlur:12,shadowColor:'rgba(0,0,0,0.15)',borderColor:'#fff',borderWidth:2},
        emphasis:{scale:1.4,itemStyle:{shadowBlur:20,borderWidth:3}},
      }],
    };
  };

  // 14. Video Analysis Risk Level Distribution
  const getVideoRiskOption = () => {
    const riskMap = { low:0, medium:0, high:0, critical:0 };
    (Array.isArray(videos) ? videos : []).forEach(v => { if(v.risk_level) riskMap[v.risk_level]++; });
    const data = Object.entries(riskMap).filter(([_,v])=>v>0).map(([k,v])=>({value:v,name:k.charAt(0).toUpperCase()+k.slice(1),itemStyle:{color:URGENCY_COLORS[k]||'#6b7280'}}));
    const vLen = Array.isArray(videos) ? videos.length : 0;
    if (data.length === 0) return { backgroundColor:'transparent', graphic:{type:'text',left:'center',top:'center',style:{text:`${vLen} Videos Analyzed`,fontSize:18,fontWeight:'bold',fill:'#0ea5e9'}} };
    return {
      backgroundColor:'transparent',
      tooltip:{trigger:'item',backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#e5e7eb',borderWidth:1,textStyle:{color:'#1f2937'}},
      series:[{type:'pie',radius:['48%','72%'],center:['50%','50%'],
        itemStyle:{borderRadius:8,borderColor:'#fff',borderWidth:4},
        label:{show:true,formatter:'{b}\n{c}',fontSize:12,fontWeight:'bold',color:'#374151'},
        data,
      }],
    };
  };

  // 15. Recent Disasters Live Feed Scatter (severity × sentiment)
  const getSentimentScatterOption = () => {
    const data = recentDisasters.slice(0,50).map(d=>([
      d.severity_score||0, d.sentiment||0, d.disaster_type,
      d.location||'Unknown', d.urgency_level||'low'
    ]));
    return {
      backgroundColor:'transparent',
      tooltip:{
        formatter:(p)=>`<b>${p.data[2]?.charAt(0).toUpperCase()+p.data[2]?.slice(1)}</b><br/>Location: ${p.data[3]}<br/>Severity: ${p.data[0]}/10<br/>Sentiment: ${p.data[1]?.toFixed(2)}<br/>Urgency: ${p.data[4]}`,
        backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#e5e7eb',borderWidth:1,textStyle:{color:'#1f2937',fontSize:12}
      },
      grid:{left:'8%',right:'5%',bottom:'10%',top:'10%',containLabel:true},
      xAxis:{type:'value',name:'Severity Score',nameTextStyle:{fontSize:12,fontWeight:'bold',color:'#374151'},min:0,max:10,axisLabel:{fontSize:10,color:'#6b7280'},splitLine:{lineStyle:{color:'#f3f4f6',type:'dashed'}}},
      yAxis:{type:'value',name:'Sentiment',nameTextStyle:{fontSize:12,fontWeight:'bold',color:'#374151'},min:-1,max:1,axisLabel:{fontSize:10,color:'#6b7280'},splitLine:{lineStyle:{color:'#f3f4f6',type:'dashed'}}},
      series:[{
        type:'scatter',data,symbolSize:(d)=>Math.max(10,d[0]*4),
        itemStyle:{color:(p)=>TYPE_COLORS[p.data[2]]||'#6b7280',opacity:0.8,borderColor:'#fff',borderWidth:2,shadowBlur:8,shadowColor:'rgba(0,0,0,0.1)'},
        emphasis:{scale:1.5},
      }],
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  if (loading) return (
    <div className="min-h-screen bg-white"><Navbar />
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-4 border-sky-200 animate-ping opacity-30"/>
            <div className="relative w-20 h-20 rounded-full border-4 border-sky-500 border-t-transparent animate-spin"/>
          </div>
          <p className="text-gray-600 font-semibold text-lg">Loading Analytics Engine...</p>
          <p className="text-gray-400 text-sm mt-1">Aggregating data from 6 sources</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-500 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,white 1px,transparent 0)',backgroundSize:'24px 24px'}}/>
          <div className="absolute top-0 left-[20%] w-96 h-96 bg-cyan-400/20 rounded-full blur-[120px]"/>
          <div className="absolute bottom-0 right-[10%] w-80 h-80 bg-sky-300/15 rounded-full blur-[100px]"/>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/5 rounded-full"/>
        </div>

        <div className="relative max-w-[1600px] mx-auto px-6 py-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}}>
              <div className="inline-flex items-center gap-2.5 bg-white/15 backdrop-blur-md border border-white/25 rounded-full px-4 py-1.5 mb-3">
                <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-60"/><span className="relative rounded-full h-2.5 w-2.5 bg-emerald-400"/></span>
                <span className="text-[11px] font-bold text-white/90 tracking-wider uppercase">Live Analytics — {recentDisasters.length} NLP Insights</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-1">System Analytics Console</h1>
              <p className="text-sky-100/70 text-sm max-w-md">6 data sources — Users, Reports, NLP Insights, Permits, Video Analysis, Drones</p>
            </motion.div>

            <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:0.2}} className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 text-white flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2"><ClockIcon className="w-3.5 h-3.5 text-sky-200"/><span className="text-sky-100">{lastUpdate?.toLocaleTimeString()}</span></div>
                <div className="h-4 w-px bg-white/20"/>
                <div className="flex items-center gap-2"><span className="text-sky-200">Next:</span><span className="font-mono font-bold text-white">{countdown}s</span></div>
              </div>
              <button onClick={()=>fetchData(true)} disabled={refreshing} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur border border-white/25 rounded-xl px-5 py-3 text-white text-sm font-bold transition-colors">
                <RefreshIcon className={`w-4 h-4 ${refreshing?'animate-spin':''}`}/> Refresh
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6">

        {/* ── Gradient Stat Cards ──────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 -mt-7 relative z-10 mb-6">
          {[
            {l:'Users',v:totalUsers,s:`${citizens.length}C / ${officers.length}O`,g:'from-sky-500 to-cyan-500',ic:<UsersIcon className="w-5 h-5"/>},
            {l:'Reports',v:reportStats?.total_reports||0,s:`${reportStats?.pending_reports||0} pending`,g:'from-blue-500 to-sky-500',ic:<FileTextIcon className="w-5 h-5"/>},
            {l:'NLP Insights',v:nlpStats?.total_incidents||recentDisasters.length,s:`${nlpStats?.urgent_incidents||0} urgent`,g:'from-cyan-500 to-teal-500',ic:<GlobeIcon className="w-5 h-5"/>},
            {l:'Critical',v:reportStats?.critical_reports||0,s:'Immediate action',g:'from-red-500 to-rose-500',ic:<AlertIcon className="w-5 h-5"/>},
            {l:'Active Drones',v:reportStats?.active_drones||0,s:'In flight now',g:'from-emerald-500 to-teal-500',ic:<DroneIcon className="w-5 h-5"/>},
            {l:'Videos',v:Array.isArray(videos)?videos.length:0,s:`${Array.isArray(videos)?videos.filter(v=>v.risk_level==='high'||v.risk_level==='critical').length:0} high risk`,g:'from-sky-600 to-blue-600',ic:<VideoIcon className="w-5 h-5"/>},
          ].map((c,i)=>(
            <motion.div key={c.l} initial={{opacity:0,y:25}} animate={{opacity:1,y:0}} transition={{delay:0.05*i}} className={`bg-gradient-to-br ${c.g} text-white rounded-2xl p-4 shadow-xl relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8"/>
              <div className="relative">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center mb-2">{c.ic}</div>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-wide">{c.l}</p>
                <h3 className="text-2xl font-extrabold">{c.v}</h3>
                <p className="text-white/50 text-[10px] mt-0.5">{c.s}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── View Toggle ──────────────────────────────────────── */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {[
            {id:'overview',l:'Overview',ic:<TargetIcon className="w-4 h-4"/>},
            {id:'users',l:'Users & Permits',ic:<UsersIcon className="w-4 h-4"/>},
            {id:'incidents',l:'Incidents & Reports',ic:<AlertIcon className="w-4 h-4"/>},
            {id:'advanced',l:'NLP & Video Intelligence',ic:<GlobeIcon className="w-4 h-4"/>},
          ].map(t=>(
            <button key={t.id} onClick={()=>setActiveView(t.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeView===t.id?'bg-sky-500 text-white shadow-lg shadow-sky-200 scale-[1.02]':'bg-white text-gray-600 hover:bg-gray-50 shadow border border-gray-200'}`}>
              {t.ic} {t.l}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        <AnimatePresence mode="wait">
        {activeView === 'overview' && (
          <motion.div key="ov" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="grid grid-cols-12 gap-5 pb-16">
            <div className="col-span-12 lg:col-span-5">
              <CC t="System Health Radar" s="Hover on each point to see detailed metric info" ic={<TargetIcon/>} b="Live">
                <div ref={radarContainerRef} className="relative" onMouseMove={handleRadarMouseMove} onMouseLeave={handleRadarMouseLeave}>
                  <ReactECharts option={getRadarOption()} style={{height:'420px'}} opts={{renderer:'svg'}}/>
                  {radarTooltip && radarMetricInfoRef.current && (() => {
                    const { metricInfo, vals, statusColor } = radarMetricInfoRef.current;
                    const i = radarTooltip.index;
                    const m = metricInfo[i];
                    const v = vals[i];
                    const sc = statusColor(m.status);
                    const containerW = radarContainerRef.current?.offsetWidth || 400;
                    // Anchor tooltip near the label, shift left if on right half
                    const onRight = radarTooltip.x > containerW * 0.55;
                    const left = onRight ? radarTooltip.x - 270 : radarTooltip.x + 12;
                    const top = Math.max(8, Math.min(radarTooltip.y - 30, 340));
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15 }}
                        className="absolute pointer-events-none z-50"
                        style={{ left: `${Math.max(4, left)}px`, top: `${top}px`, width: '250px' }}>
                        <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-4" style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sc }}/>
                            <span className="text-[13px] font-bold text-gray-900">{m.label}</span>
                            <span className="ml-auto text-xl font-extrabold text-sky-500">{v}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 mb-2.5">
                            <div className="h-2 rounded-full transition-all" style={{ width: `${v}%`, backgroundColor: sc }}/>
                          </div>
                          <p className="text-[11px] text-gray-500 mb-1.5 leading-relaxed">{m.desc}</p>
                          <p className="text-[11px] text-gray-800 font-semibold mb-2">{m.detail}</p>
                          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sc }}/>
                            <span className="text-[10px] font-bold" style={{ color: sc }}>Status: {m.status}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-7">
              <CC t="24-Hour Incident Timeline" s="Hourly NLP-detected disaster activity with peak markers" ic={<ActivityIcon/>} b={`${timeline.length} hours`}>
                <ReactECharts option={getTimelineOption()} style={{height:'380px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-4">
              <CC t="Urgency Distribution" s="NLP-classified urgency levels" ic={<PieChartIcon/>} b={`${urgencyDist.reduce((a,b)=>a+b.count,0)} total`}>
                <ReactECharts option={getUrgencyPieOption()} style={{height:'330px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-4">
              <CC t="Public Sentiment" s="Average NLP sentiment analysis score" ic={<GlobeIcon/>} b="NLP">
                <ReactECharts option={getSentimentGaugeOption()} style={{height:'330px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-4">
              <SystemStatusCard systemStatus={systemStatus} nlpStats={nlpStats} reportStats={reportStats} totalUsers={totalUsers}/>
            </div>
          </motion.div>
        )}

        {/* ═══ USERS & PERMITS ═══ */}
        {activeView === 'users' && (
          <motion.div key="us" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="grid grid-cols-12 gap-5 pb-16">
            <div className="col-span-12">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 rounded-xl flex items-center justify-center text-sky-500"><TrendIcon/></div>
                    <div><h3 className="text-sm font-bold text-gray-900">Platform Growth</h3><p className="text-[11px] text-gray-400">Cumulative user registrations over time (stacked area)</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={growthFilterYear} onChange={e => setGrowthFilterYear(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 cursor-pointer">
                      <option value="all">All Years</option>
                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={growthFilterMonth} onChange={e => setGrowthFilterMonth(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 cursor-pointer">
                      <option value="all">All Months</option>
                      {monthOptions.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <span className="px-3 py-1 bg-sky-50 border border-sky-100 text-sky-600 text-[10px] font-bold rounded-full uppercase tracking-wide">Growth</span>
                  </div>
                </div>
                <div className="p-3">
                  <ReactECharts option={getUserGrowthOption()} style={{height:'340px'}} opts={{renderer:'svg'}}/>
                </div>
              </div>
            </div>
            <div className="col-span-12">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 rounded-xl flex items-center justify-center text-sky-500"><ActivityIcon/></div>
                    <div><h3 className="text-sm font-bold text-gray-900">Platform Activity Heatmap</h3><p className="text-[11px] text-gray-400">Registrations vs Report submissions & NLP detections by day and hour</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={heatmapFilterYear} onChange={e => setHeatmapFilterYear(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 cursor-pointer">
                      <option value="all">All Years</option>
                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={heatmapFilterMonth} onChange={e => setHeatmapFilterMonth(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 cursor-pointer">
                      <option value="all">All Months</option>
                      {monthOptions.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <span className="px-3 py-1 bg-sky-50 border border-sky-100 text-sky-600 text-[10px] font-bold rounded-full uppercase tracking-wide">Dual Heatmap</span>
                  </div>
                </div>
                <div className="p-3">
                  <ReactECharts option={getHeatmapOption()} style={{height:'340px'}} opts={{renderer:'svg'}}/>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-500"><DroneIcon/></div>
                    <div><h3 className="text-sm font-bold text-gray-900">Permit Queue Insights</h3><p className="text-[11px] text-gray-400">Pending drone permit applications details</p></div>
                  </div>
                  <span className={`px-3 py-1 ${permits.length > 0 ? 'bg-amber-50 border border-amber-100 text-amber-600' : 'bg-emerald-50 border border-emerald-100 text-emerald-600'} text-[10px] font-bold rounded-full uppercase tracking-wide`}>{permits.length} pending</span>
                </div>
                <div className="p-4">
                  {permits.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 mx-auto mb-3 bg-emerald-50 rounded-full flex items-center justify-center"><ShieldIcon className="w-7 h-7 text-emerald-500"/></div>
                      <p className="text-base font-bold text-emerald-600 mb-1">All Clear</p>
                      <p className="text-xs text-gray-400">No pending permits to review</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[340px] overflow-y-auto">
                      {/* Summary Stats Row */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {[
                          { l:'Total Pending', v:permits.length, c:'text-amber-600 bg-amber-50' },
                          { l:'Avg Wait', v:`${permits.length > 0 ? (permits.reduce((a,p) => a + (p.created_at ? Math.max(0,(Date.now()-new Date(p.created_at).getTime())/86400000) : 0), 0) / permits.length).toFixed(0) : 0}d`, c:'text-sky-600 bg-sky-50' },
                          { l:'Oldest', v:`${permits.length > 0 ? Math.max(...permits.map(p => p.created_at ? Math.max(0,(Date.now()-new Date(p.created_at).getTime())/86400000) : 0)).toFixed(0) : 0}d`, c:'text-red-600 bg-red-50' },
                        ].map(s => (
                          <div key={s.l} className={`${s.c} rounded-xl p-2.5 text-center`}>
                            <p className="text-lg font-extrabold">{s.v}</p>
                            <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">{s.l}</p>
                          </div>
                        ))}
                      </div>
                      {/* Permit Cards */}
                      {permits.map((p, i) => {
                        const waitDays = p.created_at ? Math.max(0, (Date.now() - new Date(p.created_at).getTime()) / 86400000) : 0;
                        const urgency = waitDays > 30 ? 'critical' : waitDays > 14 ? 'high' : waitDays > 7 ? 'medium' : 'low';
                        const urgencyColor = { critical:'border-red-400 bg-red-50', high:'border-orange-300 bg-orange-50', medium:'border-amber-300 bg-amber-50', low:'border-sky-200 bg-sky-50' };
                        const urgencyBadge = { critical:'bg-red-100 text-red-700', high:'bg-orange-100 text-orange-700', medium:'bg-amber-100 text-amber-700', low:'bg-sky-100 text-sky-700' };
                        return (
                          <motion.div key={p.id||i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
                            className={`border-l-4 ${urgencyColor[urgency]} rounded-xl p-3.5`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm"><DroneIcon className="w-4 h-4 text-gray-600"/></div>
                                <div>
                                  <p className="text-xs font-bold text-gray-800">{p.manufacturer || 'Unknown'} {p.model || ''}</p>
                                  <p className="text-[10px] text-gray-500">{p.drone_type || 'Drone'} — SN: {p.serial_number || 'N/A'}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${urgencyBadge[urgency]}`}>{waitDays.toFixed(0)}d wait</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[10px]">
                              <div><span className="text-gray-400 block">Applicant</span><span className="font-bold text-gray-700 truncate block">{p.full_name || p.user_email || 'Unknown'}</span></div>
                              <div><span className="text-gray-400 block">Type</span><span className="font-bold text-gray-700">{p.registration_type || 'Individual'}</span></div>
                              <div><span className="text-gray-400 block">Payload</span><span className="font-bold text-gray-700">{p.max_payload ? `${p.max_payload}kg` : 'N/A'}</span></div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Recent Users List */}
            <div className="col-span-12 lg:col-span-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-sky-50 border border-sky-100 rounded-xl flex items-center justify-center text-sky-500"><UsersIcon/></div>
                  <div><h3 className="text-sm font-bold text-gray-900">Recent Users</h3><p className="text-[11px] text-gray-400">{totalUsers} total — {citizens.length} citizens, {officers.length} officers, {admins.length} admins</p></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[320px] overflow-y-auto">
                  {users.slice(0,18).map((u,i)=>(
                    <motion.div key={u.id||i} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:i*0.03}} className="bg-gray-50 rounded-xl p-2.5 flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0 ${u.role==='admin'?'bg-gradient-to-br from-red-500 to-rose-500':u.role==='officer'?'bg-gradient-to-br from-emerald-500 to-teal-500':'bg-gradient-to-br from-sky-500 to-cyan-500'}`}>
                        {u.name?.charAt(0)?.toUpperCase()||'?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-gray-800 truncate">{u.name||'Unknown'}</p>
                        <p className={`text-[9px] font-bold uppercase ${u.role==='admin'?'text-red-500':u.role==='officer'?'text-emerald-500':'text-sky-500'}`}>{u.role}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ INCIDENTS & REPORTS ═══ */}
        {activeView === 'incidents' && (
          <motion.div key="inc" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="grid grid-cols-12 gap-5 pb-16">
            <div className="col-span-12 lg:col-span-7">
              <CC t="Disaster Type Treemap" s="Proportional blocks sized by report count" ic={<LayersIcon/>} b="Treemap">
                <ReactECharts option={getTreemapOption()} style={{height:'400px'}} opts={{renderer:'canvas'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <CC t="Severity Polar Chart" s="Circular bar showing severity distribution" ic={<AlertIcon/>} b="Polar">
                <ReactECharts option={getSeverityPolarOption()} style={{height:'400px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12">
              <CC t="Global Incident Hotspots" s="Top affected locations ranked by frequency" ic={<MapPinIcon/>} b={`${locationHotspots.length} locations`}>
                <ReactECharts option={getHotspotsBarOption()} style={{height: Math.max(250, locationHotspots.length * 35) + 'px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            {/* Severity + Type cards */}
            <div className="col-span-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['LOW','MEDIUM','HIGH','CRITICAL'].map((sev,i)=>{
                  const cnt = reportStats?.reports_by_severity?.[sev]||0;
                  return <motion.div key={sev} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:0.06*i}} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor:SEVERITY_COLORS[sev]+'15'}}><div className="w-5 h-5 rounded-full" style={{backgroundColor:SEVERITY_COLORS[sev]}}/></div>
                    <div><p className="text-2xl font-extrabold" style={{color:SEVERITY_COLORS[sev]}}>{cnt}</p><p className="text-xs font-bold text-gray-500">{sev}</p></div>
                  </motion.div>;
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ NLP & VIDEO INTELLIGENCE ═══ */}
        {activeView === 'advanced' && (
          <motion.div key="adv" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="grid grid-cols-12 gap-5 pb-16">
            <div className="col-span-12">
              <CC t="NLP Disaster Stream" s="24-hour stacked area of Reddit-sourced disaster types" ic={<ActivityIcon/>} b="Stream Chart">
                <ReactECharts option={getStreamOption()} style={{height:'350px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-6">
              <CC t="Severity vs Sentiment Scatter" s="Each dot is a Reddit-detected disaster (size = severity)" ic={<GlobeIcon/>} b="NLP Scatter">
                <ReactECharts option={getSentimentScatterOption()} style={{height:'380px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-6">
              <CC t="Activity Bubble Chart" s="Disaster frequency by type and hour of day" ic={<ChartBarIcon/>} b="Bubble">
                <ReactECharts option={getBubbleOption()} style={{height:'380px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <CC t="NLP Type Distribution" s="Nightingale rose of Reddit-detected disaster types" ic={<PieChartIcon/>} b="Rose">
                <ReactECharts option={getNlpRoseOption()} style={{height:'380px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-3">
              <CC t="Video Risk Levels" s="AI video analysis risk distribution" ic={<VideoIcon/>} b={`${videos.length} analyzed`}>
                <ReactECharts option={getVideoRiskOption()} style={{height:'380px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-500"><AlertIcon/></div>
                  <div><h3 className="text-sm font-bold text-gray-900">Critical Incidents</h3><p className="text-[11px] text-gray-400">Latest high-urgency NLP detections</p></div>
                </div>
                <div className="divide-y divide-gray-50 max-h-[340px] overflow-y-auto">
                  {recentDisasters.filter(d=>d.urgency_level==='critical'||d.urgency_level==='high').slice(0,10).map((d,i)=>(
                    <motion.div key={i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
                      className="px-5 py-3 hover:bg-gray-50/50 transition-colors border-l-4"
                      style={{borderLeftColor:TYPE_COLORS[d.disaster_type]||'#ef4444'}}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${d.urgency_level==='critical'?'bg-red-50 text-red-600':'bg-orange-50 text-orange-600'}`}>{d.urgency_level}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{new Date(d.timestamp).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 capitalize">{d.disaster_type}</p>
                      <p className="text-[11px] text-gray-500 truncate">{d.location||'Unknown location'}</p>
                    </motion.div>
                  ))}
                  {recentDisasters.filter(d=>d.urgency_level==='critical'||d.urgency_level==='high').length===0 && (
                    <div className="p-8 text-center text-gray-400 text-sm">No critical incidents detected</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────
function CC({ t, s, ic, b, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 rounded-xl flex items-center justify-center text-sky-500">{ic}</div>
          <div><h3 className="text-sm font-bold text-gray-900">{t}</h3>{s&&<p className="text-[11px] text-gray-400">{s}</p>}</div>
        </div>
        {b&&<span className="px-3 py-1 bg-sky-50 border border-sky-100 text-sky-600 text-[10px] font-bold rounded-full uppercase tracking-wide">{b}</span>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function SystemStatusCard({ systemStatus, nlpStats, reportStats, totalUsers }) {
  const items = [
    { label: 'Database', value: systemStatus?.database_connected ? 'Connected' : 'Unknown', ok: systemStatus?.database_connected },
    { label: 'NLP Pipeline', value: systemStatus?.background_tasks_running ? 'Running' : 'Idle', ok: systemStatus?.background_tasks_running },
    { label: 'Total Posts Analyzed', value: systemStatus?.total_posts || 0 },
    { label: 'Total NLP Insights', value: systemStatus?.total_insights || 0 },
    { label: 'Active Drones', value: reportStats?.active_drones || 0 },
    { label: 'Avg Response Time', value: reportStats?.avg_response_time_hours ? `${reportStats.avg_response_time_hours.toFixed(1)}h` : 'N/A' },
    { label: 'Platform Users', value: totalUsers },
    { label: 'Top Disaster Type', value: nlpStats?.top_disaster_type || 'N/A' },
  ];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-500"><ShieldIcon/></div>
        <div><h3 className="text-sm font-bold text-gray-900">System Status</h3><p className="text-[11px] text-gray-400">Infrastructure & pipeline health</p></div>
      </div>
      <div className="p-4 space-y-2.5">
        {items.map((it,i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">{it.label}</span>
            <span className={`text-xs font-bold ${it.ok !== undefined ? (it.ok ? 'text-emerald-600' : 'text-gray-400') : 'text-gray-800'}`}>
              {it.ok !== undefined && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${it.ok ? 'bg-emerald-500' : 'bg-gray-300'}`}/>}
              {it.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

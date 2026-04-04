import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── SVG Icon Components ──────────────────────────────────────
const ShieldIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ClipboardCheckIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);

const DroneIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0 -2 0" fill="currentColor" />
    <path d="M12 12L5 5M12 12l7-7M12 12l-7 7M12 12l7 7" />
    <circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" />
    <circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
    <path d="M3 5h4M17 5h4M3 19h4M17 19h4" />
  </svg>
);

const AlertIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const VideoIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="M16 10l5-3v10l-5-3" />
  </svg>
);

const CommandIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2v10l4.5 4.5" />
    <circle cx="12" cy="12" r="3" />
    <path d="M2 12h3M19 12h3M12 2v3M12 19v3" />
  </svg>
);

const CameraIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ArrowRightIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const ChevronRightIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const PulseIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h3l3-9 4 18 3-9h5" />
  </svg>
);

const UserIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const MapPinIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

const RadioIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M13.02 7.34A15 15 0 0 1 19 10.13" />
    <path d="M9.34 3.65A20 20 0 0 1 19 7.72" />
    <circle cx="12" cy="17" r="2" fill="currentColor" />
    <path d="M5 12.55a10.94 10.94 0 0 1 2.28-1.49" />
    <path d="M5 10.13a15 15 0 0 1 5.98-2.79" />
    <path d="M5 7.72A20 20 0 0 1 14.66 3.65" />
  </svg>
);

const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const TrendUpIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const TargetIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

const BarChartIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

// ─── Animated Counter Hook ────────────────────────────────────
function useAnimatedCount(target, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const step = Math.ceil(target / (duration / 30));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── Component ────────────────────────────────────────────────
export default function OfficerDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    criticalReports: 0,
    activeDrones: 0,
  });
  const [pendingPermits, setPendingPermits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, permitsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/v1/disaster-reports/statistics`, { headers }),
        axios.get(`${API_URL}/api/v1/permits/pending`, { headers }),
      ]);

      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value.data;
        setStats({
          totalReports: s.total_reports || 0,
          pendingReports: s.pending_reports || 0,
          resolvedReports: s.resolved_reports || 0,
          criticalReports: s.critical_reports || 0,
          activeDrones: s.active_drones || 0,
        });
      }

      if (permitsRes.status === 'fulfilled') {
        setPendingPermits(permitsRes.value.data?.length || 0);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'Officer';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const animatedPending = useAnimatedCount(loading ? 0 : stats.pendingReports);
  const animatedPermits = useAnimatedCount(loading ? 0 : pendingPermits);
  const animatedDrones = useAnimatedCount(loading ? 0 : stats.activeDrones);
  const animatedCritical = useAnimatedCount(loading ? 0 : stats.criticalReports);
  const animatedResolved = useAnimatedCount(loading ? 0 : stats.resolvedReports);
  const animatedTotal = useAnimatedCount(loading ? 0 : stats.totalReports);

  const statCards = [
    {
      label: 'Pending Reports',
      value: animatedPending,
      accent: 'text-amber-600',
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      iconBg: 'bg-amber-100',
      border: 'border-amber-100',
      icon: <AlertIcon className="w-5 h-5" />,
      trend: stats.pendingReports > 0 ? 'Needs attention' : 'All clear',
      trendColor: stats.pendingReports > 0 ? 'text-amber-500' : 'text-emerald-500',
    },
    {
      label: 'Pending Permits',
      value: animatedPermits,
      accent: 'text-sky-600',
      bg: 'bg-gradient-to-br from-sky-50 to-blue-50',
      iconBg: 'bg-sky-100',
      border: 'border-sky-100',
      icon: <ClipboardCheckIcon className="w-5 h-5" />,
      trend: pendingPermits > 0 ? `${pendingPermits} awaiting` : 'Up to date',
      trendColor: pendingPermits > 0 ? 'text-sky-500' : 'text-emerald-500',
    },
    {
      label: 'Active Drones',
      value: animatedDrones,
      accent: 'text-emerald-600',
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      iconBg: 'bg-emerald-100',
      border: 'border-emerald-100',
      icon: <DroneIcon className="w-5 h-5" />,
      trend: 'In flight',
      trendColor: 'text-emerald-500',
    },
    {
      label: 'Critical Alerts',
      value: animatedCritical,
      accent: 'text-red-600',
      bg: 'bg-gradient-to-br from-red-50 to-rose-50',
      iconBg: 'bg-red-100',
      border: 'border-red-100',
      icon: <AlertIcon className="w-5 h-5" />,
      trend: stats.criticalReports > 0 ? 'Immediate action' : 'No critical',
      trendColor: stats.criticalReports > 0 ? 'text-red-500' : 'text-emerald-500',
    },
    {
      label: 'Resolved Cases',
      value: animatedResolved,
      accent: 'text-teal-600',
      bg: 'bg-gradient-to-br from-teal-50 to-cyan-50',
      iconBg: 'bg-teal-100',
      border: 'border-teal-100',
      icon: <ShieldIcon className="w-5 h-5" />,
      trend: 'Completed',
      trendColor: 'text-teal-500',
    },
  ];

  const quickActions = [
    {
      title: 'Permit Review',
      description: 'Review and approve emergency drone permit applications from citizens',
      path: '/permit-review',
      icon: <ClipboardCheckIcon className="w-7 h-7" />,
      iconBg: 'bg-sky-500',
      image: 'https://images.unsplash.com/photo-1521791055366-0d553872125f?w=400&h=250&fit=crop&q=80',
      badge: pendingPermits > 0 ? `${pendingPermits} pending` : null,
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'Video Analysis',
      description: 'AI-powered disaster video analysis with YOLOv8 object detection and segmentation',
      path: '/video-analysis',
      icon: <VideoIcon className="w-7 h-7" />,
      iconBg: 'bg-sky-600',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop&q=80',
      badge: null,
    },
    {
      title: 'Command Center',
      description: 'Real-time disaster monitoring, drone GPS tracking, and emergency report management',
      path: '/command-center',
      icon: <CommandIcon className="w-7 h-7" />,
      iconBg: 'bg-emerald-500',
      image: 'https://images.unsplash.com/photo-1551703599-6b3e8379aa8c?w=400&h=250&fit=crop&q=80',
      badge: stats.pendingReports > 0 ? `${stats.pendingReports} active` : null,
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Live Surveillance',
      description: 'Real-time IP camera feeds with YOLOv8 AI detection for field monitoring',
      path: '/live-surveillance',
      icon: <CameraIcon className="w-7 h-7" />,
      iconBg: 'bg-cyan-500',
      image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&h=250&fit=crop&q=80',
      badge: null,
    },
  ];

  const operationalCapabilities = [
    {
      icon: <DroneIcon className="w-6 h-6" />,
      title: 'Drone Fleet Management',
      desc: 'Deploy, monitor, and control rescue drones with real-time GPS tracking across disaster zones.',
    },
    {
      icon: <TargetIcon className="w-6 h-6" />,
      title: 'AI Threat Detection',
      desc: 'YOLOv8 powered real-time video analysis for identifying survivors, hazards, and structural damage.',
    },
    {
      icon: <RadioIcon className="w-6 h-6" />,
      title: 'Communication Hub',
      desc: 'Coordinate between field teams, drone operators, and command center with live data sync.',
    },
    {
      icon: <BarChartIcon className="w-6 h-6" />,
      title: 'Analytics Dashboard',
      desc: 'Track incident patterns, response metrics, and resource allocation across all active operations.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero Section ────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=1920&h=600&fit=crop&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-sky-700/95 via-sky-600/95 to-cyan-600/92" />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-10 left-[10%] w-64 h-64 bg-white/5 rounded-full blur-[80px]" />
        <div className="absolute bottom-10 right-[10%] w-80 h-80 bg-cyan-300/10 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 pb-24 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

            {/* Left content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Status badge */}
              <div className="inline-flex items-center gap-2.5 bg-white/15 backdrop-blur-md border border-white/25 rounded-full px-4 py-1.5 mb-6">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </span>
                <span className="text-xs font-semibold text-white/95 tracking-wider uppercase">Mission Control Active</span>
              </div>

              <p className="text-sky-100 text-sm font-medium mb-2">{greeting}, {firstName}</p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
                Emergency Operations{' '}
                <span className="bg-gradient-to-r from-white via-cyan-100 to-sky-200 bg-clip-text text-transparent">
                  Command Center
                </span>
              </h1>
              <p className="text-base lg:text-lg text-sky-100/80 max-w-xl mb-4 leading-relaxed">
                Coordinating aerial drone response, AI-powered surveillance, and real-time disaster monitoring across Nepal's terrain.
              </p>
              <p className="text-sm md:text-base text-cyan-200/90 font-medium italic mb-8 tracking-wide">
                "संकटको समयमा तपाईंको भरोसा"
              </p>

              {/* Hero action buttons */}
              <div className="flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/command-center')}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-white text-sky-600 font-bold rounded-xl shadow-lg shadow-sky-900/15 hover:shadow-xl transition-shadow"
                >
                  <CommandIcon className="w-5 h-5" />
                  Open Command Center
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/permit-review')}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-white/15 backdrop-blur-md border border-white/30 text-white font-semibold rounded-xl hover:bg-white/25 transition-colors"
                >
                  <ClipboardCheckIcon className="w-5 h-5" />
                  Review Permits
                  {pendingPermits > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-amber-400/90 text-amber-900 text-xs font-bold rounded-full">{pendingPermits}</span>
                  )}
                </motion.button>
              </div>
            </motion.div>

            {/* Right side - Officer card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="hidden lg:block"
            >
              <div className="bg-sky-900/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-sm ml-auto shadow-2xl">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/40 to-white/20 border-2 border-white/30 flex items-center justify-center">
                    {user?.profile_picture ? (
                      <img src={user.profile_picture} alt="" className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <UserIcon className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{user?.name || 'Officer'}</p>
                    <p className="text-sky-200 text-sm capitalize">{user?.role || 'officer'} — Sankalpa DMS</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/15 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-white">{loading ? '—' : stats.totalReports}</p>
                    <p className="text-[10px] text-sky-100 mt-0.5 font-medium">Total Reports</p>
                  </div>
                  <div className="bg-white/15 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-white">{loading ? '—' : stats.resolvedReports}</p>
                    <p className="text-[10px] text-sky-100 mt-0.5 font-medium">Resolved</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 bg-emerald-400/20 border border-emerald-400/30 rounded-xl px-4 py-2.5">
                  <PulseIcon className="w-4 h-4 text-emerald-300" />
                  <span className="text-sm font-medium text-emerald-200">All systems operational</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 50" fill="none" className="w-full" preserveAspectRatio="none">
            <path d="M0 50L60 44C120 38 240 26 360 21.7C480 17.3 600 20.7 720 25C840 29.3 960 34.7 1080 32.5C1200 30.3 1320 20.7 1380 15.8L1440 11V50H0Z" fill="white"/>
          </svg>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.4 }}
              className={`${card.bg} border ${card.border} rounded-2xl p-5 shadow-lg shadow-gray-100/80 hover:shadow-xl transition-shadow`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center ${card.accent}`}>
                  {card.icon}
                </div>
                <div className={`flex items-center gap-1 ${card.trendColor}`}>
                  <TrendUpIcon className="w-3 h-3" />
                </div>
              </div>
              <p className={`text-3xl font-extrabold ${card.accent} leading-none`}>
                {loading ? (
                  <span className="inline-block w-10 h-8 bg-gray-200/50 rounded-lg animate-pulse" />
                ) : (
                  card.value
                )}
              </p>
              <p className="text-gray-500 text-xs font-semibold mt-1.5 tracking-wide">{card.label}</p>
              <p className={`text-[10px] font-medium mt-1 ${card.trendColor}`}>{card.trend}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Quick Actions Grid ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Operations Hub</h2>
            <p className="text-gray-500 text-sm mt-1">Access your tools and manage ongoing operations</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sky-600 bg-sky-50 border border-sky-100 px-4 py-2 rounded-xl">
            <ClockIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 * i + 0.35, duration: 0.4 }}
              onClick={() => navigate(action.path)}
              className="group bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl hover:border-sky-200 transition-all duration-300"
            >
              {/* Card Image */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={action.image}
                  alt={action.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className={`absolute top-4 left-4 w-11 h-11 ${action.iconBg} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                  {action.icon}
                </div>
                {action.badge && (
                  <span className={`absolute top-4 right-4 px-3 py-1 text-xs font-bold rounded-full shadow-sm ${action.badgeColor || 'bg-amber-100 text-amber-700'}`}>
                    {action.badge}
                  </span>
                )}
              </div>

              {/* Card Content */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-sky-600 transition-colors">
                    {action.title}
                  </h3>
                  <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-sky-50 flex items-center justify-center text-gray-400 group-hover:text-sky-500 transition-all group-hover:translate-x-0.5">
                    <ChevronRightIcon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{action.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Operational Capabilities ────────────────────────────── */}
      <div className="bg-gradient-to-b from-sky-50/50 to-white border-t border-sky-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-10"
          >
            <p className="text-sky-500 text-xs font-bold uppercase tracking-widest mb-2">Integrated Platform</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">Operational Capabilities</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-xl mx-auto">End-to-end disaster management powered by drones, AI detection, and real-time coordination tools.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {operationalCapabilities.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 0.55 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-sky-200 transition-all group"
              >
                <div className="w-12 h-12 bg-sky-50 border border-sky-100 rounded-xl flex items-center justify-center text-sky-500 mb-4 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  {cap.icon}
                </div>
                <h4 className="text-base font-bold text-gray-900 mb-2">{cap.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{cap.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Info Bar ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <img src="/src/logo/FYP_Logo.png" alt="Sankalpa Logo" className="w-12 h-12 rounded-xl object-contain" />
            <div>
              <p className="text-sm font-bold text-gray-900">Sankalpa Disaster Management System</p>
              <p className="text-xs text-gray-500 mt-0.5">
                All systems operational — {loading ? '...' : animatedTotal} total reports processed across operations.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/command-center')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Launch Command Center
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">Sankalpa DMS — Saving lives with aerial intelligence</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPinIcon className="w-3.5 h-3.5" />
            Nepal Emergency Operations
          </div>
        </div>
      </div>
    </div>
  );
}

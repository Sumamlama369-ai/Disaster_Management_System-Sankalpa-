import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// SVG Icon Components
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const ClipboardCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 011.15.586m-5.8.998H7.5A2.25 2.25 0 005.25 6v12A2.25 2.25 0 007.5 20.25h9a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25h-1.15m-5.8 0v.414c0 .593.487 1.086 1.08 1.086h3.64c.593 0 1.08-.493 1.08-1.086V3.836M9 14.25l2.25 2.25L15 12" />
  </svg>
);

const DroneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75L7.5 7.5m0 0L3.75 7.5M7.5 7.5L3.75 11.25M20.25 3.75L16.5 7.5m0 0l3.75 0M16.5 7.5l3.75 3.75M12 12h.008M12 15v3m-3-6h6m-8.25 6h10.5a2.25 2.25 0 002.25-2.25V9.75a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9.75v6a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const VideoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25z" />
  </svg>
);

const MapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0 0l-3-3m3 3l3-3m-3 3V6.75M9 6.75L6.75 4.5M9 6.75l2.25-2.25M3.75 12h16.5M3.75 12a8.25 8.25 0 1116.5 0 8.25 8.25 0 01-16.5 0z" />
  </svg>
);

const CommandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
  </svg>
);

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const PulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3l3-9 4 18 3-9h5" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

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

  const statCards = [
    {
      label: 'Pending Reports',
      value: stats.pendingReports,
      accent: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      icon: <AlertIcon />,
    },
    {
      label: 'Pending Permits',
      value: pendingPermits,
      accent: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      icon: <ClipboardCheckIcon />,
    },
    {
      label: 'Active Drones',
      value: stats.activeDrones,
      accent: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      icon: <DroneIcon />,
    },
    {
      label: 'Critical Alerts',
      value: stats.criticalReports,
      accent: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
      icon: <AlertIcon />,
    },
    {
      label: 'Resolved Cases',
      value: stats.resolvedReports,
      accent: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-100',
      icon: <ShieldIcon />,
    },
  ];

  const quickActions = [
    {
      title: 'Permit Review',
      description: 'Review and approve emergency drone permit applications from citizens',
      path: '/permit-review',
      icon: <ClipboardCheckIcon />,
      gradient: 'from-blue-500 to-blue-600',
      badge: pendingPermits > 0 ? `${pendingPermits} pending` : null,
    },
    {
      title: 'Video Analysis',
      description: 'AI-powered disaster video analysis with object detection and segmentation',
      path: '/video-analysis',
      icon: <VideoIcon />,
      gradient: 'from-violet-500 to-purple-600',
      badge: null,
    },
    {
      title: 'Command Center',
      description: 'Real-time disaster monitoring, drone tracking, and report management',
      path: '/command-center',
      icon: <CommandIcon />,
      gradient: 'from-emerald-500 to-teal-600',
      badge: stats.pendingReports > 0 ? `${stats.pendingReports} active` : null,
    },
    {
      title: 'Live Surveillance',
      description: 'Real-time IP camera feed with YOLOv8 object detection for field monitoring',
      path: '/live-surveillance',
      icon: <CameraIcon />,
      gradient: 'from-cyan-500 to-blue-600',
      badge: null,
    },
  ];

  const firstName = user?.name?.split(' ')[0] || 'Officer';

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section with Background Image */}
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80')`,
          }}
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-800/80 to-emerald-900/75" />

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pb-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-white/90 tracking-wider uppercase">Active Mission Monitoring</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 leading-tight">
              Saving Lives with<br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Aerial Intelligence
              </span>
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mb-10 leading-relaxed">
              Coordinating emergency drone response, search and rescue operations, and real-time topographical monitoring across the Himalayas.
            </p>

            {/* Hero Buttons */}
            <div className="flex flex-wrap gap-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/command-center')}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow"
              >
                <DroneIcon />
                Deploy Drone
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/command-center')}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-white/10 backdrop-blur-md border border-white/25 text-white font-semibold rounded-xl hover:bg-white/15 transition-colors"
              >
                <CommandIcon />
                Live Map
              </motion.button>
            </div>
          </motion.div>

          {/* Officer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="absolute top-8 right-8 hidden lg:flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-3"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white">
              <UserIcon />
            </div>
            <div>
              <p className="text-white font-medium text-sm">{user?.name || 'Officer'}</p>
              <p className="text-white/50 text-xs capitalize">{user?.role || 'officer'}</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Cards - Overlapping Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 relative z-10 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
              className={`${card.bg} border ${card.border} rounded-2xl p-5 shadow-lg shadow-gray-200/50`}
            >
              <div className={`${card.accent} mb-3`}>{card.icon}</div>
              <p className={`text-2xl font-bold ${card.accent}`}>
                {loading ? (
                  <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" />
                ) : (
                  card.value
                )}
              </p>
              <p className="text-gray-500 text-xs font-medium mt-1">{card.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}</h2>
            <p className="text-gray-500 text-sm mt-1">Here are your quick actions and tools for today's operations.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">
            <PulseIcon />
            <span className="text-sm font-medium">System Online</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i + 0.3, duration: 0.4 }}
              onClick={() => navigate(action.path)}
              className="group bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl hover:border-gray-300 transition-all duration-300"
            >
              {/* Gradient Top Bar */}
              <div className={`h-1.5 bg-gradient-to-r ${action.gradient}`} />

              <div className="p-6 flex items-start gap-5">
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} text-white flex items-center justify-center shadow-lg`}>
                  {action.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {action.title}
                    </h3>
                    {action.badge && (
                      <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{action.description}</p>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                  <ChevronRightIcon />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Info Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-10 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldIcon />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Disaster Management System v1.0</p>
              <p className="text-xs text-gray-500">All systems operational. {stats.totalReports} total reports processed.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/command-center')}
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Open Command Center
            <ArrowRightIcon />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

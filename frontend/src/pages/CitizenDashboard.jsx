import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useState, useEffect } from 'react';

// ─── SVG Icon Components ───────────────────────────────────────
const DroneIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0 -2 0" fill="currentColor" />
    <path d="M12 12L5 5M12 12l7-7M12 12l-7 7M12 12l7 7" />
    <circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" />
    <circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
    <path d="M3 5h4M17 5h4M3 19h4M17 19h4" />
  </svg>
);

const ClipboardIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
  </svg>
);

const VideoIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="M16 10l5-3v10l-5-3" />
  </svg>
);

const ChartIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M7 16l4-4 4 2 5-6" />
    <circle cx="20" cy="8" r="1" fill="currentColor" />
  </svg>
);

const ReportIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

const BellIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const MapIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const ShieldCheckIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const ArrowRightIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const LocationIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const WarningIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const SignalIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h.01" /><path d="M7 20v-4" /><path d="M12 20v-8" /><path d="M17 20V8" /><path d="M22 4v16" />
  </svg>
);

const GlobeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const UsersIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ClockIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const TargetIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

// ─── Animated counter hook ─────────────────────────────────────
const useCounter = (end, duration = 2000) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (end === 0) return;
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return count;
};

// ─── Live pulse dot ────────────────────────────────────────────
const PulseDot = ({ color = 'bg-emerald-500' }) => (
  <span className="relative flex h-2.5 w-2.5">
    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
  </span>
);

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const features = [
    {
      icon: <DroneIcon className="w-8 h-8" />,
      title: 'Drone Registration',
      description: 'Register and obtain permits for emergency drone operations with streamlined approval workflow',
      gradient: 'from-blue-600/80 to-cyan-500/80',
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
      hoverBorder: 'hover:border-blue-200',
      link: '/drone-permit-form',
      image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&h=300&fit=crop&q=80',
      tag: 'Popular',
      tagColor: 'bg-blue-500',
    },
    {
      icon: <ClipboardIcon className="w-8 h-8" />,
      title: 'My Permits',
      description: 'Track all your drone permits, monitor approval status and download official documentation',
      gradient: 'from-emerald-600/80 to-teal-500/80',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      hoverBorder: 'hover:border-emerald-200',
      link: '/my-permits',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=300&fit=crop&q=80',
    },
    {
      icon: <VideoIcon className="w-8 h-8" />,
      title: 'Video Analysis',
      description: 'Upload disaster footage for AI-powered object detection and damage segmentation using YOLOv8',
      gradient: 'from-sky-600/80 to-blue-500/80',
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-100',
      hoverBorder: 'hover:border-sky-200',
      link: '/video-analysis',
      image: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&h=300&fit=crop&q=80',
      tag: 'AI Powered',
      tagColor: 'bg-sky-500',
    },
    {
      icon: <ChartIcon className="w-8 h-8" />,
      title: 'Live Dashboard',
      description: 'Monitor real-time disaster incidents, track emergency severity and view crisis analytics feeds',
      gradient: 'from-rose-600/80 to-orange-500/80',
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
      hoverBorder: 'hover:border-rose-200',
      link: '/disaster-dashboard',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=300&fit=crop&q=80',
      tag: 'Real-time',
      tagColor: 'bg-rose-500',
    },
    {
      icon: <ReportIcon className="w-8 h-8" />,
      title: 'My Disaster Reports',
      description: 'View submitted disaster reports, status updates, officer assignments and drone deployments',
      gradient: 'from-amber-600/80 to-yellow-500/80',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      hoverBorder: 'hover:border-amber-200',
      link: '/my-disaster-reports',
      image: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&h=300&fit=crop&q=80',
    },
    {
      icon: <MapIcon className="w-8 h-8" />,
      title: 'No-Fly Zones',
      description: 'Interactive map displaying restricted airspaces, military zones and protected heritage sites',
      gradient: 'from-teal-600/80 to-cyan-500/80',
      iconBg: 'bg-teal-50 text-teal-600 border border-teal-100',
      hoverBorder: 'hover:border-teal-200',
      link: '/no-fly-zone',
      image: 'https://images.unsplash.com/photo-1476973422084-e0fa66ff9456?w=600&h=300&fit=crop&q=80',
    },
  ];

  const stats = [
    {
      icon: <DroneIcon className="w-6 h-6" />,
      value: 0,
      label: 'Active Permits',
      sublabel: 'Registered drones',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      cardBg: 'bg-gradient-to-br from-blue-50 to-white',
      border: 'border-blue-100',
      accent: 'text-blue-600',
    },
    {
      icon: <VideoIcon className="w-6 h-6" />,
      value: 0,
      label: 'Videos Analyzed',
      sublabel: 'AI processed',
      iconBg: 'bg-gradient-to-br from-sky-500 to-cyan-500',
      cardBg: 'bg-gradient-to-br from-sky-50 to-white',
      border: 'border-sky-100',
      accent: 'text-sky-600',
    },
    {
      icon: <BellIcon className="w-6 h-6" />,
      value: 0,
      label: 'Active Alerts',
      sublabel: 'In your area',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      cardBg: 'bg-gradient-to-br from-amber-50 to-white',
      border: 'border-amber-100',
      accent: 'text-amber-600',
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6" />,
      value: 'Safe',
      label: 'Current Status',
      sublabel: 'All clear',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-green-500',
      cardBg: 'bg-gradient-to-br from-emerald-50 to-white',
      border: 'border-emerald-100',
      accent: 'text-emerald-600',
      isStatus: true,
    },
  ];

  const howItWorks = [
    {
      step: '01',
      icon: <WarningIcon className="w-7 h-7" />,
      title: 'Report Incident',
      description: 'Submit disaster reports with photos, precise GPS coordinates and severity classification',
      color: 'text-red-500',
      bg: 'bg-red-50',
      borderColor: 'border-red-200',
      image: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=300&h=200&fit=crop&q=80',
    },
    {
      step: '02',
      icon: <ChartIcon className="w-7 h-7" />,
      title: 'AI Analysis',
      description: 'Machine learning models analyze reports, video feeds and social data for threat assessment',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      borderColor: 'border-blue-200',
      image: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=300&h=200&fit=crop&q=80',
    },
    {
      step: '03',
      icon: <DroneIcon className="w-7 h-7" />,
      title: 'Drone Dispatch',
      description: 'Emergency drones deploy for real-time aerial surveillance, mapping and search operations',
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      image: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=300&h=200&fit=crop&q=80',
    },
    {
      step: '04',
      icon: <ShieldCheckIcon className="w-7 h-7" />,
      title: 'Response & Rescue',
      description: 'Officers coordinate rescue operations with live drone tracking and real-time status updates',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=300&h=200&fit=crop&q=80',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <div className="relative overflow-hidden bg-slate-900" style={{ minHeight: '560px' }}>
        {/* Background layers */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1920&h=800&fit=crop&q=80"
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: 0.15 }}
            onLoad={() => setHeroImageLoaded(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900/70" />
        </div>

        {/* Animated grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />

        {/* Glow effects */}
        <div className="absolute top-20 right-[20%] w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[120px]" />
        <div className="absolute -bottom-20 left-[10%] w-[400px] h-[400px] bg-cyan-500/6 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 lg:pt-16 lg:pb-28">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">

            {/* Left - Content (7 cols) */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7"
            >
              {/* Top bar */}
              <div className="flex flex-wrap items-center gap-3 mb-8">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.06] backdrop-blur-sm rounded-full border border-white/[0.08]">
                  <PulseDot color="bg-emerald-400" />
                  <span className="text-xs text-emerald-400 font-semibold tracking-wide uppercase">System Online</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.06] backdrop-blur-sm rounded-full border border-white/[0.08]">
                  <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">{formatDate()}</span>
                </div>
              </div>

              {/* Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-white mb-5 leading-[1.1] tracking-tight">
                {getGreeting()},
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-sky-400 bg-clip-text text-transparent">
                  {user?.name?.split(' ')[0] || 'Citizen'}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-400 mb-10 max-w-xl leading-relaxed">
                Your centralized hub for disaster management. Report emergencies with GPS precision,
                register drones, monitor live crisis feeds and access critical response resources.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3 mb-10">
                <Link
                  to="/report-disaster"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:-translate-y-0.5"
                >
                  <WarningIcon className="w-5 h-5" />
                  Report Emergency
                  <ArrowRightIcon className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link
                  to="/drone-permit-form"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 bg-white/[0.07] hover:bg-white/[0.12] backdrop-blur-sm text-white rounded-xl font-semibold transition-all duration-200 border border-white/[0.12] hover:border-white/[0.2]"
                >
                  <DroneIcon className="w-5 h-5" />
                  Register Drone
                </Link>
                <Link
                  to="/disaster-dashboard"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 bg-white/[0.07] hover:bg-white/[0.12] backdrop-blur-sm text-white rounded-xl font-semibold transition-all duration-200 border border-white/[0.12] hover:border-white/[0.2]"
                >
                  <ChartIcon className="w-5 h-5" />
                  Live Dashboard
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  <span>24/7 Monitoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  <span>AI-Powered Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  <span>Real-time Response</span>
                </div>
              </div>
            </motion.div>

            {/* Right - Hero Image (5 cols) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="hidden lg:block lg:col-span-5"
            >
              <div className="relative">
                {/* Main drone image */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/[0.08]">
                  <img
                    src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=640&h=440&fit=crop&q=80"
                    alt="Professional drone in flight for disaster monitoring"
                    className="w-full object-cover"
                    style={{ height: '400px' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

                  {/* Overlay badge on image */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center justify-between bg-black/40 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <DroneIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-semibold">Drone Fleet Ready</p>
                          <p className="text-slate-400 text-xs">Rapid deployment capability</p>
                        </div>
                      </div>
                      <PulseDot color="bg-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* Floating card - top right */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 }}
                  className="absolute -top-4 -right-4 z-10"
                >
                  <div className="bg-white rounded-xl shadow-xl shadow-black/10 p-3.5 flex items-center gap-3 border border-gray-100">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <SignalIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Live Tracking</p>
                      <p className="text-[11px] text-gray-400">GPS + Firebase sync</p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating card - bottom left */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1 }}
                  className="absolute -bottom-5 -left-5 z-10"
                >
                  <div className="bg-white rounded-xl shadow-xl shadow-black/10 p-3.5 flex items-center gap-3 border border-gray-100">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                      <ShieldCheckIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">All Systems</p>
                      <div className="flex items-center gap-1.5">
                        <PulseDot color="bg-emerald-500" />
                        <p className="text-[11px] text-emerald-500 font-semibold">Operational</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full" preserveAspectRatio="none">
            <path d="M0 80L60 71.7C120 63.3 240 46.7 360 38.3C480 30 600 30 720 35C840 40 960 50 1080 51.7C1200 53.3 1320 46.7 1380 43.3L1440 40V80H0Z" fill="white"/>
          </svg>
        </div>
      </div>

      {/* ═══════════════ STATS SECTION ═══════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index + 0.5, duration: 0.5 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className={`${stat.cardBg} rounded-2xl border ${stat.border} p-5 lg:p-6 transition-shadow duration-300 hover:shadow-lg cursor-default`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 ${stat.iconBg} rounded-xl flex items-center justify-center text-white shadow-sm`}>
                  {stat.icon}
                </div>
                {stat.isStatus && <PulseDot color="bg-emerald-500" />}
              </div>
              <h3 className={`text-3xl font-extrabold mb-0.5 ${stat.accent}`}>
                {stat.value}
              </h3>
              <p className="text-gray-800 text-sm font-semibold">{stat.label}</p>
              <p className="text-gray-400 text-xs mt-0.5">{stat.sublabel}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ═══════════════ SERVICES SECTION ═══════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-blue-500 rounded-full" />
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Services</span>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">Available Services</h2>
            <p className="text-gray-500 mt-2 max-w-lg">Access all disaster management tools, AI-powered analysis and emergency coordination resources</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * index + 0.8, duration: 0.5 }}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
              className={`group bg-white rounded-2xl border border-gray-100 ${feature.hoverBorder} overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300`}
            >
              <Link to={feature.link} className="block">
                {/* Image */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${feature.gradient} mix-blend-multiply`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                  {/* Tag */}
                  {feature.tag && (
                    <div className="absolute top-3 right-3">
                      <span className={`${feature.tagColor} text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm`}>
                        {feature.tag}
                      </span>
                    </div>
                  )}

                  {/* Icon on image */}
                  <div className="absolute bottom-3 left-3">
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-2.5 shadow-sm">
                      <div className="text-gray-700">{feature.icon}</div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors duration-200">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 text-[13px] leading-relaxed mb-4">
                    {feature.description}
                  </p>
                  <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold">
                    <span>Learn more</span>
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ═══════════════ EMERGENCY CTA ═══════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl"
        >
          {/* Background */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=1400&h=400&fit=crop&q=80"
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/85 to-slate-900/75" />
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-[100px]" />

          <div className="relative px-8 py-12 lg:px-14 lg:py-14">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 bg-red-500/15 rounded-2xl flex items-center justify-center border border-red-500/20">
                    <WarningIcon className="w-7 h-7 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl lg:text-3xl font-extrabold text-white">Facing an Emergency?</h3>
                  </div>
                </div>
                <p className="text-slate-300 max-w-2xl text-base leading-relaxed mb-2">
                  Report disasters instantly with precise GPS location and evidence photos. Our response team of
                  officers and drone operators are on standby 24/7 for rapid deployment and rescue coordination.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ClockIcon className="w-4 h-4" />
                    <span>Avg. response: &lt;5 min</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TargetIcon className="w-4 h-4" />
                    <span>GPS precision tracking</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4 flex lg:justify-end">
                <Link
                  to="/report-disaster"
                  className="group inline-flex items-center gap-3 px-8 py-4.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-lg transition-all duration-200 shadow-xl shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5"
                >
                  <WarningIcon className="w-6 h-6" />
                  Report Now
                  <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <div className="bg-gray-50/80 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 rounded-full border border-blue-100 mb-4">
              <GlobeIcon className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-blue-600">Our Process</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
              From incident report to rescue operation — our platform connects citizens with emergency
              responders through AI-powered analysis and real-time drone coordination
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.12 * i, duration: 0.5 }}
                className="group relative"
              >
                {/* Connector line */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-[52px] left-[55%] w-[90%] z-0">
                    <svg width="100%" height="20" className="overflow-visible">
                      <line x1="0" y1="10" x2="100%" y2="10" stroke="#d1d5db" strokeWidth="2" strokeDasharray="6 4" />
                      <polygon points="100%,5 100%,15 106%,10" fill="#d1d5db" />
                    </svg>
                  </div>
                )}

                <div className={`relative bg-white rounded-2xl border ${item.borderColor} p-6 hover:shadow-lg transition-all duration-300 z-10`}>
                  {/* Step + Icon */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-14 h-14 ${item.bg} rounded-2xl flex items-center justify-center relative`}>
                      <div className={item.color}>{item.icon}</div>
                    </div>
                    <span className={`text-3xl font-extrabold ${item.color} opacity-20`}>{item.step}</span>
                  </div>

                  {/* Image */}
                  <div className="rounded-xl overflow-hidden mb-4 h-28">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════ CAPABILITIES BANNER ═══════════════ */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Image collage */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden h-48">
                    <img
                      src="https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=400&h=300&fit=crop&q=80"
                      alt="Drone aerial view"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="rounded-2xl overflow-hidden h-32">
                    <img
                      src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop&q=80"
                      alt="Analytics dashboard"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="rounded-2xl overflow-hidden h-32">
                    <img
                      src="https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&h=200&fit=crop&q=80"
                      alt="Monitoring center"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="rounded-2xl overflow-hidden h-48">
                    <img
                      src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=400&h=300&fit=crop&q=80"
                      alt="Drone close up"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
              {/* Badge */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <DroneIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Sankalpa</p>
                    <p className="text-xs text-gray-400">Disaster Response</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right - Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 rounded-full border border-blue-100 mb-5">
                <TargetIcon className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-blue-600">Platform Capabilities</span>
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-5 leading-tight">
                Built for Rapid
                <br />
                <span className="text-blue-600">Emergency Response</span>
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Sankalpa integrates cutting-edge drone technology with AI-powered disaster analysis
                to create a comprehensive emergency management ecosystem.
              </p>

              <div className="space-y-5">
                {[
                  {
                    icon: <DroneIcon className="w-5 h-5" />,
                    title: 'Real-time Drone Fleet Tracking',
                    desc: 'Live GPS tracking of deployed drones with Firebase real-time synchronization',
                    color: 'bg-blue-50 text-blue-600 border-blue-100',
                  },
                  {
                    icon: <ChartIcon className="w-5 h-5" />,
                    title: 'YOLOv8 AI Video Analysis',
                    desc: 'Automated detection and segmentation of fire, injuries and structural damage',
                    color: 'bg-sky-50 text-sky-600 border-sky-100',
                  },
                  {
                    icon: <GlobeIcon className="w-5 h-5" />,
                    title: 'Social Media Monitoring',
                    desc: 'NLP-powered disaster detection from Reddit feeds with severity classification',
                    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                  },
                  {
                    icon: <UsersIcon className="w-5 h-5" />,
                    title: 'Multi-Role Coordination',
                    desc: 'Seamless collaboration between citizens, officers and administrators',
                    color: 'bg-amber-50 text-amber-600 border-amber-100',
                  },
                ].map((cap, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className={`w-10 h-10 ${cap.color} border rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      {cap.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-0.5">{cap.title}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{cap.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <div className="bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Sankalpa</p>
                <p className="text-slate-400 text-xs">Disaster Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link to="/disaster-dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              <Link to="/report-disaster" className="hover:text-white transition-colors">Report</Link>
              <Link to="/no-fly-zone" className="hover:text-white transition-colors">No-Fly Zones</Link>
              <Link to="/drone-permit-form" className="hover:text-white transition-colors">Drone Permits</Link>
            </div>
            <p className="text-slate-500 text-xs">Protecting communities through technology</p>
          </div>
        </div>
      </div>
    </div>
  );
}

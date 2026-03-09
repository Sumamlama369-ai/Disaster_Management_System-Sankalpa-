import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';


export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Close profile popup on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  // Define navigation items based on role (no Profile page)
  const getNavItems = () => {
    if (user?.role === 'citizen') {
      return [
        { id: 'home', label: 'Home', path: '/citizen-dashboard' },
        { id: 'drone-permit', label: 'Drone Permit', path: '/drone-permit-form' },
        { id: 'my-permits', label: 'My Permits', path: '/my-permits' },
        { id: 'video-analysis', label: 'Video Analysis', path: '/video-analysis' },
        { id: 'disaster-dashboard', label: 'Live Dashboard', path: '/disaster-dashboard' },
        { id: 'no-fly-zone', label: 'No-Fly Zone', path: '/no-fly-zone' },
        { id: 'report-disaster', label: 'Report Disaster', path: '/report-disaster' },
      ];
    } else if (user?.role === 'officer') {
      return [
        { id: 'home', label: 'Home', path: '/officer-dashboard' },
        { id: 'permit-review', label: 'Permit Review', path: '/permit-review' },
        { id: 'video-analysis', label: 'Video Analysis', path: '/video-analysis' },
        { id: 'command-center', label: 'Command Center', path: '/command-center' },
      ];
    } else if (user?.role === 'admin') {
      return [
        { id: 'home', label: 'Home', path: '/admin-dashboard' },
        { id: 'analytics', label: 'Analytics', path: '/analytics' },
        { id: 'users', label: 'User Management', path: '/user-management' },
        { id: 'video-analysis', label: 'Video Analysis', path: '/video-analysis' },
        { id: 'reports', label: 'Reports', path: '/reports' },
        { id: 'command-center', label: 'Command Center', path: '/command-center' },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  // Get theme color based on role
  const getThemeColor = () => {
    if (user?.role === 'citizen') return 'blue';
    if (user?.role === 'officer') return 'green';
    if (user?.role === 'admin') return 'red';
    return 'blue';
  };

  const themeColor = getThemeColor();

  const themeClasses = {
    blue: {
      bg: 'bg-blue-500',
      hover: 'hover:bg-blue-600',
      text: 'text-blue-600',
      border: 'border-blue-500',
      badge: 'bg-blue-100 text-blue-800',
      gradient: 'from-blue-500 to-purple-600',
    },
    green: {
      bg: 'bg-green-500',
      hover: 'hover:bg-green-600',
      text: 'text-green-600',
      border: 'border-green-500',
      badge: 'bg-green-100 text-green-800',
      gradient: 'from-green-500 to-teal-600',
    },
    red: {
      bg: 'bg-red-500',
      hover: 'hover:bg-red-600',
      text: 'text-red-600',
      border: 'border-red-500',
      badge: 'bg-red-100 text-red-800',
      gradient: 'from-red-500 to-pink-600',
    },
  };

  const theme = themeClasses[themeColor];

  const getRoleIcon = () => {
    if (user?.role === 'citizen') return '👤';
    if (user?.role === 'officer') return '👮';
    if (user?.role === 'admin') return '👑';
    return '👤';
  };

  const getRoleLabel = () => {
    if (user?.role === 'citizen') return 'Citizen Portal';
    if (user?.role === 'officer') return 'Officer Portal';
    if (user?.role === 'admin') return 'Admin Portal';
    return 'Portal';
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer flex-shrink-0" onClick={() => navigate(navItems[0].path)}>
            <div className={`w-11 h-11 bg-gradient-to-br ${theme.gradient} rounded-xl flex items-center justify-center`}>
              <span className="text-white text-2xl">{getRoleIcon()}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Sankalpa</h1>
              <p className="text-xs text-gray-500">{getRoleLabel()}</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 mx-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  location.pathname === item.path
                    ? `${theme.bg} text-white`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          {/* User Menu - Desktop (clickable for profile popup) */}
          <div className="hidden lg:flex items-center gap-3 relative" ref={profileRef}>
            <span className={`px-3 py-1 ${theme.badge} rounded-full text-xs font-semibold capitalize`}>
              {user?.role}
            </span>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 hover:bg-gray-50 rounded-xl px-3 py-1.5 transition-all"
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <img
                src={user?.profile_picture || `https://ui-avatars.com/api/?name=${user?.name}`}
                alt="Profile"
                className={`w-10 h-10 rounded-full border-2 ${theme.border}`}
              />
            </button>

            {/* Profile Popup */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                {/* Popup Header */}
                <div className={`bg-gradient-to-r ${theme.gradient} px-6 py-5 text-white relative`}>
                  <button
                    onClick={() => setProfileOpen(false)}
                    className="absolute top-3 right-3 w-7 h-7 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white text-sm transition"
                  >
                    ✕
                  </button>
                  <div className="flex items-center gap-4">
                    <img
                      src={user?.profile_picture || `https://ui-avatars.com/api/?name=${user?.name}&size=80`}
                      alt="Profile"
                      className="w-16 h-16 rounded-full border-3 border-white/50 shadow-lg"
                    />
                    <div>
                      <h3 className="text-lg font-bold">{user?.name}</h3>
                      <p className="text-white/80 text-sm">{user?.email}</p>
                    </div>
                  </div>
                </div>
                {/* Popup Body */}
                <div className="px-6 py-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Role</span>
                    <span className={`px-3 py-1 ${theme.badge} rounded-full text-xs font-bold capitalize`}>{user?.role}</span>
                  </div>
                  {user?.phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Phone</span>
                      <span className="text-sm text-gray-700 font-medium">{user.phone}</span>
                    </div>
                  )}
                  {user?.created_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Joined</span>
                      <span className="text-sm text-gray-700 font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                {/* Logout */}
                <div className="border-t border-gray-100 px-6 py-3">
                  <button
                    onClick={handleLogout}
                    className="w-full py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-2">
            {/* User Info */}
            <div className="flex items-center gap-3 pb-4 border-b">
              <img
                src={user?.profile_picture || `https://ui-avatars.com/api/?name=${user?.name}`}
                alt="Profile"
                className={`w-12 h-12 rounded-full border-2 ${theme.border}`}
              />
              <div>
                <p className="font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <span className={`inline-block mt-1 px-2 py-1 ${theme.badge} rounded-full text-xs font-semibold capitalize`}>
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Nav Items */}
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? `${theme.bg} text-white`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition mt-4"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
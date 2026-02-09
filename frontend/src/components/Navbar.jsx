import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';


export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Define navigation items based on role
  const getNavItems = () => {
    if (user?.role === 'citizen') {
      return [
        { id: 'home', label: 'Home', icon: '🏠', path: '/citizen-dashboard' },
        { id: 'drone-permit', label: 'Drone Permit', icon: '🚁', path: '/drone-permit-form' },
        { id: 'my-permits', label: 'My Permits', icon: '📋', path: '/my-permits' },
        { id: 'video-analysis', label: 'Video Analysis', icon: '🎬', path: '/video-analysis' },
        { id: 'disaster-dashboard', label: 'Live Dashboard', icon: '📊', path: '/disaster-dashboard' },
        { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
      ];
    } else if (user?.role === 'officer') {
      return [
        { id: 'home', label: 'Home', icon: '🏠', path: '/officer-dashboard' },
        { id: 'permit-review', label: 'Permit Review', icon: '✅', path: '/permit-review' },
        { id: 'video-analysis', label: 'Video Analysis', icon: '🎬', path: '/video-analysis' },
        { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
      ];
    } else if (user?.role === 'admin') {
      return [
        { id: 'home', label: 'Home', icon: '🏠', path: '/admin-dashboard' },
        { id: 'analytics', label: 'Analytics', icon: '📊', path: '/analytics' },
        { id: 'users', label: 'User Management', icon: '👥', path: '/user-management' },
        { id: 'video-analysis', label: 'Video Analysis', icon: '🎬', path: '/video-analysis' },
        { id: 'reports', label: 'Reports', icon: '📄', path: '/reports' },
        { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(navItems[0].path)}>
            <div className={`w-10 h-10 bg-gradient-to-br ${theme.gradient} rounded-lg flex items-center justify-center`}>
              <span className="text-white text-2xl">{getRoleIcon()}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Sankalpa</h1>
              <p className="text-xs text-gray-500">{getRoleLabel()}</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? `${theme.bg} text-white`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
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

          {/* User Menu - Desktop */}
          <div className="hidden lg:flex items-center gap-4">
            <span className={`px-3 py-1 ${theme.badge} rounded-full text-xs font-semibold capitalize`}>
              {user?.role}
            </span>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <img
              src={user?.profile_picture || `https://ui-avatars.com/api/?name=${user?.name}`}
              alt="Profile"
              className={`w-10 h-10 rounded-full border-2 ${theme.border}`}
            />
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
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
                <span className="mr-2">{item.icon}</span>
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
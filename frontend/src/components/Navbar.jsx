import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { authService } from '../services/auth';

// ─── Inline SVG Icons ──────────────────────────────────────────
const UserIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const OfficerIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const AdminIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const PhoneIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MailIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const TagIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const EditIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const LogoutIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const BellIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const LoaderIcon = ({ className = "w-4 h-4" }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);


export default function Navbar() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Phone editing state
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneSaved, setPhoneSaved] = useState(false);
  const phoneInputRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Close profile popup on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
        setIsEditingPhone(false);
        setPhoneError('');
      }
    };
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  // Focus phone input when editing
  useEffect(() => {
    if (isEditingPhone && phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  }, [isEditingPhone]);

  const startEditingPhone = () => {
    setPhoneInput(user?.phone || '');
    setIsEditingPhone(true);
    setPhoneError('');
    setPhoneSaved(false);
  };

  const cancelEditingPhone = () => {
    setIsEditingPhone(false);
    setPhoneInput('');
    setPhoneError('');
  };

  const savePhone = async () => {
    const trimmed = phoneInput.trim();
    if (!trimmed || trimmed.length < 7) {
      setPhoneError('Enter a valid phone number (min 7 digits)');
      return;
    }
    if (trimmed.length > 20) {
      setPhoneError('Phone number is too long');
      return;
    }

    setPhoneSaving(true);
    setPhoneError('');
    try {
      const updatedUser = await authService.updatePhone(trimmed);
      updateUser({ phone: updatedUser.phone });
      setIsEditingPhone(false);
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 2500);
    } catch (err) {
      setPhoneError(err.response?.data?.detail || 'Failed to update phone number');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handlePhoneKeyDown = (e) => {
    if (e.key === 'Enter') savePhone();
    if (e.key === 'Escape') cancelEditingPhone();
  };

  // Define navigation items based on role
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
      badge: 'bg-blue-50 text-blue-700 border border-blue-200',
      gradient: 'from-blue-500 to-cyan-500',
      light: 'bg-blue-50',
    },
    green: {
      bg: 'bg-emerald-500',
      hover: 'hover:bg-emerald-600',
      text: 'text-emerald-600',
      border: 'border-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      gradient: 'from-emerald-500 to-teal-500',
      light: 'bg-emerald-50',
    },
    red: {
      bg: 'bg-red-500',
      hover: 'hover:bg-red-600',
      text: 'text-red-600',
      border: 'border-red-500',
      badge: 'bg-red-50 text-red-700 border border-red-200',
      gradient: 'from-red-500 to-rose-500',
      light: 'bg-red-50',
    },
  };

  const theme = themeClasses[themeColor];

  const getRoleIcon = () => {
    if (user?.role === 'citizen') return <UserIcon className="w-5 h-5 text-white" />;
    if (user?.role === 'officer') return <OfficerIcon className="w-5 h-5 text-white" />;
    if (user?.role === 'admin') return <AdminIcon className="w-5 h-5 text-white" />;
    return <UserIcon className="w-5 h-5 text-white" />;
  };

  const getRoleLabel = () => {
    if (user?.role === 'citizen') return 'Citizen Portal';
    if (user?.role === 'officer') return 'Officer Portal';
    if (user?.role === 'admin') return 'Admin Portal';
    return 'Portal';
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer flex-shrink-0" onClick={() => navigate(navItems[0]?.path)}>
            <div className={`w-10 h-10 bg-gradient-to-br ${theme.gradient} rounded-xl flex items-center justify-center shadow-sm`}>
              {getRoleIcon()}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Sankalpa</h1>
              <p className="text-[11px] text-gray-400 font-medium -mt-0.5">{getRoleLabel()}</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-0.5 mx-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  location.pathname === item.path
                    ? `${theme.bg} text-white shadow-sm`
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
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
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* User Menu - Desktop */}
          <div className="hidden lg:flex items-center gap-3 relative" ref={profileRef}>
            <span className={`px-3 py-1 ${theme.badge} rounded-full text-xs font-semibold capitalize`}>
              {user?.role}
            </span>
            <button
              onClick={() => { setProfileOpen(!profileOpen); setIsEditingPhone(false); setPhoneError(''); }}
              className="flex items-center gap-3 hover:bg-gray-50 rounded-xl px-2.5 py-1.5 transition-all"
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                <p className="text-[11px] text-gray-400">{user?.email}</p>
              </div>
              <img
                src={user?.profile_picture || `https://ui-avatars.com/api/?name=${user?.name}&background=3b82f6&color=fff`}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-gray-200 shadow-sm"
              />
            </button>

            {/* ─── Profile Popup ─── */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-2xl shadow-2xl shadow-gray-200/80 border border-gray-200 z-50 overflow-hidden">

                {/* Header - White with avatar */}
                <div className="relative px-6 pt-6 pb-5 bg-white border-b border-gray-100">
                  <button
                    onClick={() => { setProfileOpen(false); setIsEditingPhone(false); }}
                    className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={user?.profile_picture || `https://ui-avatars.com/api/?name=${user?.name}&size=80&background=3b82f6&color=fff`}
                        alt="Profile"
                        className="w-16 h-16 rounded-2xl shadow-md border-2 border-white"
                      />
                      {/* Online indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-emerald-400 border-2 border-white rounded-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{user?.name}</h3>
                      <p className="text-sm text-gray-400 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Info Fields */}
                <div className="px-5 py-4 space-y-0.5">

                  {/* Email Row */}
                  <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl">
                    <div className="w-9 h-9 bg-sky-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MailIcon className="w-4.5 h-4.5 text-sky-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Email</p>
                      <p className="text-sm text-gray-700 font-medium truncate">{user?.email}</p>
                    </div>
                  </div>

                  {/* Role Row */}
                  <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl">
                    <div className={`w-9 h-9 ${theme.light} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <TagIcon className={`w-4.5 h-4.5 ${theme.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Role</p>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 ${theme.badge} rounded-full text-xs font-semibold capitalize`}>
                          {user?.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Phone Row */}
                  <div className="flex items-start gap-3 px-2 py-2.5 rounded-xl">
                    <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <PhoneIcon className="w-4.5 h-4.5 text-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Phone Number</p>
                        {!isEditingPhone && (
                          <button
                            onClick={startEditingPhone}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                          >
                            <EditIcon className="w-3 h-3" />
                            {user?.phone ? 'Edit' : 'Add'}
                          </button>
                        )}
                      </div>

                      {isEditingPhone ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <input
                              ref={phoneInputRef}
                              type="tel"
                              value={phoneInput}
                              onChange={(e) => { setPhoneInput(e.target.value); setPhoneError(''); }}
                              onKeyDown={handlePhoneKeyDown}
                              placeholder="+977-9800000000"
                              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50 text-gray-800 placeholder-gray-300"
                              disabled={phoneSaving}
                            />
                            <button
                              onClick={savePhone}
                              disabled={phoneSaving}
                              className="w-8 h-8 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                            >
                              {phoneSaving ? <LoaderIcon className="w-3.5 h-3.5" /> : <CheckIcon className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={cancelEditingPhone}
                              disabled={phoneSaving}
                              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-500 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {phoneError && (
                            <p className="text-red-500 text-[11px] mt-1.5 font-medium">{phoneError}</p>
                          )}
                          <p className="text-gray-300 text-[11px] mt-1">Used for emergency SMS alerts</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {user?.phone ? (
                            <>
                              <p className="text-sm text-gray-700 font-medium">{user.phone}</p>
                              {phoneSaved && (
                                <span className="inline-flex items-center gap-1 text-emerald-500 text-[11px] font-semibold">
                                  <CheckIcon className="w-3 h-3" />
                                  Saved
                                </span>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-300 italic">Not added yet</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SMS Alert hint */}
                  {!user?.phone && !isEditingPhone && (
                    <div className="mx-2 mt-1 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                      <div className="flex items-start gap-2">
                        <BellIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-amber-700 font-semibold">Enable SMS Alerts</p>
                          <p className="text-[11px] text-amber-500 mt-0.5">Add your phone number to receive disaster alerts and emergency notifications via SMS.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Logout Button */}
                <div className="border-t border-gray-100 px-5 py-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <LogoutIcon className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-4 space-y-2">
            {/* User Info */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <img
                src={user?.profile_picture || `https://ui-avatars.com/api/?name=${user?.name}&background=3b82f6&color=fff`}
                alt="Profile"
                className="w-12 h-12 rounded-xl border-2 border-gray-200 shadow-sm"
              />
              <div>
                <p className="font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 ${theme.badge} rounded-full text-xs font-semibold capitalize`}>
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
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? `${theme.bg} text-white`
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition mt-4"
            >
              <LogoutIcon className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

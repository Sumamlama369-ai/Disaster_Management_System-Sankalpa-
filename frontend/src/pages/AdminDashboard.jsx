import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('home');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'reports', label: 'Reports', icon: '📄' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  const features = [
    {
      icon: '📊',
      title: 'System Analytics',
      description: 'View comprehensive system-wide statistics and insights',
      color: 'from-blue-500 to-blue-600',
      count: 'Real-time',
      link: 'analytics'
    },
    {
      icon: '👥',
      title: 'User Management',
      description: 'Manage all users, roles, and permissions',
      color: 'from-purple-500 to-purple-600',
      count: '0 Users',
      link: 'users'
    },
    {
      icon: '📄',
      title: 'Reports & Logs',
      description: 'Access detailed reports and system activity logs',
      color: 'from-green-500 to-green-600',
      count: 'Latest',
      link: 'reports'
    },
    {
      icon: '⚙️',
      title: 'System Settings',
      description: 'Configure system parameters and preferences',
      color: 'from-gray-500 to-gray-600',
      count: 'Configure',
      link: 'settings'
    },
    {
      icon: '🔑',
      title: 'Access Control',
      description: 'Manage organization codes and permissions',
      color: 'from-yellow-500 to-yellow-600',
      count: 'Secure',
      link: 'access'
    },
    {
      icon: '🛡️',
      title: 'Security',
      description: 'Monitor security events and manage policies',
      color: 'from-red-500 to-red-600',
      count: 'Protected',
      link: 'security'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-2xl">👑</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Sankalpa</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeNav === item.id
                      ? 'bg-red-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                Admin
              </span>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <img
                src={user?.profile_picture || 'https://ui-avatars.com/api/?name=' + user?.name}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-red-500"
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
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Admin Control Center 👑
            </h1>
            <p className="text-xl text-white/90 mb-6">
              Full system control. Manage users, monitor analytics, and configure system settings.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setActiveNav('analytics')}
                className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                📊 View Analytics
              </button>
              <button 
                onClick={() => setActiveNav('users')}
                className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg font-semibold hover:bg-white/30 transition"
              >
                👥 Manage Users
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">👥</div>
            <h3 className="text-2xl font-bold text-blue-600">0</h3>
            <p className="text-gray-600 text-sm">Total Users</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">👮</div>
            <h3 className="text-2xl font-bold text-green-600">0</h3>
            <p className="text-gray-600 text-sm">Active Officers</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">🚁</div>
            <h3 className="text-2xl font-bold text-purple-600">0</h3>
            <p className="text-gray-600 text-sm">Total Permits</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="text-2xl font-bold text-green-600">Online</h3>
            <p className="text-gray-600 text-sm">System Status</p>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Admin Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.03 }}
                onClick={() => setActiveNav(feature.link)}
                className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all"
              >
                <div className={`h-2 bg-gradient-to-r ${feature.color}`}></div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-4xl">{feature.icon}</div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {feature.count}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Coming Soon Notice */}
        {activeNav !== 'home' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed bottom-8 right-8 bg-red-500 text-white px-6 py-4 rounded-lg shadow-2xl"
          >
            <p className="font-semibold">🚧 Under Development</p>
            <p className="text-sm opacity-90">This feature is coming soon!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
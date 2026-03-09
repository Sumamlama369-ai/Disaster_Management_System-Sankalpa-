import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function CitizenDashboard() {
  const { user } = useAuth();

  const features = [
    {
      icon: '🚁',
      title: 'Emergency Drone Registration',
      description: 'Register and get permits for emergency drone operations quickly',
      color: 'from-blue-500 to-blue-600',
      link: '/drone-permit-form'
    },
    {
      icon: '📋',
      title: 'My Permits',
      description: 'View and manage all your drone permits and their status',
      color: 'from-green-500 to-green-600',
      link: '/my-permits'
    },
    {
      icon: '📹',
      title: 'Video Upload & Analysis',
      description: 'Upload disaster footage for AI-powered analysis with YOLOv8',
      color: 'from-purple-500 to-purple-600',
      link: '/video-analysis'
    },
    {
      icon: '📊',
      title: 'Real-time Dashboard',
      description: 'Monitor active disasters and emergency alerts in your area',
      color: 'from-red-500 to-red-600',
      link: '/disaster-dashboard'
    },
    {
      icon: '📋',
      title: 'My Disaster Reports',
      description: 'Track your submitted disaster reports, status updates, and officer responses',
      color: 'from-indigo-500 to-indigo-600',
      link: '/my-disaster-reports'
    },
    {
      icon: '🔔',
      title: 'Emergency Alerts',
      description: 'Receive instant notifications about disasters near you',
      color: 'from-yellow-500 to-yellow-600',
      link: '/alerts'
    },
    {
      icon: '🗺️',
      title: 'Safe Zones Map',
      description: 'Find nearby safe locations and evacuation centers',
      color: 'from-teal-500 to-teal-600',
      link: '/safe-zones'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-xl text-white/90 mb-6">
              Your safety is our priority. Report emergencies, register drones, and stay informed.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/drone-permit-form"
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                🚁 Register Drone
              </Link>
              <Link
                to="/disaster-dashboard"
                className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg font-semibold hover:bg-white/30 transition"
              >
                📊 View Dashboard
              </Link>
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
            <div className="text-3xl mb-2">🚁</div>
            <h3 className="text-2xl font-bold text-gray-800">0</h3>
            <p className="text-gray-600 text-sm">Active Permits</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">📹</div>
            <h3 className="text-2xl font-bold text-gray-800">0</h3>
            <p className="text-gray-600 text-sm">Videos Uploaded</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">🔔</div>
            <h3 className="text-2xl font-bold text-gray-800">0</h3>
            <p className="text-gray-600 text-sm">Active Alerts</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">✅</div>
            <h3 className="text-2xl font-bold text-green-600">Safe</h3>
            <p className="text-gray-600 text-sm">Current Status</p>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Available Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.03 }}
                className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all"
              >
                <Link to={feature.link} className="block">
                  <div className={`h-2 bg-gradient-to-r ${feature.color}`}></div>
                  <div className="p-6">
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
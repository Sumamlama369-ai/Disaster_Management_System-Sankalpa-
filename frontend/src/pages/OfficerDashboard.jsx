import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';

export default function OfficerDashboard() {
  const { user } = useAuth();

  const features = [
    {
      icon: '✅',
      title: 'Permit Review & Approval',
      description: 'Review and approve emergency drone permit applications',
      color: 'from-green-500 to-green-600',
      count: '0 Pending',
      link: '/permit-review'
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description: 'View statistics and trends of permit applications',
      color: 'from-blue-500 to-blue-600',
      count: '0 This Month',
      link: '/analytics'
    },
    {
      icon: '🚨',
      title: 'Emergency Alerts',
      description: 'Manage and send emergency alerts to citizens',
      color: 'from-red-500 to-red-600',
      count: '0 Active',
      link: '/alerts'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 via-teal-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Officer Dashboard 👮
            </h1>
            <p className="text-xl text-white/90 mb-6">
              Review permits, manage alerts, and coordinate emergency response operations.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="/permit-review"
                className="px-6 py-3 bg-white text-green-600 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                ✅ Review Permits
              </a>
              <a
                href="/reports"
                className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg font-semibold hover:bg-white/30 transition"
              >
                📊 View Reports
              </a>
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
            <div className="text-3xl mb-2">📝</div>
            <h3 className="text-2xl font-bold text-orange-600">0</h3>
            <p className="text-gray-600 text-sm">Pending Reviews</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">✅</div>
            <h3 className="text-2xl font-bold text-green-600">0</h3>
            <p className="text-gray-600 text-sm">Approved Today</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">🚁</div>
            <h3 className="text-2xl font-bold text-blue-600">0</h3>
            <p className="text-gray-600 text-sm">Active Drones</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">🚨</div>
            <h3 className="text-2xl font-bold text-red-600">0</h3>
            <p className="text-gray-600 text-sm">Active Alerts</p>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Officer Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.a
                key={index}
                href={feature.link}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.05 }}
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
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
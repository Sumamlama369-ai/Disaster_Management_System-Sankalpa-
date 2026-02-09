import { useState, useEffect } from 'react';
import { permitService } from '../services/permit';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';

export default function MyPermits() {
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPermit, setSelectedPermit] = useState(null);

  useEffect(() => {
    fetchPermits();
  }, []);

  const fetchPermits = async () => {
    try {
      const data = await permitService.getMyPermits();
      setPermits(data);
    } catch (error) {
      toast.error('Failed to load permits');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: '⏳', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', icon: '✅', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: '❌', label: 'Rejected' },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${config.color}`}>
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const viewDetails = async (permitId) => {
    try {
      const data = await permitService.getPermitDetails(permitId);
      setSelectedPermit(data);
    } catch (error) {
      toast.error('Failed to load permit details');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📋 My Drone Permits
          </h1>
          <p className="text-gray-600">
            View and track the status of your drone permit applications
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">📝</div>
            <h3 className="text-2xl font-bold text-gray-800">
              {permits.length}
            </h3>
            <p className="text-gray-600 text-sm">Total Applications</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">✅</div>
            <h3 className="text-2xl font-bold text-green-600">
              {permits.filter((p) => p.status === 'approved').length}
            </h3>
            <p className="text-gray-600 text-sm">Approved</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">⏳</div>
            <h3 className="text-2xl font-bold text-yellow-600">
              {permits.filter((p) => p.status === 'pending').length}
            </h3>
            <p className="text-gray-600 text-sm">Pending Review</p>
          </motion.div>
        </div>

        {/* Permits List */}
        {permits.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No Permits Yet
            </h3>
            <p className="text-gray-600 mb-6">
              You haven't submitted any drone permit applications
            </p>
            <button
              onClick={() => (window.location.href = '/drone-permit-form')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
            >
              Submit New Application
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {permits.map((permit, index) => (
              <motion.div
                key={permit.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">
                        {permit.manufacturer} {permit.model}
                      </h3>
                      {getStatusBadge(permit.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-semibold text-gray-700">Serial No:</p>
                        <p>{permit.serial_number}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Operator:</p>
                        <p>{permit.full_name}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Phone:</p>
                        <p>{permit.phone_number}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Applied:</p>
                        <p>{new Date(permit.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Officer Review Info (if reviewed) */}
                    {permit.officer_name && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="font-semibold text-blue-900 mb-2">
                          {permit.status === 'approved' ? '✅ Approved by:' : '❌ Rejected by:'}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="font-semibold text-gray-700">Officer:</p>
                            <p>{permit.officer_name}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Designation:</p>
                            <p>{permit.officer_designation}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Organization:</p>
                            <p>{permit.officer_organization}</p>
                          </div>
                        </div>
                        {permit.review_remarks && (
                          <div className="mt-2">
                            <p className="font-semibold text-gray-700">Remarks:</p>
                            <p className="text-gray-600">{permit.review_remarks}</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Reviewed on: {new Date(permit.reviewed_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => viewDetails(permit.id)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedPermit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Permit Details
                    </h2>
                    <p className="text-gray-600">Application #{selectedPermit.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPermit(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Detailed information - you can expand this */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-lg mb-3">Drone Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-700">Manufacturer:</p>
                        <p>{selectedPermit.manufacturer}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Model:</p>
                        <p>{selectedPermit.model}</p>
                      </div>
                      {/* Add more fields as needed */}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setSelectedPermit(null)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
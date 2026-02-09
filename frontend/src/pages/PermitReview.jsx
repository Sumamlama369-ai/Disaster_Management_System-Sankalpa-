import { useState, useEffect } from 'react';
import { permitService } from '../services/permit';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';

export default function PermitReview() {
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPermit, setSelectedPermit] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState({ url: '', type: '', name: '' });
  const [reviewData, setReviewData] = useState({
    officer_name: '',
    officer_designation: '',
    officer_organization: '',
    officer_email: '',
    review_remarks: '',
  });
  const [reviewAction, setReviewAction] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingPermits();
  }, []);

  const fetchPendingPermits = async () => {
    try {
      const data = await permitService.getPendingPermits();
      setPermits(data);
    } catch (error) {
      toast.error('Failed to load pending permits');
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (permitId) => {
    try {
      const data = await permitService.getPermitDetails(permitId);
      setSelectedPermit(data);
    } catch (error) {
      toast.error('Failed to load permit details');
    }
  };

  const viewDocument = (docPath, docType, docName) => {
    // Construct full URL for document
    const baseUrl = 'http://localhost:8000';
    const fullUrl = `${baseUrl}/${docPath}`;
    setSelectedDocument({ url: fullUrl, type: docType, name: docName });
    setShowDocumentModal(true);
  };

  const openReviewModal = (permit, action) => {
    setSelectedPermit(permit);
    setReviewAction(action);
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setReviewData({
      officer_name: '',
      officer_designation: '',
      officer_organization: '',
      officer_email: '',
      review_remarks: '',
    });
    setReviewAction('');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    if (!reviewData.officer_name || !reviewData.officer_designation || !reviewData.officer_organization || !reviewData.officer_email) {
      toast.error('Please fill in all officer information');
      return;
    }

    setSubmitting(true);

    try {
      await permitService.reviewPermit({
        permit_id: selectedPermit.id,
        status: reviewAction,
        officer_name: reviewData.officer_name,
        officer_designation: reviewData.officer_designation,
        officer_organization: reviewData.officer_organization,
        officer_email: reviewData.officer_email,
        review_remarks: reviewData.review_remarks,
      });

      toast.success(`Permit ${reviewAction} successfully!`);
      closeReviewModal();
      fetchPendingPermits();
      setSelectedPermit(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPermitData = async (permit) => {
    try {
        // Show loading toast
        const loadingToast = toast.loading('Preparing download package...');
        
        // Download ZIP package from backend
        const blob = await permitService.downloadPermitPackage(permit.id);
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `permit_${permit.id}_${permit.full_name.replace(/\s+/g, '_')}.zip`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.dismiss(loadingToast);
        toast.success('Permit package downloaded successfully! (ZIP file with data + documents)');
    } catch (error) {
        console.error('Download error:', error);
        toast.error('Failed to download permit package');
    }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
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
            ✅ Permit Review & Approval
          </h1>
          <p className="text-gray-600">
            Review pending drone permit applications and make approval decisions
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
            <h3 className="text-2xl font-bold text-orange-600">
              {permits.length}
            </h3>
            <p className="text-gray-600 text-sm">Pending Reviews</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">⏰</div>
            <h3 className="text-2xl font-bold text-blue-600">
              {permits.filter(p => {
                const daysDiff = Math.floor((new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24));
                return daysDiff > 3;
              }).length}
            </h3>
            <p className="text-gray-600 text-sm">Urgent (3+ days old)</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="text-3xl mb-2">🚁</div>
            <h3 className="text-2xl font-bold text-green-600">
              {new Set(permits.map(p => p.user_email)).size}
            </h3>
            <p className="text-gray-600 text-sm">Unique Applicants</p>
          </motion.div>
        </div>

        {/* Permits List */}
        {permits.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No Pending Reviews
            </h3>
            <p className="text-gray-600">
              All permit applications have been reviewed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {permits.map((permit, index) => {
              const daysSinceApplied = Math.floor((new Date() - new Date(permit.created_at)) / (1000 * 60 * 60 * 24));
              const isUrgent = daysSinceApplied > 3;

              return (
                <motion.div
                  key={permit.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition ${
                    isUrgent ? 'border-2 border-orange-500' : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-800">
                              {permit.manufacturer} {permit.model}
                            </h3>
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                              ⏳ Pending
                            </span>
                            {isUrgent && (
                              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                                🔥 Urgent
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Applied {daysSinceApplied} {daysSinceApplied === 1 ? 'day' : 'days'} ago • 
                            {new Date(permit.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Drone Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <p className="font-semibold text-gray-700">Serial No:</p>
                          <p className="text-gray-600">{permit.serial_number}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700">Type:</p>
                          <p className="text-gray-600">{permit.drone_type}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700">Max Payload:</p>
                          <p className="text-gray-600">{permit.max_payload} kg</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700">Year:</p>
                          <p className="text-gray-600">{permit.manufactured_year}</p>
                        </div>
                      </div>

                      {/* Applicant Details */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="font-semibold text-gray-700 mb-2">Applicant Information:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Name:</p>
                            <p className="font-medium text-gray-800">{permit.full_name}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Phone:</p>
                            <p className="font-medium text-gray-800">{permit.phone_number}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Email:</p>
                            <p className="font-medium text-gray-800">{permit.email_address}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Location:</p>
                            <p className="font-medium text-gray-800">
                              {permit.district}, {permit.province}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Registration:</p>
                            <p className="font-medium text-gray-800 capitalize">
                              {permit.registration_type}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 lg:w-48">
                      <button
                        onClick={() => viewDetails(permit.id)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                      >
                        📄 View Full Details
                      </button>
                      <button
                        onClick={() => downloadPermitData(permit)}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm font-medium"
                      >
                        💾 Download Data
                      </button>
                      <button
                        onClick={() => openReviewModal(permit, 'approved')}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => openReviewModal(permit, 'rejected')}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-medium"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full Details Modal */}
        {selectedPermit && !showReviewModal && (
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
                      Full Permit Details
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

                <div className="space-y-6">
                  {/* Drone Technical Specifications */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b">
                      🚁 Drone Technical Specifications
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-700">Manufacturer:</p>
                        <p className="text-gray-600">{selectedPermit.manufacturer}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Model:</p>
                        <p className="text-gray-600">{selectedPermit.model}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Serial Number:</p>
                        <p className="text-gray-600">{selectedPermit.serial_number}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Manufactured Year:</p>
                        <p className="text-gray-600">{selectedPermit.manufactured_year}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Drone Type:</p>
                        <p className="text-gray-600">{selectedPermit.drone_type}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Max Payload:</p>
                        <p className="text-gray-600">{selectedPermit.max_payload} kg</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Color:</p>
                        <p className="text-gray-600">{selectedPermit.color}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Retailer:</p>
                        <p className="text-gray-600">{selectedPermit.retailer_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Operator Information */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b">
                      👤 Operator Information
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-700">Registration Type:</p>
                        <p className="text-gray-600 capitalize">{selectedPermit.registration_type}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Full Name:</p>
                        <p className="text-gray-600">{selectedPermit.full_name}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Citizenship/Passport:</p>
                        <p className="text-gray-600">{selectedPermit.citizenship_passport_no}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Date of Birth:</p>
                        <p className="text-gray-600">
                          {new Date(selectedPermit.date_of_birth).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Phone:</p>
                        <p className="text-gray-600">{selectedPermit.phone_number}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Email:</p>
                        <p className="text-gray-600">{selectedPermit.email_address}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Username:</p>
                        <p className="text-gray-600">{selectedPermit.username}</p>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b">
                      📍 Address Information
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-700">Country:</p>
                        <p className="text-gray-600">{selectedPermit.country}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Province:</p>
                        <p className="text-gray-600">{selectedPermit.province}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">District:</p>
                        <p className="text-gray-600">{selectedPermit.district}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Municipality:</p>
                        <p className="text-gray-600">{selectedPermit.municipality}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Ward No:</p>
                        <p className="text-gray-600">{selectedPermit.ward_no}</p>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b">
                      📄 Submitted Documents
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => viewDocument(selectedPermit.purpose_letter, 'pdf', 'Purpose Letter')}
                        className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition text-left"
                      >
                        <span className="text-blue-500 text-xl">📄</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">Purpose Letter</p>
                          <p className="text-xs text-gray-500">PDF Document</p>
                        </div>
                        <span className="text-blue-500">→</span>
                      </button>

                      <button
                        onClick={() => viewDocument(selectedPermit.purchase_bill, 'pdf', 'Purchase Bill')}
                        className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition text-left"
                      >
                        <span className="text-blue-500 text-xl">📄</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">Purchase Bill</p>
                          <p className="text-xs text-gray-500">PDF Document</p>
                        </div>
                        <span className="text-blue-500">→</span>
                      </button>

                      <button
                        onClick={() => viewDocument(selectedPermit.drone_image, 'image', 'Drone Image')}
                        className="flex items-center gap-2 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition text-left"
                      >
                        <span className="text-green-500 text-xl">🖼️</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">Drone Image</p>
                          <p className="text-xs text-gray-500">Image File</p>
                        </div>
                        <span className="text-green-500">→</span>
                      </button>

                      <button
                        onClick={() => viewDocument(selectedPermit.citizenship_doc, 'pdf', 'Citizenship Document')}
                        className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition text-left"
                      >
                        <span className="text-blue-500 text-xl">📄</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">Citizenship</p>
                          <p className="text-xs text-gray-500">PDF Document</p>
                        </div>
                        <span className="text-blue-500">→</span>
                      </button>
                    </div>
                  </div>

                  {/* Agreement */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 text-xl">✓</span>
                      <div>
                        <p className="font-semibold text-blue-900">Applicant's Declaration</p>
                        <p className="text-sm text-blue-800">
                          Agreed to abide by MOHA Drone Working Procedure 2075 and CAAN Drone Requirements
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <button
                    onClick={() => downloadPermitData(selectedPermit)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    💾 Download Data
                  </button>
                  <button
                    onClick={() => setSelectedPermit(null)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Document Viewer Modal */}
        {showDocumentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">{selectedDocument.name}</h3>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-4 bg-gray-100">
                {selectedDocument.type === 'image' ? (
                  <img 
                    src={selectedDocument.url} 
                    alt={selectedDocument.name}
                    className="max-w-full h-auto mx-auto"
                  />
                ) : (
                  <iframe
                    src={selectedDocument.url}
                    className="w-full h-full min-h-[600px]"
                    title={selectedDocument.name}
                  />
                )}
              </div>

              <div className="p-4 border-t flex justify-end gap-3">
                <a
                  href={selectedDocument.url}
                  download
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  💾 Download
                </a>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Review Modal - (keeping existing code) */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full"
            >
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {reviewAction === 'approved' ? '✅ Approve Permit' : '❌ Reject Permit'}
                  </h2>
                  <p className="text-gray-600">
                    Application #{selectedPermit.id} - {selectedPermit.manufacturer} {selectedPermit.model}
                  </p>
                </div>

                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ Important:</strong> Please provide your officer identification details.
                      This information will be sent to the applicant.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        value={reviewData.officer_name}
                        onChange={(e) => setReviewData({ ...reviewData, officer_name: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Designation *
                      </label>
                      <input
                        type="text"
                        value={reviewData.officer_designation}
                        onChange={(e) => setReviewData({ ...reviewData, officer_designation: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., Senior Officer"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization *
                      </label>
                      <input
                        type="text"
                        value={reviewData.officer_organization}
                        onChange={(e) => setReviewData({ ...reviewData, officer_organization: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., NDRF, Fire Department"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Email *
                      </label>
                      <input
                        type="email"
                        value={reviewData.officer_email}
                        onChange={(e) => setReviewData({ ...reviewData, officer_email: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="officer@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Remarks {reviewAction === 'rejected' ? '*' : '(Optional)'}
                    </label>
                    <textarea
                      value={reviewData.review_remarks}
                      onChange={(e) => setReviewData({ ...reviewData, review_remarks: e.target.value })}
                      required={reviewAction === 'rejected'}
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder={
                        reviewAction === 'approved'
                          ? 'Optional: Add any notes or conditions...'
                          : 'Required: Explain why this permit is being rejected...'
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={closeReviewModal}
                      disabled={submitting}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`px-6 py-2 rounded-lg text-white font-medium transition ${
                        reviewAction === 'approved'
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-red-500 hover:bg-red-600'
                      } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {submitting
                        ? 'Submitting...'
                        : reviewAction === 'approved'
                        ? '✅ Confirm Approval'
                        : '❌ Confirm Rejection'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
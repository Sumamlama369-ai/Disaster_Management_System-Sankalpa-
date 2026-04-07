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
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-sky-500"></div>
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Permit Review & Approval
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
            <div className="mb-2"><svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
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
            <div className="mb-2"><svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
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
            <div className="mb-2"><svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" /><circle cx="12" cy="12" r="3" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m10-10h-4M6 12H2" /></svg></div>
            <h3 className="text-2xl font-bold text-green-600">
              {new Set(permits.map(p => p.user_email)).size}
            </h3>
            <p className="text-gray-600 text-sm">Unique Applicants</p>
          </motion.div>
        </div>

        {/* Permits List */}
        {permits.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="mb-4"><svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
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
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Pending
                            </span>
                            {isUrgent && (
                              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
                                Urgent
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
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        View Full Details
                      </button>
                      <button
                        onClick={() => downloadPermitData(permit)}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm font-medium"
                      >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Data
                      </button>
                      <button
                        onClick={() => openReviewModal(permit, 'approved')}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium"
                      >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Approve
                      </button>
                      <button
                        onClick={() => openReviewModal(permit, 'rejected')}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-medium"
                      >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Reject
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
                      <svg className="w-5 h-5 inline mr-1 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m10-10h-4M6 12H2" /></svg>
                      Drone Technical Specifications
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
                      <svg className="w-5 h-5 inline mr-1 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Operator Information
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
                      <svg className="w-5 h-5 inline mr-1 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Address Information
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
                      <svg className="w-5 h-5 inline mr-1 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      Submitted Documents
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => viewDocument(selectedPermit.purpose_letter, 'pdf', 'Purpose Letter')}
                        className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition text-left"
                      >
                        <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">Purpose Letter</p>
                          <p className="text-xs text-gray-500">PDF Document</p>
                        </div>
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>

                      <button
                        onClick={() => viewDocument(selectedPermit.purchase_bill, 'pdf', 'Purchase Bill')}
                        className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition text-left"
                      >
                        <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">Purchase Bill</p>
                          <p className="text-xs text-gray-500">PDF Document</p>
                        </div>
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>

                      <button
                        onClick={() => viewDocument(selectedPermit.drone_image, 'image', 'Drone Image')}
                        className="flex items-center gap-2 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition text-left"
                      >
                        <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">Drone Image</p>
                          <p className="text-xs text-gray-500">Image File</p>
                        </div>
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>

                      <button
                        onClick={() => viewDocument(selectedPermit.citizenship_doc, 'pdf', 'Citizenship Document')}
                        className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition text-left"
                      >
                        <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" /></svg>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">Citizenship</p>
                          <p className="text-xs text-gray-500">PDF Document</p>
                        </div>
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Agreement */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download Data
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
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
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
                    {reviewAction === 'approved' ? (
                      <span className="flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Approve Permit</span>
                    ) : (
                      <span className="flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Reject Permit</span>
                    )}
                  </h2>
                  <p className="text-gray-600">
                    Application #{selectedPermit.id} - {selectedPermit.manufacturer} {selectedPermit.model}
                  </p>
                </div>

                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      <strong><svg className="w-4 h-4 inline mr-1 text-yellow-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Important:</strong> Please provide your officer identification details.
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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
                        ? <span className="inline-flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Confirm Approval</span>
                        : <span className="inline-flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Confirm Rejection</span>}
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
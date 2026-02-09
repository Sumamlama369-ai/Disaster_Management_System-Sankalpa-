import api from './api';

export const permitService = {
  // Submit new permit request
  submitPermit: async (formData) => {
    const response = await api.post('/permits/submit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get my permits (citizen)
  getMyPermits: async () => {
    const response = await api.get('/permits/my-permits');
    return response.data;
  },

  // Get pending permits (officer)
  getPendingPermits: async () => {
    const response = await api.get('/permits/pending');
    return response.data;
  },

  // Get permit details
  getPermitDetails: async (permitId) => {
    const response = await api.get(`/permits/${permitId}`);
    return response.data;
  },

  // Review permit (officer)
  reviewPermit: async (reviewData) => {
    const response = await api.post('/permits/review', reviewData);
    return response.data;
  },

  // Download permit package (NEW)
  downloadPermitPackage: async (permitId) => {
    const response = await api.get(`/permits/download/${permitId}`, {
      responseType: 'blob', // Important for file download
    });
    return response.data;
  },
};
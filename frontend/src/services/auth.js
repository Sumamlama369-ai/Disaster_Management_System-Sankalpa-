import api from './api';

export const authService = {
  register: async (googleToken, role, organizationCode = null, masterAdminCode = null) => {
    const response = await api.post('/auth/register', {
      google_token: googleToken,
      role: role,
      organization_code: organizationCode,
      master_admin_code: masterAdminCode,
    });
    return response.data;
  },

  verifyOTP: async (email, otpCode) => {
    const response = await api.post('/auth/verify-otp', {
      email: email,
      otp_code: otpCode,
    });
    return response.data;
  },

  resendOTP: async (email) => {
    const response = await api.post('/auth/resend-otp', {
      email: email,
    });
    return response.data;
  },

  login: async (googleToken) => {
    const response = await api.post('/auth/login', {
      google_token: googleToken,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  checkEmail: async (email) => {
    const response = await api.get(`/auth/check-email/${email}`);
    return response.data;
  },
};
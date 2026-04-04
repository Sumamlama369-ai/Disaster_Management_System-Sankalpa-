import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginProcess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleLogin();
  }, []);

  const handleLogin = async () => {
    try {
      const googleToken = location.state?.googleToken || sessionStorage.getItem('google_token');

      if (!googleToken) {
        toast.error('Session expired. Please login again.');
        navigate('/');
        return;
      }

      const response = await authService.login(googleToken);

      if (response.success) {
        // User is verified - direct login
        login(response.access_token, response.user);

        // Navigate to dashboard
        const role = response.user.role;
        navigate(`/${role}-dashboard`);
      } else if (response.needs_verification) {
        // User needs OTP verification
        toast.info('Please verify your email');
        sessionStorage.setItem('verify_email', response.email);
        navigate('/verify-otp');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Login failed';
      toast.error(errorMsg);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <img src="/src/logo/FYP_Logo.png" alt="Sankalpa Logo" className="w-29 h-29 rounded-2xl object-contain mx-auto mb-8" />

        {/* Animated spinner */}
        <div className="relative w-10 h-10 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-3 border-slate-100" />
          <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-blue-500 animate-spin" />
        </div>

        <h3 className="text-lg font-semibold text-slate-800 mb-1">
          Signing you in...
        </h3>
        <p className="text-sm text-slate-400">
          Verifying your credentials securely
        </p>

        {/* Animated dots */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

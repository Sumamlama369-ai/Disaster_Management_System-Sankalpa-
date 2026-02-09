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
        toast.success('Welcome back!');
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-disaster-blue mx-auto"></div>
        <p className="mt-4 text-white text-lg">Logging in...</p>
      </div>
    </div>
  );
}
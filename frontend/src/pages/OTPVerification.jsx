import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function OTPVerification() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('verify_email');
    if (!storedEmail) {
      toast.error('Session expired. Please login again.');
      navigate('/');
      return;
    }
    setEmail(storedEmail);
    
    // Focus first input
    inputRefs.current[0]?.focus();
  }, [navigate]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(newOtp);
    
    // Focus last filled input
    const lastIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter complete OTP');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.verifyOTP(email, otpCode);

      if (response.success) {
        toast.success('Verification successful!');
        
        // Save auth data
        login(response.access_token, response.user);
        
        // Clear session storage
        sessionStorage.removeItem('google_token');
        sessionStorage.removeItem('verify_email');
        
        // Navigate to dashboard based on role
        const role = response.user.role;
        navigate(`/${role}-dashboard`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Invalid OTP';
      toast.error(errorMsg);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    try {
      await authService.resendOTP(email);
      toast.success('OTP resent successfully!');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="inline-block bg-disaster-blue/10 p-4 rounded-full mb-4">
              <span className="text-5xl">📧</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Verify Your Email
            </h1>
            <p className="text-gray-600">
              We've sent a 6-digit code to
            </p>
            <p className="text-disaster-blue font-semibold mt-1">
              {email}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* OTP Input */}
            <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-disaster-blue focus:outline-none transition-all"
                />
              ))}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className={`
                w-full py-4 rounded-xl font-semibold text-white text-lg
                transition-all transform hover:scale-[1.02]
                ${loading || otp.join('').length !== 6
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-disaster-blue hover:bg-blue-600 shadow-lg'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verifying...
                </span>
              ) : (
                'Verify & Continue'
              )}
            </button>
          </form>

          {/* Resend OTP */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendOTP}
              disabled={resending}
              className="mt-2 text-disaster-blue font-semibold hover:underline disabled:opacity-50"
            >
              {resending ? 'Resending...' : 'Resend OTP'}
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">💡 Tip:</span> The code expires in 10 minutes. 
              You have 3 attempts to enter the correct code.
            </p>
          </div>

          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="w-full mt-4 py-3 text-gray-600 hover:text-gray-800"
          >
            ← Back to Login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
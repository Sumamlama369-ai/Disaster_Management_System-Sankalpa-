import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import GoogleLoginButton from '../components/GoogleLoginButton';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const GOOGLE_CLIENT_ID = '319558988931-4s3luu63ovtsf2ugcnu8apvqkce7tc5h.apps.googleusercontent.com';

export default function PublicPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);

  const handleGoogleSuccess = (googleToken) => {
    // Store token temporarily
    sessionStorage.setItem('google_token', googleToken);
    
    if (isRegister) {
      // Go to role selection for registration
      navigate('/role-selection');
    } else {
      // Go to login (will handle OTP if needed)
      navigate('/login-process', { state: { googleToken } });
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-5xl w-full"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left side - Hero */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-white"
            >
              <div className="text-7xl mb-6">🚨</div>
              <h1 className="text-6xl font-bold mb-4">Sankalpa</h1>
              <p className="text-2xl mb-6 text-white/90">
                Disaster Management System
              </p>
              <p className="text-lg text-white/80 mb-8">
                Real-time disaster reporting, emergency response coordination, 
                and AI-powered threat detection to keep communities safe.
              </p>
              <div className="flex gap-4 flex-wrap">
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <span className="text-sm font-medium">🔐 Secure Authentication</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <span className="text-sm font-medium">⚡ Real-time Alerts</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <span className="text-sm font-medium">🤖 AI Detection</span>
                </div>
              </div>
            </motion.div>

            {/* Right side - Auth Card */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {isRegister ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-gray-600">
                  {isRegister 
                    ? 'Register to start reporting and managing disasters' 
                    : 'Sign in to access your dashboard'}
                </p>
              </div>

              {/* Google Login Button */}
              <div className="mb-6">
                <GoogleLoginButton 
                  onSuccess={handleGoogleSuccess}
                  text={isRegister ? "signup_with" : "signin_with"}
                />
              </div>

              {/* Toggle Login/Register */}
              <div className="text-center">
                <p className="text-gray-600">
                  {isRegister ? 'Already have an account?' : "Don't have an account?"}
                  <button
                    onClick={() => setIsRegister(!isRegister)}
                    className="ml-2 text-disaster-blue font-semibold hover:underline"
                  >
                    {isRegister ? 'Login' : 'Register'}
                  </button>
                </p>
              </div>

              {/* Features */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Three role types: Citizen, Officer, Admin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Secure OTP verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Role-based access control</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 text-center text-white/80 text-sm"
          >
            <p>Powered by AI • Real-time Monitoring • Emergency Response</p>
          </motion.div>
        </motion.div>
      </div>
    </GoogleOAuthProvider>
  );
}
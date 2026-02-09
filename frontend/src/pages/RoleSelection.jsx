import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function RoleSelection() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('');
  const [organizationCode, setOrganizationCode] = useState('');
  const [masterAdminCode, setMasterAdminCode] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: 'citizen',
      name: 'Citizen',
      icon: '👤',
      description: 'Report disasters, receive alerts, access emergency resources',
      color: 'bg-blue-500',
      needsCode: false
    },
    {
      id: 'officer',
      name: 'Officer',
      icon: '👮',
      description: 'Verify reports, coordinate response, send alerts',
      color: 'bg-green-500',
      needsCode: true,
      codePlaceholder: 'Enter organization code (e.g., NDRF2024)'
    },
    {
      id: 'admin',
      name: 'Admin',
      icon: '👑',
      description: 'Manage users, system configuration, full control',
      color: 'bg-red-500',
      needsCode: true,
      codePlaceholder: 'Enter master admin code'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    const selectedRoleData = roles.find(r => r.id === selectedRole);
    
    // Validate codes
    if (selectedRoleData.needsCode) {
      if (selectedRole === 'officer' && !organizationCode) {
        toast.error('Organization code is required for officers');
        return;
      }
      if (selectedRole === 'admin' && !masterAdminCode) {
        toast.error('Master admin code is required for admins');
        return;
      }
    }

    setLoading(true);

    try {
      const googleToken = sessionStorage.getItem('google_token');
      
      if (!googleToken) {
        toast.error('Session expired. Please login again.');
        navigate('/');
        return;
      }

      const response = await authService.register(
        googleToken,
        selectedRole,
        selectedRole === 'officer' ? organizationCode : null,
        selectedRole === 'admin' ? masterAdminCode : null
      );

      if (response.success) {
        toast.success('OTP sent to your email!');
        // Store email for OTP verification
        sessionStorage.setItem('verify_email', response.email);
        navigate('/verify-otp');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Registration failed';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Select Your Role
            </h1>
            <p className="text-gray-600">
              Choose how you want to contribute to disaster management
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Role Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {roles.map((role) => (
                <motion.div
                  key={role.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRole(role.id)}
                  className={`
                    relative cursor-pointer rounded-2xl p-6 border-4 transition-all
                    ${selectedRole === role.id 
                      ? 'border-disaster-blue shadow-xl bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {/* Selected Indicator */}
                  {selectedRole === role.id && (
                    <div className="absolute top-3 right-3 bg-disaster-blue text-white rounded-full w-8 h-8 flex items-center justify-center">
                      ✓
                    </div>
                  )}

                  {/* Icon */}
                  <div className="text-5xl mb-3">{role.icon}</div>

                  {/* Role Name */}
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {role.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-600">
                    {role.description}
                  </p>

                  {/* Badge */}
                  {role.needsCode && (
                    <div className="mt-3 inline-block">
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Requires Code
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Code Input Fields */}
            {selectedRole === 'officer' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6"
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Code *
                </label>
                <input
                  type="text"
                  value={organizationCode}
                  onChange={(e) => setOrganizationCode(e.target.value)}
                  placeholder="NDRF2024, FIRE-DEPT-2024, or POLICE-2024"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-disaster-blue focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Valid codes: NDRF2024, FIRE-DEPT-2024, POLICE-2024
                </p>
              </motion.div>
            )}

            {selectedRole === 'admin' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6"
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Master Admin Code *
                </label>
                <input
                  type="password"
                  value={masterAdminCode}
                  onChange={(e) => setMasterAdminCode(e.target.value)}
                  placeholder="Enter secure admin code"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-disaster-blue focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Contact administrator for the master code
                </p>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedRole}
              className={`
                w-full py-4 rounded-xl font-semibold text-white text-lg
                transition-all transform hover:scale-[1.02]
                ${loading || !selectedRole
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-disaster-blue hover:bg-blue-600 shadow-lg'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </span>
              ) : (
                'Continue to Verification'
              )}
            </button>
          </form>

          {/* Back Button */}
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
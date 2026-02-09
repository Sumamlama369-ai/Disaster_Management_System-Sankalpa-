import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Login function
  const login = (accessToken, userData) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Get user role
  const getRole = () => {
    return user?.role || null;
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    getRole,
    hasRole,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
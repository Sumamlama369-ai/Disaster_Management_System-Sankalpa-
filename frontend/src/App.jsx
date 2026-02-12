import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import LiveDashboard from './pages/LiveDashboard';

// Pages
import PublicPage from './pages/PublicPage';
import RoleSelection from './pages/RoleSelection';
import OTPVerification from './pages/OTPVerification';
import LoginProcess from './pages/LoginProcess';
import CitizenDashboard from './pages/CitizenDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DronePermitForm from './pages/DronePermitForm';
import MyPermits from './pages/MyPermits';
import PermitReview from './pages/PermitReview';
import VideoAnalysis from './pages/VideoAnalysis';
import NoFlyZone from './pages/NoFlyZone';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicPage />} />
          <Route path="/role-selection" element={<RoleSelection />} />
          <Route path="/verify-otp" element={<OTPVerification />} />
          <Route path="/login-process" element={<LoginProcess />} />

          {/* Protected Routes - Citizen */}
          <Route
            path="/citizen-dashboard"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Officer */}
          <Route
            path="/officer-dashboard"
            element={
              <ProtectedRoute allowedRoles={['officer']}>
                <OfficerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Admin */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Citizen Routes */}
          <Route
            path="/drone-permit-form"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <DronePermitForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-permits"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <MyPermits />
              </ProtectedRoute>
            }
          />

          {/* Officer Routes */}
          <Route
            path="/permit-review"
            element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <PermitReview />
              </ProtectedRoute>
            }
          />
          {/* Citizen Route - Live Dashboard */}
          <Route
            path="/disaster-dashboard"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <LiveDashboard />
              </ProtectedRoute>
            }
          />

          {/* Video Analysis Route */}
          <Route
            path="/video-analysis"
            element={
              <ProtectedRoute allowedRoles={['citizen','officer', 'admin']}>
                <VideoAnalysis />
              </ProtectedRoute>
            }
          />

          {/* No Fly Zone Route */}
          <Route path="/no-fly-zone" element={<NoFlyZone />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
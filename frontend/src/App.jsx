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
import AdminAnalytics from './pages/AdminAnalytics';
import DisasterAlertSMS from './pages/DisasterAlertSMS';
import AdminWeather from './pages/AdminWeather';
import DronePermitForm from './pages/DronePermitForm';
import MyPermits from './pages/MyPermits';
import PermitReview from './pages/PermitReview';
import VideoAnalysis from './pages/VideoAnalysis';
import NoFlyZone from './pages/NoFlyZone';

import DisasterReport from './pages/DisasterReport';
import NepalWeather from './pages/NepalWeather';
import CommandCenter from './pages/CommandCenter';
import IncidentWeather from './pages/IncidentWeather';
import LiveSurveillance from './pages/LiveSurveillance';
import MyDisasterReports from './pages/MyDisasterReports';
import DroneVisualization from './pages/DroneVisualization';
import UserManagement from './pages/UserManagement';


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
          
          {/* Admin Analytics */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />

          {/* Admin SMS Alerts */}
          <Route
            path="/sms-alerts"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DisasterAlertSMS />
              </ProtectedRoute>
            }
          />

          {/* Admin Weather Intelligence */}
          <Route
            path="/admin-weather"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminWeather />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
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
              <ProtectedRoute allowedRoles={['citizen','officer']}>
                <VideoAnalysis />
              </ProtectedRoute>
            }
          />

          {/* No Fly Zone Route */}
          <Route path="/no-fly-zone" element={<NoFlyZone />} />

          {/* Nepal Weather Route */}
          <Route
            path="/nepal-weather"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <NepalWeather />
              </ProtectedRoute>
            }
          />

          {/* Disaster Report Route */}
          <Route
            path="/report-disaster"
            element={<DisasterReport />}
          />

          {/* My Disaster Reports Route */}
          <Route
            path="/my-disaster-reports"
            element={
              <ProtectedRoute allowedRoles={['citizen', 'officer', 'admin']}>
                <MyDisasterReports />
              </ProtectedRoute>
            }
          />

          {/* Command Center Route */}
          <Route
            path="/command-center"
            element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <CommandCenter />
              </ProtectedRoute>
            }
          />

          {/* Incident Weather Route */}
          <Route
            path="/incident-weather"
            element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <IncidentWeather />
              </ProtectedRoute>
            }
          />

          {/* Live Surveillance Route */}
          <Route
            path="/live-surveillance"
            element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <LiveSurveillance />
              </ProtectedRoute>
            }
          />

          {/* Drone Visualization Route */}
          <Route
            path="/drone-visualization"
            element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <DroneVisualization />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
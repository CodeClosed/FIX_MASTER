import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

// Auth Features
import { LoginScreen } from './features/auth/LoginScreen';
import { RegisterScreen } from './features/auth/RegisterScreen';

// Student Features
import { StudentHome } from './features/student/StudentHome';
import { NewComplaintForm } from './features/student/NewComplaintForm';
import { MyComplaints } from './features/student/MyComplaints';

// Staff Features
import { StaffQueue } from './features/staff/StaffQueue';

// Supervisor Features
import { SupervisorDashboard } from './features/supervisor/SupervisorDashboard';
import { AllComplaintsTable } from './features/supervisor/AllComplaintsTable';
import { HotspotsTable } from './features/supervisor/HotspotsTable';
import { EscalatedQueue } from './features/supervisor/EscalatedQueue';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

const RoleRedirect: React.FC = () => {
  const { user, getHomeRouteForRole, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomeRouteForRole(user.role)} replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginScreen />} />
              <Route path="/register" element={<RegisterScreen />} />

              {/* Protected App Shell */}
              <Route element={<AppShell />}>
                {/* Default Index Route */}
                <Route path="/" element={<RoleRedirect />} />

                {/* Student Portal */}
                <Route
                  path="/student"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <StudentHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/new"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <NewComplaintForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/complaints"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <MyComplaints />
                    </ProtectedRoute>
                  }
                />

                {/* Staff Portal */}
                <Route
                  path="/staff"
                  element={
                    <ProtectedRoute allowedRoles={['STAFF']}>
                      <StaffQueue />
                    </ProtectedRoute>
                  }
                />

                {/* Supervisor / Admin Portal */}
                <Route
                  path="/supervisor"
                  element={
                    <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
                      <SupervisorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/supervisor/all-complaints"
                  element={
                    <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
                      <AllComplaintsTable />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/supervisor/hotspots"
                  element={
                    <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
                      <HotspotsTable />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/supervisor/escalated"
                  element={
                    <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
                      <EscalatedQueue />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Fallback Catch-all Route */}
              <Route path="*" element={<RoleRedirect />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

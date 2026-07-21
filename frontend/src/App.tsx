import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ExamPage } from './pages/student/ExamPage';

// Teacher Pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { ManageQuestions } from './pages/teacher/ManageQuestions';
import { LiveMonitor } from './pages/teacher/LiveMonitor';
import { HistoricalResults } from './pages/teacher/HistoricalResults';
import { BulkImport } from './features/teacher/BulkImport';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';

// Catch-all Default Redirector Component
const DefaultRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="mt-4 text-slate-400 font-medium tracking-wide">Initializing QuizNest...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on current role
  if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
  if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;

  return <Navigate to="/login" replace />;
};

const AppContent: React.FC = () => {
  return (
    <>
      <Navbar />
      <div className="flex-1 flex flex-col">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student Protected Portals */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exam/:id"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <ExamPage />
              </ProtectedRoute>
            }
          />

          {/* Teacher Protected Portals */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/questions"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <ManageQuestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/monitor"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <LiveMonitor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/results"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <HistoricalResults />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/import"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <BulkImport />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Portals */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </div>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;

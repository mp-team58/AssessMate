import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import DashboardLayout from './layouts/DashboardLayout';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

import CandidateLayout from './layouts/CandidateLayout';
import DynamicLayout from './layouts/DynamicLayout';
import NotFound from './pages/NotFound';
import RouteMeta from './components/RouteMeta';
import { useLocation } from 'react-router-dom';
import { scrollAppToTop } from './utils/scroll';

import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminLayout from './layouts/AdminLayout';

const HostDashboard = React.lazy(() => import('./pages/HostDashboard'));
const HostExamResults = React.lazy(() => import('./pages/HostExamResults'));
const HostCandidateReport = React.lazy(() => import('./pages/HostCandidateReport'));
const HostProctoring = React.lazy(() => import('./pages/HostProctoring'));
const HostLiveMonitor = React.lazy(() => import('./pages/HostLiveMonitor'));
const CreateExam = React.lazy(() => import('./pages/CreateExam'));
const GenerateQuestions = React.lazy(() => import('./pages/GenerateQuestions'));
const ExamQuestions = React.lazy(() => import('./pages/ExamQuestions'));
const CandidateDashboard = React.lazy(() => import('./pages/CandidateDashboard'));
const MyExams = React.lazy(() => import('./pages/MyExams'));
const ManageExam = React.lazy(() => import('./pages/ManageExam'));
const QuestionBank = React.lazy(() => import('./pages/QuestionBank'));
const MyAssessments = React.lazy(() => import('./pages/MyAssessments'));
const CandidateResults = React.lazy(() => import('./pages/CandidateResults'));
const CandidatePerformance = React.lazy(() => import('./pages/CandidatePerformance'));
const UserProfile = React.lazy(() => import('./pages/UserProfile'));
const JoinAssessment = React.lazy(() => import('./pages/JoinAssessment'));
const ActiveExam = React.lazy(() => import('./pages/ActiveExam'));
const ExamResult = React.lazy(() => import('./pages/ExamResult'));

const AdminLogin = React.lazy(() => import('./pages/admin/AdminLogin'));
const AdminSetupPassword = React.lazy(() => import('./pages/admin/AdminSetupPassword'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminHosts = React.lazy(() => import('./pages/admin/AdminHosts'));
const AdminCandidates = React.lazy(() => import('./pages/admin/AdminCandidates'));
const AdminExams = React.lazy(() => import('./pages/admin/AdminExams'));
const AdminActivity = React.lazy(() => import('./pages/admin/AdminActivity'));
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings'));

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { scrollAppToTop(); }, [pathname]);
  return null;
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface" role="status" aria-label="Loading">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
    </div>
  );
}

function App() {
  return (
    <ConfirmProvider>
      <ToastProvider>
        <ScrollToTop />
        <RouteMeta />
        <React.Suspense fallback={<PageLoader />}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/setup-password" element={<AdminSetupPassword />} />
          <Route element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/hosts" element={<AdminHosts />} />
              <Route path="/admin/candidates" element={<AdminCandidates />} />
              <Route path="/admin/exams" element={<AdminExams />} />
              <Route path="/admin/activity" element={<AdminActivity />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/profile" element={<UserProfile />} />
            </Route>
          </Route>

          {/* Protected Routes (Role based protection) */}
          <Route element={<ProtectedRoute allowedRole="HOST" />}>
            <Route element={<DashboardLayout />}>
              <Route path="/host/dashboard" element={<HostDashboard />} />
              <Route path="/host/my-exams" element={<MyExams />} />
              <Route path="/host/exams/:id/manage" element={<ManageExam />} />
              <Route path="/host/exams/:id/results" element={<HostExamResults />} />
              <Route path="/host/exams/:id/results/:enrollmentId" element={<HostCandidateReport />} />
              <Route path="/host/exams/:id/proctoring" element={<HostProctoring />} />
              <Route path="/host/exams/:id/live" element={<HostLiveMonitor />} />
              <Route path="/host/create-exam" element={<CreateExam />} />
              <Route path="/host/exams/:id/edit" element={<CreateExam />} />
              <Route path="/host/generate-questions" element={<GenerateQuestions />} />
              <Route path="/host/question-bank" element={<QuestionBank />} />
              <Route path="/host/exams/:examId/questions" element={<ExamQuestions />} />
              <Route path="/host/profile" element={<UserProfile />} />
            </Route>
          </Route>

          {/* Candidate Routes with Layout matching Host Dashboard */}
          <Route element={<ProtectedRoute allowedRole="CANDIDATE" />}>
            <Route element={<CandidateLayout />}>
              <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
              <Route path="/candidate/my-assessments" element={<MyAssessments />} />
              <Route path="/candidate/results" element={<CandidateResults />} />
              <Route path="/candidate/performance" element={<CandidatePerformance />} />
              <Route path="/candidate/profile" element={<UserProfile />} />
              <Route path="/candidate/join" element={<JoinAssessment />} />
              <Route path="/candidate/result/:enrollmentId" element={<ExamResult />} />
            </Route>
          </Route>

          {/* Active Exam is full-screen dedicated examination room */}
          <Route element={<ProtectedRoute allowedRole="CANDIDATE" />}>
            <Route path="/candidate/exam/:enrollmentId" element={<ActiveExam />} />
          </Route>

          {/* Shared Profile Route */}
          <Route element={<ProtectedRoute allowedRole={['HOST', 'CANDIDATE', 'ADMIN']} />}>
            <Route element={<DynamicLayout />}>
              <Route path="/profile" element={<UserProfile />} />
            </Route>
          </Route>

              {/* Anything that doesn't match above */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </React.Suspense>
      </ToastProvider>
    </ConfirmProvider>
  );
}

export default App;

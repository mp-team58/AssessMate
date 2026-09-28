import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import HostDashboard from './pages/HostDashboard';
import HostExamResults from './pages/HostExamResults';
import HostCandidateReport from './pages/HostCandidateReport';
import HostProctoring from './pages/HostProctoring';
import HostLiveMonitor from './pages/HostLiveMonitor';
import CreateExam from './pages/CreateExam';
import GenerateQuestions from './pages/GenerateQuestions';
import ExamQuestions from './pages/ExamQuestions';
import CandidateDashboard from './pages/CandidateDashboard';
import DashboardLayout from './layouts/DashboardLayout';
import MyExams from './pages/MyExams';
import ManageExam from './pages/ManageExam';
import QuestionBank from './pages/QuestionBank';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';

import CandidateLayout from './layouts/CandidateLayout';
import MyAssessments from './pages/MyAssessments';
import CandidateResults from './pages/CandidateResults';
import CandidatePerformance from './pages/CandidatePerformance';
import CandidateProfile from './pages/CandidateProfile';
import JoinAssessment from './pages/JoinAssessment';
import ActiveExam from './pages/ActiveExam';
import ExamResult from './pages/ExamResult';
import { useLocation } from 'react-router-dom';
import { scrollAppToTop } from './utils/scroll';

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { scrollAppToTop(); }, [pathname]);
  return null;
}

function App() {
  return (
    <ToastProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
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
        </Route>
      </Route>

      {/* Candidate Routes with Layout matching Host Dashboard */}
      <Route element={<ProtectedRoute allowedRole="CANDIDATE" />}>
        <Route element={<CandidateLayout />}>
        <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
        <Route path="/candidate/my-assessments" element={<MyAssessments />} />
        <Route path="/candidate/results" element={<CandidateResults />} />
        <Route path="/candidate/performance" element={<CandidatePerformance />} />
        <Route path="/candidate/profile" element={<CandidateProfile />} />
        <Route path="/candidate/join" element={<JoinAssessment />} />
        <Route path="/candidate/result/:enrollmentId" element={<ExamResult />} />
        </Route>
      </Route>

      {/* Active Exam is full-screen dedicated examination room */}
      <Route element={<ProtectedRoute allowedRole="CANDIDATE" />}>
        <Route path="/candidate/exam/:enrollmentId" element={<ActiveExam />} />
      </Route>
      </Routes>
    </ToastProvider>
  );
}

export default App;

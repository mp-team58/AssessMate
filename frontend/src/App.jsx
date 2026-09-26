import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import HostDashboard from './pages/HostDashboard';
import CreateExam from './pages/CreateExam';
import GenerateQuestions from './pages/GenerateQuestions';
import ExamQuestions from './pages/ExamQuestions';
import CandidateDashboard from './pages/CandidateDashboard';
import DashboardLayout from './layouts/DashboardLayout';
import MyExams from './pages/MyExams';
import ManageExam from './pages/ManageExam';
import QuestionBank from './pages/QuestionBank';
import { ToastProvider } from './contexts/ToastContext';

import CandidateLayout from './layouts/CandidateLayout';
import MyAssessments from './pages/MyAssessments';
import CandidateResults from './pages/CandidateResults';
import CandidatePerformance from './pages/CandidatePerformance';
import CandidateProfile from './pages/CandidateProfile';
import JoinAssessment from './pages/JoinAssessment';
import ActiveExam from './pages/ActiveExam';
import ExamResult from './pages/ExamResult';

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Protected Routes (Role based protection will be added later) */}
      <Route element={<DashboardLayout />}>
        <Route path="/host/dashboard" element={<HostDashboard />} />
        <Route path="/host/my-exams" element={<MyExams />} />
        <Route path="/host/exams/:id/manage" element={<ManageExam />} />
        <Route path="/host/create-exam" element={<CreateExam />} />
        <Route path="/host/generate-questions" element={<GenerateQuestions />} />
        <Route path="/host/question-bank" element={<QuestionBank />} />
        <Route path="/host/exams/:examId/questions" element={<ExamQuestions />} />
      </Route>

      {/* Candidate Routes with Layout matching Host Dashboard */}
      <Route element={<CandidateLayout />}>
        <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
        <Route path="/candidate/my-assessments" element={<MyAssessments />} />
        <Route path="/candidate/results" element={<CandidateResults />} />
        <Route path="/candidate/performance" element={<CandidatePerformance />} />
        <Route path="/candidate/profile" element={<CandidateProfile />} />
        <Route path="/candidate/join" element={<JoinAssessment />} />
        <Route path="/candidate/result/:enrollmentId" element={<ExamResult />} />
      </Route>

      {/* Active Exam is full-screen dedicated examination room */}
        <Route path="/candidate/exam/:enrollmentId" element={<ActiveExam />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;

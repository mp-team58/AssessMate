import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import HostDashboard from './pages/HostDashboard';
import CreateExam from './pages/CreateExam';
import GenerateQuestions from './pages/GenerateQuestions';
import CandidateDashboard from './pages/CandidateDashboard';
import DashboardLayout from './layouts/DashboardLayout';
import MyExams from './pages/MyExams';
import ManageExam from './pages/ManageExam';

function App() {
  return (
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
      </Route>

      {/* Candidate Routes */}
      <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
    </Routes>
  );
}

export default App;

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* 
        Future routes to be implemented in subsequent phases:
        <Route element={<ProtectedRoute role="host" />}>
          <Route path="/host/dashboard" element={<HostDashboard />} />
        </Route>
        <Route element={<ProtectedRoute role="candidate" />}>
          <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
        </Route>
      */}
    </Routes>
  );
}

export default App;

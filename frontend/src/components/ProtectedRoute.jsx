import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    // Redirect user to their respective dashboard if they try to access unauthorized routes
    if (role === 'HOST') return <Navigate to="/host/dashboard" replace />;
    if (role === 'CANDIDATE') return <Navigate to="/candidate/dashboard" replace />;
    
    // Fallback if role is completely missing or invalid
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

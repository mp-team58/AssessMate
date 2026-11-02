import React from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from './DashboardLayout';
import CandidateLayout from './CandidateLayout';
import { Navigate } from 'react-router-dom';

export default function DynamicLayout() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user?.role === 'HOST') {
    return <DashboardLayout />;
  }

  if (user?.role === 'CANDIDATE') {
    return <CandidateLayout />;
  }

  // Fallback
  return <Navigate to="/login" replace />;
}

import React from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from './DashboardLayout';
import CandidateLayout from './CandidateLayout';
import AdminLayout from './AdminLayout';
import { Navigate } from 'react-router-dom';

export default function DynamicLayout() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <AdminLayout />;
  }

  if (user?.role === 'HOST') {
    return <DashboardLayout />;
  }

  if (user?.role === 'CANDIDATE') {
    return <CandidateLayout />;
  }

  return <Navigate to="/login" replace />;
}

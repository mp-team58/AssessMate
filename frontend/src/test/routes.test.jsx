import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminProtectedRoute from '../components/AdminProtectedRoute';
import { renderWithProviders } from './test-utils';

function DummyTarget({ label }) {
  return <div data-testid="target-content">{label}</div>;
}

function DummyLogin() {
  return <div data-testid="login-page">Login Page</div>;
}

function DummyAdminLogin() {
  return <div data-testid="admin-login-page">Admin Login Page</div>;
}

function DummyCandidateDashboard() {
  return <div data-testid="candidate-dashboard">Candidate Dashboard</div>;
}

function DummyHostDashboard() {
  return <div data-testid="host-dashboard">Host Dashboard</div>;
}

describe('Frontend Route Protection Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('ProtectedRoute', () => {
    it('redirects unauthenticated users to /login', () => {
      renderWithProviders(
        <Routes>
          <Route path="/login" element={<DummyLogin />} />
          <Route element={<ProtectedRoute allowedRole="HOST" />}>
            <Route path="/host/dashboard" element={<DummyTarget label="Host Portal" />} />
          </Route>
        </Routes>,
        { route: '/host/dashboard' }
      );

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('target-content')).not.toBeInTheDocument();
    });

    it('renders child component when authenticated with matching role', () => {
      renderWithProviders(
        <Routes>
          <Route path="/login" element={<DummyLogin />} />
          <Route element={<ProtectedRoute allowedRole="HOST" />}>
            <Route path="/host/dashboard" element={<DummyTarget label="Host Portal" />} />
          </Route>
        </Routes>,
        { route: '/host/dashboard', initialRole: 'HOST' }
      );

      expect(screen.getByTestId('target-content')).toHaveTextContent('Host Portal');
    });

    it('redirects a CANDIDATE attempting to access a HOST route to /candidate/dashboard', () => {
      renderWithProviders(
        <Routes>
          <Route path="/candidate/dashboard" element={<DummyCandidateDashboard />} />
          <Route element={<ProtectedRoute allowedRole="HOST" />}>
            <Route path="/host/dashboard" element={<DummyTarget label="Host Portal" />} />
          </Route>
        </Routes>,
        { route: '/host/dashboard', initialRole: 'CANDIDATE' }
      );

      expect(screen.getByTestId('candidate-dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('target-content')).not.toBeInTheDocument();
    });

    it('redirects a HOST attempting to access a CANDIDATE route to /host/dashboard', () => {
      renderWithProviders(
        <Routes>
          <Route path="/host/dashboard" element={<DummyHostDashboard />} />
          <Route element={<ProtectedRoute allowedRole="CANDIDATE" />}>
            <Route path="/candidate/dashboard" element={<DummyTarget label="Candidate Portal" />} />
          </Route>
        </Routes>,
        { route: '/candidate/dashboard', initialRole: 'HOST' }
      );

      expect(screen.getByTestId('host-dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('target-content')).not.toBeInTheDocument();
    });
  });

  describe('AdminProtectedRoute', () => {
    it('redirects unauthenticated visitors to /admin', () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin" element={<DummyAdminLogin />} />
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin/dashboard" element={<DummyTarget label="Admin Secret" />} />
          </Route>
        </Routes>,
        { route: '/admin/dashboard' }
      );

      expect(screen.getByTestId('admin-login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('target-content')).not.toBeInTheDocument();
    });

    it('redirects non-admin authenticated users away from admin dashboard', () => {
      renderWithProviders(
        <Routes>
          <Route path="/candidate/dashboard" element={<DummyCandidateDashboard />} />
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin/dashboard" element={<DummyTarget label="Admin Secret" />} />
          </Route>
        </Routes>,
        { route: '/admin/dashboard', initialRole: 'CANDIDATE' }
      );

      expect(screen.getByTestId('candidate-dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('target-content')).not.toBeInTheDocument();
    });

    it('allows ADMIN users to view admin portal', () => {
      renderWithProviders(
        <Routes>
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin/dashboard" element={<DummyTarget label="Admin Control Panel" />} />
          </Route>
        </Routes>,
        { route: '/admin/dashboard', initialRole: 'ADMIN' }
      );

      expect(screen.getByTestId('target-content')).toHaveTextContent('Admin Control Panel');
    });

    it('forces password change screen if mustChangePassword flag is true', () => {
      localStorage.setItem('mustChangePassword', 'true');
      renderWithProviders(
        <Routes>
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin/dashboard" element={<DummyTarget label="Admin Control Panel" />} />
          </Route>
        </Routes>,
        { route: '/admin/dashboard', initialRole: 'ADMIN' }
      );

      expect(screen.getByText(/Password Change Required/i)).toBeInTheDocument();
      expect(screen.queryByTestId('target-content')).not.toBeInTheDocument();
    });
  });
});


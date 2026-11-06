import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import HostDashboard from '../pages/HostDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import QuestionBank from '../pages/QuestionBank';
import { renderWithProviders } from './test-utils';
import apiClient from '../services/apiClient';

vi.mock('../services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  API_BASE_URL: 'http://localhost:8080/api'
}));

describe('Host & Admin Portals Automated Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('Host Dashboard', () => {
    it('renders host welcome greeting, quick statistics, and action buttons', async () => {
      apiClient.get.mockImplementation((url) => {
        if (url.includes('/exams/host')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/questions/bank')) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: {} });
      });

      renderWithProviders(<HostDashboard />, {
        initialRole: 'HOST',
        initialUser: { name: 'Sarah Host', email: 'sarah@example.com' }
      });

      await waitFor(() => {
        expect(screen.getByText(/Sarah/i)).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /Create Assessment/i }).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Host Question Bank', () => {
    it('renders question bank view with empty state when bank is clear', async () => {
      apiClient.get.mockResolvedValueOnce({ data: [] });

      renderWithProviders(<QuestionBank />, {
        initialRole: 'HOST',
        initialUser: { name: 'Sarah Host', email: 'sarah@example.com' }
      });

      await waitFor(() => {
        expect(screen.getByText(/Question Bank/i)).toBeInTheDocument();
        expect(screen.getByText(/No questions found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Admin Dashboard', () => {
    it('renders admin metrics overview and management cards', async () => {
      apiClient.get.mockResolvedValueOnce({
        data: {
          totalUsers: 142,
          totalExams: 38,
          activeExams: 4,
          totalSubmissions: 310
        }
      });

      renderWithProviders(<AdminDashboard />, {
        initialRole: 'ADMIN',
        initialUser: { name: 'Super Admin', email: 'admin@assessmate.com' }
      });

      await waitFor(() => {
        expect(screen.getByText(/System Administration Portal/i)).toBeInTheDocument();
        expect(screen.getByText(/Super Admin/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /New Administrator/i })).toBeInTheDocument();
      });
    });
  });
});

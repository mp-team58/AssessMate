import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import JoinAssessment from '../pages/JoinAssessment';
import AdminLogin from '../pages/admin/AdminLogin';
import { renderWithProviders } from './test-utils';
import * as candidateService from '../services/candidateService';
import apiClient from '../services/apiClient';

vi.mock('../services/candidateService', () => ({
  joinExamByCode: vi.fn(),
  getAvailableExams: vi.fn().mockResolvedValue([]),
  getMyAssessments: vi.fn().mockResolvedValue([])
}));

vi.mock('../services/apiClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  API_BASE_URL: 'http://localhost:8080/api',
  clearApiCache: vi.fn()
}));

describe('Portal Workflows & Form Interactions', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('Candidate Join Assessment', () => {
    it('disables submit button when access code input is empty', () => {
      renderWithProviders(<JoinAssessment />);
      const verifyButton = screen.getByRole('button', { name: /Verify & Enroll/i });
      expect(verifyButton).toBeDisabled();
    });

    it('enables submit button and forces uppercase entry', () => {
      renderWithProviders(<JoinAssessment />);
      const input = screen.getByPlaceholderText(/e\.g\. EXAM-8492/i);
      fireEvent.change(input, { target: { value: 'math101' } });

      expect(input.value).toBe('MATH101');
      const verifyButton = screen.getByRole('button', { name: /Verify & Enroll/i });
      expect(verifyButton).not.toBeDisabled();
    });

    it('displays error banner if join code verification fails', async () => {
      candidateService.joinExamByCode.mockRejectedValueOnce({
        response: { data: { message: 'Invalid exam join code' } }
      });

      renderWithProviders(<JoinAssessment />);
      const input = screen.getByPlaceholderText(/e\.g\. EXAM-8492/i);
      fireEvent.change(input, { target: { value: 'INVALID' } });

      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getAllByText(/Invalid exam join code/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Admin Login Workflow', () => {
    it('renders admin badge, email and password inputs', () => {
      renderWithProviders(<AdminLogin />);
      expect(screen.getByText(/Administrator sign in/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('name@organization.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Sign in$/i })).toBeInTheDocument();
    });

    it('submits admin credentials with portal: ADMIN payload', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          token: 'mock-admin-token',
          role: 'ADMIN',
          name: 'Super Admin',
          mustChangePassword: false
        }
      });

      renderWithProviders(<AdminLogin />);
      fireEvent.change(screen.getByPlaceholderText('name@organization.com'), { target: { value: 'admin@assessmate.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'AdminPassword123!' } });

      const form = screen.getByPlaceholderText('name@organization.com').closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
          email: 'admin@assessmate.com',
          password: 'AdminPassword123!',
          portal: 'ADMIN'
        });
        expect(localStorage.getItem('token')).toBe('mock-admin-token');
        expect(localStorage.getItem('role')).toBe('ADMIN');
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Login from '../pages/Login';
import ForgotPassword from '../pages/ForgotPassword';
import OtpInput from '../components/ui/OtpInput';
import { renderWithProviders } from './test-utils';
import * as authService from '../services/authService';

vi.mock('../services/authService', () => ({
  loginHost: vi.fn(),
  loginCandidate: vi.fn(),
  requestPasswordResetOtp: vi.fn(),
  resetPassword: vi.fn(),
  requestRegistrationOtp: vi.fn(),
  registerWithOtp: vi.fn()
}));

describe('Frontend Authentication Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('Login Form', () => {
    it('renders email, password inputs, submit button and portal options', () => {
      renderWithProviders(<Login />);
      expect(screen.getByPlaceholderText(/name@organization.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign in as host/i })).toBeInTheDocument();
    });

    it('toggles password visibility when eye button is clicked', () => {
      renderWithProviders(<Login />);
      const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleBtn = screen.getByRole('button', { name: /show password/i });
      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute('type', 'text');

      fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('submits credentials and persists auth state on successful login', async () => {
      authService.loginHost.mockResolvedValueOnce({
        data: {
          token: 'mock-jwt-token',
          role: 'HOST',
          name: 'Jane Host',
          id: 12
        }
      });

      renderWithProviders(<Login />);
      fireEvent.change(screen.getByPlaceholderText(/name@organization.com/i), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), { target: { value: 'Password123!' } });

      fireEvent.click(screen.getByRole('button', { name: /Sign in as host/i }));

      await waitFor(() => {
        expect(authService.loginHost).toHaveBeenCalledWith({
          email: 'jane@example.com',
          password: 'Password123!'
        });
        expect(localStorage.getItem('token')).toBe('mock-jwt-token');
        expect(localStorage.getItem('role')).toBe('HOST');
      });
    });
  });

  describe('OTP Input Component', () => {
    it('renders 6 input slots and handles digit entry', () => {
      const onChangeMock = vi.fn();
      renderWithProviders(<OtpInput length={6} value="" onChange={onChangeMock} />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(6);

      fireEvent.change(inputs[0], { target: { value: '5' } });
      expect(onChangeMock).toHaveBeenCalledWith('5');
    });

    it('rejects non-numeric characters', () => {
      const onChangeMock = vi.fn();
      renderWithProviders(<OtpInput length={6} value="" onChange={onChangeMock} />);

      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'a' } });
      expect(onChangeMock).not.toHaveBeenCalled();
    });
  });

  describe('Forgot Password Flow', () => {
    it('renders request OTP step initially', () => {
      renderWithProviders(<ForgotPassword />);
      expect(screen.getByText(/Forgot Password/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/name@organization.com/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send Verification Code/i })).toBeInTheDocument();
    });

    it('transitions to OTP verification after requesting reset code', async () => {
      authService.requestPasswordResetOtp.mockResolvedValueOnce({
        data: { message: 'Reset code sent.' }
      });

      renderWithProviders(<ForgotPassword />);
      const emailInput = screen.getByPlaceholderText(/name@organization.com/i);
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

      const form = emailInput.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(authService.requestPasswordResetOtp).toHaveBeenCalledWith({ email: 'user@example.com' });
        expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument();
        expect(screen.getAllByText(/Verification Code/i).length).toBeGreaterThan(0);
      });
    });
  });
});

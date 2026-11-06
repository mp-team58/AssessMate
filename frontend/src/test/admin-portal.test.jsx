import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminExams from '../pages/admin/AdminExams';
import AdminActivity from '../pages/admin/AdminActivity';
import AdminSettings from '../pages/admin/AdminSettings';
import AdminLogin from '../pages/admin/AdminLogin';
import AdminSetupPassword from '../pages/admin/AdminSetupPassword';
import AdminProtectedRoute from '../components/AdminProtectedRoute';
import { renderWithProviders } from './test-utils';
import adminService from '../services/adminService';
import apiClient from '../services/apiClient';

vi.mock('../services/adminService', () => ({
  default: {
    getDashboard: vi.fn(),
    getUsers: vi.fn(),
    getUserDetail: vi.fn(),
    getHosts: vi.fn(),
    getCandidates: vi.fn(),
    getAdmins: vi.fn(),
    getExams: vi.fn(),
    getExamDetail: vi.fn(),
    suspendExam: vi.fn(),
    updateUserStatus: vi.fn(),
    createAdmin: vi.fn(),
    resendInvitation: vi.fn(),
    deleteAdmin: vi.fn(),
    getSecurityStatus: vi.fn(),
    validateInvitation: vi.fn(),
    setupPassword: vi.fn(),
    deleteUser: vi.fn(),
    getActivityLogs: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn()
  }
}));

vi.mock('../services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  },
  API_BASE_URL: 'http://localhost:8080/api',
  clearApiCache: vi.fn()
}));

describe('Batch 3: Admin Portal Comprehensive Automated Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  // =========================================================================
  // 1. Admin Dashboard
  // =========================================================================
  describe('Admin Dashboard', () => {
    it('renders admin metrics overview and greeting', async () => {
      adminService.getDashboard.mockResolvedValueOnce({
        data: {
          totalUsers: 1250,
          totalHosts: 45,
          totalCandidates: 1205,
          totalExams: 88,
          activeExams: 6,
          totalSubmissions: 3420
        }
      });

      renderWithProviders(<AdminDashboard />, {
        initialRole: 'ADMIN',
        initialUser: { name: 'Super Admin', email: 'admin@assessmate.com' }
      });

      await waitFor(() => {
        expect(screen.getByText(/System Administration Portal/i)).toBeInTheDocument();
        expect(screen.getByText(/Super Admin/i)).toBeInTheDocument();
        expect(screen.getByText('1,250')).toBeInTheDocument();
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('Active Hosts')).toBeInTheDocument();
      });
    });

    it('handles dashboard loading state with skeleton pulse elements', () => {
      adminService.getDashboard.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<AdminDashboard />, {
        initialRole: 'ADMIN',
        initialUser: { name: 'Admin', email: 'admin@assessmate.com' }
      });

      const pulseContainers = document.querySelectorAll('.animate-pulse');
      expect(pulseContainers.length).toBeGreaterThan(0);
    });

    it('handles API failure gracefully and allows retry', async () => {
      adminService.getDashboard
        .mockRejectedValueOnce(new Error('Network error loading metrics'))
        .mockResolvedValueOnce({
          data: { totalUsers: 50, totalHosts: 5, totalCandidates: 45 }
        });

      renderWithProviders(<AdminDashboard />, {
        initialRole: 'ADMIN',
        initialUser: { name: 'Admin', email: 'admin@assessmate.com' }
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load metrics/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
      });
    });

    it('provides quick action navigation links to settings and audit trail', async () => {
      adminService.getDashboard.mockResolvedValueOnce({
        data: { totalUsers: 10, totalHosts: 2, totalCandidates: 8 }
      });

      renderWithProviders(<AdminDashboard />, {
        initialRole: 'ADMIN',
        initialUser: { name: 'Admin', email: 'admin@assessmate.com' }
      });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /New Administrator/i })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /Audit Trail/i }).length).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // 2. Admin User Management
  // =========================================================================
  describe('Admin User Management', () => {
    const mockUsers = [
      { id: '1', name: 'Alice Host', email: 'alice@host.com', role: 'HOST', status: 'ACTIVE', createdAt: '2026-01-01' },
      { id: '2', name: 'Bob Candidate', email: 'bob@student.com', role: 'CANDIDATE', status: 'DEACTIVATED', createdAt: '2026-01-02' }
    ];

    it('renders user records and status badges', async () => {
      adminService.getUsers.mockResolvedValueOnce({
        data: {
          content: mockUsers,
          totalPages: 1,
          totalElements: 2
        }
      });

      renderWithProviders(<AdminUsers />, { initialRole: 'ADMIN' });

      await waitFor(() => {
        expect(screen.getByText('Alice Host')).toBeInTheDocument();
        expect(screen.getByText('alice@host.com')).toBeInTheDocument();
        expect(screen.getByText('Bob Candidate')).toBeInTheDocument();
        expect(screen.getByText('bob@student.com')).toBeInTheDocument();
      });
    });

    it('filters users by role and status', async () => {
      adminService.getUsers.mockResolvedValue({
        data: { content: [mockUsers[0]], totalPages: 1, totalElements: 1 }
      });

      renderWithProviders(<AdminUsers />, { initialRole: 'ADMIN' });

      await waitFor(() => {
        expect(screen.getByText('Alice Host')).toBeInTheDocument();
      });

      const hostTab = screen.getByRole('button', { name: /^Hosts$/i });
      fireEvent.click(hostTab);

      await waitFor(() => {
        expect(adminService.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({ role: 'HOST' })
        );
      });

      const statusSelect = document.querySelector('select');
      fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });

      await waitFor(() => {
        expect(adminService.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'ACTIVE' })
        );
      });
    });

    it('searches user records by keyword input', async () => {
      adminService.getUsers.mockResolvedValue({
        data: { content: [mockUsers[1]], totalPages: 1, totalElements: 1 }
      });

      renderWithProviders(<AdminUsers />, { initialRole: 'ADMIN' });

      const searchInput = screen.getByPlaceholderText(/Search by name or email/i);
      fireEvent.change(searchInput, { target: { value: 'bob' } });
      fireEvent.submit(searchInput.closest('form'));

      await waitFor(() => {
        expect(adminService.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({ q: 'bob' })
        );
      });
    });

    it('toggles user account status between active and deactivated', async () => {
      adminService.getUsers.mockResolvedValue({
        data: { content: mockUsers, totalPages: 1, totalElements: 2 }
      });
      adminService.updateUserStatus.mockResolvedValueOnce({ success: true });

      renderWithProviders(<AdminUsers />, { initialRole: 'ADMIN' });

      await waitFor(() => {
        expect(screen.getByText('Alice Host')).toBeInTheDocument();
      });

      const deactivateButtons = screen.getAllByRole('button', { name: /Deactivate/i });
      fireEvent.click(deactivateButtons[0]);

      await waitFor(() => {
        expect(adminService.updateUserStatus).toHaveBeenCalledWith('1', 'DEACTIVATED');
      });
    });

    it('opens delete confirmation modal and executes deletion', async () => {
      adminService.getUsers.mockResolvedValue({
        data: { content: mockUsers, totalPages: 1, totalElements: 2 }
      });
      adminService.deleteUser.mockResolvedValueOnce({ success: true });

      renderWithProviders(<AdminUsers />, { initialRole: 'ADMIN' });

      await waitFor(() => {
        expect(screen.getByText('Alice Host')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText(/Safe Account Deletion/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /Permanently Delete Account/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(adminService.deleteUser).toHaveBeenCalledWith('1');
      });
    });
  });

  // =========================================================================
  // 3. Admin Exam Management
  // =========================================================================
  describe('Admin Exam Management', () => {
    const mockExams = [
      {
        id: '101',
        title: 'Full Stack Java & React',
        subject: 'Software Engineering',
        status: 'LIVE',
        durationMinutes: 90,
        enrollmentsCount: 42,
        joinCode: 'FS-9912',
        hostName: 'Sarah Prof',
        hostEmail: 'sarah@prof.com',
        createdAt: '2026-02-01'
      }
    ];

    it('renders platform assessments table and details', async () => {
      adminService.getExams.mockResolvedValueOnce({
        data: { content: mockExams, totalPages: 1, totalElements: 1 }
      });

      renderWithProviders(<AdminExams />, { initialRole: 'ADMIN' });

      await waitFor(() => {
        expect(screen.getByText('Full Stack Java & React')).toBeInTheDocument();
        expect(screen.getByText(/Software Engineering/i)).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText(/enrolled candidates/i)).toBeInTheDocument();
      });
    });

    it('filters exams by status tab buttons', async () => {
      adminService.getExams.mockResolvedValue({
        data: { content: mockExams, totalPages: 1, totalElements: 1 }
      });

      renderWithProviders(<AdminExams />, { initialRole: 'ADMIN' });

      await waitFor(() => {
        expect(screen.getByText('Full Stack Java & React')).toBeInTheDocument();
      });

      const endedTab = screen.getByRole('button', { name: /ENDED/i });
      fireEvent.click(endedTab);

      await waitFor(() => {
        expect(adminService.getExams).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'ENDED' })
        );
      });
    });

    it('opens suspend exam confirmation modal and suspends a live exam', async () => {
      adminService.getExams.mockResolvedValue({
        data: { content: mockExams, totalPages: 1, totalElements: 1 }
      });
      adminService.suspendExam.mockResolvedValueOnce({ success: true });

      renderWithProviders(<AdminExams />, { initialRole: 'ADMIN' });

      await waitFor(() => {
        expect(screen.getByText('Full Stack Java & React')).toBeInTheDocument();
      });

      const suspendButton = screen.getByRole('button', { name: /End \/ Suspend/i });
      fireEvent.click(suspendButton);

      expect(screen.getByText(/Suspend \/ Force-End Exam/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /Yes, End Exam/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(adminService.suspendExam).toHaveBeenCalledWith('101');
      });
    });
  });

  // =========================================================================
  // 4. Admin Activity Logs
  // =========================================================================
  describe('Admin Activity Logs', () => {
    const mockLogs = [
      {
        id: '99',
        action: 'EXAM_SUSPEND',
        actorEmail: 'admin@assessmate.com',
        targetType: 'EXAM',
        targetId: '101',
        clientIp: '192.168.1.100',
        metadataJson: JSON.stringify({ reason: 'Security violation', adminToken: 'secret_jwt_xyz' }),
        createdAt: '2026-03-01T12:00:00Z'
      }
    ];

    it('renders audit trail entries and metadata', async () => {
      adminService.getActivityLogs.mockResolvedValueOnce({
        data: { content: mockLogs, totalPages: 1, totalElements: 1 }
      });

      renderWithProviders(<AdminActivity />, { initialRole: 'ADMIN' });

      await waitFor(() => {
        expect(screen.getByText('EXAM_SUSPEND')).toBeInTheDocument();
        expect(screen.getByText('admin@assessmate.com')).toBeInTheDocument();
        expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      });
    });

    it('opens audit log detail modal and redacts sensitive tokens', async () => {
      adminService.getActivityLogs.mockResolvedValueOnce({
        data: { content: mockLogs, totalPages: 1, totalElements: 1 }
      });

      renderWithProviders(<AdminActivity />, { initialRole: 'ADMIN' });

      await waitFor(() => {
        expect(screen.getByText('EXAM_SUSPEND')).toBeInTheDocument();
      });

      const viewDetailsBtn = screen.getByRole('button', { name: /View Details/i });
      fireEvent.click(viewDetailsBtn);

      expect(screen.getByText(/Audit Log Event Details/i)).toBeInTheDocument();
      expect(screen.getByText(/Event ID: 99/i)).toBeInTheDocument();

      // Check sensitive property redaction
      expect(screen.getByText(/\[REDACTED\]/i)).toBeInTheDocument();
      expect(screen.queryByText('secret_jwt_xyz')).not.toBeInTheDocument();
    });

    it('copies event metadata JSON to clipboard', async () => {
      adminService.getActivityLogs.mockResolvedValueOnce({
        data: { content: mockLogs, totalPages: 1, totalElements: 1 }
      });

      renderWithProviders(<AdminActivity />, { initialRole: 'ADMIN' });

      await waitFor(() => {
        expect(screen.getByText('EXAM_SUSPEND')).toBeInTheDocument();
      });

      const viewDetailsBtn = screen.getByRole('button', { name: /View Details/i });
      fireEvent.click(viewDetailsBtn);

      const copyBtn = screen.getByRole('button', { name: /Copy JSON/i });
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Admin Settings & Governance
  // =========================================================================
  describe('Admin Settings & Governance', () => {
    const mockAdmins = [
      { id: 'admin-1', name: 'Root Admin', email: 'root@assessmate.com', status: 'ACTIVE', role: 'ADMIN', createdAt: '2026-01-01' },
      { id: 'admin-2', name: 'Secondary Admin', email: 'sec@assessmate.com', status: 'PENDING_INVITATION', role: 'ADMIN', createdAt: '2026-01-02' }
    ];

    it('provisions a new administrator and renders invitation link', async () => {
      adminService.getAdmins.mockResolvedValue({ data: mockAdmins });
      adminService.getSecurityStatus.mockResolvedValue({ data: { totalActiveAdmins: 1, totalAdmins: 2 } });
      adminService.createAdmin.mockResolvedValueOnce({
        data: {
          email: 'newadmin@assessmate.com',
          setupUrl: 'https://assessmate.com/admin/setup-password?token=mock_token_abc'
        }
      });

      renderWithProviders(<AdminSettings />, {
        initialRole: 'ADMIN',
        initialUser: { email: 'root@assessmate.com' }
      });

      await waitFor(() => {
        expect(screen.getByText(/Admin Governance & Settings/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(/e\.g\. Eleanor Vance/i);
      const emailInput = screen.getByPlaceholderText(/name@organization\.com/i);
      fireEvent.change(nameInput, { target: { value: 'Rachel Green' } });
      fireEvent.change(emailInput, { target: { value: 'rachel@assessmate.com' } });

      const submitBtn = screen.getByRole('button', { name: /Send Admin Invitation/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(adminService.createAdmin).toHaveBeenCalledWith({
          name: 'Rachel Green',
          email: 'rachel@assessmate.com'
        });
        expect(screen.getByText(/Invitation Dispatched/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Copy Link/i })).toBeInTheDocument();
      });
    });

    it('resends invitation to a pending administrator', async () => {
      adminService.getAdmins.mockResolvedValue({ data: mockAdmins });
      adminService.getSecurityStatus.mockResolvedValue({ data: { totalActiveAdmins: 1, totalAdmins: 2 } });
      adminService.resendInvitation.mockResolvedValueOnce({
        data: { message: 'Invitation resent successfully.' }
      });

      renderWithProviders(<AdminSettings />, {
        initialRole: 'ADMIN',
        initialUser: { email: 'root@assessmate.com' }
      });

      await waitFor(() => {
        expect(screen.getByText('Secondary Admin')).toBeInTheDocument();
      });

      const resendBtn = screen.getByRole('button', { name: /Resend/i });
      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(adminService.resendInvitation).toHaveBeenCalledWith('admin-2');
      });
    });

    it('requires password input and deletes administrator', async () => {
      adminService.getAdmins.mockResolvedValue({ data: mockAdmins });
      adminService.getSecurityStatus.mockResolvedValue({ data: { totalActiveAdmins: 2, totalAdmins: 2 } });
      adminService.deleteAdmin.mockResolvedValueOnce({
        data: { message: 'Administrator deleted.' }
      });

      renderWithProviders(<AdminSettings />, {
        initialRole: 'ADMIN',
        initialUser: { email: 'root@assessmate.com' }
      });

      await waitFor(() => {
        expect(screen.getByText('Secondary Admin')).toBeInTheDocument();
      });

      const deleteBtn = screen.getByTitle('Permanently remove administrator account');
      fireEvent.click(deleteBtn);

      expect(screen.getByText(/Authorize Administrator Deletion/i)).toBeInTheDocument();

      const passwordInput = screen.getByPlaceholderText(/Enter your master password/i);
      fireEvent.change(passwordInput, { target: { value: 'MasterPass123!@#' } });

      const confirmBtn = screen.getByRole('button', { name: /Confirm & Delete Admin/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(adminService.deleteAdmin).toHaveBeenCalledWith('admin-2', 'MasterPass123!@#');
      });
    });
  });

  // =========================================================================
  // 6. Admin Invitation Lifecycle & Setup Password
  // =========================================================================
  describe('Admin Setup Password Page', () => {
    it('validates token and allows setting up new password', async () => {
      adminService.validateInvitation.mockResolvedValueOnce({
        data: { valid: true, email: 'newadmin@assessmate.com', name: 'Rachel Green' }
      });
      adminService.setupPassword.mockResolvedValueOnce({
        data: { message: 'Password set successfully.' }
      });

      renderWithProviders(<AdminSetupPassword />, {
        route: '/admin/setup-password?token=valid_token_123'
      });

      await waitFor(() => {
        expect(screen.getByText(/Rachel Green/i)).toBeInTheDocument();
        expect(screen.getByText(/newadmin@assessmate\.com/i)).toBeInTheDocument();
      });

      const passInput = screen.getByPlaceholderText(/Enter strong password/i);
      const confirmInput = screen.getByPlaceholderText(/Re-enter password/i);
      fireEvent.change(passInput, { target: { value: 'StrongAdminPass123!' } });
      fireEvent.change(confirmInput, { target: { value: 'StrongAdminPass123!' } });

      const submitButton = screen.getByRole('button', { name: /Activate Admin Account/i });
      expect(submitButton).toBeEnabled();
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(adminService.setupPassword).toHaveBeenCalledWith({
          token: 'valid_token_123',
          newPassword: 'StrongAdminPass123!'
        });
      });
    });

    it('renders error state when token is invalid or expired', async () => {
      adminService.validateInvitation.mockRejectedValueOnce({
        response: { data: { message: 'This invitation token has expired.' } }
      });

      renderWithProviders(<AdminSetupPassword />, {
        route: '/admin/setup-password?token=expired_token'
      });

      await waitFor(() => {
        expect(screen.getByText(/Invalid or Expired Invitation/i)).toBeInTheDocument();
        expect(screen.getByText(/This invitation token has expired/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Return to Admin Login/i })).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // 7. Admin Authentication & Protected Route Guard
  // =========================================================================
  describe('Admin Authentication & Protection', () => {
    it('submits admin credentials and navigates on successful login', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          token: 'mock_admin_jwt',
          role: 'ADMIN',
          name: 'Head Admin',
          mustChangePassword: false
        }
      });

      renderWithProviders(<AdminLogin />);

      const emailInput = screen.getByPlaceholderText('name@organization.com');
      const passInput = screen.getByPlaceholderText('Enter your password');

      fireEvent.change(emailInput, { target: { value: 'headadmin@assessmate.com' } });
      fireEvent.change(passInput, { target: { value: 'SecurePass123!' } });

      const loginBtn = screen.getByRole('button', { name: /^Sign in$/i });
      fireEvent.click(loginBtn);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
          email: 'headadmin@assessmate.com',
          password: 'SecurePass123!',
          portal: 'ADMIN'
        });
        expect(localStorage.getItem('role')).toBe('ADMIN');
      });
    });

    it('blocks unauthorized non-admin users from accessing admin login', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          token: 'candidate_jwt',
          role: 'CANDIDATE',
          name: 'Regular Candidate'
        }
      });

      renderWithProviders(<AdminLogin />);

      const emailInput = screen.getByPlaceholderText('name@organization.com');
      const passInput = screen.getByPlaceholderText('Enter your password');

      fireEvent.change(emailInput, { target: { value: 'candidate@assessmate.com' } });
      fireEvent.change(passInput, { target: { value: 'Pass123!' } });

      const loginBtn = screen.getByRole('button', { name: /^Sign in$/i });
      fireEvent.click(loginBtn);

      await waitFor(() => {
        expect(localStorage.getItem('role')).toBeNull();
      });
    });

    it('enforces mandatory password change modal when mustChangePassword is true', async () => {
      localStorage.setItem('mustChangePassword', 'true');

      renderWithProviders(
        <Routes>
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin/dashboard" element={<div>Protected Admin Dashboard</div>} />
          </Route>
        </Routes>,
        { route: '/admin/dashboard', initialRole: 'ADMIN' }
      );

      await waitFor(() => {
        expect(screen.getByText(/Password Change Required/i)).toBeInTheDocument();
        expect(screen.queryByText('Protected Admin Dashboard')).not.toBeInTheDocument();
      });
    });
  });
});

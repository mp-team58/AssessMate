import apiClient from './apiClient';

export const adminService = {
  getDashboard: () => apiClient.get('/admin/dashboard'),

  getUsers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.role && params.role !== 'ALL') query.append('role', params.role);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);
    if (params.sort) query.append('sort', params.sort);
    if (params.dir) query.append('dir', params.dir);
    return apiClient.get(`/admin/users?${query.toString()}`);
  },

  getUserDetail: (id) => apiClient.get(`/admin/users/${id}`),

  getHosts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);
    return apiClient.get(`/admin/hosts?${query.toString()}`);
  },

  getCandidates: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);
    return apiClient.get(`/admin/candidates?${query.toString()}`);
  },

  getAdmins: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.q) query.append('q', params.q);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);
    return apiClient.get(`/admin/admins?${query.toString()}`);
  },

  getExams: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.q) query.append('q', params.q);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);
    if (params.sort) query.append('sort', params.sort);
    if (params.dir) query.append('dir', params.dir);
    return apiClient.get(`/admin/exams?${query.toString()}`);
  },

  getExamDetail: (id) => apiClient.get(`/admin/exams/${id}`),

  suspendExam: (id) => apiClient.patch(`/admin/exams/${id}/suspend`),

  updateUserStatus: (id, status) => apiClient.patch(`/admin/users/${id}/status`, { status }),

  createAdmin: (data) => apiClient.post('/admin/admins', data),

  resendInvitation: (adminId) => apiClient.post(`/admin/admins/${adminId}/resend-invitation`),

  deleteAdmin: (adminId, currentPassword) => {
    const encoded = encodeURIComponent(currentPassword);
    return apiClient.delete(`/admin/admins/${adminId}?currentPassword=${encoded}`, {
      data: { currentPassword },
      body: JSON.stringify({ currentPassword })
    });
  },

  getSecurityStatus: () => apiClient.get('/admin/security-status'),

  validateInvitation: (token) =>
    apiClient.get(`/auth/admin/invitation/validate?token=${encodeURIComponent(token)}`),

  setupPassword: (data) => apiClient.post('/auth/admin/setup-password', data),

  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),

  getActivityLogs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);
    return apiClient.get(`/admin/activity?${query.toString()}`);
  },

  getProfile: () => apiClient.get('/admin/profile'),

  updateProfile: (data) => apiClient.patch('/admin/profile', data),
};

export default adminService;

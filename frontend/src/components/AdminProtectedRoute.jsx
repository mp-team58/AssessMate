import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import apiClient from '../services/apiClient';

export default function AdminProtectedRoute() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const [mustChangePassword, setMustChangePassword] = useState(
    localStorage.getItem('mustChangePassword') === 'true'
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  if (role !== 'ADMIN') {
    if (role === 'HOST') return <Navigate to="/host/dashboard" replace />;
    if (role === 'CANDIDATE') return <Navigate to="/candidate/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      localStorage.setItem('mustChangePassword', 'false');
      setMustChangePassword(false);
      setSuccess('Password changed successfully! You now have full access.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  if (mustChangePassword) {
    return (
      <div className="min-h-screen bg-[#F9FAF8] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
              !
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-serif">Password Change Required</h2>
              <p className="text-xs text-gray-500">Security notice for administrative accounts</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Your administrator account was initialized with a temporary or bootstrap password. For security compliance, you must set a strong, personal password before accessing administrative tools.
          </p>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-100">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
              {success}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Temporary / Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F4E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password (min 12 chars)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 12 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F4E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F4E]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#2F6F4E] hover:bg-[#25583E] text-white font-medium text-sm rounded-xl transition shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? 'Updating Password...' : 'Set New Password & Proceed'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <Outlet />;
}


import React, { useState } from 'react';
import adminService from '../../services/adminService';
import apiClient from '../../services/apiClient';
import { UserPlus, KeyRound, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AdminSettings() {
  // Create Admin State
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdAdminResult, setCreatedAdminResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreatedAdminResult(null);
    setCopied(false);
    setCreateLoading(true);

    try {
      const res = await adminService.createAdmin({
        name: adminName.trim(),
        email: adminEmail.trim(),
      });
      setCreatedAdminResult(res.data);
      setAdminName('');
      setAdminEmail('');
    } catch (err) {
      setCreateError(err?.response?.data?.message || err?.message || 'Failed to create administrator.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (createdAdminResult?.temporaryPassword) {
      navigator.clipboard.writeText(createdAdminResult.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword.length < 12) {
      setPwError('New password must be at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }

    setPwLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      setPwSuccess('Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err?.response?.data?.message || err?.message || 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">
          Admin Governance & Security
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Delegate administrative roles and update master security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Provision New Administrator */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <UserPlus size={18} />
              </div>
              <div>
                <h2 className="text-sm font-serif font-bold text-gray-900">Provision Administrator</h2>
                <p className="text-[11px] text-gray-500">Create a new system admin account</p>
              </div>
            </div>

            {createError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                {createError}
              </div>
            )}

            {createdAdminResult && (
              <div className="p-4 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck size={16} className="text-emerald-700" />
                  <span>Admin Provisioned Successfully</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Account created for <strong>{createdAdminResult.email}</strong>. Share this temporary password securely. The administrator will be required to change it immediately upon login.
                </p>
                <div className="flex items-center gap-2 mt-2 bg-white px-3 py-2 rounded-lg border border-emerald-300">
                  <code className="flex-1 font-mono text-xs font-bold text-gray-800 tracking-wider">
                    {createdAdminResult.temporaryPassword}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1 text-emerald-700 hover:text-emerald-900 font-medium text-xs flex items-center gap-1"
                    title="Copy Password"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Administrator Email</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin.delegate@assessmate.com"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E]"
                />
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full mt-3 py-2.5 bg-[#2F6F4E] hover:bg-[#25583E] text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {createLoading ? 'Provisioning...' : 'Create Admin Account'}
              </button>
            </form>
          </div>
        </div>

        {/* Change Current Administrator Password */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                <KeyRound size={18} />
              </div>
              <div>
                <h2 className="text-sm font-serif font-bold text-gray-900">Change Master Password</h2>
                <p className="text-[11px] text-gray-500">Update your current administrator password</p>
              </div>
            </div>

            {pwError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                {pwError}
              </div>
            )}

            {pwSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                {pwSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Password (min 12 chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E]"
                />
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full mt-3 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


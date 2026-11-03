import React, { useEffect, useState } from 'react';
import {
  Mail,
  ShieldCheck,
  Calendar,
  KeyRound,
  Lock,
  User,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getMyProfile, updateProfile, changePassword } from '../services/authService';

const UserProfile = () => {
  const { user: authUser, updateUser } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const response = await getMyProfile();
        if (isMounted) {
          const data = response.data?.user || response.data?.data || response.data || {};
          setProfile(data);
          setName(data.name || authUser?.name || '');
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
        if (isMounted && authUser?.name) {
          setName(authUser.name);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [authUser]);

  const displayUser = profile || authUser || {};
  const currentRole = displayUser.role || authUser?.role || 'CANDIDATE';
  const roleName = currentRole === 'ADMIN' ? 'Administrator' : currentRole === 'HOST' ? 'Host' : 'Candidate';
  const email = displayUser.email || authUser?.email || '';
  const status = displayUser.status || 'ACTIVE';
  const mustChangePassword = Boolean(displayUser.mustChangePassword);
  const displayName = displayUser.name || authUser?.name || 'Unnamed User';
  const initial = (displayName || email || 'U').trim()[0].toUpperCase();

  const rawCreatedAt = displayUser.createdAt || profile?.createdAt;
  const memberSince = rawCreatedAt
    ? new Date(rawCreatedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recent Member';

  // Handle Save Full Name
  const handleSaveName = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameError('Name must be at least 2 characters long.');
      return;
    }
    if (trimmed.length > 100) {
      setNameError('Name cannot exceed 100 characters.');
      return;
    }

    setSavingName(true);
    setNameError('');

    try {
      const res = await updateProfile({ name: trimmed });
      const updatedData = res.data?.user || res.data?.data || res.data || {};
      setProfile((prev) => ({ ...(prev || {}), ...updatedData, name: trimmed }));
      setName(trimmed);
      if (updateUser) {
        updateUser({ name: trimmed });
      }
      setIsEditingName(false);
      showToast('Profile name updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update name', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to update name.';
      showToast(msg, 'error');
    } finally {
      setSavingName(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast('Current password is required.', 'warning');
      return;
    }
    if (!newPassword) {
      showToast('New password is required.', 'warning');
      return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'warning');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      showToast('Password updated successfully! Other active sessions have been signed out.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (profile?.mustChangePassword) {
        setProfile((prev) => ({ ...(prev || {}), mustChangePassword: false }));
        if (updateUser) updateUser({ mustChangePassword: false });
      }
    } catch (err) {
      console.error('Password change error', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to update password. Check your current password and try again.';
      showToast(msg, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-pulse font-sans">
        <div className="space-y-2">
          <div className="h-8 w-44 bg-secondary-200/80 rounded-xl" />
          <div className="h-4 w-72 bg-secondary-200/50 rounded-lg" />
        </div>
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-secondary-200 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-secondary-200/70" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-48 bg-secondary-200/80 rounded-lg" />
              <div className="h-4 w-32 bg-secondary-200/50 rounded" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-secondary-200 h-64" />
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-secondary-200 h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300 font-sans">
      {/* A. Page Header */}
      <header>
        <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">
          My Profile
        </h1>
        <p className="text-secondary-600 mt-1.5 text-base">
          Manage your personal information and account security.
        </p>
      </header>

      {/* E. Mandatory Password Change Alert */}
      {mustChangePassword && (
        <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Password Change Required</p>
            <p className="text-amber-800 mt-0.5">
              You are currently signed in with a temporary password. Choose a new password below to maintain full platform access.
            </p>
          </div>
        </div>
      )}

      {/* B. Profile Overview Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-secondary-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-brand-500/20 border-2 border-brand-500/40 text-brand-700 font-extrabold flex items-center justify-center text-3xl shadow-inner shrink-0">
              {initial}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-extrabold text-secondary-900 tracking-tight">
                  {displayName}
                </h2>
                <span className="px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                  {currentRole}
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                  status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-secondary-500 text-sm font-medium">
                {email}
              </p>
            </div>
          </div>

          {!isEditingName && (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-sm font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <User className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {/* Inline Name Edit Form */}
        {isEditingName && (
          <form onSubmit={handleSaveName} className="mt-6 pt-6 border-t border-secondary-100 space-y-3">
            <label htmlFor="fullNameInput" className="block text-xs font-bold text-secondary-700 uppercase tracking-wider">
              Edit Full Name
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                id="fullNameInput"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError('');
                }}
                placeholder="Enter full name"
                maxLength={100}
                className="flex-1 px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingName}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName(profile?.name || authUser?.name || '');
                    setNameError('');
                    setIsEditingName(false);
                  }}
                  className="px-4 py-2.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
            {nameError && (
              <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {nameError}
              </p>
            )}
          </form>
        )}
      </div>

      {/* C. Personal Information Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-secondary-200 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-secondary-100">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900">Personal Information</h2>
            <p className="text-xs text-secondary-500 font-medium">Verified account details and platform identity.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <User className="w-4 h-4 text-brand-600" />
              <span>Full Name</span>
            </div>
            <p className="text-base font-bold text-secondary-900 truncate">{displayName}</p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <Mail className="w-4 h-4 text-brand-600" />
              <span>Email Address</span>
              <span className="text-[10px] font-normal lowercase text-secondary-400 bg-secondary-200/60 px-1.5 py-0.5 rounded">read-only</span>
            </div>
            <p className="text-base font-bold text-secondary-900 truncate">{email}</p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Assigned Role</span>
            </div>
            <p className="text-base font-bold text-emerald-700 capitalize">{roleName}</p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Account Status</span>
            </div>
            <p className="text-base font-bold text-emerald-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {status === 'ACTIVE' ? 'Active & Verified' : status}
            </p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1 sm:col-span-2">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span>Member Since</span>
            </div>
            <p className="text-base font-bold text-secondary-900">{memberSince}</p>
          </div>
        </div>
      </div>

      {/* D. Account Security: Change Password Card */}
      <div className={`bg-white rounded-3xl p-6 md:p-8 shadow-sm border ${mustChangePassword ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-secondary-200'} space-y-6`}>
        <div className="flex items-center gap-3 pb-4 border-b border-secondary-100">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900">Change Password</h2>
            <p className="text-xs text-secondary-500 font-medium">Update your account credentials. Other active sessions will be invalidated.</p>
          </div>
        </div>



        <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
          <div>
            <label htmlFor="currentPassword" className="block text-xs font-bold text-secondary-700 uppercase tracking-wider mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={mustChangePassword ? 'Enter temporary password' : 'Enter current password'}
                className="w-full pl-4 pr-11 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl text-secondary-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 p-1 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-xs font-bold text-secondary-700 uppercase tracking-wider mb-1.5">
              New Password <span className="text-secondary-400 font-normal lowercase">(min 8 characters)</span>
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new secure password"
                minLength={8}
                className="w-full pl-4 pr-11 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl text-secondary-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Hide new password' : 'Show new password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 p-1 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-bold text-secondary-700 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                minLength={8}
                className="w-full pl-4 pr-11 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl text-secondary-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 p-1 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;

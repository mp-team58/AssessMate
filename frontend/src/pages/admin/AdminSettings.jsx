import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus,
  ShieldCheck,
  Copy,
  Check,
  Users,
  Search,
  RefreshCw,
  Lock,
  ArrowRight,
  Calendar,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  UserX,
  UserCheck,
  Send,
  KeyRound,
  ShieldAlert,
  Clock,
  X
} from 'lucide-react';

export default function AdminSettings() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const currentAdminEmail = (user?.email || localStorage.getItem('email') || '').toLowerCase();

  // Create Admin State
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [invitationResult, setInvitationResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Directory & Security State
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [securityStatus, setSecurityStatus] = useState(null);

  // Action loading state per admin ID
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Delete Admin Modal State
  const [deleteModalAdmin, setDeleteModalAdmin] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchSecurityStatus = async () => {
    try {
      const res = await adminService.getSecurityStatus();
      setSecurityStatus(res.data);
    } catch (err) {
      console.warn('Could not load security status:', err);
    }
  };

  const fetchAdmins = async (query = searchQuery) => {
    try {
      setLoadingAdmins(true);
      const res = await adminService.getAdmins({ q: query.trim() || undefined });
      setAdmins(res.data?.content || []);
    } catch (err) {
      console.warn('Failed to fetch administrator directory:', err);
      showToast('Failed to load administrator accounts.', 'error');
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchSecurityStatus();
  }, []);

  const activeAdminCount = useMemo(() => {
    if (securityStatus?.totalActiveAdmins !== undefined) {
      return securityStatus.totalActiveAdmins;
    }
    return admins.filter((a) => a.status === 'ACTIVE').length;
  }, [securityStatus, admins]);

  // NEW: pull the remaining KPI figures out of the admins list so they can
  // live in one stat row instead of being scattered/duplicated across cards.
  const pendingInviteCount = useMemo(
    () => admins.filter((a) => a.status === 'PENDING_INVITATION').length,
    [admins]
  );
  const totalAdminCount = securityStatus?.totalAdmins ?? admins.length;

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setInvitationResult(null);
    setCopiedLink(false);
    setCreateLoading(true);

    try {
      const res = await adminService.createAdmin({
        name: adminName.trim(),
        email: adminEmail.trim(),
      });
      setInvitationResult(res.data);
      setAdminName('');
      setAdminEmail('');
      showToast(`Administrator invitation sent to ${res.data?.email}!`, 'success');
      fetchAdmins();
      fetchSecurityStatus();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to provision administrator.', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResendInvitation = async (admin) => {
    setActionLoadingId(admin.id);
    try {
      const res = await adminService.resendInvitation(admin.id);
      showToast(res.data?.message || `Invitation resent to ${admin.email}.`, 'success');
      fetchAdmins();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to resend invitation.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (admin) => {
    const newStatus = admin.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    setActionLoadingId(admin.id);
    try {
      await adminService.updateUserStatus(admin.id, newStatus);
      showToast(`Admin ${admin.email} is now ${newStatus === 'ACTIVE' ? 'Active' : 'Deactivated'}.`, 'success');
      await fetchAdmins();
      await fetchSecurityStatus();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update account status.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    if (!deleteModalAdmin || !deletePassword) return;

    setDeleteSubmitting(true);
    setDeleteError('');

    try {
      const res = await adminService.deleteAdmin(deleteModalAdmin.id, deletePassword);
      showToast(res.data?.message || 'Administrator account removed successfully.', 'success');
      setDeleteModalAdmin(null);
      setDeletePassword('');
      setDeleteError('');
      await fetchAdmins();
      await fetchSecurityStatus();
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to delete administrator. Please verify your password.';
      setDeleteError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleCopySetupUrl = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Setup URL copied to clipboard', 'info');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdmins(searchQuery);
  };

  return (
    <div className="w-full space-y-8 font-sans pb-16 animate-in fade-in duration-300">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-secondary-900 tracking-tight leading-tight">
            Admin Governance &amp; Settings
          </h1>
          <p className="text-secondary-600 mt-1 text-xs sm:text-sm font-medium">
            Delegate administrative privileges, provision system administrators, and inspect platform security configurations.
          </p>
        </div>
        <Link
          to="/admin/profile"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-secondary-50 border border-secondary-200 text-secondary-700 text-xs font-bold rounded-2xl shadow-sm transition hover:border-brand-300 flex-shrink-0"
        >
          <User size={14} className="text-brand-600" />
          <span>My Admin Profile</span>
          <ArrowRight size={14} className="text-secondary-400" />
        </Link>
      </header>

      {/* Disaster Recovery Warning Banner when active admins <= 1 */}
      {activeAdminCount <= 1 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-amber-900 shadow-sm animate-in fade-in duration-200">
          <div className="p-2 bg-amber-500/20 text-amber-700 rounded-xl flex-shrink-0 mt-0.5">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <span>Disaster Recovery Notice: Single Administrator Active</span>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                High Priority
              </span>
            </h2>
            <p className="text-xs text-amber-800 leading-relaxed">
              There is currently only <strong>1 active administrator account</strong> on AssessMate. To prevent administrative lockout in the event of credential loss or emergency, governance standards require maintaining at least <strong>two active administrators</strong>.
            </p>
          </div>
        </div>
      )}

      {/* NEW: KPI Stat Row — replaces the mini-stat box that used to live inside
          the Security Policy card, and gives the page the same "numbers first"
          layout used on the Host Dashboard / Analytics screens. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-secondary-200 shadow-sm">
          <div className="flex items-center gap-2 text-secondary-500 mb-1">
            <UserCheck size={14} className={activeAdminCount >= 2 ? 'text-emerald-600' : 'text-amber-600'} />
            <p className="text-[11px] font-bold uppercase tracking-wider">Active Admins</p>
          </div>
          <span className="text-2xl font-extrabold text-secondary-900">{activeAdminCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-secondary-200 shadow-sm">
          <div className="flex items-center gap-2 text-secondary-500 mb-1">
            <Clock size={14} className="text-amber-600" />
            <p className="text-[11px] font-bold uppercase tracking-wider">Pending Invites</p>
          </div>
          <span className="text-2xl font-extrabold text-secondary-900">{pendingInviteCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-secondary-200 shadow-sm">
          <div className="flex items-center gap-2 text-secondary-500 mb-1">
            <Users size={14} className="text-secondary-500" />
            <p className="text-[11px] font-bold uppercase tracking-wider">Total Admins</p>
          </div>
          <span className="text-2xl font-extrabold text-secondary-900">{totalAdminCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-secondary-200 shadow-sm">
          <div className="flex items-center gap-2 text-secondary-500 mb-1">
            <KeyRound size={14} className={securityStatus?.emergencyRecoveryEnabled ? 'text-emerald-600' : 'text-secondary-400'} />
            <p className="text-[11px] font-bold uppercase tracking-wider">Emergency Recovery</p>
          </div>
          <span className="text-sm font-extrabold text-secondary-900 leading-tight block mt-1.5">
            {securityStatus?.emergencyRecoveryEnabled ? 'Configured' : 'Server Secret Guarded'}
          </span>
        </div>
      </div>

      {/* Top Grid: Provision Admin & Security Policy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left: Provision New Administrator */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-secondary-200 shadow-sm space-y-5 flex flex-col">
          <div className="flex items-center gap-3 pb-4 border-b border-secondary-100">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200 flex-shrink-0">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-secondary-900">Provision Administrator</h2>
              <p className="text-xs text-secondary-500 font-medium">Send an email invitation with a secure 30-minute password setup link</p>
            </div>
          </div>

          {invitationResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <ShieldCheck size={16} className="text-emerald-700" />
                  <span>Invitation Dispatched</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  {invitationResult.emailDelivered ? 'Email Delivered' : 'Simulated / Logged'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Administrator account provisioned for <strong>{invitationResult.email}</strong> in pending invitation status. The password setup link is valid for <strong>30 minutes</strong>.
              </p>
              {invitationResult.setupUrl && (
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-300">
                  <span className="flex-1 font-mono text-[11px] text-secondary-700 truncate select-all">
                    {invitationResult.setupUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopySetupUrl(invitationResult.setupUrl)}
                    className="text-brand-700 hover:text-brand-900 font-bold text-xs flex items-center gap-1 cursor-pointer flex-shrink-0"
                    title="Copy Setup Link"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-secondary-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="e.g. Eleanor Vance"
                className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl text-xs text-secondary-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary-700 uppercase tracking-wider mb-1.5">
                Administrator Email
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin.delegate@assessmate.com"
                className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl text-xs text-secondary-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={createLoading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {createLoading ? (
                <span>Generating Secure Invitation...</span>
              ) : (
                <>
                  <Send size={15} />
                  <span>Send Admin Invitation</span>
                </>
              )}
            </button>
          </form>

          {/* Spacer pushes a short closing note to the bottom, so this card's
              content fills the same height as the policy card beside it
              instead of ending early and leaving a gap. */}
          <div className="flex-1" />
          <p className="text-[11px] text-secondary-400 font-medium pt-2 border-t border-secondary-100">
            Invited administrators appear in the directory below as <strong>Pending Invite</strong> until they complete setup.
          </p>
        </div>

        {/* Right: Security & Governance Policy (condensed) */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-secondary-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-secondary-100">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 flex-shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-secondary-900">Security &amp; Governance Policy</h2>
              <p className="text-xs text-secondary-500 font-medium">Standards enforcing platform integrity and disaster recovery</p>
            </div>
          </div>

          {/* Condensed into one list instead of three separate boxed callouts —
              same information, less vertical space, and no longer duplicates
              the KPI row above. */}
          <ul className="divide-y divide-secondary-100">
            <li className="py-3 flex items-start gap-3">
              <Mail size={14} className="text-brand-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-secondary-900">Secure Email Invitation Workflow</p>
                <p className="text-[11px] text-secondary-600 leading-relaxed mt-0.5">
                  New administrators receive a single-use 30-minute token to set their password. No temporary plaintext passwords are ever generated or stored.
                </p>
              </div>
            </li>
            <li className="py-3 flex items-start gap-3">
              <Lock size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-secondary-900">Centralized Password Management</p>
                <p className="text-[11px] text-secondary-600 leading-relaxed mt-0.5">
                  Each admin manages their own password from{' '}
                  <Link to="/admin/profile" className="text-brand-700 hover:underline font-semibold">
                    their Admin Profile
                  </Link>
                  . Salted hashing and active session invalidation apply on update.
                </p>
              </div>
            </li>
            <li className="py-3 flex items-start gap-3">
              <Calendar size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-secondary-900">Audit Trail &amp; IP Observability</p>
                <p className="text-[11px] text-secondary-600 leading-relaxed mt-0.5">
                  All administrative operations, invitation dispatches, and account deletions are recorded in the system audit log with client IP addresses.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Section: Active System Administrators Directory (Full Width) */}
      <div className="bg-white rounded-3xl border border-secondary-200 shadow-sm p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-secondary-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary-100 text-secondary-700 flex items-center justify-center border border-secondary-200 flex-shrink-0">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-secondary-900">System Administrators</h2>
                <span className="px-2 py-0.5 bg-secondary-100 text-secondary-700 rounded-full text-[11px] font-bold">
                  {admins.length} {admins.length === 1 ? 'Admin' : 'Admins'}
                </span>
              </div>
              <p className="text-xs text-secondary-500 font-medium">
                Active and invited administrator accounts with elevated platform privileges
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search administrators..."
                className="w-full pl-9 pr-3 py-1.5 bg-secondary-50 border border-secondary-200 rounded-xl text-xs text-secondary-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
            </form>
            <button
              type="button"
              onClick={() => {
                fetchAdmins(searchQuery);
                fetchSecurityStatus();
              }}
              disabled={loadingAdmins}
              className="p-2 bg-secondary-50 hover:bg-secondary-100 border border-secondary-200 rounded-xl text-secondary-600 hover:text-secondary-900 transition disabled:opacity-50 cursor-pointer flex-shrink-0"
              title="Refresh Administrators List"
            >
              <RefreshCw size={14} className={loadingAdmins ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Administrator Directory Table */}
        {loadingAdmins ? (
          <div className="py-12 flex flex-col items-center justify-center text-secondary-400 space-y-2">
            <RefreshCw size={24} className="animate-spin text-brand-600" />
            <p className="text-xs font-semibold text-secondary-500">Loading system administrators...</p>
          </div>
        ) : admins.length === 0 ? (
          <div className="py-10 text-center text-secondary-500 text-xs space-y-1">
            <AlertCircle size={28} className="mx-auto text-secondary-400 mb-2" />
            <p className="font-bold text-secondary-700">No administrators found</p>
            <p className="text-secondary-500">
              {searchQuery ? `No administrator matches "${searchQuery}".` : 'No administrators provisioned yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-secondary-100 text-secondary-500 uppercase tracking-wider font-bold">
                    <th className="pb-3 pl-4 sm:pl-2">Administrator</th>
                    <th className="pb-3 px-4">Role</th>
                    <th className="pb-3 px-4">Account Status</th>
                    <th className="pb-3 px-4">Password Status</th>
                    <th className="pb-3 px-4">Provisioned</th>
                    <th className="pb-3 pr-4 sm:pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {admins.map((adm) => {
                    const initial = (adm.name || adm.email || 'A')[0].toUpperCase();
                    const isSelf = (adm.email || '').toLowerCase() === currentAdminEmail;
                    const isLastActive = adm.status === 'ACTIVE' && activeAdminCount <= 1;
                    const isActionLoading = actionLoadingId === adm.id;

                    const formattedDate = adm.createdAt
                      ? new Date(adm.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                      : '—';

                    return (
                      <tr key={adm.id} className="hover:bg-secondary-50/60 transition-colors">
                        <td className="py-3.5 pl-4 sm:pl-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 font-black text-xs flex items-center justify-center border border-brand-200 flex-shrink-0">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-secondary-900 flex items-center gap-1.5 truncate">
                                <span>{adm.name || 'Unnamed Admin'}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 bg-brand-100 text-brand-800 rounded text-[10px] font-bold">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-secondary-500 flex items-center gap-1 truncate">
                                <Mail size={11} className="text-secondary-400 flex-shrink-0" />
                                <span className="truncate">{adm.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                            ADMIN
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {adm.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : adm.status === 'PENDING_INVITATION' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending Invite
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold text-[11px] bg-secondary-100 text-secondary-700 border border-secondary-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary-400" />
                              Deactivated
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {adm.status === 'PENDING_INVITATION' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                              <span>Pending Setup</span>
                            </span>
                          ) : adm.mustChangePassword ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                              <span>Pending Reset</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary-100 text-secondary-600 font-medium text-[11px]">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              <span>Secured</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-secondary-500 font-medium text-[11px] whitespace-nowrap">
                          {formattedDate}
                        </td>

                        <td className="py-3.5 pr-4 sm:pr-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {adm.status === 'PENDING_INVITATION' && (
                              <button
                                type="button"
                                onClick={() => handleResendInvitation(adm)}
                                disabled={isActionLoading}
                                title="Resend invitation email"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                              >
                                <Send size={11} className={isActionLoading ? 'animate-spin' : ''} />
                                <span>Resend</span>
                              </button>
                            )}

                            {adm.status === 'ACTIVE' ? (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(adm)}
                                disabled={isSelf || isLastActive || isActionLoading}
                                title={
                                  isSelf
                                    ? 'You cannot deactivate your own account'
                                    : isLastActive
                                      ? 'Cannot deactivate the only active administrator'
                                      : 'Deactivate administrator account'
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 border border-secondary-200 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <UserX size={11} />
                                <span>Deactivate</span>
                              </button>
                            ) : adm.status === 'DEACTIVATED' ? (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(adm)}
                                disabled={isActionLoading}
                                title="Reactivate administrator account"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                              >
                                <UserCheck size={11} />
                                <span>Reactivate</span>
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => {
                                setDeleteModalAdmin(adm);
                                setDeletePassword('');
                                setDeleteError('');
                              }}
                              disabled={isSelf || isLastActive || isActionLoading}
                              title={
                                isSelf
                                  ? 'You cannot delete your own account'
                                  : isLastActive
                                    ? 'Cannot delete the only active administrator'
                                    : 'Permanently remove administrator account'
                              }
                              className="p-1.5 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Admin Deletion Confirmation Modal */}
      {deleteModalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-secondary-200 max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 flex-shrink-0">
                <ShieldAlert size={24} />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalAdmin(null);
                  setDeletePassword('');
                  setDeleteError('');
                }}
                className="text-secondary-400 hover:text-secondary-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-secondary-900">
                Authorize Administrator Deletion
              </h3>
              <p className="text-xs text-secondary-600 leading-relaxed">
                You are about to delete administrator privileges for{' '}
                <strong>{deleteModalAdmin.name || deleteModalAdmin.email}</strong> ({deleteModalAdmin.email}).
                This will soft-delete and anonymize the account.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-red-600" />
                <span className="font-semibold leading-relaxed">{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-secondary-700 mb-1.5">
                  Your Current Admin Password
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    if (deleteError) setDeleteError('');
                  }}
                  placeholder="Enter your master password"
                  className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl text-xs text-secondary-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                />
                <p className="text-[11px] text-secondary-500 mt-1">
                  Re-authenticating your credentials is required for administrative deletion.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalAdmin(null);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  disabled={deleteSubmitting}
                  className="px-4 py-2 text-xs font-bold text-secondary-700 hover:bg-secondary-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteSubmitting || !deletePassword}
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {deleteSubmitting ? (
                    <span>Verifying...</span>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Confirm &amp; Delete Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
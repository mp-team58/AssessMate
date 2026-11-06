import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useModalScrollLock from '../../hooks/useModalScrollLock';
import useModalAccessibility from '../../hooks/useModalAccessibility';
import adminService from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import StatusBadge from '../../components/ui/StatusBadge';
import { 
  Users, 
  Search, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw
} from 'lucide-react';

export default function AdminUsers({ defaultRole = 'ALL' }) {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [role, setRole] = useState(defaultRole);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Sync role when defaultRole changes (e.g. navigation between Admin Hosts and Admin Candidates)
  useEffect(() => {
    setRole(defaultRole);
    setPage(0);
  }, [defaultRole]);

  // Safe Deletion Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const closeDeleteModal = () => {
    setTargetUser(null);
    setDeleteError('');
    setDeleteModalOpen(false);
  };

  useModalScrollLock(deleteModalOpen && Boolean(targetUser));
  const deleteModalRef = useModalAccessibility({
    isOpen: deleteModalOpen && Boolean(targetUser),
    onClose: () => closeDeleteModal(),
    preventEscape: deleting,
    defaultFocusCancel: true,
  });

    const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getUsers({
        role: role !== 'ALL' ? role : undefined,
        status: status !== 'ALL' ? status : undefined,
        q: search.trim() || undefined,
        includeDeleted,
        page,
        size: 15,
        sort: 'createdAt',
        dir: 'desc'
      });
      const root = res?.data !== undefined ? res.data : res;
      if (!root || (typeof root === 'object' && !Array.isArray(root) && !Array.isArray(root.content))) {
        setError('Received an unexpected response structure from the server.');
        setUsers([]);
      } else {
        const raw = Array.isArray(root) ? root : (root.content || []);
        setUsers(raw);
        setTotalPages(root.totalPages || 1);
        setTotalElements(root.totalElements !== undefined ? root.totalElements : raw.length);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load user records.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [role, status, search, includeDeleted, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(0);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setRole(defaultRole);
    setIncludeDeleted(false);
    setPage(0);
  };

  const handleStatusToggle = async (user) => {
    const isActivating = user.status === 'DEACTIVATED';
    const newStatus = isActivating ? 'ACTIVE' : 'DEACTIVATED';

    try {
      await adminService.updateUserStatus(user.id, newStatus);
      showToast(`User "${user.name}" status updated to ${newStatus}.`, 'success');
      fetchUsers();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to update user status.', 'error');
    }
  };

  const openDeleteModal = (user) => {
    setTargetUser(user);
    setDeleteError('');
    setDeleteModalOpen(true);
  };



  const handleConfirmDelete = async () => {
    if (!targetUser) return;
    setDeleting(true);
    setDeleteError('');

    try {
      await adminService.deleteUser(targetUser.id);
      showToast(`Account for ${targetUser.email} has been safely anonymized and deleted.`, 'success');
      closeDeleteModal();
      fetchUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete user.';
      setDeleteError(msg);
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans pb-16">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-secondary-900 tracking-tight">
            {role === 'HOST' ? 'Host Management' : role === 'CANDIDATE' ? 'Candidate Directory' : 'User Directory'}
          </h1>
          <p className="text-secondary-600 mt-1 text-xs sm:text-sm font-medium">
            Browse registered hosts, candidates, and administrators across the platform
          </p>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-secondary-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Role Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-secondary-100 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
            {['ALL', 'HOST', 'CANDIDATE', 'ADMIN'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setPage(0); }}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  role === r
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-200/50'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r === 'HOST' ? 'Hosts' : r === 'CANDIDATE' ? 'Candidates' : 'Admins'}
              </button>
            ))}
          </div>

          {/* Search Input Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:max-w-md">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full h-10 pl-10 pr-8 py-2 bg-secondary-50 border border-secondary-200 rounded-xl text-xs text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-secondary-400 hover:text-secondary-600 rounded-full hover:bg-secondary-200/50 transition cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="h-10 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer shrink-0"
            >
              Search
            </button>
          </form>
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-secondary-100 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2">
              <span className="text-secondary-500 font-bold shrink-0">Status:</span>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(0); }}
                className="bg-secondary-50 border border-secondary-200 rounded-xl px-3 py-1.5 text-xs font-medium text-secondary-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DEACTIVATED">Deactivated</option>
                <option value="DELETED">Deleted</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-secondary-600 cursor-pointer select-none font-medium">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => { setIncludeDeleted(e.target.checked); setPage(0); }}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-secondary-300 cursor-pointer"
              />
              <span>Include deleted accounts</span>
            </label>
          </div>

          <div className="flex items-center gap-2 text-secondary-500">
            <span>
              Total records: <strong className="text-secondary-900 font-bold">{totalElements}</strong>
            </span>
            {(search || status !== 'ALL' || role !== defaultRole || includeDeleted) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer ml-1"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-secondary-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs text-secondary-600 min-w-[700px]">
            <thead className="bg-secondary-50 text-secondary-600 text-xs uppercase tracking-wider border-b border-secondary-200 font-bold">
              <tr>
                <th className="py-3.5 px-5">User</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Created</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-secondary-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading user records...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-secondary-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={32} className="text-secondary-300 stroke-[1.5]" />
                      <p className="font-bold text-secondary-700 text-sm">No users found</p>
                      <p className="text-xs text-secondary-400 max-w-sm">
                        {search || status !== 'ALL' || role !== 'ALL'
                          ? 'No user accounts match the current filter criteria. Try adjusting or clearing your filters.'
                          : 'There are currently no registered accounts under this category.'}
                      </p>
                      {(search || status !== 'ALL' || role !== defaultRole) && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 px-3 py-1.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isDeleted = u.status === 'DELETED';
                  const isDeactivated = u.status === 'DEACTIVATED';
                  const isAdminUser = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-secondary-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-secondary-900">{u.name}</div>
                        <div className="text-[11px] text-secondary-400 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                          u.role === 'ADMIN'
                            ? 'bg-brand-50 text-brand-800 border-brand-200'
                            : u.role === 'HOST'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <StatusBadge status={u.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-5 text-secondary-500 font-medium">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-2">
                        {!isDeleted && !isAdminUser && (
                          <>
                            <button
                              onClick={() => handleStatusToggle(u)}
                              className={`px-3 py-1.5 min-h-[32px] rounded-xl text-xs font-bold transition cursor-pointer ${
                                isDeactivated
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                              }`}
                            >
                              {isDeactivated ? 'Activate' : 'Deactivate'}
                            </button>
                            <button
                              onClick={() => openDeleteModal(u)}
                              className="px-3 py-1.5 min-h-[32px] rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {isDeleted && (
                          <span className="text-[11px] text-secondary-400 italic">Archived</span>
                        )}
                        {isAdminUser && (
                          <span className="text-[11px] text-secondary-400 font-medium">Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-secondary-50 border-t border-secondary-200 text-xs text-secondary-500">
          <div>
            Page <span className="font-bold text-secondary-900">{page + 1}</span> of{' '}
            <span className="font-bold text-secondary-900">{totalPages}</span>
            <span className="ml-2 text-secondary-400">({totalElements} total entries)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 px-2.5 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-100 text-secondary-700 disabled:opacity-40 cursor-pointer flex items-center gap-1 transition"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 px-2.5 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-100 text-secondary-700 disabled:opacity-40 cursor-pointer flex items-center gap-1 transition"
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Safe Deletion Modal matching original modal style */}
      {deleteModalOpen && targetUser && createPortal(
        <div className="fixed inset-0 w-screen h-screen supports-[height:100dvh]:h-dvh z-[9999] bg-[#16241F]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div ref={deleteModalRef} role="alertdialog" aria-modal="true" aria-labelledby="admin-delete-user-title" aria-describedby="admin-delete-user-desc" tabIndex={-1} className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 md:p-8 shadow-2xl border border-secondary-200 space-y-4 font-sans outline-none my-auto">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 id="admin-delete-user-title" className="text-xl font-bold text-secondary-900">
                  Safe Account Deletion
                </h3>
                <p className="text-xs text-secondary-500 font-medium">Irreversible security procedure</p>
              </div>
            </div>

            <p id="admin-delete-user-desc" className="text-xs text-secondary-600 leading-relaxed">
              You are deleting the account for <strong className="text-secondary-900 font-mono">{targetUser.email}</strong> ({targetUser.name}).
            </p>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-1.5">
              <p className="font-bold">Security &amp; Data Safeguards:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
                <li>Email is permanently anonymized to <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">deleted-{targetUser.id}@deleted.invalid</code>.</li>
                <li>Display name is cleared to &quot;Deleted User&quot; and password hash randomized.</li>
                <li>All active sessions and pending OTPs are immediately revoked.</li>
                <li>Historical exam statistics, questions, and submissions remain intact.</li>
                <li>Deletion will be rejected if the host has LIVE exams or candidate has ongoing exams.</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                {deleteError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                data-cancel="true"
                className="px-4 py-2 min-h-[38px] bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 min-h-[38px] bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Anonymizing...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

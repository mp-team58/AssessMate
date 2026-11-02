import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { 
  Users, 
  Search, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

export default function AdminUsers({ defaultRole = 'ALL' }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Filters & Pagination
  const [role, setRole] = useState(defaultRole);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Safe Deletion Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getUsers({
        role: role !== 'ALL' ? role : undefined,
        status: status !== 'ALL' ? status : undefined,
        q: search || undefined,
        includeDeleted,
        page,
        size: 15,
        sort: 'createdAt',
        dir: 'desc'
      });
      setUsers(res.data.content || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalElements(res.data.totalElements || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load user records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [role, status, includeDeleted, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleStatusToggle = async (user) => {
    const nextStatus = user.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    try {
      setActionMessage('');
      await adminService.updateUserStatus(user.id, nextStatus);
      setActionMessage(`Account for ${user.email} marked as ${nextStatus}.`);
      fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update user status.');
    }
  };

  const openDeleteModal = (user) => {
    setTargetUser(user);
    setDeleteConfirmationInput('');
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setTargetUser(null);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!targetUser) return;
    setDeleting(true);
    setDeleteError('');

    try {
      await adminService.deleteUser(targetUser.id);
      setActionMessage(`Account ${targetUser.email} has been safely deleted and anonymized.`);
      closeDeleteModal();
      fetchUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete user account.';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">
            User Directory
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Browse registered hosts, candidates, and administrators across the platform.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage('')} className="text-emerald-600 hover:text-emerald-900">&times;</button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs font-medium border border-red-200">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Role Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl overflow-x-auto">
            {['ALL', 'HOST', 'CANDIDATE', 'ADMIN'].map((r) => (
              <button
                key={r}
                onClick={() => { setRole(r); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                  role === r
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2F6F4E]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#2F6F4E] hover:bg-[#25583E] text-white rounded-xl text-xs font-medium transition"
            >
              Search
            </button>
          </form>
        </div>

        {/* Secondary filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Status:</span>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(0); }}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DEACTIVATED">Deactivated</option>
                <option value="DELETED">Deleted</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => { setIncludeDeleted(e.target.checked); setPage(0); }}
                className="rounded text-[#2F6F4E] focus:ring-[#2F6F4E]"
              />
              <span>Include deleted accounts</span>
            </label>
          </div>

          <span className="text-gray-400">
            Total records: <strong className="text-gray-700">{totalElements}</strong>
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isDeleted = u.status === 'DELETED';
                  const isDeactivated = u.status === 'DEACTIVATED';
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{u.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                          u.role === 'ADMIN'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : u.role === 'HOST'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isDeactivated
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {!isDeleted && !isAdmin && (
                          <>
                            <button
                              onClick={() => handleStatusToggle(u)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                                isDeactivated
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              }`}
                            >
                              {isDeactivated ? 'Activate' : 'Deactivate'}
                            </button>
                            <button
                              onClick={() => openDeleteModal(u)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {isDeleted && (
                          <span className="text-[11px] text-gray-400 italic">Archived</span>
                        )}
                        {isAdmin && (
                          <span className="text-[11px] text-gray-400">Protected</span>
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
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
          <div>
            Page <span className="font-semibold text-gray-800">{page + 1}</span> of{' '}
            <span className="font-semibold text-gray-800">{totalPages}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Safe Deletion Modal */}
      {deleteModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-gray-900">
                  Safe Account Deletion & Anonymization
                </h3>
                <p className="text-xs text-gray-500">Irreversible security procedure</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              You are deleting the account for <strong className="text-gray-900 font-mono">{targetUser.email}</strong> ({targetUser.name}).
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
              <p className="font-semibold">Security & Data Safeguards:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                <li>Email will be permanently anonymized to <code className="bg-amber-100 px-1 py-0.5 rounded">deleted-{targetUser.id}@deleted.invalid</code>.</li>
                <li>Display name will be cleared to "Deleted User" and password hash randomized.</li>
                <li>All active sessions and pending verification OTPs will be immediately invalidated.</li>
                <li>Historical exam statistics, questions, and grading results are safely preserved.</li>
                <li>Deletion will be rejected with an alert if a Host has LIVE exams or a Candidate has an ongoing exam.</li>
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
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
              >
                {deleting ? 'Anonymizing...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


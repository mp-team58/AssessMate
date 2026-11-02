import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { History, ChevronLeft, ChevronRight, Shield } from 'lucide-react';

export default function AdminActivity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getActivityLogs({ page, size: 20 });
      setLogs(res.data.content || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalElements(res.data.totalElements || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'USER_DELETE':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'EXAM_SUSPEND':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ADMIN_CREATE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'USER_STATUS_CHANGE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">
            Security & System Audit Log
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Immutable, append-only record of administrative operations and critical events.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs font-medium border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Metadata</th>
                <th className="py-3 px-4">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 font-sans">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 font-sans">
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 px-4 text-gray-500 text-[11px] whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-900 font-medium">
                      {l.actorEmail || `ID: ${l.actorId}`}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${getActionBadgeColor(l.action)}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {l.targetType}: {l.targetId}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-[11px] max-w-xs truncate">
                      {l.metadataJson || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-[11px]">
                      {l.clientIp || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
          <div>
            Showing page <span className="font-semibold text-gray-800">{page + 1}</span> of{' '}
            <span className="font-semibold text-gray-800">{totalPages}</span> ({totalElements} total entries)
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
    </div>
  );
}


import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useModalScrollLock from '../../hooks/useModalScrollLock';
import useModalAccessibility from '../../hooks/useModalAccessibility';
import adminService from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import {
  History,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  X,
  Copy,
  Check,
  Calendar,
  User,
  Activity,
  Globe,
  Database
} from 'lucide-react';

function ActivityDetailsModal({ log, onClose }) {
  useModalScrollLock(Boolean(log));
  const detailsModalRef = useModalAccessibility({
    isOpen: Boolean(log),
    onClose,
  });
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  let formattedJson = '';
  let parseSuccess = false;

  if (log.metadataJson) {
    try {
      const parsed = JSON.parse(log.metadataJson);
      // Redact guard for safety
      const sanitize = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        const copy = Array.isArray(obj) ? [...obj] : { ...obj };
        for (const k of Object.keys(copy)) {
          if (typeof copy[k] === 'string' && /password|token|secret|jwt/i.test(k)) {
            copy[k] = '[REDACTED]';
          } else if (typeof copy[k] === 'object') {
            copy[k] = sanitize(copy[k]);
          }
        }
        return copy;
      };
      formattedJson = JSON.stringify(sanitize(parsed), null, 2);
      parseSuccess = true;
    } catch {
      formattedJson = log.metadataJson;
    }
  }

  const handleCopy = () => {
    if (!formattedJson && !log.metadataJson) return;
    navigator.clipboard.writeText(formattedJson || log.metadataJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen supports-[height:100dvh]:h-dvh z-[9999] flex items-center justify-center p-4 bg-[#16241F]/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans overflow-y-auto">
      <div ref={detailsModalRef} role="dialog" aria-modal="true" aria-labelledby="audit-log-details-title" tabIndex={-1} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-secondary-200 overflow-hidden flex flex-col max-h-[90vh] outline-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-secondary-100 bg-secondary-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center shadow-inner">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 id="audit-log-details-title" className="text-lg font-bold text-secondary-900">Audit Log Event Details</h2>
              <p className="text-xs text-secondary-500 font-mono">Event ID: {log.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-secondary-400 hover:text-secondary-700 hover:bg-secondary-100 rounded-xl transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3.5 bg-secondary-50 rounded-2xl border border-secondary-200">
              <span className="font-bold text-secondary-500 uppercase tracking-wider block text-[10px] mb-1">
                Timestamp
              </span>
              <p className="font-bold text-secondary-900 font-mono">
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="p-3.5 bg-secondary-50 rounded-2xl border border-secondary-200">
              <span className="font-bold text-secondary-500 uppercase tracking-wider block text-[10px] mb-1">
                Actor / Administrator
              </span>
              <p className="font-bold text-secondary-900 truncate">
                {log.actorEmail || `User ID: ${log.actorId}`}
              </p>
            </div>

            <div className="p-3.5 bg-secondary-50 rounded-2xl border border-secondary-200">
              <span className="font-bold text-secondary-500 uppercase tracking-wider block text-[10px] mb-1">
                Action Type
              </span>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-brand-50 text-brand-800 border border-brand-200">
                {log.action}
              </span>
            </div>

            <div className="p-3.5 bg-secondary-50 rounded-2xl border border-secondary-200">
              <span className="font-bold text-secondary-500 uppercase tracking-wider block text-[10px] mb-1">
                Target Entity
              </span>
              <p className="font-bold text-secondary-900">
                <span className="text-secondary-700">{log.targetType || 'SYSTEM'}</span>
                {log.targetId ? ` (${log.targetId})` : ''}
              </p>
            </div>

            <div className="p-3.5 bg-secondary-50 rounded-2xl border border-secondary-200 sm:col-span-2">
              <span className="font-bold text-secondary-500 uppercase tracking-wider block text-[10px] mb-1">
                Client IP Address
              </span>
              <p className="font-mono text-secondary-900 font-bold">
                {log.clientIp || '127.0.0.1'}
              </p>
            </div>
          </div>

          {/* Full Metadata JSON Viewer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-secondary-700 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-brand-600" />
                Event Metadata Payload
              </label>
              {formattedJson && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-secondary-700 bg-secondary-100 hover:bg-secondary-200 rounded-xl transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-secondary-500" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {formattedJson ? (
              <pre className="bg-[#16241F] text-[#F1F4F2] p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-60 border border-secondary-800 leading-relaxed select-all">
                {formattedJson}
              </pre>
            ) : (
              <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 text-xs text-secondary-500 italic text-center">
                No additional metadata payload attached to this audit event.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AdminActivity() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);

    const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getActivityLogs({ page, size: 20 });
      const root = res?.data !== undefined ? res.data : res;
      if (!root || (typeof root === 'object' && !Array.isArray(root) && !Array.isArray(root.content))) {
        setError('Received an unexpected response structure from the server.');
        setLogs([]);
      } else {
        const raw = Array.isArray(root) ? root : (root.content || []);
        setLogs(raw);
        setTotalPages(root.totalPages || 1);
        setTotalElements(root.totalElements !== undefined ? root.totalElements : raw.length);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch audit logs.');
      setLogs([]);
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
      case 'PROFILE_UPDATE':
      case 'PASSWORD_CHANGE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-secondary-100 text-secondary-700 border-secondary-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans pb-16">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-secondary-900 tracking-tight leading-tight">
            Security &amp; System Audit Log
          </h1>
          <p className="text-secondary-600 mt-1 text-xs sm:text-sm font-medium">
            Immutable, append-only record of administrative operations and critical platform events
          </p>
        </div>
      </header>



      <div className="bg-white rounded-2xl sm:rounded-3xl border border-secondary-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs text-secondary-600 min-w-[750px]">
            <thead className="bg-secondary-50 text-secondary-600 text-xs uppercase tracking-wider border-b border-secondary-200 font-bold">
              <tr>
                <th className="py-3.5 px-5">Timestamp</th>
                <th className="py-3.5 px-5">Administrator</th>
                <th className="py-3.5 px-5">Action</th>
                <th className="py-3.5 px-5">Target</th>
                <th className="py-3.5 px-5">Metadata</th>
                <th className="py-3.5 px-5">Client IP</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-secondary-400 font-sans">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-secondary-400 font-sans">
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-secondary-50 transition-colors">
                    <td className="py-3.5 px-5 text-secondary-500 text-[11px] whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-secondary-900 font-bold font-sans">
                      {l.actorEmail || `ID: ${l.actorId}`}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border ${getActionBadgeColor(l.action)}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-secondary-700 font-sans">
                      {l.targetType}: {l.targetId}
                    </td>
                    <td className="py-3.5 px-5 text-secondary-500 text-[11px] max-w-xs truncate font-mono">
                      {l.metadataJson || '-'}
                    </td>
                    <td className="py-3.5 px-5 text-secondary-500 text-[11px]">
                      {l.clientIp || '127.0.0.1'}
                    </td>
                    <td className="py-3.5 px-5 text-right font-sans">
                      <button
                        onClick={() => setSelectedLog(l)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 transition border border-brand-200 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-secondary-50 border-t border-secondary-200 text-xs text-secondary-500">
          <div>
            Page <span className="font-bold text-secondary-900">{page + 1}</span> of{' '}
            <span className="font-bold text-secondary-900">{totalPages}</span> ({totalElements} total entries)
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded-lg hover:bg-secondary-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded-lg hover:bg-secondary-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <ActivityDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

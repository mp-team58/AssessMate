import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useModalScrollLock from '../../hooks/useModalScrollLock';
import useModalAccessibility from '../../hooks/useModalAccessibility';
import adminService from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import StatusBadge from '../../components/ui/StatusBadge';
import { 
  FileText, 
  Search, 
  AlertOctagon, 
  ChevronLeft, 
  ChevronRight, 
  ShieldAlert,
  X,
  RotateCcw
} from 'lucide-react';

export default function AdminExams() {
  const { showToast } = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Suspend modal state
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [targetExam, setTargetExam] = useState(null);
  const [suspending, setSuspending] = useState(false);

  const closeSuspendModal = () => {
    setTargetExam(null);
    setSuspendModalOpen(false);
  };

  useModalScrollLock(suspendModalOpen && Boolean(targetExam));
  const suspendModalRef = useModalAccessibility({
    isOpen: suspendModalOpen && Boolean(targetExam),
    onClose: () => closeSuspendModal(),
    preventEscape: suspending,
    defaultFocusCancel: true,
  });

    const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getExams({
        status: status !== 'ALL' ? status : undefined,
        q: search.trim() || undefined,
        page,
        size: 15,
        sort: 'createdAt',
        dir: 'desc'
      });
      const root = res?.data !== undefined ? res.data : res;
      if (!root || (typeof root === 'object' && !Array.isArray(root) && !Array.isArray(root.content))) {
        setError('Received an unexpected response structure from the server.');
        setExams([]);
      } else {
        const raw = Array.isArray(root) ? root : (root.content || []);
        setExams(raw);
        setTotalPages(root.totalPages || 1);
        setTotalElements(root.totalElements !== undefined ? root.totalElements : raw.length);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch assessments.');
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchExams();
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(0);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setPage(0);
  };

  const openSuspendModal = (exam) => {
    setTargetExam(exam);
    setSuspendModalOpen(true);
  };



  const handleConfirmSuspend = async () => {
    if (!targetExam) return;
    setSuspending(true);
    try {
      await adminService.suspendExam(targetExam.id);
      showToast(`Exam "${targetExam.title}" has been suspended / ended.`, 'success');
      closeSuspendModal();
      fetchExams();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to suspend exam.', 'error');
    } finally {
      setSuspending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans pb-16">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-secondary-900 tracking-tight">
            Assessments Oversight
          </h1>
          <p className="text-secondary-600 mt-1 text-xs sm:text-sm font-medium">
            Global monitoring of live, draft, and completed exams across the platform
          </p>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-secondary-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-secondary-100 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
            {['ALL', 'LIVE', 'ENDED', 'DRAFT'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setStatus(s); setPage(0); }}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  status === s
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-200/50'
                }`}
              >
                {s === 'ALL' ? 'All Assessments' : s}
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
                placeholder="Search by title or join code..."
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

        {/* Secondary meta info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-secondary-100 text-xs">
          <div className="flex items-center gap-2 text-secondary-500">
            <span>
              Total assessments: <strong className="text-secondary-900 font-bold">{totalElements}</strong>
            </span>
            {(search || status !== 'ALL') && (
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

      {/* Exams Table Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-secondary-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center gap-2">
            <ShieldAlert size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs text-secondary-600 min-w-[750px]">
            <thead className="bg-secondary-50 text-secondary-600 text-xs uppercase tracking-wider border-b border-secondary-200 font-bold">
              <tr>
                <th className="py-3.5 px-5">Assessment Title</th>
                <th className="py-3.5 px-5">Host</th>
                <th className="py-3.5 px-5">Join Code</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Total Enrolled</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-secondary-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading assessments...</span>
                    </div>
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-secondary-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText size={32} className="text-secondary-300 stroke-[1.5]" />
                      <p className="font-bold text-secondary-700 text-sm">No assessments found</p>
                      <p className="text-xs text-secondary-400 max-w-sm">
                        {search || status !== 'ALL'
                          ? 'No assessments match the current filter criteria. Try adjusting or clearing your filters.'
                          : 'No assessments have been created yet on the platform.'}
                      </p>
                      {(search || status !== 'ALL') && (
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
                exams.map((ex) => (
                  <tr key={ex.id} className="hover:bg-secondary-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-secondary-900">{ex.title}</div>
                      <div className="text-[11px] text-secondary-400 font-medium">{ex.subject} &bull; {ex.durationMinutes} mins</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-secondary-800">{ex.hostName}</div>
                      <div className="text-[11px] text-secondary-400 font-mono">{ex.hostEmail}</div>
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-brand-700">
                      {ex.joinCode}
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={ex.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-secondary-900 text-sm">
                        {Number(ex.enrollmentsCount || 0).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-secondary-400 font-medium">
                        enrolled candidates
                      </div>
                      {ex.status === 'LIVE' && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Live Session</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {ex.status !== 'ENDED' ? (
                        <button
                          onClick={() => openSuspendModal(ex)}
                          className="px-3 py-1.5 min-h-[32px] rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <AlertOctagon size={13} />
                          <span>End / Suspend</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-secondary-400 font-medium">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-secondary-50 border-t border-secondary-200 text-xs text-secondary-500">
          <div>
            Page <span className="font-bold text-secondary-900">{page + 1}</span> of{' '}
            <span className="font-bold text-secondary-900">{totalPages}</span>
            <span className="ml-2 text-secondary-400">({totalElements} total assessments)</span>
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

      {/* Suspend Confirmation Modal */}
      {suspendModalOpen && targetExam && createPortal(
        <div className="fixed inset-0 w-screen h-screen supports-[height:100dvh]:h-dvh z-[9999] bg-[#16241F]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div ref={suspendModalRef} role="alertdialog" aria-modal="true" aria-labelledby="admin-suspend-exam-title" aria-describedby="admin-suspend-exam-desc" tabIndex={-1} className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-6 md:p-8 shadow-2xl border border-secondary-200 space-y-4 font-sans outline-none my-auto">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 id="admin-suspend-exam-title" className="text-xl font-bold text-secondary-900">
                  Suspend / Force-End Exam
                </h3>
                <p className="text-xs text-secondary-500 font-medium">Emergency administrative action</p>
              </div>
            </div>

            <div id="admin-suspend-exam-desc" className="space-y-4">
              <p className="text-xs text-secondary-600 leading-relaxed">
                Are you sure you want to immediately suspend and force-end this assessment? This action takes effect across the platform in real time.
              </p>

              {/* Assessment Context Card */}
              <div className="p-4 bg-secondary-50/80 rounded-2xl border border-secondary-200 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-secondary-900 text-sm leading-tight">{targetExam.title}</h4>
                    <p className="text-[11px] text-secondary-500 font-medium mt-0.5">
                      {targetExam.subject} &bull; {targetExam.durationMinutes} mins &bull; Host: {targetExam.hostName} ({targetExam.hostEmail})
                    </p>
                  </div>
                  <StatusBadge status={targetExam.status} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-secondary-200/70">
                  <div className="p-2.5 bg-white rounded-xl border border-secondary-200">
                    <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider block">Join Code</span>
                    <span className="font-mono font-bold text-brand-700 text-xs">{targetExam.joinCode}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-secondary-200">
                    <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider block">Total Enrolled</span>
                    <span className="font-bold text-secondary-900 text-xs">
                      {Number(targetExam.enrollmentsCount || 0).toLocaleString()} Candidates
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-secondary-500 leading-tight">
                  <strong className="text-secondary-700">Candidate Data Notice:</strong> The count reflects total enrolled candidates. Any candidates with sessions currently active will have their attempts immediately finalized and auto-submitted.
                </p>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs space-y-1.5">
                <p className="font-bold">Immediate Consequences of Suspension:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-red-800">
                  <li><strong>Session Auto-Submission:</strong> The exam status immediately transitions to <code className="font-bold">ENDED</code>. Any candidates currently taking the exam have their sessions auto-submitted with all existing answers safely saved.</li>
                  <li><strong>No Further Attempts:</strong> All in-progress sessions are locked; candidates can no longer answer questions or run code.</li>
                  <li><strong>Access Invalidation:</strong> Join code <code className="font-bold">{targetExam.joinCode}</code> is deactivated immediately. No new candidates can enter.</li>
                  <li><strong>Audit Trail:</strong> This emergency action is immutably recorded in the system audit log with your admin identity and IP address.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeSuspendModal}
                disabled={suspending}
                data-cancel="true"
                className="px-4 py-2 min-h-[38px] bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={suspending}
                className="px-4 py-2 min-h-[38px] bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {suspending ? 'Suspending...' : 'Yes, End Exam'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

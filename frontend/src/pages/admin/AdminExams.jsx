import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import { 
  FileText, 
  Search, 
  Radio, 
  AlertOctagon, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export default function AdminExams() {
  const { showToast } = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Suspend modal state
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [targetExam, setTargetExam] = useState(null);
  const [suspending, setSuspending] = useState(false);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getExams({
        status: status !== 'ALL' ? status : undefined,
        q: search || undefined,
        page,
        size: 15,
        sort: 'createdAt',
        dir: 'desc'
      });
      setExams(res.data.content || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalElements(res.data.totalElements || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch assessments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [status, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchExams();
  };

  const openSuspendModal = (exam) => {
    setTargetExam(exam);
    setSuspendModalOpen(true);
  };

  const closeSuspendModal = () => {
    setTargetExam(null);
    setSuspendModalOpen(false);
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
          <h1 className="text-3xl font-black text-secondary-900 tracking-tight">
            Assessments Oversight
          </h1>
          <p className="text-secondary-600 mt-1 text-sm font-medium">
            Global monitoring of live, draft, and completed exams across the platform
          </p>
        </div>
      </header>



      {/* Filter and Search Bar */}
      <div className="bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-secondary-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-secondary-100 rounded-xl overflow-x-auto w-full sm:w-auto">
          {['ALL', 'LIVE', 'ENDED', 'DRAFT'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                status === s
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              {s === 'ALL' ? 'All Exams' : s}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or join code..."
              className="w-full pl-9 pr-3 py-2 bg-secondary-50 border border-secondary-200 rounded-xl text-xs text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Exams Table */}
      <div className="bg-white rounded-3xl border border-secondary-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-secondary-600">
            <thead className="bg-secondary-50 text-secondary-600 text-xs uppercase tracking-wider border-b border-secondary-200 font-bold">
              <tr>
                <th className="py-3.5 px-5">Assessment Title</th>
                <th className="py-3.5 px-5">Host</th>
                <th className="py-3.5 px-5">Join Code</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Enrollments</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-secondary-400">
                    Loading assessments...
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-secondary-400">
                    No assessments found.
                  </td>
                </tr>
              ) : (
                exams.map((ex) => (
                  <tr key={ex.id} className="hover:bg-secondary-50 transition-colors">
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
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        ex.status === 'LIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ex.status === 'ENDED'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {ex.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {ex.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-secondary-700">
                      {ex.enrollmentsCount}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {ex.status !== 'ENDED' ? (
                        <button
                          onClick={() => openSuspendModal(ex)}
                          className="px-3 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition inline-flex items-center gap-1 cursor-pointer"
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
        <div className="flex items-center justify-between px-5 py-3.5 bg-secondary-50 border-t border-secondary-200 text-xs text-secondary-500">
          <div>
            Page <span className="font-bold text-secondary-900">{page + 1}</span> of{' '}
            <span className="font-bold text-secondary-900">{totalPages}</span>
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

      {/* Suspend Confirmation Modal */}
      {suspendModalOpen && targetExam && (
        <div className="fixed inset-0 z-50 bg-[#16241F]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-secondary-200 space-y-4 font-sans">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-secondary-900">
                  Suspend / Force-End Exam
                </h3>
                <p className="text-xs text-secondary-500 font-medium">Emergency administrative action</p>
              </div>
            </div>

            <p className="text-xs text-secondary-600 leading-relaxed">
              Are you sure you want to immediately suspend and end <strong className="text-secondary-900 font-semibold">{targetExam.title}</strong> (Join Code: <code className="font-mono bg-secondary-100 px-1.5 py-0.5 rounded text-secondary-800">{targetExam.joinCode}</code>)?
            </p>

            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs space-y-1.5">
              <p className="font-bold">Impact on Candidates in Progress:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-red-800">
                <li><strong>Session Auto-Submitted:</strong> The exam status immediately transitions to <code className="font-bold">ENDED</code>. Any candidates currently in the exam room have their active sessions finalized with all autosaved answers preserved.</li>
                <li><strong>No Further Edits:</strong> Attempts are closed; candidates can no longer edit answers or run code.</li>
                <li><strong>Join Code Invalidation:</strong> The 6-character access code (<code className="font-bold">{targetExam.joinCode}</code>) is deactivated. No new candidates can enter.</li>
                <li><strong>Audit Trail:</strong> Recorded in the permanent admin audit trail with your identity and IP.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeSuspendModal}
                disabled={suspending}
                className="px-4 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={suspending}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {suspending ? 'Suspending...' : 'Yes, End Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

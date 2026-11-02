import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
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
      setActionMessage(`Exam "${targetExam.title}" has been suspended / ended.`);
      closeSuspendModal();
      fetchExams();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to suspend exam.');
    } finally {
      setSuspending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">
            Assessments Oversight
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Global monitoring of live, draft, and completed exams.
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
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl overflow-x-auto w-full sm:w-auto">
          {['ALL', 'LIVE', 'ENDED', 'DRAFT'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                status === s
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {s === 'ALL' ? 'All Exams' : s}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or join code..."
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

      {/* Exams Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Assessment Title</th>
                <th className="py-3 px-4">Host</th>
                <th className="py-3 px-4">Join Code</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Enrollments</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Loading assessments...
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No assessments found.
                  </td>
                </tr>
              ) : (
                exams.map((ex) => (
                  <tr key={ex.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{ex.title}</div>
                      <div className="text-[11px] text-gray-400">{ex.subject} &bull; {ex.durationMinutes} mins</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800">{ex.hostName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{ex.hostEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-gray-800">
                      {ex.joinCode}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
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
                    <td className="py-3 px-4 font-semibold text-gray-700">
                      {ex.enrollmentsCount}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {ex.status !== 'ENDED' ? (
                        <button
                          onClick={() => openSuspendModal(ex)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition inline-flex items-center gap-1"
                        >
                          <AlertOctagon size={13} />
                          <span>End / Suspend</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400">Completed</span>
                      )}
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

      {/* Suspend Confirmation Modal */}
      {suspendModalOpen && targetExam && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-gray-900">
                  Suspend / Force-End Exam
                </h3>
                <p className="text-xs text-gray-500">Emergency administrative action</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to immediately suspend and end <strong className="text-gray-900 font-semibold">{targetExam.title}</strong> (Join Code: <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">{targetExam.joinCode}</code>)?
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs space-y-1.5">
              <p className="font-bold">Impact on Candidates in Progress:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-red-800">
                <li><strong>Session Auto-Submitted:</strong> The exam status immediately transitions to <code className="font-semibold">ENDED</code>. Any candidates currently in the examination room have their active sessions finalized and auto-submitted with all autosaved answers preserved.</li>
                <li><strong>No Further Edits:</strong> Examination attempts are permanently closed; candidates can no longer edit answers or run code.</li>
                <li><strong>Join Code Invalidation:</strong> The 6-character access code (<code className="font-semibold">{targetExam.joinCode}</code>) is immediately deactivated. No new candidates can enter or start the assessment.</li>
                <li><strong>Audit Trail:</strong> This emergency termination is recorded in the permanent admin audit trail with your admin identity and IP address.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeSuspendModal}
                disabled={suspending}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={suspending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
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


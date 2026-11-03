import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyExams, deleteExam } from '../services/examService';
import ShareExamModal from '../components/ShareExamModal';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { 
  Share2, PlusCircle, Sparkles, FileText, FileSpreadsheet, 
  Trash2, Clock, Calendar, HelpCircle, Code2, KeyRound, BookOpenCheck, MoreVertical 
} from 'lucide-react';
import { prefetchRoute } from '../utils/prefetch';

const MyExams = () => {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shareExamId, setShareExamId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    if (!activeMenuId) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest("[data-exam-menu]")) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activeMenuId]);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const response = await getMyExams();
      const raw = Array.isArray(response.data) ? response.data : (response.data?.content || []);
      const sorted = [...raw].sort((a, b) => new Date(b.scheduledStart || b.createdAt || 0) - new Date(a.scheduledStart || a.createdAt || 0));
      setExams(sorted);
    } catch (err) {
      showToast(err.message || 'Failed to fetch exams.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Exam',
      message: 'Are you sure you want to delete this exam? This action cannot be undone.',
      confirmText: 'Delete Exam',
      cancelText: 'Cancel',
      isDanger: true,
    });
    if (!isConfirmed) return;
    try {
      await deleteExam(id);
      setExams(exams.filter(exam => exam.id !== id));
      showToast('Exam deleted successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete exam.', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-300 relative z-10 font-sans">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-secondary-900 tracking-tight">My Exams</h1>
          <p className="text-secondary-600 mt-1 text-sm font-medium">Manage your drafts, live assessments, and past exams</p>
        </div>
        {exams.length > 0 && (
          <Link
            to="/host/create-exam"
            onMouseEnter={() => prefetchRoute('/host/create-exam')}
            onFocus={() => prefetchRoute('/host/create-exam')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-sm hover:shadow transition-all text-sm shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Create Exam
          </Link>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white/80 rounded-2xl border border-secondary-200/70 p-6 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-secondary-200/80 rounded-lg" />
                  <div className="h-3 w-32 bg-secondary-200/50 rounded" />
                </div>
                <div className="h-7 w-20 bg-secondary-200/60 rounded-full" />
              </div>
              <div className="h-4 w-64 bg-secondary-200/40 rounded" />
            </div>
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-secondary-200/80 shadow-sm flex items-center justify-center text-brand-600 mb-4">
            <BookOpenCheck className="w-8 h-8 text-brand-600" />
          </div>
          <h2 className="text-xl font-bold text-secondary-900 mb-2">
            No exams created yet
          </h2>
          <p className="text-secondary-500 text-sm max-w-sm mb-6 leading-relaxed">
            Get started by creating your first assessment. It only takes a few minutes to set up.
          </p>
          <Link
            to="/host/create-exam"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-md shadow-brand-600/20 hover:shadow-lg transition-all text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Create First Exam
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white/80 backdrop-blur-xl rounded-[1.25rem] p-6 shadow-sm border border-secondary-200/60 hover:border-brand-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 flex flex-col h-full group relative overflow-hidden"
            >
              {/* Decorative accent blob */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-100 rounded-full blur-[40px] opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"></div>

              {/* Top soft gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 opacity-90 ${exam.status === 'LIVE' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                  exam.status === 'DRAFT' ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                    'bg-gradient-to-r from-secondary-300 to-secondary-400'
                }`}></div>

              <div className="flex justify-between items-start mb-5 mt-2 relative z-10">
                <span className={`px-3 py-1.5 text-[11px] font-black rounded-lg uppercase tracking-widest flex items-center gap-2 shadow-sm
                    ${exam.status === 'LIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' :
                    exam.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' :
                      'bg-secondary-50 text-secondary-600 border border-secondary-200/50'}`}>
                  {exam.status === 'LIVE' && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                  {exam.status}
                </span>

                <div className="bg-white text-secondary-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm border border-secondary-200/60 hover:text-brand-600 hover:border-brand-200 transition-colors cursor-default">
                  <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  {exam.joinCode}
                </div>
              </div>

              <div className="relative z-10 mb-6 flex-grow">
                <h3 className="text-xl font-bold text-secondary-900 mb-1.5 leading-tight group-hover:text-brand-600 transition-colors">{exam.title}</h3>
                <p className="text-brand-600 font-semibold text-sm mb-5 bg-brand-50 inline-block px-2.5 py-1 rounded-md">{exam.subject}</p>

                <div className="space-y-2.5">
                  <div className="flex items-center text-secondary-600 text-sm font-medium">
                    <div className="w-6 flex justify-center mr-1">
                      <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    {exam.timerType === 'WHOLE_EXAM'
                      ? `${exam.durationMinutes} min total`
                      : `${exam.easySeconds}/${exam.mediumSeconds}/${exam.hardSeconds} sec per question`}
                  </div>
                  <div className="flex items-center text-secondary-600 text-sm font-medium">
                    <div className="w-6 flex justify-center mr-1">
                      <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    {new Date(exam.scheduledStart).toLocaleString('en-US', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  <div className="flex items-center text-secondary-600 text-sm font-medium">
                    <div className="w-6 flex justify-center mr-1">
                      <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    {exam.totalQuestions || 0} General Qs
                  </div>
                  {exam.hasCodingSection && (
                    <div className="flex items-center text-indigo-600 text-sm font-medium">
                      <div className="w-6 flex justify-center mr-1">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      {exam.codingQuestionsCount || 0} Coding Qs
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-secondary-100 flex items-center gap-1.5 sm:gap-2 relative z-10 flex-nowrap w-full">
                <Link
                  to={`/host/exams/${exam.id}/manage`}
                  className="flex-1 min-w-0 h-9 bg-white border border-brand-200 text-brand-700 hover:bg-brand-50 hover:border-brand-300 transition-colors shadow-sm rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap flex items-center justify-center px-2 sm:px-3 truncate"
                  title="Manage Exam"
                >
                  Manage Exam
                </Link>

                {(exam.status === 'ENDED' || exam.status === 'LIVE') && (
                  <Link
                    to={`/host/exams/${exam.id}/results`}
                    className="flex-1 min-w-0 h-9 bg-emerald-50 border border-emerald-200/50 text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap flex items-center justify-center px-2 sm:px-3 truncate"
                    title="View Results"
                  >
                    View Results
                  </Link>
                )}

                {exam.status === 'LIVE' ? (
                  <>
                    <div className="sm:hidden relative shrink-0" data-exam-menu>
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(activeMenuId === exam.id ? null : exam.id)}
                        className="w-9 h-9 flex items-center justify-center text-secondary-500 hover:text-secondary-800 hover:bg-secondary-100/80 border border-secondary-200 rounded-xl transition-colors shadow-sm bg-white shrink-0"
                        title="More options"
                        aria-label="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeMenuId === exam.id && (
                        <div className="absolute right-0 bottom-full mb-2 w-44 bg-white rounded-xl shadow-xl border border-secondary-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                          <button
                            type="button"
                            onClick={() => { setActiveMenuId(null); setShareExamId(exam.id); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-secondary-700 hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
                          >
                            <Share2 className="w-4 h-4 text-brand-600 shrink-0" />
                            Share Exam
                          </button>
                          <button
                            type="button"
                            onClick={() => { setActiveMenuId(null); handleDelete(exam.id); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left border-t border-secondary-100"
                          >
                            <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                            Delete Exam
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShareExamId(exam.id)}
                      className="hidden sm:flex w-9 h-9 items-center justify-center text-brand-600 hover:text-brand-700 hover:bg-brand-50 border border-secondary-200 hover:border-brand-200 rounded-xl transition-colors shadow-sm bg-white shrink-0"
                      title="Share Exam"
                      aria-label="Share Exam"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(exam.id)}
                      className="hidden sm:flex w-9 h-9 items-center justify-center text-secondary-400 hover:text-red-600 hover:bg-red-50 border border-secondary-200 hover:border-red-200 rounded-xl transition-colors shadow-sm bg-white shrink-0"
                      title="Delete Exam"
                      aria-label="Delete Exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    {exam.status === 'SCHEDULED' && (
                      <button
                        type="button"
                        onClick={() => setShareExamId(exam.id)}
                        className="w-9 h-9 flex items-center justify-center text-brand-600 hover:text-brand-700 hover:bg-brand-50 border border-secondary-200 hover:border-brand-200 rounded-xl transition-colors shadow-sm bg-white shrink-0"
                        title="Share Exam"
                        aria-label="Share Exam"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(exam.id)}
                      className="w-9 h-9 flex items-center justify-center text-secondary-400 hover:text-red-600 hover:bg-red-50 border border-secondary-200 hover:border-red-200 rounded-xl transition-colors shadow-sm bg-white shrink-0"
                      title="Delete Exam"
                      aria-label="Delete Exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ShareExamModal
        examId={shareExamId}
        isOpen={!!shareExamId}
        onClose={() => setShareExamId(null)}
      />
    </div>
  );
};

export default MyExams;

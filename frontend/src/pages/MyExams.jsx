import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getMyExams, deleteExam } from '../services/examService';
import ShareExamModal from '../components/ShareExamModal';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import { 
  Share2, PlusCircle, Trash2, BookOpenCheck, MoreVertical, 
  Search, X, ArrowUpDown, Filter 
} from 'lucide-react';
import { prefetchRoute } from '../utils/prefetch';

const MyExams = () => {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shareExamId, setShareExamId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Search, filter, and sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'DRAFT' | 'LIVE' | 'ENDED'
  const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST' | 'OLDEST' | 'TITLE_AZ' | 'TITLE_ZA'

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
      setExams((prev) => prev.filter(exam => exam.id !== id));
      showToast('Exam deleted successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete exam.', 'error');
    }
  };

  // Filter & sort memoization
  const filteredAndSortedExams = useMemo(() => {
    let result = exams;

    // Status filtering
    if (statusFilter !== 'ALL') {
      result = result.filter((exam) => (exam.status || '').toUpperCase() === statusFilter);
    }

    // Search query matching (title or subject)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((exam) => {
        const titleMatch = (exam.title || '').toLowerCase().includes(q);
        const subjectMatch = (exam.subject || '').toLowerCase().includes(q);
        return titleMatch || subjectMatch;
      });
    }

    // Sorting (pure immutable array sort)
    return [...result].sort((a, b) => {
      if (sortBy === 'NEWEST') {
        const dateA = new Date(a.scheduledStart || a.createdAt || 0).getTime();
        const dateB = new Date(b.scheduledStart || b.createdAt || 0).getTime();
        return dateB - dateA;
      }
      if (sortBy === 'OLDEST') {
        const dateA = new Date(a.scheduledStart || a.createdAt || 0).getTime();
        const dateB = new Date(b.scheduledStart || b.createdAt || 0).getTime();
        return dateA - dateB;
      }
      if (sortBy === 'TITLE_AZ') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'TITLE_ZA') {
        return (b.title || '').localeCompare(a.title || '');
      }
      return 0;
    });
  }, [exams, statusFilter, searchQuery, sortBy]);

  // Status counts for badge tabs
  const statusCounts = useMemo(() => {
    const counts = { ALL: exams.length, DRAFT: 0, LIVE: 0, ENDED: 0 };
    exams.forEach((exam) => {
      const s = (exam.status || '').toUpperCase();
      if (counts[s] !== undefined) {
        counts[s] += 1;
      }
    });
    return counts;
  }, [exams]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSortBy('NEWEST');
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

      {/* Search, Filter Tabs, and Sorting Controls */}
      {exams.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-secondary-200/80 p-3 sm:p-4 shadow-sm flex flex-col lg:flex-row gap-3.5 lg:items-center lg:justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-secondary-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exams by title or subject..."
              aria-label="Search exams by title or subject"
              className="w-full pl-10 pr-9 py-2 bg-secondary-50/70 hover:bg-white focus:bg-white border border-secondary-200 rounded-xl text-xs sm:text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-700 p-1 rounded-md cursor-pointer transition-colors"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 justify-between sm:justify-start">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 bg-secondary-100/70 p-1 rounded-xl overflow-x-auto max-w-full" role="tablist" aria-label="Filter exams by status">
              {['ALL', 'DRAFT', 'LIVE', 'ENDED'].map((status) => {
                const isActive = statusFilter === status;
                const count = statusCounts[status] ?? 0;
                return (
                  <button
                    key={status}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-white text-brand-700 shadow-sm border border-secondary-200/50'
                        : 'text-secondary-600 hover:text-secondary-900 hover:bg-white/50'
                    }`}
                  >
                    <span>{status === 'ALL' ? 'All' : status}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'bg-secondary-200/70 text-secondary-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
              <label htmlFor="exam-sort-select" className="sr-only">Sort exams by</label>
              <div className="relative flex items-center">
                <ArrowUpDown className="w-3.5 h-3.5 text-secondary-500 absolute left-3 pointer-events-none" />
                <select
                  id="exam-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-8 pr-8 py-2 bg-secondary-50/70 hover:bg-white focus:bg-white border border-secondary-200 rounded-xl text-xs sm:text-sm font-semibold text-secondary-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer appearance-none"
                >
                  <option value="NEWEST">Newest First</option>
                  <option value="OLDEST">Oldest First</option>
                  <option value="TITLE_AZ">Title A–Z</option>
                  <option value="TITLE_ZA">Title Z–A</option>
                </select>
                <div className="absolute right-2.5 pointer-events-none text-secondary-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
        <EmptyState
          icon={BookOpenCheck}
          title="No assessments created yet"
          description="Get started by creating your first assessment. It only takes a few minutes to configure questions and start inviting candidates."
          actionText="Create Assessment"
          actionIcon={PlusCircle}
          actionTo="/host/create-exam"
          className="my-12 py-16"
        />
      ) : filteredAndSortedExams.length === 0 ? (
        searchQuery ? (
          <EmptyState
            icon={Search}
            iconVariant="secondary"
            title="No matching assessments found"
            description={`No examinations matching "${searchQuery}" were found${statusFilter !== 'ALL' ? ` in ${statusFilter} status` : ''}.`}
            actionText="Clear Search"
            onAction={() => setSearchQuery('')}
            secondaryActionText="Reset All Filters"
            onSecondaryAction={clearAllFilters}
            className="my-12 py-14"
          />
        ) : (
          <EmptyState
            icon={Filter}
            iconVariant="secondary"
            title={`No ${statusFilter.toLowerCase()} assessments`}
            description={`You do not have any assessments currently categorized as ${statusFilter}.`}
            actionText="View All Exams"
            onAction={clearAllFilters}
            className="my-12 py-14"
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
          {filteredAndSortedExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-[1.25rem] p-6 shadow-sm border border-secondary-200/60 hover:border-brand-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 flex flex-col h-full group relative overflow-hidden"
            >
              {/* Top soft gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 opacity-90 ${exam.status === 'LIVE' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                  exam.status === 'DRAFT' ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                    'bg-gradient-to-r from-secondary-300 to-secondary-400'
                }`}></div>

              <div className="flex justify-between items-start mb-5 mt-2 relative z-10">
                <StatusBadge status={exam.status} size="sm" />

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
                        className="w-9 h-9 flex items-center justify-center text-secondary-500 hover:text-secondary-800 hover:bg-secondary-100/80 border border-secondary-200 rounded-xl transition-colors shadow-sm bg-white shrink-0 cursor-pointer"
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
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-secondary-700 hover:bg-brand-50 hover:text-brand-700 transition-colors text-left cursor-pointer"
                          >
                            <Share2 className="w-4 h-4 text-brand-600 shrink-0" />
                            Share Exam
                          </button>
                          <button
                            type="button"
                            onClick={() => { setActiveMenuId(null); handleDelete(exam.id); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left border-t border-secondary-100 cursor-pointer"
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
                      className="hidden sm:flex w-9 h-9 items-center justify-center text-brand-600 hover:text-brand-700 hover:bg-brand-50 border border-secondary-200 hover:border-brand-200 rounded-xl transition-colors shadow-sm bg-white shrink-0 cursor-pointer"
                      title="Share Exam"
                      aria-label="Share Exam"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(exam.id)}
                      className="hidden sm:flex w-9 h-9 items-center justify-center text-secondary-400 hover:text-red-600 hover:bg-red-50 border border-secondary-200 hover:border-red-200 rounded-xl transition-colors shadow-sm bg-white shrink-0 cursor-pointer"
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
                        className="w-9 h-9 flex items-center justify-center text-brand-600 hover:text-brand-700 hover:bg-brand-50 border border-secondary-200 hover:border-brand-200 rounded-xl transition-colors shadow-sm bg-white shrink-0 cursor-pointer"
                        title="Share Exam"
                        aria-label="Share Exam"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(exam.id)}
                      className="w-9 h-9 flex items-center justify-center text-secondary-400 hover:text-red-600 hover:bg-red-50 border border-secondary-200 hover:border-red-200 rounded-xl transition-colors shadow-sm bg-white shrink-0 cursor-pointer"
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

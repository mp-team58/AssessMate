import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCandidateHistory } from '../services/candidateService';
import { checkDeviceAccess } from '../utils/deviceDetection';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../contexts/ToastContext';
import StatusBadge from '../components/ui/StatusBadge';
import { prefetchRoute } from '../utils/prefetch';
import {
  Search,
  RotateCw,
  Sparkles,
  Play,
  Award,
  KeyRound,
  Calendar,
  Clock,
  AlertCircle,
  BookOpen
} from 'lucide-react';

const MyAssessments = () => {
  const { showToast } = useToast();
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const navigate = useNavigate();

  const fetchAssessments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getCandidateHistory();
      const raw = response.data;
      const list = Array.isArray(raw) ? raw : (raw?.content || []);
      list.sort((a, b) => new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0));
      setAssessments(list);
    } catch (err) {
      setError(err.message || 'Failed to fetch assessments.');
      showToast(err.message || 'Failed to fetch assessments.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleStartExam = async (enrollmentId, examId, deviceAccess, examConfigObj) => {
    if (deviceAccess) {
      const check = checkDeviceAccess(deviceAccess);
      if (!check.allowed) {
        showToast(check.message, 'error');
        return;
      }
    }
    sessionStorage.setItem('currentEnrollmentId', enrollmentId);
    if (examId) {
      sessionStorage.setItem('currentExamId', String(examId));
      sessionStorage.setItem(`exam_id_${enrollmentId}`, String(examId));
      localStorage.setItem(`exam_id_${enrollmentId}`, String(examId));
    }
    if (examConfigObj) {
      try {
        sessionStorage.setItem(`exam_config_${enrollmentId}`, JSON.stringify(examConfigObj));
      } catch (_) {}
    }
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (_) {}
    navigate(`/candidate/exam/${enrollmentId}${examId ? `?examId=${examId}` : ''}`);
  };

  const filtered = assessments.filter((exam) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      exam.examTitle?.toLowerCase().includes(q) ||
      exam.subject?.toLowerCase().includes(q) ||
      exam.status?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'COMPLETED') {
      return exam.status === 'SUBMITTED' || exam.status === 'EXPIRED';
    }
    if (statusFilter === 'IN_PROGRESS') {
      return (
        exam.status === 'ONGOING' ||
        exam.status === 'IN_PROGRESS' ||
        exam.status === 'ENROLLED' ||
        !exam.status
      );
    }
    return true;
  });

  const totalCount = assessments.length;
  const completedCount = assessments.filter(
    (e) => e.status === 'SUBMITTED' || e.status === 'EXPIRED'
  ).length;
  const inProgressCount = totalCount - completedCount;

  return (
    <div className="w-full space-y-7 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#16241F] tracking-tight">Assessments</h1>
          <p className="text-secondary-600 mt-1 text-sm sm:text-base">
            Track your proctored examinations, resume active sessions, and review AI reports.
          </p>
        </div>
        <Button
          onClick={() => navigate('/candidate/join')}
          onMouseEnter={() => prefetchRoute('/candidate/join')}
          onFocus={() => prefetchRoute('/candidate/join')}
          className="!w-full sm:!w-auto px-6 py-2.5 text-sm font-bold shadow-md bg-amber-400 text-[#16241F] hover:bg-amber-300"
        >
          <KeyRound className="w-4 h-4 mr-1.5" />
          <span>Join Assessment</span>
        </Button>
      </header>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* Status Filter Tabs matching QuestionBank style */}
        <div className="flex bg-white p-1 rounded-2xl border border-secondary-200 shadow-xs w-full sm:w-fit overflow-x-auto">
          {[
            { id: 'ALL', label: 'All', count: totalCount },
            { id: 'IN_PROGRESS', label: 'Active', count: inProgressCount },
            { id: 'COMPLETED', label: 'Completed', count: completedCount }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer flex-1 sm:flex-initial ${
                statusFilter === tab.id
                  ? 'bg-[#16241F] text-amber-300 shadow-xs'
                  : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  statusFilter === tab.id ? 'bg-amber-400/20 text-amber-300' : 'bg-secondary-100 text-secondary-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input & Refresh Button */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-secondary-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-secondary-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-xs transition-all text-[#16241F]"
              aria-label="Search assessments by title or subject"
            />
          </div>

          <button
            type="button"
            onClick={fetchAssessments}
            disabled={isLoading}
            className="p-2.5 text-secondary-600 hover:text-secondary-900 hover:bg-white rounded-xl border border-secondary-200 bg-white transition-all shadow-xs shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
            title="Refresh assessments"
            aria-label="Refresh assessments list"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Assessment Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-secondary-200 h-64 flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-6 w-24 bg-secondary-200/70 rounded-full" />
                  <div className="h-4 w-16 bg-secondary-200/50 rounded" />
                </div>
                <div className="h-6 w-3/4 bg-secondary-200/80 rounded-lg" />
                <div className="h-4 w-1/2 bg-secondary-200/50 rounded" />
              </div>
              <div className="h-10 w-full bg-secondary-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : error && filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-12 text-center shadow-sm border border-secondary-200 max-w-xl mx-auto my-8 space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-600 border border-red-100">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-[#16241F]">Unable to load assessments</h3>
          <p className="text-secondary-500 text-sm max-w-sm mx-auto">
            Something went wrong while fetching your assessments. Check your connection and try again.
          </p>
          <Button onClick={fetchAssessments} className="!w-auto px-6 py-2.5 text-sm mx-auto inline-flex items-center gap-2">
            <RotateCw className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        searchQuery ? (
          <EmptyState
            icon={Search}
            iconVariant="secondary"
            title="No matching assessments"
            description={`No enrolled assessments match "${searchQuery}".`}
            actionText="Clear Search"
            onAction={() => setSearchQuery('')}
            className="my-8"
          />
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No assessments found"
            description="Enter an access code provided by your instructor or organization to enroll in your assessment."
            actionText="Join Assessment"
            actionIcon={KeyRound}
            actionTo="/candidate/join"
            className="my-8"
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((exam) => {
            const isSubmitted = exam.status === 'SUBMITTED' || exam.status === 'EXPIRED';
            const isInProgress = exam.status === 'ONGOING' || exam.status === 'IN_PROGRESS';

            return (
              <div
                key={exam.enrollmentId}
                className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 hover:border-brand-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full group relative overflow-hidden"
              >
                {/* Top Accent Line */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isSubmitted ? 'bg-emerald-500' : isInProgress ? 'bg-[#2F6F4E]' : 'bg-amber-400'
                  }`}
                />

                <div>
                  {/* Status and Score pill */}
                  <div className="flex justify-between items-start mb-3 mt-1 gap-2">
                    <StatusBadge status={exam.status || 'ENROLLED'} size="sm" />

                    {isSubmitted && exam.percentage !== undefined && exam.percentage !== null ? (
                      <div className="bg-brand-50 text-brand-900 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-inner border border-brand-200 shrink-0">
                        <Award className="w-3.5 h-3.5 text-[#2F6F4E]" />
                        <span>{exam.percentage}%</span>
                      </div>
                    ) : (
                      <div className="bg-secondary-50 text-secondary-600 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border border-secondary-200 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-secondary-400" />
                        <span>{isInProgress ? 'In Progress' : 'Enrolled'}</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Subject */}
                  <h3 className="text-lg font-bold text-[#16241F] mb-1 line-clamp-2 group-hover:text-brand-700 transition-colors">
                    {exam.examTitle}
                  </h3>
                  <p className="text-[#2F6F4E] font-semibold text-xs sm:text-sm mb-4">
                    {exam.subject || 'General Assessment'}
                  </p>

                  {/* Metadata Row */}
                  <div className="space-y-1.5 mb-6 text-xs text-secondary-500 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      <span>
                        Joined{' '}
                        {new Date(exam.joinedAt || Date.now()).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons pinned to bottom */}
                <div className="pt-4 border-t border-secondary-100 flex gap-2 mt-auto">
                  {isSubmitted ? (
                    <Button
                      onClick={() => navigate(`/candidate/result/${exam.enrollmentId}`)}
                      variant="primary"
                      className="w-full py-2.5 px-4 text-xs font-bold"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      <span>View AI Report</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleStartExam(exam.enrollmentId, exam.examId || exam.id, exam.deviceAccess, exam)}
                      variant="secondary"
                      className="w-full py-2.5 px-4 text-xs font-bold bg-[#16241F] hover:bg-secondary-800 text-white"
                    >
                      <Play className="w-4 h-4 fill-current mr-1.5" />
                      <span>{isInProgress ? 'Resume Exam' : 'Start Exam'}</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyAssessments;

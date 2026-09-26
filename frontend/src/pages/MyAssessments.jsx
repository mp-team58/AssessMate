import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCandidateHistory } from '../services/candidateService';
import Button from '../components/ui/Button';
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
      setAssessments(list);
    } catch (err) {
      setError(err.message || 'Failed to fetch assessments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleStartExam = (enrollmentId) => {
    sessionStorage.setItem('currentEnrollmentId', enrollmentId);
    navigate(`/candidate/exam/${enrollmentId}`);
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
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Assessments</h1>
          <p className="text-secondary-600 mt-1.5 text-base">
            Track your proctored examinations, resume active sessions, and review AI reports.
          </p>
        </div>
        <Button
          onClick={() => navigate('/candidate/join')}
          className="!w-auto px-6 py-2.5 text-sm shadow-md"
        >
          <KeyRound className="w-4 h-4" />
          <span>Join Assessment</span>
        </Button>
      </header>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl shadow-sm border border-red-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={fetchAssessments}
            className="px-3 py-1 bg-white border border-red-200 text-xs font-bold rounded-lg text-red-700 hover:bg-red-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar matching Host UI */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* Status Filter Tabs */}
        <div className="flex bg-white p-1 rounded-2xl border border-secondary-200 shadow-sm w-fit">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
            }`}
          >
            Active ({inProgressCount})
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              statusFilter === 'COMPLETED'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Search Input & Refresh Button */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-secondary-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-secondary-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm transition-all"
            />
          </div>

          <button
            onClick={fetchAssessments}
            disabled={isLoading}
            className="p-2.5 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-xl border border-secondary-200 bg-white transition-all shadow-sm"
            title="Refresh assessments"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Assessment Grid matching MyExams */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-secondary-200/80 max-w-xl mx-auto my-8 space-y-4">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto text-brand-600 border border-brand-100">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-secondary-900">No assessments found</h3>
          <p className="text-secondary-500 text-sm max-w-sm mx-auto">
            {searchQuery
              ? 'No assessments match your search criteria. Try a different query or clear the search.'
              : 'Enter an access code provided by your instructor to enroll in your assessment.'}
          </p>
          <Button onClick={() => navigate('/candidate/join')} className="!w-auto px-6 py-2.5 text-sm mx-auto">
            <KeyRound className="w-4 h-4" />
            <span>Join Assessment</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((exam) => {
            const isSubmitted = exam.status === 'SUBMITTED' || exam.status === 'EXPIRED';
            const isInProgress = exam.status === 'ONGOING' || exam.status === 'IN_PROGRESS';

            return (
              <div
                key={exam.enrollmentId}
                className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 hover:border-brand-400 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-300 flex flex-col h-full group relative overflow-hidden"
              >
                {/* Top color status indicator bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isSubmitted
                      ? 'bg-emerald-500'
                      : isInProgress
                      ? 'bg-brand-500'
                      : 'bg-amber-400'
                  }`}
                />

                {/* Header: Status and Score pill */}
                <div className="flex justify-between items-start mb-4 mt-1">
                  <span
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 ${
                      isSubmitted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isInProgress
                        ? 'bg-brand-50 text-brand-700 border border-brand-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isInProgress && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                    )}
                    {exam.status || 'ENROLLED'}
                  </span>

                  {isSubmitted && exam.percentage !== undefined && exam.percentage !== null ? (
                    <div className="bg-brand-50 text-brand-800 px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-inner border border-brand-200">
                      <Award className="w-3.5 h-3.5 text-brand-600" />
                      <span>{exam.percentage}%</span>
                    </div>
                  ) : (
                    <div className="bg-secondary-50 text-secondary-600 px-2.5 py-1 rounded-lg text-xs font-semibold border border-secondary-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-secondary-400" />
                      <span>Active</span>
                    </div>
                  )}
                </div>

                {/* Title & Subject */}
                <h3 className="text-lg font-bold text-secondary-900 mb-1 line-clamp-1 group-hover:text-brand-700 transition-colors">
                  {exam.examTitle}
                </h3>
                <p className="text-brand-600 font-semibold text-sm mb-4">
                  {exam.subject || 'General Assessment'}
                </p>

                {/* Metadata Row */}
                <div className="space-y-2 mb-6 flex-grow">
                  <div className="flex items-center text-secondary-500 text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5 mr-2 text-brand-500 flex-shrink-0" />
                    <span>
                      Joined on{' '}
                      {new Date(exam.joinedAt || Date.now()).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Action Buttons matching MyExams */}
                <div className="pt-4 border-t border-secondary-100 flex gap-2">
                  {isSubmitted ? (
                    <button
                      onClick={() => navigate(`/candidate/result/${exam.enrollmentId}`)}
                      className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>View AI Report</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartExam(exam.enrollmentId)}
                      className="flex-1 bg-secondary-900 hover:bg-secondary-800 text-[#F3EDE0] py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isInProgress ? 'Resume Exam' : 'Start Exam'}</span>
                    </button>
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

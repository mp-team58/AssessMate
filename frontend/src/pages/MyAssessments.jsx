import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCandidateHistory } from '../services/candidateService';
import Button from '../components/ui/Button';
import { Search, RotateCw, Sparkles, Play, Award } from 'lucide-react';

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
      setAssessments(Array.isArray(response.data) ? response.data : []);
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

    if (statusFilter === 'COMPLETED') return exam.status === 'SUBMITTED';
    if (statusFilter === 'IN_PROGRESS') return exam.status === 'IN_PROGRESS' || exam.status === 'ENROLLED' || !exam.status;
    return true;
  });

  const totalCount = assessments.length;
  const completedCount = assessments.filter(e => e.status === 'SUBMITTED').length;
  const inProgressCount = totalCount - completedCount;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">My Assessments</h1>
          <p className="text-secondary-600 mt-2 text-base">View your enrolled assessments, scores, and AI feedback</p>
        </div>
        <Button onClick={() => navigate('/candidate/join')} className="!w-auto px-6 py-2.5 text-base">
          Join New Assessment
        </Button>
      </header>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl shadow-sm border border-red-100">
          {error}
        </div>
      )}

      {/* Filter and Search Bar matching Host UI */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* Status Filter Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-secondary-200 shadow-sm w-fit">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
            }`}
          >
            Active ({inProgressCount})
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
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
              placeholder="Search assessments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-secondary-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm"
            />
          </div>

          <button
            onClick={fetchAssessments}
            disabled={isLoading}
            className="p-2.5 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-xl border border-secondary-200 bg-white transition-all shadow-sm"
            title="Refresh list"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Assessment Grid matching MyExams.jsx */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-lg border border-secondary-200">
          <h3 className="text-xl font-bold text-secondary-900 mb-2">No assessments found</h3>
          <p className="text-secondary-600 mb-6 text-base">
            {searchQuery
              ? 'No tests match your filter and search criteria.'
              : 'Enter an access code to enroll in your first test.'}
          </p>
          <Button onClick={() => navigate('/candidate/join')} className="!w-auto px-6 py-2.5 text-base">
            Join Assessment
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((exam) => {
            const isSubmitted = exam.status === 'SUBMITTED';
            const isInProgress = exam.status === 'IN_PROGRESS';

            return (
              <div
                key={exam.enrollmentId}
                className="bg-white rounded-2xl p-6 shadow-md border border-secondary-200 hover:border-brand-500 hover:shadow-xl transition-all flex flex-col h-full group"
              >
                {/* Header: Status and Score pill */}
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${
                      isSubmitted
                        ? 'bg-green-100 text-green-700'
                        : isInProgress
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {exam.status || 'ENROLLED'}
                  </span>

                  {isSubmitted && exam.totalScore !== undefined ? (
                    <div className="bg-brand-50 text-brand-700 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 shadow-inner border border-brand-100">
                      <Award className="w-3.5 h-3.5" />
                      <span>{exam.totalScore} pts ({exam.percentage}%)</span>
                    </div>
                  ) : (
                    <div className="bg-secondary-50 text-secondary-700 px-3 py-1 rounded-lg text-xs font-bold border border-secondary-200">
                      {exam.joinedAt
                        ? new Date(exam.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'Active'}
                    </div>
                  )}
                </div>

                {/* Title & Subject */}
                <h3 className="text-lg font-bold text-slate-800 mb-1">{exam.examTitle}</h3>
                <p className="text-brand-600 font-medium text-sm mb-4">{exam.subject || 'General Assessment'}</p>

                {/* Metadata Row matching MyExams */}
                <div className="space-y-2 mb-6 flex-grow">
                  <div className="flex items-center text-slate-500 text-sm">
                    <svg className="w-4 h-4 mr-2 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Joined on {new Date(exam.joinedAt || Date.now()).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                {/* Action Buttons matching MyExams */}
                <div className="pt-5 border-t border-secondary-100 flex gap-2 flex-wrap">
                  {isSubmitted ? (
                    <button
                      onClick={() => navigate(`/candidate/result/${exam.enrollmentId}`)}
                      className="flex-1 min-w-[120px] bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>View AI Report</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartExam(exam.enrollmentId)}
                      className="flex-1 min-w-[120px] bg-secondary-900 hover:bg-secondary-800 text-[#F3EDE0] py-2 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
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

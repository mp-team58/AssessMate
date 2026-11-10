import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCandidateHistory } from '../services/candidateService';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import {
  Award,
  Sparkles,
  Search,
  RotateCw,
  CheckCircle2,
  XCircle,
  Calendar,
  ArrowRight,
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react';

const CandidateResults = () => {
  const { showToast } = useToast();
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const fetchResults = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getCandidateHistory();
      const raw = response.data;
      const list = Array.isArray(raw) ? raw : (raw?.content || []);
      // Filter only submitted / expired completed exams with results
      const completedOnly = list.filter(
        (e) => e.status === 'SUBMITTED' || e.status === 'EXPIRED'
      );
      setResults(completedOnly);
    } catch (err) {
      setError(err.message || 'Failed to fetch assessment results.');
      showToast(err.message || 'Failed to fetch assessment results.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const filtered = results.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.examTitle?.toLowerCase().includes(q) ||
      item.subject?.toLowerCase().includes(q)
    );
  });

  // Calculate summary metrics
  const totalCompleted = results.length;
  const scoredList = results.filter((r) => r.percentage !== null && r.percentage !== undefined);
  const averagePercentage =
    scoredList.length > 0
      ? (scoredList.reduce((acc, r) => acc + Number(r.percentage), 0) / scoredList.length).toFixed(2)
      : null;
  const passedCount = scoredList.filter((r) => Number(r.percentage) >= 50).length;

  return (
    <div className="w-full space-y-4 sm:space-y-6 lg:space-y-7 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 tracking-tight">Assessment Results</h1>
          <p className="text-secondary-600 mt-1 text-xs sm:text-sm md:text-base">
            Review detailed AI diagnostic evaluations, topic breakdowns, and scores for all completed exams.
          </p>
        </div>
      </header>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-secondary-200/80 hover:shadow-md transition-all flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Completed Tests</span>
            <div className="p-2.5 bg-brand-50 text-brand-700 border border-brand-100 rounded-xl">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-secondary-900 tracking-tight">{totalCompleted}</h3>
          </div>
          <div className="mt-4 pt-3 border-t border-secondary-100 flex items-center justify-between text-xs text-secondary-500 font-medium">
            <span>Submitted or evaluated</span>
            <span className="font-semibold text-brand-700">All Time</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-secondary-200/80 hover:shadow-md transition-all flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Average Performance</span>
            <div className="p-2.5 bg-brand-50 text-brand-700 border border-brand-100 rounded-xl">
              <Award className="w-5 h-5 text-brand-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-secondary-900 tracking-tight">
              {averagePercentage !== null ? `${averagePercentage}%` : '—'}
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-secondary-100 flex items-center justify-between text-xs text-secondary-500 font-medium">
            <span>Cumulative mean score</span>
            <span className="font-semibold text-brand-700">{scoredList.length} graded</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-secondary-200/80 hover:shadow-md transition-all flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Qualified Assessments</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-secondary-900 tracking-tight">
              {passedCount} <span className="text-sm text-secondary-400 font-normal">/ {totalCompleted}</span>
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-secondary-100 flex items-center justify-between text-xs text-secondary-500 font-medium">
            <span>Passing threshold ≥ 50%</span>
            <span className="font-semibold text-emerald-700">
              {totalCompleted > 0 ? `${Math.round((passedCount / totalCompleted) * 100)}% pass rate` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 text-secondary-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search completed results..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-secondary-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm transition-all"
          />
        </div>

        <button
          onClick={fetchResults}
          disabled={isLoading}
          className="p-2.5 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-xl border border-secondary-200 bg-white transition-all shadow-sm self-end sm:self-auto"
          title="Refresh results"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Results List */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
        </div>
      ) : error && filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-secondary-200/80 max-w-xl mx-auto my-8 space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-600 border border-red-100">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-secondary-900">Unable to load assessment results</h3>
          <p className="text-secondary-500 text-sm max-w-sm mx-auto">
            Something went wrong while retrieving your completed results. Please try again.
          </p>
          <Button onClick={fetchResults} className="!w-auto px-6 py-2.5 text-sm mx-auto inline-flex items-center gap-2">
            <RotateCw className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        searchQuery ? (
          <EmptyState
            icon={Search}
            iconVariant="secondary"
            title="No matching results found"
            description={`No completed assessment results match "${searchQuery}".`}
            actionText="Clear Search"
            onAction={() => setSearchQuery('')}
            className="my-8"
          />
        ) : (
          <EmptyState
            icon={Award}
            title="No published assessment results yet"
            description="Complete your enrolled assessments to receive comprehensive AI diagnostic feedback and score reports once evaluated."
            actionText="View Enrolled Assessments"
            actionIcon={ArrowRight}
            actionTo="/candidate/my-assessments"
            className="my-8"
          />
        )
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const hasScore = item.percentage !== null && item.percentage !== undefined;
            const score = hasScore ? Math.round(Number(item.percentage) * 100) / 100 : null;
            const isQualified = hasScore && score >= 50;

            return (
              <div
                key={item.enrollmentId}
                className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-secondary-200 hover:border-brand-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 group"
              >
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-bold text-secondary-900 group-hover:text-brand-700 transition-colors break-words">
                      {item.examTitle}
                    </h3>
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider inline-flex items-center gap-1.5 flex-shrink-0 ${
                        isQualified
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isQualified ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Qualified</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Needs Improvement</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-secondary-500 font-medium">
                    <span className="text-brand-600 font-semibold">{item.subject || 'General Assessment'}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      Completed on{' '}
                      {new Date(item.joinedAt || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Score and Action */}
                <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-secondary-100 flex-shrink-0">
                  {hasScore && (
                    <div className="bg-secondary-50 border border-secondary-200/80 px-3.5 py-2 rounded-xl text-center min-w-[70px]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-400">Score</p>
                      <p className="text-lg font-black text-brand-700">{score}%</p>
                    </div>
                  )}

                  <Button
                    onClick={() => navigate(`/candidate/result/${item.enrollmentId}`)}
                    className="!w-auto px-4 sm:px-5 py-2.5 text-xs shadow-sm inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>View AI Report</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CandidateResults;

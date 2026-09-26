import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCandidateHistory } from '../services/candidateService';
import Button from '../components/ui/Button';
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
  FileText
} from 'lucide-react';

const CandidateResults = () => {
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
      ? (scoredList.reduce((acc, r) => acc + Number(r.percentage), 0) / scoredList.length).toFixed(1)
      : null;
  const passedCount = scoredList.filter((r) => Number(r.percentage) >= 50).length;

  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Assessment Results</h1>
          <p className="text-secondary-600 mt-1.5 text-base">
            Review detailed AI diagnostic evaluations, topic breakdowns, and scores for all completed exams.
          </p>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl shadow-sm border border-red-200 flex items-center justify-between gap-3">
          <span className="text-sm font-medium">{error}</span>
          <button
            onClick={fetchResults}
            className="px-3 py-1 bg-white border border-red-200 text-xs font-bold rounded-lg text-red-700 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-center gap-4">
          <div className="p-3.5 bg-brand-50 text-brand-700 border border-brand-100 rounded-xl flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Completed Tests</p>
            <h3 className="text-2xl font-extrabold text-secondary-900 mt-0.5">{totalCompleted}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-center gap-4">
          <div className="p-3.5 bg-brand-50 text-brand-700 border border-brand-100 rounded-xl flex-shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Average Performance</p>
            <h3 className="text-2xl font-extrabold text-secondary-900 mt-0.5">
              {averagePercentage !== null ? `${averagePercentage}%` : '—'}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Qualified Assessments</p>
            <h3 className="text-2xl font-extrabold text-secondary-900 mt-0.5">
              {passedCount} <span className="text-sm text-secondary-400 font-normal">/ {totalCompleted}</span>
            </h3>
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
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-secondary-200/80 max-w-xl mx-auto my-8 space-y-4">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto text-brand-600 border border-brand-100">
            <Award className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-secondary-900">No assessment results yet</h3>
          <p className="text-secondary-500 text-sm max-w-sm mx-auto">
            {searchQuery
              ? 'No completed results match your search query.'
              : 'Complete your enrolled assessments to receive comprehensive AI diagnostic feedback and score reports.'}
          </p>
          <Button onClick={() => navigate('/candidate/my-assessments')} className="!w-auto px-6 py-2.5 text-sm mx-auto">
            <span>View Active Assessments</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const hasScore = item.percentage !== null && item.percentage !== undefined;
            const isQualified = hasScore && Number(item.percentage) >= 50;

            return (
              <div
                key={item.enrollmentId}
                className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 hover:border-brand-400 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-bold text-secondary-900 group-hover:text-brand-700 transition-colors">
                      {item.examTitle}
                    </h3>
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 ${
                        isQualified
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isQualified ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Qualified</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Needs Improvement</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-secondary-500 font-medium">
                    <span className="text-brand-600 font-semibold">{item.subject || 'General Assessment'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-brand-500" />
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
                <div className="flex items-center gap-4 flex-shrink-0 self-start md:self-auto">
                  {hasScore && (
                    <div className="bg-secondary-50 border border-secondary-200 px-4 py-2 rounded-xl text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-400">Score</p>
                      <p className="text-xl font-black text-brand-600">{item.percentage}%</p>
                    </div>
                  )}

                  <Button
                    onClick={() => navigate(`/candidate/result/${item.enrollmentId}`)}
                    className="!w-auto px-5 py-2.5 text-xs shadow-md"
                  >
                    <Sparkles className="w-4 h-4" />
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

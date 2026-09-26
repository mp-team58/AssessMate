import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCandidateHistory } from '../services/candidateService';
import Button from '../components/ui/Button';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  Sparkles,
  BarChart3,
  ArrowRight,
  BookOpen,
  RotateCw,
  AlertCircle
} from 'lucide-react';

const CandidatePerformance = () => {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchHistory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getCandidateHistory();
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.content || []);
      setAssessments(list);
    } catch (err) {
      setError(err.message || 'Failed to fetch performance data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filter completed and scored exams
  const completedExams = assessments.filter(
    (e) => e.status === 'SUBMITTED' || e.status === 'EXPIRED'
  );
  const scoredExams = completedExams.filter(
    (e) => e.percentage !== null && e.percentage !== undefined
  );

  // Computed metrics
  const totalCount = assessments.length;
  const completedCount = completedExams.length;
  const averageScore =
    scoredExams.length > 0
      ? (scoredExams.reduce((sum, e) => sum + Number(e.percentage), 0) / scoredExams.length).toFixed(1)
      : null;

  const highestScore =
    scoredExams.length > 0
      ? Math.max(...scoredExams.map((e) => Number(e.percentage))).toFixed(1)
      : null;

  const passedCount = scoredExams.filter((e) => Number(e.percentage) >= 50).length;
  const passRate = scoredExams.length > 0 ? Math.round((passedCount / scoredExams.length) * 100) : null;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Subject-wise grouping
  const subjectMap = {};
  scoredExams.forEach((exam) => {
    const subj = exam.subject || 'General';
    if (!subjectMap[subj]) {
      subjectMap[subj] = { total: 0, count: 0, highest: 0 };
    }
    const score = Number(exam.percentage);
    subjectMap[subj].total += score;
    subjectMap[subj].count += 1;
    if (score > subjectMap[subj].highest) {
      subjectMap[subj].highest = score;
    }
  });

  const subjectStats = Object.keys(subjectMap).map((subj) => ({
    subject: subj,
    avg: (subjectMap[subj].total / subjectMap[subj].count).toFixed(1),
    count: subjectMap[subj].count,
    highest: subjectMap[subj].highest.toFixed(1)
  }));

  // Chronological score trend (oldest to newest for trend)
  const scoreTrend = [...scoredExams].reverse();

  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Performance Analytics</h1>
          <p className="text-secondary-600 mt-1.5 text-base">
            Detailed breakdown of your assessment metrics, score trajectory, and subject proficiency.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="p-2.5 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-xl border border-secondary-200 bg-white transition-all shadow-sm flex items-center gap-2 text-xs font-bold"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </header>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl shadow-sm border border-red-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={fetchHistory}
            className="px-3 py-1 bg-white border border-red-200 text-xs font-bold rounded-lg text-red-700 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Primary Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4">
          <div className="p-3.5 bg-brand-50 text-brand-700 border border-brand-100 rounded-xl flex-shrink-0">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Average Score</p>
            <h3 className="text-3xl font-extrabold text-secondary-900">
              {averageScore !== null ? `${averageScore}%` : '—'}
            </h3>
            <p className="text-xs text-secondary-500 mt-1.5 font-medium">
              {scoredExams.length > 0 ? `Across ${scoredExams.length} tests` : 'No score data yet'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl flex-shrink-0">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Highest Score</p>
            <h3 className="text-3xl font-extrabold text-secondary-900">
              {highestScore !== null ? `${highestScore}%` : '—'}
            </h3>
            <p className="text-xs text-emerald-600 mt-1.5 font-medium">Personal Best</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4">
          <div className="p-3.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl flex-shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Pass Rate</p>
            <h3 className="text-3xl font-extrabold text-secondary-900">
              {passRate !== null ? `${passRate}%` : '—'}
            </h3>
            <p className="text-xs text-secondary-500 mt-1.5 font-medium">
              {passedCount} of {completedCount} qualified
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4">
          <div className="p-3.5 bg-brand-50 text-brand-700 border border-brand-100 rounded-xl flex-shrink-0">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Completion Rate</p>
            <h3 className="text-3xl font-extrabold text-secondary-900">{completionRate}%</h3>
            <p className="text-xs text-secondary-500 mt-1.5 font-medium">
              {completedCount} of {totalCount} finished
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
        </div>
      ) : scoredExams.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-secondary-200/80 max-w-xl mx-auto my-8 space-y-4">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto text-brand-600 border border-brand-100">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-secondary-900">No performance data yet</h3>
          <p className="text-secondary-500 text-sm max-w-sm mx-auto">
            Performance analytics and score trends will appear here automatically once you complete your first proctored assessment.
          </p>
          <Button onClick={() => navigate('/candidate/my-assessments')} className="!w-auto px-6 py-2.5 text-sm mx-auto">
            <span>View Assessments</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left Column: Visual Score Trajectory & History (8 Cols) */}
          <div className="lg:col-span-8 space-y-7">
            {/* Visual Score Trajectory Chart */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-secondary-200 space-y-6">
              <div className="flex items-center justify-between border-b border-secondary-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-secondary-900">Score Trajectory</h3>
                  <p className="text-xs text-secondary-500 mt-0.5">Chronological test scores over time</p>
                </div>
                <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-lg">
                  {scoreTrend.length} Data Point{scoreTrend.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* CSS Bar Chart */}
              <div className="pt-6 pb-2">
                <div className="h-52 flex items-end justify-between gap-3 sm:gap-6 border-b border-secondary-200 pb-2 px-2">
                  {scoreTrend.map((exam, index) => {
                    const score = Number(exam.percentage || 0);
                    const isPassed = score >= 50;

                    return (
                      <div
                        key={exam.enrollmentId || index}
                        className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 bg-secondary-900 text-white text-[11px] font-bold py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-20 shadow-lg">
                          <p>{exam.examTitle}</p>
                          <p className="text-brand-300">{score}%</p>
                        </div>

                        {/* Bar */}
                        <span className="text-xs font-black text-secondary-700 opacity-80 group-hover:text-brand-600 transition-colors">
                          {score}%
                        </span>
                        <div
                          className={`w-full max-w-[48px] rounded-t-xl transition-all duration-500 ${
                            isPassed
                              ? 'bg-gradient-to-t from-brand-600 to-brand-400 group-hover:from-brand-700 group-hover:to-brand-500 shadow-md'
                              : 'bg-gradient-to-t from-amber-600 to-amber-400 group-hover:from-amber-700 group-hover:to-amber-500'
                          }`}
                          style={{ height: `${Math.max(12, Math.min(100, score))}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X Axis Labels */}
                <div className="flex justify-between gap-3 sm:gap-6 pt-3 px-2 text-[11px] font-semibold text-secondary-500">
                  {scoreTrend.map((exam, idx) => (
                    <div key={idx} className="flex-1 text-center truncate" title={exam.examTitle}>
                      {exam.examTitle}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Assessment History Performance Log */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-secondary-200 space-y-6">
              <div className="border-b border-secondary-100 pb-4">
                <h3 className="text-xl font-bold text-secondary-900">Performance Log</h3>
                <p className="text-xs text-secondary-500 mt-0.5">Comprehensive audit of completed assessments</p>
              </div>

              <div className="space-y-3">
                {completedExams.map((exam) => {
                  const score = exam.percentage !== null && exam.percentage !== undefined ? Number(exam.percentage) : null;
                  const isQualified = score !== null && score >= 50;

                  return (
                    <div
                      key={exam.enrollmentId}
                      className="p-4 rounded-xl border border-secondary-200/80 hover:border-brand-300 hover:bg-secondary-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-secondary-900 text-sm group-hover:text-brand-700 transition-colors">
                            {exam.examTitle}
                          </h4>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider ${
                              isQualified
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {isQualified ? 'Qualified' : 'Needs Review'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-secondary-500">
                          <span className="text-brand-600 font-medium">{exam.subject || 'General'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-secondary-400" />
                            {new Date(exam.joinedAt || Date.now()).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        {score !== null && (
                          <div className="text-right">
                            <p className="text-base font-black text-brand-600">{score}%</p>
                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Score</p>
                          </div>
                        )}

                        <Button
                          onClick={() => navigate(`/candidate/result/${exam.enrollmentId}`)}
                          variant="primary"
                          className="!w-auto px-4 py-1.5 text-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI Report</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Subject Proficiency Breakdown (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 space-y-5">
              <div className="border-b border-secondary-100 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-600" />
                  <h3 className="font-bold text-secondary-900 text-base">Subject Proficiency</h3>
                </div>
                <p className="text-xs text-secondary-500 mt-0.5">Average scores grouped by topic</p>
              </div>

              {subjectStats.length === 0 ? (
                <p className="text-xs text-secondary-500 text-center py-4">No subject data available.</p>
              ) : (
                <div className="space-y-4">
                  {subjectStats.map((item) => {
                    const avgNum = Number(item.avg);
                    return (
                      <div key={item.subject} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-secondary-900">{item.subject}</span>
                          <span className="font-black text-brand-600">{item.avg}%</span>
                        </div>
                        <div className="w-full bg-secondary-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, avgNum))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-secondary-400 font-medium">
                          <span>{item.count} test{item.count > 1 ? 's' : ''} taken</span>
                          <span>Peak: {item.highest}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Insights Readiness Card */}
            <div className="bg-gradient-to-br from-brand-900 to-brand-800 rounded-2xl p-6 text-white space-y-3 shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-300" />
                <h4 className="font-bold text-white text-sm">AI Diagnostic Readiness</h4>
              </div>
              <p className="text-xs text-brand-100 leading-relaxed opacity-90">
                Every exam submission is processed by Gemini AI to identify high-yield focus areas and conceptual strengths.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => navigate('/candidate/my-assessments')}
                  className="w-full py-2 bg-white text-brand-900 hover:bg-brand-50 text-xs font-bold"
                >
                  Explore Assessments
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidatePerformance;

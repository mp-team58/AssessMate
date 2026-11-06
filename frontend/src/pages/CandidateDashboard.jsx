import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  KeyRound,
  FileText,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  Play,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Library,
  RotateCw
} from 'lucide-react';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getCandidateHistory, getCandidateDashboard } from '../services/candidateService';
import { prefetchRoute } from '../utils/prefetch';
import { checkDeviceAccess } from '../utils/deviceDetection';

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [assessments, setAssessments] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [historyRes, statsRes] = await Promise.allSettled([
        getCandidateHistory(),
        getCandidateDashboard()
      ]);

      if (historyRes.status === 'fulfilled') {
        const rawData = historyRes.value.data;
        const list = Array.isArray(rawData) ? rawData : (rawData?.content || []);
        setAssessments(list);
      } else {
        setError(historyRes.reason?.message || 'Unable to load assessments.');
      }

      if (statsRes.status === 'fulfilled') {
        setDashboardStats(statsRes.value.data || null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
      showToast(err.message || 'Failed to load dashboard data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  // Compute metrics safely from real history
  const totalCount = dashboardStats?.totalExams ?? assessments.length;
  const completedList = assessments.filter(
    (e) => e.status === 'SUBMITTED' || e.status === 'EXPIRED'
  );
  const completedCount = dashboardStats?.completedExams ?? completedList.length;
  const activeList = assessments.filter(
    (e) => e.status === 'ONGOING' || e.status === 'IN_PROGRESS' || e.status === 'ENROLLED'
  );
  const activeCount = dashboardStats?.ongoingExams ?? activeList.length;

  // Active / in-progress candidate assessment
  const activeAssessment = activeList[0] || null;

  // Average score from completed exams with percentage
  const scoredExams = completedList.filter((e) => e.percentage !== null && e.percentage !== undefined);
  const averageScore =
    scoredExams.length > 0
      ? (scoredExams.reduce((sum, e) => sum + Number(e.percentage), 0) / scoredExams.length).toFixed(1)
      : null;

  const passedCount = scoredExams.filter((e) => Number(e.percentage) >= 50).length;
  const passRate = scoredExams.length > 0 ? Math.round((passedCount / scoredExams.length) * 100) : null;

  // Recent 5 assessments
  const recentAssessments = assessments.slice(0, 5);

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#16241F] via-[#1d352b] to-[#2F6F4E] p-6 sm:p-8 md:p-10 text-white shadow-xl border border-secondary-800">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold uppercase tracking-wider text-amber-300 mb-3 sm:mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Candidate Portal</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-2 sm:mb-3 text-white">
            Welcome back, {user?.name || 'Candidate'}!
          </h1>
          <p className="text-brand-100 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 leading-relaxed opacity-90">
            Stay on top of your proctored assessments, review personalized AI diagnostic feedback, and track your learning progress.
          </p>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              to="/candidate/join"
              onMouseEnter={() => prefetchRoute('/candidate/join')}
              onFocus={() => prefetchRoute('/candidate/join')}
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-amber-400 text-[#16241F] rounded-xl font-bold hover:bg-amber-300 hover:scale-[1.01] transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm sm:text-base"
            >
              <KeyRound className="w-4 h-4 text-[#16241F]" />
              <span>Join Assessment</span>
            </Link>
            <Link
              to="/candidate/my-assessments"
              onMouseEnter={() => prefetchRoute('/candidate/my-assessments')}
              onFocus={() => prefetchRoute('/candidate/my-assessments')}
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-bold hover:bg-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-white/40 text-sm sm:text-base"
            >
              <FileText className="w-4 h-4 text-brand-300" />
              <span>My Assessments</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Statistics Overview Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#16241F] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[#2F6F4E]" />
            <span>Overview &amp; Metrics</span>
          </h2>

          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-white rounded-xl border border-secondary-200 bg-white/80 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
            title="Refresh statistics"
            aria-label="Refresh dashboard statistics"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Total Assessments */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-secondary-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 h-full flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-secondary-600 font-semibold text-xs uppercase tracking-wider">
                  Total Enrolled
                </span>
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Library className="w-5 h-5 text-[#2F6F4E]" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#16241F] tracking-tight">
                {totalCount}
              </div>
            </div>
            <div className="border-t border-secondary-100 pt-3 mt-4 flex items-center justify-between text-xs text-secondary-500 font-medium">
              <span>Active in progress</span>
              <span className="font-bold text-[#2F6F4E]">{activeCount}</span>
            </div>
          </div>

          {/* Card 2: Completed */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-secondary-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 h-full flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-secondary-600 font-semibold text-xs uppercase tracking-wider">
                  Completed
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#16241F] tracking-tight">
                {completedCount}
              </div>
            </div>
            <div className="border-t border-secondary-100 pt-3 mt-4 flex items-center justify-between text-xs text-secondary-500 font-medium">
              <span>Evaluation</span>
              <span className="font-bold text-emerald-700">AI Diagnosed</span>
            </div>
          </div>

          {/* Card 3: Average Score */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-secondary-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 h-full flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-secondary-600 font-semibold text-xs uppercase tracking-wider">
                  Average Score
                </span>
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Award className="w-5 h-5 text-[#2F6F4E]" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#16241F] tracking-tight">
                {averageScore !== null ? `${averageScore}%` : '—'}
              </div>
            </div>
            <div className="border-t border-secondary-100 pt-3 mt-4 flex items-center justify-between text-xs text-secondary-500 font-medium">
              <span>Evaluated exams</span>
              <span className="font-bold text-secondary-700">{scoredExams.length}</span>
            </div>
          </div>

          {/* Card 4: Qualification Rate */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-secondary-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 h-full flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-secondary-600 font-semibold text-xs uppercase tracking-wider">
                  Qualified Rate
                </span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#16241F] tracking-tight">
                {passRate !== null ? `${passRate}%` : '—'}
              </div>
            </div>
            <div className="border-t border-secondary-100 pt-3 mt-4 flex items-center justify-between text-xs text-secondary-500 font-medium">
              <span>Passed tests</span>
              <span className="font-bold text-emerald-700">{passedCount} passed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Assessment Banner */}
      {activeAssessment ? (
        <div className="bg-white rounded-2xl p-5 sm:p-6 md:p-7 shadow-md border-2 border-brand-400/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-[#2F6F4E]" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2F6F4E]"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2F6F4E] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Active Assessment Ready
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#16241F] tracking-tight">
                {activeAssessment.examTitle}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-secondary-600 font-medium">
                <span className="text-[#2F6F4E] font-bold">{activeAssessment.subject || 'General Assessment'}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand-500" />
                  Enrolled on {new Date(activeAssessment.joinedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            <Button
              onClick={() => handleStartExam(activeAssessment.enrollmentId, activeAssessment.examId || activeAssessment.id, activeAssessment.deviceAccess, activeAssessment)}
              className="!w-full sm:!w-auto px-7 py-3 text-sm sm:text-base font-bold shadow-md shadow-brand-700/20 bg-[#16241F] hover:bg-secondary-800 text-white shrink-0"
            >
              <Play className="w-4 h-4 fill-current mr-1.5" />
              <span>Resume Assessment</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-secondary-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-50 text-brand-700 rounded-xl border border-brand-100 shrink-0">
              <KeyRound className="w-6 h-6 text-[#2F6F4E]" />
            </div>
            <div>
              <h4 className="font-bold text-[#16241F] text-base">Ready for your next assessment?</h4>
              <p className="text-xs text-secondary-500 mt-0.5">
                Enter your instructor&apos;s exam access code to enroll and take your proctored test.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/candidate/join')}
            variant="outline"
            className="!w-full sm:!w-auto px-5 py-2 text-sm font-bold border-secondary-300 text-secondary-800 hover:bg-secondary-50 shrink-0"
          >
            <span>Enter Access Code</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      )}

      {/* Main Content Layout: Left 8 Cols (Recent Assessments) + Right 4 Cols (Sidebar / Protocol) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Recent Assessments (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 md:p-7 shadow-sm border border-secondary-200 space-y-5">
            <div className="flex items-center justify-between border-b border-secondary-100 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#16241F]">Recent Assessments</h3>
                <p className="text-xs text-secondary-500 mt-0.5">Your latest enrolled and submitted exams</p>
              </div>
              <Link
                to="/candidate/my-assessments"
                className="text-xs font-bold text-[#2F6F4E] hover:text-brand-800 flex items-center gap-1 hover:underline p-1 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded-lg"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3.5 animate-pulse py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-secondary-50/80 rounded-2xl border border-secondary-200/60 p-4 shadow-sm" />
                ))}
              </div>
            ) : error && recentAssessments.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-600 border border-red-100">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
                <h4 className="text-base font-bold text-secondary-900">Unable to load assessments</h4>
                <p className="text-xs text-secondary-500 max-w-sm mx-auto">
                  A connection issue occurred while retrieving your assessment history.
                </p>
                <Button
                  onClick={fetchData}
                  className="!w-auto px-5 py-2 text-sm mx-auto inline-flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </Button>
              </div>
            ) : recentAssessments.length === 0 ? (
              <div className="py-6 sm:py-8">
                <EmptyState
                  icon={FileText}
                  title="No enrolled assessments yet"
                  description="You haven't joined any assessments yet. Enter the access code provided by your instructor to get started."
                  actionText="Join Assessment"
                  actionIcon={ArrowRight}
                  actionTo="/candidate/join"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {recentAssessments.map((exam) => {
                  const isSubmitted = exam.status === 'SUBMITTED' || exam.status === 'EXPIRED';
                  const isInProgress = exam.status === 'ONGOING' || exam.status === 'IN_PROGRESS';

                  return (
                    <div
                      key={exam.enrollmentId}
                      className="p-4 sm:p-5 rounded-2xl border border-secondary-200/80 hover:border-brand-300 hover:bg-secondary-50/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-[#16241F] text-base group-hover:text-brand-700 transition-colors line-clamp-1">
                            {exam.examTitle}
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                              isSubmitted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isInProgress
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {exam.status || 'ENROLLED'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-secondary-500 font-medium">
                          <span className="text-[#2F6F4E] font-semibold">{exam.subject || 'General'}</span>
                          <span>•</span>
                          <span>
                            {new Date(exam.joinedAt || Date.now()).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Right Action & Score */}
                      <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                        {isSubmitted && exam.percentage !== undefined && exam.percentage !== null && (
                          <div className="bg-brand-50 text-brand-900 border border-brand-200 px-3 py-1.5 rounded-xl text-xs font-black shadow-inner flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-[#2F6F4E]" />
                            <span>{exam.percentage}%</span>
                          </div>
                        )}

                        {isSubmitted ? (
                          <Button
                            onClick={() => navigate(`/candidate/result/${exam.enrollmentId}`)}
                            variant="primary"
                            className="!w-auto px-4 py-2 text-xs font-bold"
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                            <span>AI Report</span>
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleStartExam(exam.enrollmentId, exam.examId || exam.id, exam.deviceAccess, exam)}
                            variant="secondary"
                            className="!w-auto px-4 py-2 text-xs font-bold bg-[#16241F] hover:bg-secondary-800 text-white"
                          >
                            <Play className="w-3.5 h-3.5 fill-current mr-1" />
                            <span>{isInProgress ? 'Resume' : 'Start'}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Exam Prep Guidelines (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-secondary-200 space-y-4">
            <div className="flex items-center gap-2 text-[#16241F] font-bold text-sm border-b border-secondary-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Proctoring Guidelines</span>
            </div>

            <div className="space-y-3 text-xs text-secondary-600">
              <div className="p-3.5 bg-secondary-50/80 rounded-xl border border-secondary-200/80">
                <p className="font-bold text-[#16241F] mb-1">Fullscreen Enforced</p>
                <p className="text-secondary-500 leading-relaxed">Exiting full screen will be flagged and recorded automatically in the session audit log.</p>
              </div>

              <div className="p-3.5 bg-secondary-50/80 rounded-xl border border-secondary-200/80">
                <p className="font-bold text-[#16241F] mb-1">Continuous Tab Monitoring</p>
                <p className="text-secondary-500 leading-relaxed">Do not navigate away or switch browser tabs during active testing.</p>
              </div>

              <div className="p-3.5 bg-secondary-50/80 rounded-xl border border-secondary-200/80">
                <p className="font-bold text-[#16241F] mb-1">AI Diagnostic Evaluation</p>
                <p className="text-secondary-500 leading-relaxed">Comprehensive breakdown powered by Gemini AI delivered upon exam submission.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;

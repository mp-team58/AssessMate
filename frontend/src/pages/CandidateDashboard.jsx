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
import { useAuth } from '../context/AuthContext';
import { getCandidateHistory, getCandidateDashboard } from '../services/candidateService';

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assessments, setAssessments] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [quickCode, setQuickCode] = useState('');

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
      }

      if (statsRes.status === 'fulfilled') {
        setDashboardStats(statsRes.value.data || null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartExam = (enrollmentId) => {
    sessionStorage.setItem('currentEnrollmentId', enrollmentId);
    navigate(`/candidate/exam/${enrollmentId}`);
  };

  const handleQuickJoin = (e) => {
    e.preventDefault();
    if (!quickCode.trim()) return;
    navigate(`/candidate/join?code=${encodeURIComponent(quickCode.trim())}`);
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

  // Recent 4 assessments
  const recentAssessments = assessments.slice(0, 5);

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Hero Welcome Banner matching HostDashboard */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-8 md:p-10 text-white shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-semibold uppercase tracking-wider text-brand-100 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-brand-300" />
            <span>Candidate Portal</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">
            Welcome back, {user?.name || 'Candidate'}!
          </h1>
          <p className="text-brand-100 text-base md:text-lg mb-8 leading-relaxed opacity-90">
            Stay on top of your proctored assessments, review personalized AI diagnostic feedback, and track your learning journey.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/candidate/join"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-900 rounded-xl font-bold hover:bg-brand-50 hover:scale-[1.02] transition-all shadow-lg"
            >
              <KeyRound className="w-4 h-4 text-brand-700" />
              <span>Join Assessment</span>
            </Link>
            <Link
              to="/candidate/my-assessments"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-800/60 backdrop-blur-sm border border-brand-400/30 text-white rounded-xl font-bold hover:bg-brand-700/60 transition-all"
            >
              <FileText className="w-4 h-4 text-brand-300" />
              <span>My Assessments</span>
            </Link>
          </div>
        </div>

        {/* Decorative background ambient orbs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-brand-500 blur-3xl opacity-30 animate-pulse pointer-events-none" />
        <div className="absolute bottom-0 right-40 -mb-20 w-72 h-72 rounded-full bg-brand-400 blur-3xl opacity-20 pointer-events-none" />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl shadow-sm border border-red-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1 bg-white border border-red-200 text-xs font-bold rounded-lg text-red-700 hover:bg-red-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Quick Statistics Overview Grid matching Host UI */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-secondary-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-brand-600" />
            <span>Performance & Overview</span>
          </h2>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-white rounded-xl border border-secondary-200 bg-white/70 transition-all shadow-sm"
            title="Refresh statistics"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Assessments */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4 group hover:shadow-md hover:border-brand-300 transition-all">
            <div className="p-3.5 bg-[#F8F5F0] text-brand-700 border border-[#EBE3D5] rounded-xl group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
              <Library className="w-7 h-7" />
            </div>
            <div>
              <p className="text-secondary-600 font-semibold text-xs uppercase tracking-wider mb-1">
                Total Enrolled
              </p>
              <h3 className="text-3xl font-extrabold text-[#362E20]">{totalCount}</h3>
              <p className="text-xs text-secondary-500 mt-1.5 font-medium">
                {activeCount} currently active
              </p>
            </div>
          </div>

          {/* Card 2: Completed */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4 group hover:shadow-md hover:border-brand-300 transition-all">
            <div className="p-3.5 bg-[#F8F5F0] text-emerald-700 border border-[#EBE3D5] rounded-xl group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-secondary-600 font-semibold text-xs uppercase tracking-wider mb-1">
                Completed
              </p>
              <h3 className="text-3xl font-extrabold text-[#362E20]">{completedCount}</h3>
              <p className="text-xs text-emerald-600 mt-1.5 font-medium flex items-center gap-1">
                AI Evaluated
              </p>
            </div>
          </div>

          {/* Card 3: Average Score */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4 group hover:shadow-md hover:border-brand-300 transition-all">
            <div className="p-3.5 bg-[#F8F5F0] text-brand-600 border border-[#EBE3D5] rounded-xl group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <p className="text-secondary-600 font-semibold text-xs uppercase tracking-wider mb-1">
                Average Score
              </p>
              <h3 className="text-3xl font-extrabold text-[#362E20]">
                {averageScore !== null ? `${averageScore}%` : '—'}
              </h3>
              <p className="text-xs text-secondary-500 mt-1.5 font-medium">
                {scoredExams.length > 0 ? `Across ${scoredExams.length} tests` : 'No score data yet'}
              </p>
            </div>
          </div>

          {/* Card 4: Qualification Rate */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4 group hover:shadow-md hover:border-brand-300 transition-all">
            <div className="p-3.5 bg-[#F8F5F0] text-amber-700 border border-[#EBE3D5] rounded-xl group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <p className="text-secondary-600 font-semibold text-xs uppercase tracking-wider mb-1">
                Qualified Rate
              </p>
              <h3 className="text-3xl font-extrabold text-[#362E20]">
                {passRate !== null ? `${passRate}%` : '—'}
              </h3>
              <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                {passedCount > 0 ? `${passedCount} passed tests` : 'Complete tests to view'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active / Current Assessment Banner */}
      {activeAssessment ? (
        <div className="bg-white rounded-2xl p-6 md:p-7 shadow-md border-2 border-brand-400/40 relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-2 bg-brand-500" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-600"></span>
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                  Active Assessment Ready
                </span>
              </div>
              <h3 className="text-2xl font-extrabold text-secondary-900 tracking-tight">
                {activeAssessment.examTitle}
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-sm text-secondary-600 font-medium">
                <span className="text-brand-700 font-bold">{activeAssessment.subject || 'General Assessment'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-brand-500" />
                  Joined on {new Date(activeAssessment.joinedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            <Button
              onClick={() => handleStartExam(activeAssessment.enrollmentId)}
              className="!w-auto px-7 py-3 text-base shadow-lg shadow-brand-600/20"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Assessment</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-50 text-brand-700 rounded-xl border border-brand-100 flex-shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-secondary-900 text-base">Ready for your next assessment?</h4>
              <p className="text-xs text-secondary-500">
                Enter your instructor&apos;s exam code to verify and take your proctored test.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/candidate/join')}
            variant="outline"
            className="!w-auto px-5 py-2 text-sm"
          >
            <span>Enter Access Code</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Main Content Layout: Left 8 Cols (Recent Assessments) + Right 4 Cols (Sidebar / Tips) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Recent Assessments (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl p-6 md:p-7 shadow-sm border border-secondary-200 space-y-6">
            <div className="flex items-center justify-between border-b border-secondary-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-secondary-900">Recent Assessments</h3>
                <p className="text-xs text-secondary-500 mt-0.5">Your latest enrolled and submitted exams</p>
              </div>
              <Link
                to="/candidate/my-assessments"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
              </div>
            ) : recentAssessments.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto text-brand-600 border border-brand-100">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-secondary-800">No assessments found</h4>
                <p className="text-xs text-secondary-500 max-w-sm mx-auto">
                  You haven&apos;t joined any assessments yet. Use an access code from your instructor to get started.
                </p>
                <Button
                  onClick={() => navigate('/candidate/join')}
                  className="!w-auto px-5 py-2 text-sm mx-auto"
                >
                  Join First Assessment
                </Button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recentAssessments.map((exam) => {
                  const isSubmitted = exam.status === 'SUBMITTED' || exam.status === 'EXPIRED';
                  const isInProgress = exam.status === 'ONGOING' || exam.status === 'IN_PROGRESS';

                  return (
                    <div
                      key={exam.enrollmentId}
                      className="p-4 rounded-xl border border-secondary-200/80 hover:border-brand-300 hover:bg-secondary-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-secondary-900 text-base group-hover:text-brand-700 transition-colors">
                            {exam.examTitle}
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wider ${
                              isSubmitted
                                ? 'bg-green-100 text-green-700'
                                : isInProgress
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {exam.status || 'ENROLLED'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-secondary-500 font-medium">
                          <span className="text-brand-600 font-semibold">{exam.subject || 'General'}</span>
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
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {isSubmitted && exam.percentage !== undefined && exam.percentage !== null && (
                          <div className="bg-brand-50 text-brand-800 border border-brand-200 px-3 py-1 rounded-lg text-xs font-black shadow-inner flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-brand-600" />
                            <span>{exam.percentage}%</span>
                          </div>
                        )}

                        {isSubmitted ? (
                          <Button
                            onClick={() => navigate(`/candidate/result/${exam.enrollmentId}`)}
                            variant="primary"
                            className="!w-auto px-4 py-1.5 text-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI Report</span>
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleStartExam(exam.enrollmentId)}
                            variant="secondary"
                            className="!w-auto px-4 py-1.5 text-xs"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
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

        {/* Right Column: Quick Join Box & Exam Prep Guidelines (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Access Code Box */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-brand-50 text-brand-700 rounded-lg border border-brand-100">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-secondary-900 text-base">Quick Access Code</h3>
                <p className="text-xs text-secondary-500">Jump right into your exam</p>
              </div>
            </div>

            <form onSubmit={handleQuickJoin} className="space-y-3">
              <input
                type="text"
                placeholder="e.g. EXAM-8492"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-secondary-300 font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm"
              />
              <Button type="submit" disabled={!quickCode.trim()} className="w-full py-2.5 text-sm">
                <span>Verify & Enroll</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {/* Assessment Protocol Notice */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 space-y-4">
            <div className="flex items-center gap-2 text-secondary-900 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Proctoring Guidelines</span>
            </div>

            <div className="space-y-3 text-xs text-secondary-600">
              <div className="p-3 bg-secondary-50 rounded-xl border border-secondary-200/70">
                <p className="font-bold text-secondary-800 mb-0.5">Fullscreen Enforced</p>
                <p className="text-secondary-500">Exiting full screen will be flagged and logged automatically.</p>
              </div>

              <div className="p-3 bg-secondary-50 rounded-xl border border-secondary-200/70">
                <p className="font-bold text-secondary-800 mb-0.5">Continuous Tab Monitoring</p>
                <p className="text-secondary-500">Do not navigate away or switch browser tabs during testing.</p>
              </div>

              <div className="p-3 bg-secondary-50 rounded-xl border border-secondary-200/70">
                <p className="font-bold text-secondary-800 mb-0.5">AI Diagnostic Analysis</p>
                <p className="text-secondary-500">Instant personalized breakdown powered by Gemini AI upon submission.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;

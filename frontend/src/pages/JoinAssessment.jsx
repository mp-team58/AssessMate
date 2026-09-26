import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  KeyRound,
  ArrowRight,
  Clock,
  ShieldAlert,
  AlertCircle,
  Sparkles,
  Maximize2,
  CheckCircle2,
  Lock,
  Eye,
  FileText
} from 'lucide-react';
import Button from '../components/ui/Button';
import { joinExamByCode } from '../services/candidateService';

const JoinAssessment = () => {
  const [searchParams] = useSearchParams();
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [enrolledExam, setEnrolledExam] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setJoinCode(codeParam.toUpperCase());
    }
  }, [searchParams]);

  const handleJoin = async (e) => {
    e?.preventDefault();
    if (!joinCode.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await joinExamByCode(joinCode.trim());
      setEnrolledExam(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Invalid or expired access code. Please verify the code with your instructor.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExam = (enrollmentId) => {
    sessionStorage.setItem('currentEnrollmentId', enrollmentId);
    navigate(`/candidate/exam/${enrollmentId}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-7 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <header>
        <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Join Assessment</h1>
        <p className="text-secondary-600 mt-1.5 text-base">
          Enter your unique access code to verify your credentials and begin your proctored assessment session.
        </p>
      </header>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl shadow-sm border border-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Access Code Input Card */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-secondary-200 space-y-6">
        <div className="flex items-center gap-3.5 pb-4 border-b border-secondary-100">
          <div className="bg-brand-50 text-brand-700 p-3 rounded-2xl border border-brand-100 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-secondary-900">Exam Access Code</h3>
            <p className="text-secondary-500 text-xs mt-0.5">
              Enter the unique join code assigned by your instructor or organization
            </p>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-secondary-700 uppercase tracking-wider mb-2">
              Access Code
            </label>
            <div className="relative">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="e.g. EXAM-8492"
                className="w-full px-5 py-4 text-lg bg-secondary-50/50 border-2 border-secondary-200 rounded-2xl focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all font-mono tracking-widest text-secondary-900 uppercase placeholder:text-secondary-400 font-bold"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-secondary-400">
                <Lock className="w-5 h-5" />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !joinCode.trim()}
            className="w-full py-3.5 text-base shadow-lg shadow-brand-600/20"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Access Code...</span>
              </>
            ) : (
              <>
                <span>Verify &amp; Enroll</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Pre-Assessment Protocol Standards */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-secondary-200 space-y-5">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-brand-600" />
          <h4 className="text-lg font-bold text-secondary-900">Before You Start — Examination Rules</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-secondary-600">
          <div className="bg-secondary-50 p-5 rounded-2xl border border-secondary-200/80 space-y-1">
            <div className="flex items-center gap-2 text-secondary-900 font-bold text-sm">
              <Maximize2 className="w-4 h-4 text-brand-600" />
              <span>Full Screen Mode Enforced</span>
            </div>
            <p className="text-xs text-secondary-500 leading-relaxed">
              Assessment requires continuous full-screen mode. Exiting full screen or minimizing automatically logs a proctoring incident.
            </p>
          </div>

          <div className="bg-secondary-50 p-5 rounded-2xl border border-secondary-200/80 space-y-1">
            <div className="flex items-center gap-2 text-secondary-900 font-bold text-sm">
              <Eye className="w-4 h-4 text-brand-600" />
              <span>Anti-Cheating Monitoring</span>
            </div>
            <p className="text-xs text-secondary-500 leading-relaxed">
              Tab switching, window minimizing, multiple displays, and right clicking are monitored and recorded in real time.
            </p>
          </div>

          <div className="bg-secondary-50 p-5 rounded-2xl border border-secondary-200/80 space-y-1">
            <div className="flex items-center gap-2 text-secondary-900 font-bold text-sm">
              <Clock className="w-4 h-4 text-brand-600" />
              <span>Continuous Countdown Timer</span>
            </div>
            <p className="text-xs text-secondary-500 leading-relaxed">
              The test timer begins immediately upon entering the exam room. Responses are automatically submitted when time expires.
            </p>
          </div>

          <div className="bg-secondary-50 p-5 rounded-2xl border border-secondary-200/80 space-y-1">
            <div className="flex items-center gap-2 text-secondary-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>Gemini AI Evaluation</span>
            </div>
            <p className="text-xs text-secondary-500 leading-relaxed">
              Upon completion, Gemini AI automatically analyzes your score, identifies conceptual weak areas, and delivers personalized diagnostic insights.
            </p>
          </div>
        </div>
      </div>

      {/* Pre-Flight Instructions Modal / Verified Card */}
      {enrolledExam && (
        <div className="fixed inset-0 z-50 bg-[#362E20]/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-secondary-200 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="border-b border-secondary-100 pb-4">
              <span className="px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider bg-green-100 text-green-800 flex items-center gap-1.5 w-fit">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                Enrollment Verified
              </span>
              <h3 className="text-2xl font-extrabold text-secondary-900 tracking-tight mt-3">
                {enrolledExam.examTitle || enrolledExam.title}
              </h3>
              <p className="text-brand-600 font-semibold text-sm mt-0.5">
                {enrolledExam.subject || 'General Assessment'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-secondary-50 p-4 rounded-2xl border border-secondary-200 text-center">
              <div>
                <p className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider">Duration</p>
                <p className="text-lg font-black text-secondary-900 flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-4 h-4 text-brand-600" />
                  <span>{enrolledExam.durationMinutes || 60}m</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider">Total Marks</p>
                <p className="text-lg font-black text-secondary-900 mt-1">
                  {enrolledExam.totalMarks ?? enrolledExam.totalQuestions ?? 100}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider">Passing Marks</p>
                <p className="text-lg font-black text-green-700 mt-1">
                  {enrolledExam.passingMarks ?? `${enrolledExam.passingPercentage || 50}%`}
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-sm space-y-1">
              <div className="font-bold flex items-center gap-2 text-amber-950 text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Proctoring Notice</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                Full-screen mode will be initiated upon starting. Exiting full screen, minimizing, or switching tabs will be recorded on your proctoring audit log.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEnrolledExam(null)}
                className="px-5 py-2.5 font-bold rounded-xl text-xs text-secondary-600 bg-white border border-secondary-200 hover:bg-secondary-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <Button
                type="button"
                onClick={() => {
                  const id = enrolledExam.enrollmentId || enrolledExam.id;
                  setEnrolledExam(null);
                  handleStartExam(id);
                }}
                className="px-6 py-2.5 text-xs shadow-md"
              >
                <span>Start Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JoinAssessment;

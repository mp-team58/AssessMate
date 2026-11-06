import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useModalScrollLock from '../hooks/useModalScrollLock';
import useModalAccessibility from '../hooks/useModalAccessibility';
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
  Monitor,
  Smartphone
} from 'lucide-react';
import { checkDeviceAccess } from '../utils/deviceDetection';
import Button from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';
import { joinExamByCode } from '../services/candidateService';

const formatJoinErrorMessage = (err) => {
  const rawMsg = err?.response?.data?.message || err?.message || '';

  if (/restricted to Desktop/i.test(rawMsg)) {
    return 'This exam is restricted to Desktop devices only. Mobile phones and tablets are not permitted.';
  }
  if (/restricted to Mobile/i.test(rawMsg)) {
    return 'This exam is restricted to Mobile devices only. Desktop and laptop computers are not permitted.';
  }

  if (/has not started yet/i.test(rawMsg) || /wait until/i.test(rawMsg)) {
    const match = rawMsg.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/);
    if (match) {
      const parsedDate = new Date(match[1]);
      if (!isNaN(parsedDate.getTime())) {
        const formattedDate = parsedDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        const formattedTime = parsedDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        return `The exam hasn't started yet. Please try again on ${formattedDate} at ${formattedTime}.`;
      }
    }
    return "The exam hasn't started yet. Please check back at the scheduled start time.";
  }

  return (
    rawMsg ||
    'Invalid or expired access code. Please verify the code with your instructor.'
  );
};

const JoinAssessment = () => {
  const [searchParams] = useSearchParams();
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [enrolledExam, setEnrolledExam] = useState(null);

  useModalScrollLock(Boolean(enrolledExam));
  const preflightModalRef = useModalAccessibility({
    isOpen: Boolean(enrolledExam),
    onClose: () => setEnrolledExam(null),
    defaultFocusCancel: true,
  });

  const navigate = useNavigate();
  const { showToast } = useToast();

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
    setErrorBanner('');

    try {
      const res = await joinExamByCode(joinCode.trim());
      setEnrolledExam(res.data);
      if (res.data?.enrollmentId) {
        sessionStorage.setItem(`exam_config_${res.data.enrollmentId}`, JSON.stringify(res.data));
      }
    } catch (err) {
      const friendlyMessage = formatJoinErrorMessage(err);
      setErrorBanner(friendlyMessage);
      showToast(friendlyMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExam = async (enrollmentId, examId, deviceAccess) => {
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
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (fsErr) {
      console.warn('Fullscreen entry on start dismissed:', fsErr);
    }
    navigate(`/candidate/exam/${enrollmentId}${examId ? `?examId=${examId}` : ''}`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-7 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <header>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#16241F] tracking-tight">Join Assessment</h1>
        <p className="text-secondary-600 mt-1 text-sm sm:text-base">
          Enter your unique access code to verify your credentials and begin your proctored assessment session.
        </p>
      </header>

      {/* Access Code Input Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-secondary-200 space-y-6">
        <div className="flex items-center gap-3.5 pb-4 border-b border-secondary-100">
          <div className="bg-brand-50 text-[#2F6F4E] p-3 rounded-2xl border border-brand-100 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#16241F]">Exam Access Code</h2>
            <p className="text-secondary-500 text-xs mt-0.5">
              Enter the unique alphanumeric join code provided by your instructor or organization
            </p>
          </div>
        </div>

        {errorBanner && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs sm:text-sm font-medium flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorBanner}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label htmlFor="exam-access-code" className="block text-xs font-bold text-secondary-700 uppercase tracking-wider mb-2">
              Access Code
            </label>
            <div className="relative">
              <input
                id="exam-access-code"
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setErrorBanner('');
                }}
                placeholder="e.g. EXAM-8492"
                autoComplete="off"
                className="w-full px-5 py-4 text-base sm:text-lg bg-secondary-50/60 border-2 border-secondary-200 rounded-2xl focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all font-mono tracking-widest text-[#16241F] uppercase placeholder:text-secondary-400 font-bold"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-secondary-400">
                <Lock className="w-5 h-5" />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !joinCode.trim()}
            className="w-full py-3.5 text-sm sm:text-base font-bold shadow-lg shadow-brand-600/20 bg-[#16241F] hover:bg-secondary-800 text-white"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                <span>Verifying Access Code...</span>
              </>
            ) : (
              <>
                <span>Verify &amp; Enroll</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Pre-Assessment Rules Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-secondary-200 space-y-5">
        <div className="flex items-center gap-2.5 pb-2 border-b border-secondary-100">
          <ShieldAlert className="w-5 h-5 text-[#2F6F4E]" />
          <h3 className="text-base sm:text-lg font-bold text-[#16241F]">Before You Start — Examination Rules</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-secondary-600">
          <div className="bg-secondary-50/80 p-4 sm:p-5 rounded-2xl border border-secondary-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-[#16241F] font-bold text-sm">
              <Maximize2 className="w-4 h-4 text-[#2F6F4E] shrink-0" />
              <span>Full Screen Mode Enforced</span>
            </div>
            <p className="text-xs text-secondary-500 leading-relaxed">
              Assessment requires continuous full-screen mode. Exiting full screen or minimizing the browser will be flagged and logged in your audit report.
            </p>
          </div>

          <div className="bg-secondary-50/80 p-4 sm:p-5 rounded-2xl border border-secondary-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-[#16241F] font-bold text-sm">
              <Eye className="w-4 h-4 text-[#2F6F4E] shrink-0" />
              <span>Anti-Cheating Monitoring</span>
            </div>
            <p className="text-xs text-secondary-500 leading-relaxed">
              Tab switching, window unfocusing, and unauthorized actions are monitored and recorded in real time throughout testing.
            </p>
          </div>

          <div className="bg-secondary-50/80 p-4 sm:p-5 rounded-2xl border border-secondary-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-[#16241F] font-bold text-sm">
              <Clock className="w-4 h-4 text-[#2F6F4E] shrink-0" />
              <span>Continuous Countdown Timer</span>
            </div>
            <p className="text-xs text-secondary-500 leading-relaxed">
              The test timer starts upon entering the exam room. Your progress is autosaved continuously and submitted automatically if time expires.
            </p>
          </div>

          <div className="bg-secondary-50/80 p-4 sm:p-5 rounded-2xl border border-secondary-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-[#16241F] font-bold text-sm">
              <Sparkles className="w-4 h-4 text-[#2F6F4E] shrink-0" />
              <span>Gemini AI Evaluation</span>
            </div>
            <p className="text-xs text-secondary-500 leading-relaxed">
              Upon completion, Gemini AI automatically synthesizes your results, highlights weak conceptual areas, and generates personalized feedback.
            </p>
          </div>
        </div>
      </div>

      {/* Pre-Flight Instructions Modal / Verified Enrollment Card */}
      {enrolledExam && createPortal(
        <div className="fixed inset-0 w-screen h-screen supports-[height:100dvh]:h-dvh z-[9999] bg-[#16241F]/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div
            ref={preflightModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-preflight-title"
            tabIndex={-1}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-secondary-200 space-y-6 animate-in zoom-in-95 duration-200 outline-none my-auto"
          >
            <div className="border-b border-secondary-100 pb-4">
              <span className="px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1.5 w-fit border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Enrollment Verified
              </span>
              <h3 id="candidate-preflight-title" className="text-xl sm:text-2xl font-extrabold text-[#16241F] tracking-tight mt-3">
                {enrolledExam.examTitle || enrolledExam.title}
              </h3>
              <p className="text-[#2F6F4E] font-semibold text-xs sm:text-sm mt-0.5">
                {enrolledExam.subject || 'General Assessment'}
              </p>
            </div>

            {/* Responsive Statistics Grid (stacks cleanly on 320px/360px) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-secondary-50 p-4 rounded-2xl border border-secondary-200 text-center">
              <div className="p-2 sm:p-0 border-b sm:border-b-0 sm:border-r border-secondary-200">
                <p className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider">Duration</p>
                <p className="text-lg font-black text-[#16241F] flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="w-4 h-4 text-[#2F6F4E]" />
                  <span>{enrolledExam.durationMinutes || 60}m</span>
                </p>
              </div>
              <div className="p-2 sm:p-0 border-b sm:border-b-0 sm:border-r border-secondary-200">
                <p className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider">Total Marks</p>
                <p className="text-lg font-black text-[#16241F] mt-0.5">
                  {enrolledExam.totalMarks ?? enrolledExam.totalQuestions ?? 100}
                </p>
              </div>
              <div className="p-2 sm:p-0">
                <p className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider">Passing Score</p>
                <p className="text-lg font-black text-emerald-700 mt-0.5">
                  {enrolledExam.passingMarks ?? `${enrolledExam.passingPercentage || 50}%`}
                </p>
              </div>
            </div>

            {enrolledExam.deviceAccess && enrolledExam.deviceAccess !== 'BOTH' && (
              <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  {enrolledExam.deviceAccess === 'DESKTOP' ? (
                    <Monitor className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span>Device Requirement</span>
                </div>
                <span className="font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-[11px] uppercase tracking-wider">
                  {enrolledExam.deviceAccess === 'DESKTOP' ? 'Desktop Only' : 'Mobile Only'}
                </span>
              </div>
            )}

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-1">
              <div className="font-bold flex items-center gap-2 text-amber-950 text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Proctoring Notice</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                Full-screen mode will be requested upon starting. Exiting full screen, minimizing the window, or switching browser tabs will be recorded on your proctoring audit log.
              </p>
            </div>

            {/* Responsive Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEnrolledExam(null)}
                className="w-full sm:w-auto px-5 py-2.5 font-bold rounded-xl text-xs sm:text-sm bg-secondary-100 hover:bg-secondary-200 text-secondary-800 border border-secondary-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                Cancel
              </button>
              <Button
                type="button"
                onClick={() => {
                  const id = enrolledExam.enrollmentId || enrolledExam.id;
                  const examId = enrolledExam.examId;
                  setEnrolledExam(null);
                  handleStartExam(id, examId, enrolledExam.deviceAccess);
                }}
                className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-bold shadow-md bg-[#16241F] hover:bg-secondary-800 text-white cursor-pointer"
              >
                <span>Start Assessment</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default JoinAssessment;

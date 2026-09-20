import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowRight, Clock, ShieldAlert, AlertCircle, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button';
import { joinExamByCode } from '../services/candidateService';

const JoinAssessment = () => {
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [enrolledExam, setEnrolledExam] = useState(null);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await joinExamByCode(joinCode.trim());
      setEnrolledExam(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid or expired join code. Please check with your host.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExam = (enrollmentId) => {
    sessionStorage.setItem('currentEnrollmentId', enrollmentId);
    navigate(`/candidate/exam/${enrollmentId}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Join Assessment</h1>
        <p className="text-secondary-600 mt-2 text-base">
          Enter your unique access code to verify and begin your proctored assessment.
        </p>
      </header>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl shadow-sm border border-red-100 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Join Code Card matching Host Form styling */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-secondary-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-brand-50 text-brand-700 p-2.5 rounded-xl border border-brand-100 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-secondary-900">Exam Access Code</h3>
            <p className="text-secondary-500 text-sm">Enter the code provided by your instructor</p>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="block text-[14px] font-semibold text-secondary-800 mb-2">
              Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="e.g. EXAM-8492"
              className="w-full px-4 py-3 text-[16px] bg-white border border-secondary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm font-mono tracking-wider text-secondary-900 uppercase"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !joinCode.trim()}
            className="w-full py-3 text-base"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Access Code...</span>
              </>
            ) : (
              <>
                <span>Verify & Enroll</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Guidelines Card */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-secondary-200">
        <h4 className="text-base font-bold text-secondary-900 mb-3 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-brand-600" />
          <span>Before You Start</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-secondary-600">
          <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-200">
            <p className="font-bold text-secondary-900 mb-1">Full Screen Mode</p>
            <p className="text-xs leading-relaxed">
              Assessment requires continuous full-screen mode. Exiting full screen logs an anti-cheating alert.
            </p>
          </div>
          <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-200">
            <p className="font-bold text-secondary-900 mb-1">Anti-Cheating Monitoring</p>
            <p className="text-xs leading-relaxed">
              Tab switching, window minimizing, and right clicking are monitored and recorded in real time.
            </p>
          </div>
          <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-200">
            <p className="font-bold text-secondary-900 mb-1">Continuous Timer</p>
            <p className="text-xs leading-relaxed">
              The test timer begins as soon as you accept. Answers are auto-submitted when the clock runs out.
            </p>
          </div>
          <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-200">
            <p className="font-bold text-secondary-900 mb-1">Personalized AI Evaluation</p>
            <p className="text-xs leading-relaxed">
              Upon completion, Gemini AI automatically analyzes your strengths and highlights targeted improvement areas.
            </p>
          </div>
        </div>
      </div>

      {/* Pre-Flight Instructions Modal */}
      {enrolledExam && (
        <div className="fixed inset-0 z-50 bg-[#362E20]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl border border-secondary-200 space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-secondary-100 pb-4">
              <span className="px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider bg-green-100 text-green-700">
                Enrollment Verified
              </span>
              <h3 className="text-2xl font-extrabold text-secondary-900 tracking-tight mt-3">
                {enrolledExam.examTitle}
              </h3>
              <p className="text-brand-600 font-medium text-sm mt-1">{enrolledExam.subject}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-secondary-50 p-4 rounded-xl border border-secondary-200 text-center">
              <div>
                <p className="text-xs font-semibold text-secondary-500">Duration</p>
                <p className="text-lg font-bold text-secondary-900 flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="w-4 h-4 text-brand-500" />
                  <span>{enrolledExam.durationMinutes} min</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-secondary-500">Total Marks</p>
                <p className="text-lg font-bold text-secondary-900 mt-0.5">{enrolledExam.totalMarks}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-secondary-500">Passing Marks</p>
                <p className="text-lg font-bold text-green-700 mt-0.5">{enrolledExam.passingMarks}</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-sm space-y-1.5">
              <div className="font-bold flex items-center gap-2 text-amber-950">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Proctoring Notice</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                Full-screen mode is enforced throughout the session. Exiting full screen or navigating away to another tab logs an anti-cheating violation.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEnrolledExam(null)}
                className="px-4 py-2 font-bold rounded-xl text-sm text-secondary-600 bg-white border border-secondary-200 hover:bg-secondary-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <Button
                type="button"
                onClick={() => {
                  const id = enrolledExam.enrollmentId;
                  setEnrolledExam(null);
                  handleStartExam(id);
                }}
                className="px-6 py-2.5"
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

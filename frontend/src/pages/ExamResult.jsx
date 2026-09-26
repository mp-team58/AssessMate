import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  Target,
  RefreshCw,
  BrainCircuit,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Award
} from 'lucide-react';
import Button from '../components/ui/Button';
import { getExamResult, getAnswerReview } from '../services/candidateService';

const ExamResult = () => {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [answersReview, setAnswersReview] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    const messages = [
      'Grading and compiling assessment submissions...',
      'Synthesizing score analytics with Gemini AI...',
      'Evaluating weak conceptual topics and diagnostic areas...',
      'Generating your personalized AI improvement feedback...'
    ];

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % messages.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [isLoading]);

  const fetchResult = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getExamResult(enrollmentId);
      setResult(res.data);
    } catch (err) {
      console.error('Failed to get result:', err);
      setError(err.response?.data?.message || err.message || 'Failed to retrieve assessment results.');
    } finally {
      setIsLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  const loadAnswersReview = async () => {
    if (answersReview !== null) {
      setShowReview(!showReview);
      return;
    }
    setIsLoadingReview(true);
    try {
      const res = await getAnswerReview(enrollmentId);
      setAnswersReview(Array.isArray(res.data) ? res.data : []);
      setShowReview(true);
    } catch (err) {
      console.warn('Failed to load answer review:', err);
      setAnswersReview([]);
      setShowReview(true);
    } finally {
      setIsLoadingReview(false);
    }
  };

  const parseWeakTopics = (weakTopicsRaw) => {
    if (!weakTopicsRaw) return [];
    if (Array.isArray(weakTopicsRaw)) return weakTopicsRaw;
    try {
      const parsed = JSON.parse(weakTopicsRaw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (_err) {
      if (typeof weakTopicsRaw === 'string') {
        return weakTopicsRaw.replace(/[[\]"]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
      }
      return [];
    }
  };

  if (isLoading) {
    const loadingMessages = [
      'Grading and compiling assessment submissions...',
      'Synthesizing score analytics with Gemini AI...',
      'Evaluating weak conceptual topics and diagnostic areas...',
      'Generating your personalized AI improvement feedback...'
    ];

    return (
      <div className="flex flex-col items-center justify-center p-12 text-center select-none min-h-[450px] animate-in fade-in duration-300">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-brand-500/15 border-2 border-brand-500/30 flex items-center justify-center animate-pulse">
            <BrainCircuit className="w-10 h-10 text-brand-600 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 bg-brand-600 rounded-lg text-white shadow-md">
            <Sparkles className="w-3.5 h-3.5 animate-bounce" />
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-secondary-900 tracking-tight mb-2">
          Generating AI Assessment Report
        </h2>
        <p className="text-secondary-600 text-sm max-w-md transition-all duration-300 min-h-[40px] flex items-center justify-center font-medium">
          {loadingMessages[loadingStep]}
        </p>

        <div className="w-56 h-2 bg-secondary-200 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-brand-500 animate-pulse rounded-full w-4/5" />
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-secondary-200 shadow-xl text-center space-y-4 my-12 animate-in fade-in duration-200">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-secondary-900">Result Not Available</h2>
        <p className="text-secondary-600 text-sm">{error || 'Unable to retrieve results for this assessment.'}</p>
        <div className="flex gap-3 pt-2">
          <Button onClick={() => navigate('/candidate/dashboard')} variant="outline" className="flex-1">
            Dashboard
          </Button>
          <Button onClick={fetchResult} className="flex-1">
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    );
  }

  const weakTopics = parseWeakTopics(result.weakTopicsJson);
  const percentage = result.percentage !== undefined && result.percentage !== null ? Number(result.percentage).toFixed(1) : 0;
  const isPassed = !!result.passed || Number(percentage) >= 50;

  return (
    <div className="max-w-5xl mx-auto space-y-7 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-12">
      {/* Top Banner Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-secondary-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold text-secondary-900 tracking-tight">
              {result.examTitle}
            </h1>
            <span
              className={`px-3.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                isPassed
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {isPassed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
                  <span>PASSED</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span>NEEDS IMPROVEMENT</span>
                </>
              )}
            </span>
          </div>
          <p className="text-secondary-600 text-sm font-medium">
            Candidate Performance &amp; AI Diagnostic Evaluation Report
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/candidate/my-assessments')}
            variant="outline"
            className="!w-auto px-4 py-2 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Assessments</span>
          </Button>
          <Button
            onClick={() => navigate('/candidate/dashboard')}
            variant="secondary"
            className="!w-auto px-4 py-2 text-xs"
          >
            <span>Dashboard</span>
          </Button>
        </div>
      </div>

      {/* Score Summary & Key Performance Metrics */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-secondary-200 space-y-6">
        <div className="flex items-center justify-between border-b border-secondary-100 pb-4">
          <h2 className="text-xl font-bold text-secondary-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-600" />
            <span>Score Summary</span>
          </h2>
          <span className="text-xs font-bold uppercase tracking-wider text-secondary-500">
            Assessment Outcome
          </span>
        </div>

        {/* Big Highlights Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Score */}
          <div className="bg-secondary-50 p-5 rounded-2xl border border-secondary-200">
            <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Total Score</p>
            <p className="text-3xl font-black text-secondary-900 mt-1">
              {result.totalScore ?? '—'}{' '}
              <span className="text-base text-secondary-500 font-normal">/ {result.maxScore ?? '—'}</span>
            </p>
            <div className="w-full bg-secondary-200 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-brand-600 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
          </div>

          {/* Percentage */}
          <div className="bg-secondary-50 p-5 rounded-2xl border border-secondary-200">
            <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Percentage</p>
            <p className="text-3xl font-black text-brand-600 mt-1">{percentage}%</p>
            <p className="text-xs text-secondary-500 mt-3 font-medium">Overall calculated grade</p>
          </div>

          {/* Evaluation Status */}
          <div className="bg-secondary-50 p-5 rounded-2xl border border-secondary-200">
            <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Evaluation Status</p>
            <p
              className={`text-2xl font-black mt-1 flex items-center gap-2 ${
                isPassed ? 'text-green-600' : 'text-amber-600'
              }`}
            >
              {isPassed ? (
                <>
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                  <span>Qualified</span>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 flex-shrink-0" />
                  <span>Review Required</span>
                </>
              )}
            </p>
            <p className="text-xs text-secondary-500 mt-3 font-medium">
              {isPassed ? 'Successfully met passing standards' : 'Additional practice recommended'}
            </p>
          </div>
        </div>

        {/* Secondary Diagnostics (Correct, Wrong, Unanswered, Time, Proctoring) */}
        {(result.correctCount !== undefined ||
          result.wrongCount !== undefined ||
          result.timeTakenSeconds !== undefined ||
          result.honestyScore !== undefined) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-secondary-100">
            {result.correctCount !== undefined && (
              <div className="p-3 bg-green-50/60 rounded-xl border border-green-100 text-center">
                <p className="text-[11px] font-bold text-green-800 uppercase tracking-wider">Correct</p>
                <p className="text-xl font-black text-green-700 mt-0.5">{result.correctCount}</p>
              </div>
            )}
            {result.wrongCount !== undefined && (
              <div className="p-3 bg-red-50/60 rounded-xl border border-red-100 text-center">
                <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider">Incorrect</p>
                <p className="text-xl font-black text-red-700 mt-0.5">{result.wrongCount}</p>
              </div>
            )}
            {result.unansweredCount !== undefined && (
              <div className="p-3 bg-secondary-100/70 rounded-xl border border-secondary-200 text-center">
                <p className="text-[11px] font-bold text-secondary-600 uppercase tracking-wider">Skipped</p>
                <p className="text-xl font-black text-secondary-800 mt-0.5">{result.unansweredCount}</p>
              </div>
            )}
            {result.honestyScore !== undefined && (
              <div className="p-3 bg-brand-50/60 rounded-xl border border-brand-100 text-center">
                <p className="text-[11px] font-bold text-brand-800 uppercase tracking-wider flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-brand-600" />
                  Honesty
                </p>
                <p className="text-xl font-black text-brand-700 mt-0.5">{Math.round(result.honestyScore)}%</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gemini AI Personalized Feedback */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-secondary-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-secondary-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            <span>Personalized AI Diagnostic Feedback</span>
          </h2>
          <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-xl text-xs font-bold border border-brand-100 shadow-inner">
            Powered by Gemini AI
          </span>
        </div>

        <div className="bg-secondary-50 p-6 rounded-2xl border border-secondary-200/80">
          <p className="text-secondary-800 leading-relaxed text-sm md:text-base font-sans whitespace-pre-line">
            {result.aiFeedback ||
              'Great effort on completing this assessment! Keep reviewing your key concepts and practicing standard problem patterns.'}
          </p>
        </div>
      </div>

      {/* Weak Topics / Diagnostic Insights */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-secondary-200 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-brand-600" />
          <h2 className="text-xl font-bold text-secondary-900">Weak Topics &amp; Focus Areas</h2>
        </div>
        <p className="text-secondary-600 text-sm">
          Specific conceptual domains identified by AI where targeted study will produce maximum performance improvement.
        </p>

        {weakTopics.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {weakTopics.map((topic, idx) => (
              <div
                key={idx}
                className="bg-secondary-50 p-5 rounded-2xl border border-secondary-200 flex items-start gap-3.5 hover:border-brand-300 transition-all shadow-sm"
              >
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 mt-0.5 flex-shrink-0">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-secondary-900 text-base mb-1">{topic}</h4>
                  <p className="text-xs text-secondary-600 leading-relaxed">
                    Review foundational concepts, study implementation examples, and solve targeted practice problems.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-green-50/70 p-6 rounded-2xl border border-green-200 text-center space-y-1.5">
            <CheckCircle2 className="w-7 h-7 text-green-600 mx-auto" />
            <h4 className="text-base font-bold text-green-900">Strong Conceptual Mastery</h4>
            <p className="text-xs text-green-700 max-w-md mx-auto">
              No significant weak topics detected. You demonstrated strong comprehension across the assessed domains.
            </p>
          </div>
        )}
      </div>

      {/* Optional Question-by-Question Review Section */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-secondary-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-brand-600" />
            <h2 className="text-xl font-bold text-secondary-900">Question &amp; Answer Review</h2>
          </div>

          <Button
            onClick={loadAnswersReview}
            disabled={isLoadingReview}
            variant="outline"
            className="!w-auto px-4 py-2 text-xs"
          >
            {isLoadingReview ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : showReview ? (
              <>
                <span>Hide Detailed Review</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Show Detailed Review</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        {showReview && answersReview && (
          <div className="space-y-4 pt-4 border-t border-secondary-100">
            {answersReview.length === 0 ? (
              <p className="text-secondary-500 text-sm text-center py-4">
                Detailed answer review is not available for this exam.
              </p>
            ) : (
              answersReview.map((item, index) => {
                const isCorrect = item.isCorrect === true || item.candidateAnswer === item.correctAnswer;
                return (
                  <div
                    key={item.questionId || index}
                    className={`p-5 rounded-2xl border transition-all ${
                      isCorrect
                        ? 'bg-green-50/30 border-green-200'
                        : 'bg-red-50/30 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-white border border-secondary-200 text-secondary-800">
                          Q{index + 1}
                        </span>
                        {item.topic && (
                          <span className="text-xs text-brand-700 font-semibold bg-brand-50 px-2 py-0.5 rounded">
                            {item.topic}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          isCorrect
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <p className="font-bold text-secondary-900 text-sm mb-3">
                      {item.questionText}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-secondary-200">
                        <p className="text-secondary-500 font-semibold mb-1">Your Answer:</p>
                        {item.type === 'CODING' ? (
                          <pre className="p-2.5 bg-secondary-950 text-emerald-300 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                            {item.candidateAnswer || '// No code submitted'}
                          </pre>
                        ) : (
                          <p className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            {item.candidateAnswer || '(No answer provided)'}
                          </p>
                        )}
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-secondary-200">
                        <p className="text-secondary-500 font-semibold mb-1">Correct / Model Answer:</p>
                        {item.type === 'CODING' ? (
                          <pre className="p-2.5 bg-secondary-950 text-green-300 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                            {item.correctAnswer || '// Model solution evaluated by test cases'}
                          </pre>
                        ) : (
                          <p className="font-bold text-green-700">{item.correctAnswer}</p>
                        )}
                      </div>
                    </div>

                    {item.explanation && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-secondary-200 text-xs text-secondary-600">
                        <strong className="text-secondary-900">Explanation: </strong>
                        {item.explanation}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center gap-4 pt-2">
        <Button onClick={() => navigate('/candidate/dashboard')} className="!w-auto px-6 py-2.5 text-sm">
          Return to Dashboard
        </Button>
        <Button
          onClick={() => navigate('/candidate/my-assessments')}
          variant="outline"
          className="!w-auto px-6 py-2.5 text-sm"
        >
          View All Assessments
        </Button>
      </div>
    </div>
  );
};

export default ExamResult;

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
  XCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import { getExamResult } from '../services/candidateService';

const ExamResult = () => {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
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
      setLoadingStep(prev => (prev + 1) % messages.length);
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
      setError(err.response?.data?.message || err.message || 'Failed to generate assessment results.');
    } finally {
      setIsLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  const parseWeakTopics = (weakTopicsRaw) => {
    if (!weakTopicsRaw) return [];
    if (Array.isArray(weakTopicsRaw)) return weakTopicsRaw;
    try {
      const parsed = JSON.parse(weakTopicsRaw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (_err) {
      if (typeof weakTopicsRaw === 'string') {
        return weakTopicsRaw.replace(/[[\]"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
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
      <div className="flex flex-col items-center justify-center p-12 text-center select-none min-h-[400px]">
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
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-secondary-200 shadow-lg text-center space-y-4 my-12">
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
  const percentage = result.percentage !== undefined ? Number(result.percentage).toFixed(1) : 0;
  const isPassed = !!result.passed;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner Card matching ManageExam */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">{result.examTitle}</h1>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider
              ${isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
            </span>
          </div>
          <p className="text-secondary-600 font-medium">Candidate Performance & AI Diagnostic Report</p>
        </div>

        <Button onClick={() => navigate('/candidate/dashboard')} variant="outline" className="!w-auto px-4 py-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Button>
      </div>

      {/* Score Summary Metrics matching ManageExam */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
        <h2 className="text-xl font-bold text-secondary-900 mb-4">Score Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-200">
            <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">Total Score</p>
            <p className="text-2xl font-black text-secondary-900 mt-1">
              {result.totalScore} <span className="text-base text-secondary-500 font-normal">/ {result.maxScore}</span>
            </p>
          </div>

          <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-200">
            <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">Percentage</p>
            <p className="text-2xl font-black text-brand-600 mt-1">{percentage}%</p>
          </div>

          <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-200">
            <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">Evaluation</p>
            <p className={`text-2xl font-black mt-1 flex items-center gap-1.5 ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
              {isPassed ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Qualified</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  <span>Not Qualified</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Gemini AI Personalized Feedback */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            <span>Personalized AI Feedback</span>
          </h2>
          <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-lg text-xs font-bold border border-brand-100 shadow-inner">
            Powered by Gemini AI
          </span>
        </div>

        <div className="bg-secondary-50 p-5 rounded-xl border border-secondary-200">
          <p className="text-secondary-800 leading-relaxed text-sm md:text-base font-sans whitespace-pre-line">
            {result.aiFeedback || 'Great effort on completing the assessment! Keep practicing relevant problems and reviewing your key concepts.'}
          </p>
        </div>
      </div>

      {/* Weak Topics / Areas for Improvement */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-brand-600" />
          <h2 className="text-xl font-bold text-secondary-900">Weak Topics & Diagnostic Insights</h2>
        </div>
        <p className="text-secondary-600 text-sm mb-4">
          Specific areas identified by AI where focused study will deliver maximum performance gains.
        </p>

        {weakTopics.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {weakTopics.map((topic, idx) => (
              <div
                key={idx}
                className="bg-secondary-50 p-4 rounded-xl border border-secondary-200 flex items-start gap-3 hover:border-brand-400 transition-all"
              >
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800 mt-0.5 flex-shrink-0">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-secondary-900 text-sm mb-1">{topic}</h4>
                  <p className="text-xs text-secondary-600 leading-relaxed">
                    Review foundational theory, practice standard implementation problems, and verify test cases.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-green-50 p-5 rounded-xl border border-green-200 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-bold text-green-900">No Significant Weak Topics Detected</p>
            <p className="text-xs text-green-700 mt-0.5">
              You displayed strong conceptual grasp across all assessed subject domains.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="pt-2">
        <Button onClick={() => navigate('/candidate/dashboard')} className="!w-auto px-6 py-2.5">
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default ExamResult;

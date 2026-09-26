import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  Shield,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flag,
  RotateCcw,
  Send,
  Camera,
  Maximize2,
  CheckCircle2,
  HelpCircle,
  Eye,
  AlertCircle,
  BookOpenCheck,
  Code2,
  Play,
  Terminal,
  FileCode,
  XCircle,
  Copy,
  Info
} from 'lucide-react';
import {
  getExamQuestions,
  logProctorEvent,
  submitExamAnswers,
  runCandidateCode,
  submitCandidateCode,
  saveExamProgress
} from '../services/candidateService';

const STARTER_CODE = {
  PYTHON: '# Write your Python 3 code here\ndef solution():\n    pass\n\nif __name__ == "__main__":\n    solution()\n',
  JAVA: 'import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}\n',
  CPP: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ code here\n    return 0;\n}\n',
  C: '#include <stdio.h>\n\nint main() {\n    // Write your C code here\n    return 0;\n}\n',
  JAVASCRIPT: '// Write your JavaScript solution here\nconst fs = require("fs");\n\nfunction main() {\n    // Read input if needed\n}\n\nmain();\n'
};

const ActiveExam = () => {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();

  // Exam Data State
  const [examData, setExamData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Assessment Progress State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: "A" | "A,B" | "text" | code }
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [screenshotWarning, setScreenshotWarning] = useState(false);

  // Coding Question Workspace State
  const [codeLanguage, setCodeLanguage] = useState('PYTHON');
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [codeSubmitResult, setCodeSubmitResult] = useState(null);

  // Overall Timer State
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);
  const timerRef = useRef(null);

  // Per-Question Timer State
  const [questionTimeLeft, setQuestionTimeLeft] = useState(null);
  const questionTimerRef = useRef(null);

  // Proctoring State & Refs
  const [proctorWarnings, setProctorWarnings] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [webcamActive, setWebcamActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState('CHECKING'); // 'VERIFIED' | 'NO_FACE' | 'MULTIPLE_FACES' | 'CHECKING'
  const videoRef = useRef(null);
  const tabHiddenTimeRef = useRef(null);
  const hasAutoSubmittedRef = useRef(false);

  // 1. Fetch Exam & Questions
  useEffect(() => {
    let isMounted = true;

    const fetchExam = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await getExamQuestions(enrollmentId);
        if (!isMounted) return;

        const data = res.data;
        setExamData(data);

        // Prepopulate saved answers if any
        if (data.questions && Array.isArray(data.questions)) {
          const initialAnswers = {};
          data.questions.forEach((q) => {
            if (q.savedAnswer) {
              initialAnswers[q.id] = q.savedAnswer;
            }
          });
          setAnswers(initialAnswers);
        }

        // Initialize Timer from durationMinutes or remainingSeconds
        const storageKey = `exam_start_${enrollmentId}`;
        const storedStartTime = localStorage.getItem(storageKey);
        const totalDurationSec = (data.durationMinutes || 60) * 60;

        let remainingSec = totalDurationSec;
        if (data.remainingSeconds !== undefined && data.remainingSeconds !== null) {
          remainingSec = data.remainingSeconds;
        } else if (storedStartTime) {
          const elapsedSec = Math.floor((Date.now() - parseInt(storedStartTime, 10)) / 1000);
          remainingSec = Math.max(0, totalDurationSec - elapsedSec);
        } else {
          localStorage.setItem(storageKey, Date.now().toString());
        }

        setTimeLeftSeconds(remainingSec);
      } catch (err) {
        if (!isMounted) return;
        setError(err.response?.data?.message || err.message || 'Failed to load exam questions');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchExam();

    return () => {
      isMounted = false;
    };
  }, [enrollmentId]);

  // 2. Submit Action
  const handleSubmitExam = useCallback(async () => {
    if (isSubmitting || hasAutoSubmittedRef.current) return;
    hasAutoSubmittedRef.current = true;
    setIsSubmitting(true);

    try {
      localStorage.removeItem(`exam_start_${enrollmentId}`);

      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }

      await submitExamAnswers(enrollmentId, answers);

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (_) {}
      }

      navigate(`/candidate/result/${enrollmentId}`);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to submit exam answers.');
      setIsSubmitting(false);
      hasAutoSubmittedRef.current = false;
    }
  }, [enrollmentId, answers, isSubmitting, navigate]);

  // 3. Countdown Timer Hook (Overall)
  useEffect(() => {
    if (timeLeftSeconds === null || isSubmitting) return;

    if (timeLeftSeconds <= 0) {
      handleSubmitExam();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeftSeconds, isSubmitting, handleSubmitExam]);

  // 4. Per-Question Timer Hook
  useEffect(() => {
    if (!examData || !examData.questions || !examData.questions[currentIndex]) return;

    const currentQ = examData.questions[currentIndex];
    const qTimeSec = currentQ.timeSeconds || (examData.timerType === 'PER_QUESTION' ? 60 : null);

    if (qTimeSec && qTimeSec > 0) {
      setQuestionTimeLeft(qTimeSec);

      if (questionTimerRef.current) clearInterval(questionTimerRef.current);

      questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(questionTimerRef.current);
            // Auto-advance to next question or submit
            if (currentIndex < examData.questions.length - 1) {
              setCurrentIndex((idx) => idx + 1);
            } else {
              setShowSubmitModal(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setQuestionTimeLeft(null);
    }

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [currentIndex, examData]);

  // 5. Context Lock & Anti-Cheat Event Listeners
  useEffect(() => {
    // Attempt fullscreen on mount
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (err) {
        console.warn('Fullscreen request dismissed:', err);
      }
    };
    enterFullscreen();

    // Webcam Setup
    const currentVideo = videoRef.current;
    const initWebcam = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240 }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setWebcamActive(true);
            setFaceStatus('VERIFIED');
          }
        }
      } catch (err) {
        console.warn('Webcam permission not granted:', err);
        setWebcamActive(false);
        setFaceStatus('NO_FACE');
      }
    };
    initWebcam();

    // Browser Context Lock: Back navigation prevention
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setShowLeaveWarning(true);
    };
    window.addEventListener('popstate', handlePopState);

    // Tab Switch / Visibility Listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenTimeRef.current = Date.now();
      } else if (tabHiddenTimeRef.current) {
        const awaySeconds = Math.max(1, Math.round((Date.now() - tabHiddenTimeRef.current) / 1000));
        tabHiddenTimeRef.current = null;

        const details = `Candidate switched away from exam window for ${awaySeconds}s`;
        logProctorEvent(enrollmentId, 'TAB_SWITCH', details);

        setProctorWarnings((prev) => [
          ...prev,
          {
            type: 'TAB_SWITCH',
            message: `Tab Switch detected! Stay on this screen. (${awaySeconds}s)`,
            timestamp: new Date()
          }
        ]);
      }
    };

    // Fullscreen Exit Listener
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);

      if (!inFullscreen) {
        logProctorEvent(enrollmentId, 'FULLSCREEN_EXIT', 'Candidate exited full screen mode');
        setProctorWarnings((prev) => [
          ...prev,
          {
            type: 'FULLSCREEN_EXIT',
            message: 'Full screen exit detected! Please return to full screen mode.',
            timestamp: new Date()
          }
        ]);
      }
    };

    // Right-Click Context Menu Prevention
    const handleContextMenu = (e) => {
      e.preventDefault();
      logProctorEvent(enrollmentId, 'RIGHT_CLICK', 'Candidate attempted right-click context menu');
      return false;
    };

    // Copy / Paste & PrintScreen Key Prevention
    const handleKeyDown = (e) => {
      // PrintScreen key prevention
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        setScreenshotWarning(true);
        setTimeout(() => setScreenshotWarning(false), 3500);
        logProctorEvent(enrollmentId, 'SCREEN_SHARE_STOPPED', 'Screenshot key event detected');
        return false;
      }

      // Check if target is inside code editor or text input (allow normal code editing)
      const isInputOrEditor =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable;

      if (!isInputOrEditor) {
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'C', 'V', 'X', 'A'].includes(e.key)) {
          e.preventDefault();
          return false;
        }
      }
    };

    // Before Unload Warning
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Assessment in progress! Are you sure you want to exit?';
      return e.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (currentVideo && currentVideo.srcObject) {
        const tracks = currentVideo.srcObject.getTracks();
        tracks.forEach((t) => t.stop());
      }
    };
  }, [enrollmentId]);

  const requestFullscreenAgain = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Fullscreen request failed:', err);
    }
  };

  // Answer modification handlers
  const handleSingleChoiceSelect = (questionId, optionKey) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: optionKey };
      saveExamProgress(enrollmentId, updated).catch(() => {});
      return updated;
    });
  };

  const handleMultipleSelectToggle = (questionId, optionKey) => {
    const currentVal = answers[questionId] || '';
    const selectedOptions = currentVal ? currentVal.split(',').filter(Boolean) : [];

    let newOptions;
    if (selectedOptions.includes(optionKey)) {
      newOptions = selectedOptions.filter((o) => o !== optionKey);
    } else {
      newOptions = [...selectedOptions, optionKey].sort();
    }

    const val = newOptions.join(',');
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: val };
      saveExamProgress(enrollmentId, updated).catch(() => {});
      return updated;
    });
  };

  const handleTextAnswerChange = (questionId, value) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: value };
      saveExamProgress(enrollmentId, updated).catch(() => {});
      return updated;
    });
  };

  const handleClearAnswer = (questionId) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      saveExamProgress(enrollmentId, copy).catch(() => {});
      return copy;
    });
  };

  const handleToggleFlag = (questionId) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // Coding Question: Run Code Handler
  const handleRunCandidateCode = async (questionId) => {
    const currentCode = answers[questionId] || STARTER_CODE[codeLanguage] || '';
    setIsRunningCode(true);
    setRunResult(null);

    try {
      const res = await runCandidateCode({
        codingQuestionId: questionId,
        language: codeLanguage,
        sourceCode: currentCode,
        customInput: showCustomInput ? customInput : ''
      });
      setRunResult(res.data);
    } catch (err) {
      setRunResult({
        status: 'EXECUTION_ERROR',
        stderr: err.response?.data?.message || err.message || 'Execution failed.',
        passed: false
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  // Coding Question: Submit Code Solution Handler
  const handleSubmitCandidateCode = async (questionId) => {
    const currentCode = answers[questionId] || STARTER_CODE[codeLanguage] || '';
    setIsSubmittingCode(true);
    setCodeSubmitResult(null);

    try {
      const res = await submitCandidateCode({
        enrollmentId,
        codingQuestionId: questionId,
        language: codeLanguage,
        sourceCode: currentCode
      });
      setCodeSubmitResult(res.data);
    } catch (err) {
      setCodeSubmitResult({
        status: 'SUBMISSION_ERROR',
        compileOutput: err.response?.data?.message || err.message || 'Code submission failed.'
      });
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // Format Timer Display
  const formatTime = (totalSeconds) => {
    if (totalSeconds === null) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => n.toString().padStart(2, '0');
    return hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3EDE0] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-600 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-secondary-900">Preparing Your Assessment Environment</h2>
        <p className="text-secondary-600 text-sm mt-1">Configuring anti-cheating monitor &amp; questions...</p>
      </div>
    );
  }

  if (error || !examData || !examData.questions || examData.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#F3EDE0] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-secondary-200 shadow-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-secondary-900">Unable to Start Assessment</h2>
          <p className="text-secondary-600 text-sm">{error || 'No questions available for this exam.'}</p>
          <button
            onClick={() => navigate('/candidate/dashboard')}
            className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition-all shadow-md"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const questions = examData.questions;
  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id] || '';
  const isCurrentFlagged = flaggedQuestions.has(currentQuestion.id);

  // Status computation for palette
  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== '').length;
  const flaggedCount = flaggedQuestions.size;
  const remainingCount = questions.length - answeredCount;

  const isTimeUrgent = timeLeftSeconds !== null && timeLeftSeconds < 300;

  return (
    <div className="min-h-screen bg-[#F3EDE0] text-secondary-900 font-sans flex flex-col select-none relative overflow-x-hidden">
      {/* Background Glowing Ambient Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#DEC430] rounded-full blur-[140px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-500 rounded-full blur-[140px] opacity-10 pointer-events-none" />

      {/* Screenshot Warning Toast */}
      {screenshotWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
          <span className="text-xs font-bold">Screenshot attempts are monitored and logged to proctor audit.</span>
        </div>
      )}

      {/* Fullscreen Alert Banner */}
      {!isFullscreen && (
        <div className="bg-red-600 text-white py-2.5 px-4 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 sticky top-0 z-50 animate-pulse">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Full screen mode is required for proctoring compliance. Incident has been logged.</span>
          <button
            onClick={requestFullscreenAgain}
            className="px-3 py-1 bg-white text-red-700 font-bold rounded-lg text-xs hover:bg-red-50 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Re-enter Full Screen</span>
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-[#362E20] text-[#F3EDE0] px-6 py-4 shadow-md flex items-center justify-between sticky top-0 z-40 border-b border-secondary-700/50">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/20 p-2 rounded-xl">
            <BookOpenCheck className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight block leading-tight">AssessMate</span>
            <span className="text-xs text-brand-300 font-semibold uppercase truncate max-w-[200px] sm:max-w-xs block">
              {examData.examTitle || 'Proctored Assessment'}
            </span>
          </div>
        </div>

        {/* Dynamic Timers & Action Header */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Per-Question Timer (if enabled) */}
          {questionTimeLeft !== null && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/70 border border-amber-500/50 text-amber-300 rounded-xl text-xs font-mono font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Q-Timer: {questionTimeLeft}s</span>
            </div>
          )}

          {/* Main Overall Timer Badge */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold transition-all shadow-inner ${
              isTimeUrgent
                ? 'bg-red-950/90 text-red-300 border border-red-500 animate-pulse'
                : 'bg-brand-50 text-brand-700 border border-brand-100'
            }`}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{formatTime(timeLeftSeconds)}</span>
          </div>

          <button
            onClick={() => setShowInstructionsModal(true)}
            className="p-2 text-secondary-300 hover:text-white hover:bg-secondary-800 rounded-xl transition-colors"
            title="View Exam Guidelines"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowSubmitModal(true)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start z-10">
        {/* Left / Center Viewport: Question Card (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-secondary-200 relative">
            {/* Question Header: Number, Marks, Flags */}
            <div className="flex items-center justify-between border-b border-secondary-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-brand-50 border border-brand-200 text-brand-800 rounded-xl text-xs font-extrabold">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-xs font-semibold uppercase px-2.5 py-1 bg-secondary-100 text-secondary-700 rounded-lg">
                  {currentQuestion.type ? String(currentQuestion.type).replace('_', ' ') : 'MULTIPLE CHOICE'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-bold text-emerald-600">+{currentQuestion.marks || 1}</span>
                  {currentQuestion.negativeMarks > 0 && (
                    <span className="text-xs font-bold text-rose-500 ml-1.5">-{currentQuestion.negativeMarks}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFlag(currentQuestion.id)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isCurrentFlagged
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'text-secondary-400 hover:text-secondary-700 border-secondary-200'
                  }`}
                  title={isCurrentFlagged ? 'Remove Flag' : 'Mark for Review'}
                >
                  <Flag className={`w-4 h-4 ${isCurrentFlagged ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Question Statement */}
            <div className="mb-6">
              <h2 className="text-lg md:text-xl font-bold text-secondary-900 leading-relaxed">
                {currentQuestion.questionText}
              </h2>

              {currentQuestion.imageUrl && (
                <div className="mt-4 rounded-2xl overflow-hidden border border-secondary-200 max-h-72">
                  <img src={currentQuestion.imageUrl} alt="Question diagram" className="w-full object-contain" />
                </div>
              )}
            </div>

            {/* Answer Options according to question type */}
            <div className="space-y-3 mb-8">
              {/* Type: SINGLE_CHOICE or Default */}
              {(!currentQuestion.type || currentQuestion.type === 'SINGLE_CHOICE') && (
                currentQuestion.options && currentQuestion.options.length > 0 ? (
                  currentQuestion.options.map((opt) => {
                    const isSelected = currentAnswer === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSingleChoiceSelect(currentQuestion.id, opt.key)}
                        className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50/70 shadow-sm'
                            : 'border-secondary-200 hover:border-brand-400 hover:bg-brand-50/20 bg-white'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-brand-600 text-white' : 'bg-secondary-100 text-secondary-700'
                          }`}
                        >
                          {opt.key}
                        </div>
                        <span className="text-sm md:text-base font-medium text-secondary-800 pt-0.5 leading-normal">
                          {opt.value}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  ['A', 'B', 'C', 'D'].map((key) => {
                    const optionText = currentQuestion[`option${key}`];
                    if (!optionText) return null;
                    const isSelected = currentAnswer === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSingleChoiceSelect(currentQuestion.id, key)}
                        className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50/70 shadow-sm'
                            : 'border-secondary-200 hover:border-brand-400 hover:bg-brand-50/20 bg-white'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-brand-600 text-white' : 'bg-secondary-100 text-secondary-700'
                          }`}
                        >
                          {key}
                        </div>
                        <span className="text-sm md:text-base font-medium text-secondary-800 pt-0.5 leading-normal">
                          {optionText}
                        </span>
                      </button>
                    );
                  })
                )
              )}

              {/* Type: MULTIPLE_SELECT */}
              {currentQuestion.type === 'MULTIPLE_SELECT' && (
                <>
                  <p className="text-xs font-semibold text-secondary-500 mb-2 italic">Select all options that apply:</p>
                  {(currentQuestion.options || ['A', 'B', 'C', 'D'].map((k) => ({ key: k, value: currentQuestion[`option${k}`] }))).map(
                    (opt) => {
                      if (!opt.value) return null;
                      const selectedList = currentAnswer ? currentAnswer.split(',') : [];
                      const isSelected = selectedList.includes(opt.key);

                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleMultipleSelectToggle(currentQuestion.id, opt.key)}
                          className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                            isSelected
                              ? 'border-brand-600 bg-brand-50/70 shadow-sm'
                              : 'border-secondary-200 hover:border-brand-400 hover:bg-brand-50/20 bg-white'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-secondary-300 bg-white'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                          <span className="text-sm md:text-base font-medium text-secondary-800 pt-0.5 leading-normal">
                            <strong className="font-bold text-secondary-900 mr-2">{opt.key}.</strong>
                            {opt.value}
                          </span>
                        </button>
                      );
                    }
                  )}
                </>
              )}

              {/* Type: FILL_BLANK or NUMERICAL */}
              {(currentQuestion.type === 'FILL_BLANK' || currentQuestion.type === 'NUMERICAL') && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary-600 uppercase tracking-wider block">Your Answer</label>
                  <input
                    type={currentQuestion.type === 'NUMERICAL' ? 'number' : 'text'}
                    value={currentAnswer}
                    onChange={(e) => handleTextAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder={currentQuestion.type === 'NUMERICAL' ? 'Enter numerical value...' : 'Type your answer here...'}
                    className="w-full px-5 py-4 rounded-xl border-2 border-secondary-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-base font-medium text-secondary-900 focus:outline-none transition-all bg-white"
                  />
                </div>
              )}

              {/* Type: CODING Problem Workspace */}
              {currentQuestion.type === 'CODING' && (
                <div className="space-y-4 pt-2">
                  {/* Language Selector Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary-900 text-white p-3 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-brand-400" />
                      <span className="text-xs font-bold uppercase tracking-wider">Language:</span>
                      <select
                        value={codeLanguage}
                        onChange={(e) => {
                          const lang = e.target.value;
                          setCodeLanguage(lang);
                          if (!currentAnswer) {
                            handleTextAnswerChange(currentQuestion.id, STARTER_CODE[lang] || '');
                          }
                        }}
                        className="bg-secondary-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-secondary-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="PYTHON">Python 3</option>
                        <option value="JAVA">Java (OpenJDK)</option>
                        <option value="CPP">C++ (GCC)</option>
                        <option value="C">C (GCC)</option>
                        <option value="JAVASCRIPT">JavaScript (Node.js)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRunCandidateCode(currentQuestion.id)}
                        disabled={isRunningCode}
                        className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                      >
                        {isRunningCode ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                        <span>Run Code</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSubmitCandidateCode(currentQuestion.id)}
                        disabled={isSubmittingCode}
                        className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                      >
                        {isSubmittingCode ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Submit Solution</span>
                      </button>
                    </div>
                  </div>

                  {/* Code Area */}
                  <textarea
                    rows={12}
                    value={currentAnswer || STARTER_CODE[codeLanguage] || ''}
                    onChange={(e) => handleTextAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="// Write your code solution here..."
                    className="w-full p-4 rounded-2xl border-2 border-secondary-800 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all resize-y"
                    spellCheck="false"
                  />

                  {/* Custom Input Toggle */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(!showCustomInput)}
                      className="text-xs font-bold text-secondary-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <span>{showCustomInput ? '− Hide Custom Input' : '+ Use Custom Test Input'}</span>
                    </button>
                    {showCustomInput && (
                      <textarea
                        rows={3}
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Enter custom standard input data..."
                        className="w-full p-3 rounded-xl border border-secondary-300 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    )}
                  </div>

                  {/* Run / Submission Console Output */}
                  {(runResult || codeSubmitResult) && (
                    <div className="bg-secondary-900 text-secondary-100 rounded-2xl p-4 space-y-3 font-mono text-xs border border-secondary-800">
                      <div className="flex items-center justify-between border-b border-secondary-800 pb-2">
                        <div className="flex items-center gap-2 font-bold text-white">
                          <Terminal className="w-4 h-4 text-brand-400" />
                          <span>Console Output</span>
                        </div>
                        {runResult?.status && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              runResult.passed ? 'bg-green-900/80 text-green-300' : 'bg-red-900/80 text-red-300'
                            }`}
                          >
                            {runResult.status}
                          </span>
                        )}
                      </div>

                      {runResult && (
                        <div className="space-y-2">
                          {runResult.stdout && (
                            <div>
                              <p className="text-secondary-400 text-[10px] uppercase font-bold">Standard Output:</p>
                              <pre className="p-2 bg-secondary-950 rounded-lg text-emerald-300 whitespace-pre-wrap">
                                {runResult.stdout}
                              </pre>
                            </div>
                          )}
                          {runResult.stderr && (
                            <div>
                              <p className="text-secondary-400 text-[10px] uppercase font-bold text-red-400">Error Output:</p>
                              <pre className="p-2 bg-secondary-950 rounded-lg text-red-300 whitespace-pre-wrap">
                                {runResult.stderr}
                              </pre>
                            </div>
                          )}
                          {runResult.executionTimeMs && (
                            <p className="text-secondary-400 text-[10px]">
                              Execution time: {runResult.executionTimeMs}ms
                            </p>
                          )}
                        </div>
                      )}

                      {codeSubmitResult && (
                        <div className="space-y-1.5 border-t border-secondary-800 pt-2 text-white">
                          <p className="font-bold text-green-400">
                            Test cases passed: {codeSubmitResult.testCasesPassed ?? 0} / {codeSubmitResult.totalTestCases ?? 'all'}
                          </p>
                          {codeSubmitResult.marksAwarded !== undefined && (
                            <p className="text-brand-300">Marks Awarded: {codeSubmitResult.marksAwarded} pts</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-secondary-100 pt-6">
              <button
                type="button"
                onClick={() => handleClearAnswer(currentQuestion.id)}
                disabled={!currentAnswer}
                className="px-4 py-2.5 rounded-xl border border-secondary-200 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 disabled:opacity-40 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Choice</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-5 py-2.5 rounded-xl border border-secondary-300 text-secondary-700 hover:bg-secondary-100 disabled:opacity-40 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-6 py-2.5 bg-secondary-900 hover:bg-secondary-800 text-[#F3EDE0] font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5"
                  >
                    <span>Review &amp; Submit</span>
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Proctoring Monitor & Question Palette (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live Proctoring Monitor Widget */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-secondary-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-xs font-black uppercase tracking-wider text-secondary-800">
                  AI Proctor Guard
                </span>
              </div>
              <span
                className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  webcamActive
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${webcamActive ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                {webcamActive ? 'Active' : 'Standby'}
              </span>
            </div>

            {/* Camera Video Stream Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-secondary-900 aspect-video flex items-center justify-center border border-secondary-700">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${webcamActive ? 'block' : 'hidden'}`}
              />
              {!webcamActive && (
                <div className="text-center p-4 space-y-2">
                  <Camera className="w-8 h-8 text-secondary-500 mx-auto" />
                  <p className="text-xs text-secondary-400 font-medium">Camera Sensor Standby</p>
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white flex items-center gap-1">
                <Eye className="w-3 h-3 text-green-400" />
                <span>{faceStatus === 'VERIFIED' ? 'Face Verified' : 'Proctor Active'}</span>
              </div>
            </div>

            {/* Warnings Log Summary */}
            {proctorWarnings.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>Proctoring Alerts ({proctorWarnings.length})</span>
                </div>
                <p className="line-clamp-2 text-red-700">
                  {proctorWarnings[proctorWarnings.length - 1].message}
                </p>
              </div>
            )}
          </div>

          {/* Question Palette / Navigator */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-secondary-200 space-y-5">
            <div className="flex items-center justify-between border-b border-secondary-100 pb-3">
              <h3 className="text-xs font-black text-secondary-900 uppercase tracking-wider">Question Map</h3>
              <span className="text-xs font-bold text-secondary-500">
                {answeredCount}/{questions.length} Answered
              </span>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-secondary-600">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md bg-green-600" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md bg-secondary-200" />
                <span>Unanswered ({remainingCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md bg-amber-500" />
                <span>Flagged ({flaggedCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md border-2 border-brand-600 bg-brand-50" />
                <span>Current</span>
              </div>
            </div>

            {/* Questions Grid */}
            <div className="grid grid-cols-5 gap-2.5 pt-2 max-h-64 overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                const isFlagged = flaggedQuestions.has(q.id);
                const isCurrent = currentIndex === idx;

                let btnStyle = 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200';
                if (isCurrent) {
                  btnStyle = 'ring-2 ring-brand-600 bg-brand-100 text-brand-900 font-black';
                } else if (isFlagged) {
                  btnStyle = 'bg-amber-500 text-white font-bold';
                } else if (isAnswered) {
                  btnStyle = 'bg-green-600 text-white font-bold';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl text-xs sm:text-sm transition-all relative flex items-center justify-center ${btnStyle}`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && isAnswered && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 bg-secondary-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-secondary-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-secondary-100 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-brand-600" />
                <h3 className="text-xl font-bold text-secondary-900">Assessment Rules &amp; Guidelines</h3>
              </div>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="text-secondary-400 hover:text-secondary-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-secondary-600 leading-relaxed max-h-80 overflow-y-auto pr-1">
              <p>• <strong>Full-Screen Enforced:</strong> Maintain full-screen mode throughout testing.</p>
              <p>• <strong>No Tab Switching:</strong> Navigating away from this window triggers proctor violations.</p>
              <p>• <strong>Timer &amp; Auto-Submit:</strong> When the countdown reaches zero, all answers auto-submit.</p>
              <p>• <strong>Coding Questions:</strong> Use the &quot;Run Code&quot; button to test with sample inputs before final submission.</p>
              <p>• <strong>AI Diagnostic Feedback:</strong> Personalized insights from Gemini AI are delivered immediately upon completion.</p>
            </div>

            <button
              onClick={() => setShowInstructionsModal(false)}
              className="w-full py-2.5 bg-secondary-900 text-white rounded-xl text-xs font-bold hover:bg-secondary-800"
            >
              Understood, Return to Test
            </button>
          </div>
        </div>
      )}

      {/* Leave / Back Warning Modal */}
      {showLeaveWarning && (
        <div className="fixed inset-0 z-50 bg-secondary-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-secondary-200">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-lg font-bold text-secondary-900">Do Not Leave Exam Room</h3>
            <p className="text-xs text-secondary-600">
              Navigating away or using the browser back button will interrupt your proctor session.
            </p>
            <button
              onClick={() => setShowLeaveWarning(false)}
              className="w-full py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700"
            >
              Continue Assessment
            </button>
          </div>
        </div>
      )}

      {/* Final Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-secondary-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-secondary-200 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Send className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-secondary-900">Submit Assessment?</h3>
              <p className="text-secondary-600 text-xs sm:text-sm">
                Once submitted, responses are locked and evaluated automatically by AI.
              </p>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-3 gap-3 bg-secondary-50 p-4 rounded-2xl border border-secondary-100 text-center">
              <div>
                <p className="text-xs font-semibold text-secondary-500">Answered</p>
                <p className="text-xl font-black text-emerald-600">{answeredCount}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-secondary-500">Unanswered</p>
                <p className="text-xl font-black text-rose-500">{remainingCount}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-secondary-500">Flagged</p>
                <p className="text-xl font-black text-purple-600">{flaggedCount}</p>
              </div>
            </div>

            {remainingCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-xl text-xs font-semibold border border-amber-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>You still have {remainingCount} unanswered question{remainingCount > 1 ? 's' : ''}!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-secondary-300 text-secondary-700 hover:bg-secondary-100 font-semibold text-xs sm:text-sm transition-all"
              >
                Back to Test
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Grading Answers...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Finish</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveExam;

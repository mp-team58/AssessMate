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
  BookOpenCheck
} from 'lucide-react';
import {
  getExamQuestions,
  logProctorEvent,
  submitExamAnswers
} from '../services/candidateService';

const ActiveExam = () => {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();

  // Exam Data State
  const [examData, setExamData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Assessment Progress State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: "A" | "A,B" | "text" }
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set()); // Set of questionIds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Timer State
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);
  const timerRef = useRef(null);

  // Proctoring State & Refs
  const [proctorWarnings, setProctorWarnings] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [webcamActive, setWebcamActive] = useState(false);
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

        // Initialize Timer from durationMinutes
        const storageKey = `exam_start_${enrollmentId}`;
        const storedStartTime = localStorage.getItem(storageKey);
        const totalDurationSec = (data.durationMinutes || 60) * 60;

        let remainingSec = totalDurationSec;
        if (storedStartTime) {
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
      // Clear persistent timer
      localStorage.removeItem(`exam_start_${enrollmentId}`);
      
      // Stop webcam stream if active
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }

      await submitExamAnswers(enrollmentId, answers);

      // Exit fullscreen safely
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (_) {}
      }

      // Navigate to results
      navigate(`/candidate/result/${enrollmentId}`);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to submit exam answers.');
      setIsSubmitting(false);
      hasAutoSubmittedRef.current = false;
    }
  }, [enrollmentId, answers, isSubmitting, navigate]);

  // 3. Countdown Timer Hook
  useEffect(() => {
    if (timeLeftSeconds === null || isSubmitting) return;

    if (timeLeftSeconds <= 0) {
      // Auto-submit when time expires
      handleSubmitExam();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds(prev => {
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

  // 4. Proctoring Event Listeners
  useEffect(() => {
    // Attempt fullscreen on mount
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (err) {
        console.warn('Fullscreen request blocked or dismissed:', err);
      }
    };
    enterFullscreen();

    // Webcam Setup
    const currentVideo = videoRef.current;
    const initWebcam = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setWebcamActive(true);
          }
        }
      } catch (err) {
        console.warn('Webcam permission not granted or unavailable:', err);
        setWebcamActive(false);
      }
    };
    initWebcam();

    // Tab Switch / Visibility Listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenTimeRef.current = Date.now();
      } else if (tabHiddenTimeRef.current) {
        const awaySeconds = Math.max(1, Math.round((Date.now() - tabHiddenTimeRef.current) / 1000));
        tabHiddenTimeRef.current = null;
        
        const details = `User switched away to another tab/window for ${awaySeconds}s`;
        logProctorEvent(enrollmentId, 'TAB_SWITCH', details);
        
        setProctorWarnings(prev => [
          ...prev, 
          { type: 'TAB_SWITCH', message: `Tab Switch detected! Stay on this screen. (${awaySeconds}s)`, timestamp: new Date() }
        ]);
      }
    };

    // Fullscreen Exit Listener
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);

      if (!inFullscreen) {
        logProctorEvent(enrollmentId, 'FULLSCREEN_EXIT', 'Candidate exited full screen mode');
        setProctorWarnings(prev => [
          ...prev,
          { type: 'FULLSCREEN_EXIT', message: 'Full screen exit detected! Please return to full screen.', timestamp: new Date() }
        ]);
      }
    };

    // Context Menu / Right-Click Prevention
    const handleContextMenu = (e) => {
      e.preventDefault();
      logProctorEvent(enrollmentId, 'RIGHT_CLICK', 'Candidate attempted right-click context menu');
      return false;
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
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (currentVideo && currentVideo.srcObject) {
        const tracks = currentVideo.srcObject.getTracks();
        tracks.forEach(t => t.stop());
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
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionKey
    }));
  };

  const handleMultipleSelectToggle = (questionId, optionKey) => {
    const currentVal = answers[questionId] || '';
    const selectedOptions = currentVal ? currentVal.split(',').filter(Boolean) : [];

    let newOptions;
    if (selectedOptions.includes(optionKey)) {
      newOptions = selectedOptions.filter(o => o !== optionKey);
    } else {
      newOptions = [...selectedOptions, optionKey].sort();
    }

    setAnswers(prev => ({
      ...prev,
      [questionId]: newOptions.join(',')
    }));
  };

  const handleTextAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleClearAnswer = (questionId) => {
    setAnswers(prev => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  const handleToggleFlag = (questionId) => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
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
        <p className="text-secondary-600 text-sm mt-1">Configuring anti-cheating monitor & shuffling questions...</p>
      </div>
    );
  }

  if (error || !examData || !examData.questions || examData.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#F3EDE0] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-secondary-200 shadow-xl text-center space-y-4">
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
  const answeredCount = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length;
  const flaggedCount = flaggedQuestions.size;
  const remainingCount = questions.length - answeredCount;

  const isTimeUrgent = timeLeftSeconds !== null && timeLeftSeconds < 300; // < 5 min

  return (
    <div className="min-h-screen bg-[#F3EDE0] text-secondary-900 font-sans flex flex-col select-none relative overflow-x-hidden">
      {/* Background Glowing Ambient Orbs matching Host Layout */}
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#DEC430] rounded-full blur-[140px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-500 rounded-full blur-[140px] opacity-10 pointer-events-none" />

      {/* Fullscreen Alert Banner if exited */}
      {!isFullscreen && (
        <div className="bg-red-600 text-white py-2.5 px-4 text-center text-sm font-semibold flex items-center justify-center gap-3 sticky top-0 z-50 animate-pulse">
          <AlertTriangle className="w-4 h-4" />
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

      {/* Top Header Bar matching Host Header */}
      <header className="bg-[#362E20] text-[#F3EDE0] px-6 py-4 shadow-md flex items-center justify-between sticky top-0 z-40 border-b border-secondary-700/50">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/20 p-2 rounded-lg">
            <BookOpenCheck className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight block leading-tight">AssessMate</span>
            <span className="text-xs text-brand-300 font-semibold uppercase">{examData.examTitle}</span>
          </div>
        </div>

        {/* Dynamic Timer Badge */}
        <div className="flex items-center gap-4 md:gap-6">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-base md:text-lg font-bold transition-all shadow-inner ${
              isTimeUrgent
                ? 'bg-red-950/80 text-red-300 border border-red-500 animate-pulse'
                : 'bg-brand-50 text-brand-700 border border-brand-100'
            }`}
          >
            <Clock className="w-5 h-5 flex-shrink-0" />
            <span>{formatTime(timeLeftSeconds)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Submit Test</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start z-10">
        
        {/* Left / Center Viewport: Question Card (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md border border-secondary-200 relative">
            
            {/* Question Header: Number, Marks, Flags */}
            <div className="flex items-center justify-between border-b border-secondary-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-brand-50 border border-brand-200 text-brand-800 rounded-xl text-sm font-extrabold">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-xs font-semibold uppercase px-2.5 py-1 bg-secondary-100 text-secondary-700 rounded-lg">
                  {currentQuestion.type ? currentQuestion.type.replace('_', ' ') : 'MULTIPLE CHOICE'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-600">+{currentQuestion.marks || 1}</span>
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
            <div className="mb-8">
              <h2 className="text-lg md:text-xl font-bold text-secondary-900 leading-relaxed">
                {currentQuestion.questionText}
              </h2>
            </div>

            {/* Answer Options according to question type */}
            <div className="space-y-3 mb-8">
              {/* Type: SINGLE_CHOICE or Default */}
              {(!currentQuestion.type || currentQuestion.type === 'SINGLE_CHOICE') && (
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
                          isSelected
                            ? 'bg-brand-600 text-white'
                            : 'bg-secondary-100 text-secondary-700'
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
              )}

              {/* Type: MULTIPLE_SELECT */}
              {currentQuestion.type === 'MULTIPLE_SELECT' && (
                <>
                  <p className="text-xs font-semibold text-secondary-500 mb-2 italic">
                    Select all options that apply:
                  </p>
                  {['A', 'B', 'C', 'D'].map((key) => {
                    const optionText = currentQuestion[`option${key}`];
                    if (!optionText) return null;
                    const selectedList = currentAnswer ? currentAnswer.split(',') : [];
                    const isSelected = selectedList.includes(key);

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleMultipleSelectToggle(currentQuestion.id, key)}
                        className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50/70 shadow-sm'
                            : 'border-secondary-200 hover:border-brand-400 hover:bg-brand-50/20 bg-white'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-brand-600 border-brand-600 text-white'
                              : 'border-secondary-300 bg-white'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <span className="text-sm md:text-base font-medium text-secondary-800 pt-0.5 leading-normal">
                          <strong className="font-bold text-secondary-900 mr-2">{key}.</strong>
                          {optionText}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Type: FILL_BLANK or NUMERICAL */}
              {(currentQuestion.type === 'FILL_BLANK' || currentQuestion.type === 'NUMERICAL') && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary-600 uppercase tracking-wider block">
                    Your Answer
                  </label>
                  <input
                    type={currentQuestion.type === 'NUMERICAL' ? 'number' : 'text'}
                    value={currentAnswer}
                    onChange={(e) => handleTextAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder={currentQuestion.type === 'NUMERICAL' ? 'Enter numerical value...' : 'Type your answer here...'}
                    className="w-full px-5 py-4 rounded-xl border-2 border-secondary-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-base font-medium text-secondary-900 focus:outline-none transition-all"
                  />
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
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-5 py-2.5 rounded-xl border border-secondary-300 text-secondary-700 hover:bg-secondary-100 disabled:opacity-40 font-bold text-sm transition-all flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-6 py-2.5 bg-secondary-900 hover:bg-secondary-800 text-[#F3EDE0] font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5"
                  >
                    <span>Review & Submit</span>
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Proctoring Monitor & Question Palette (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Live Proctoring Monitor Widget matching Host cards */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-secondary-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-xs font-black uppercase tracking-wider text-secondary-800">
                  Proctoring Monitor
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Active
              </span>
            </div>

            {/* Camera Video Stream Preview */}
            <div className="relative rounded-xl overflow-hidden bg-secondary-900 aspect-video flex items-center justify-center border border-secondary-700">
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
                  <p className="text-xs text-secondary-400 font-medium">Webcam Sensor Active</p>
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white flex items-center gap-1">
                <Eye className="w-3 h-3 text-green-400" />
                <span>AI Proctor Guard</span>
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

          {/* Question Palette / Navigator matching Host cards */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-secondary-200 space-y-5">
            <div className="flex items-center justify-between border-b border-secondary-100 pb-3">
              <h3 className="text-sm font-black text-secondary-900 uppercase tracking-wider">
                Question Map
              </h3>
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
                <span>Marked for Review ({flaggedCount})</span>
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
                    className={`h-10 rounded-xl text-sm transition-all relative flex items-center justify-center ${btnStyle}`}
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

      {/* Final Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-secondary-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-secondary-200 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Send className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-secondary-900">Submit Assessment?</h3>
              <p className="text-secondary-600 text-sm">
                Once submitted, you will not be able to change any answers. Your results will be auto-graded and analyzed by AI.
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
                className="px-5 py-3 rounded-xl border border-secondary-300 text-secondary-700 hover:bg-secondary-100 font-semibold text-sm transition-all"
              >
                Back to Test
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Grading Answers...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Finish</span>
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

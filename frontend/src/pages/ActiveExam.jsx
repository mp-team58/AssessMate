import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Global cache to prevent re-downloading models on every render
let globalBlazefaceModel = null;
let globalCocoSsdModel = null;
import { useToast } from '../contexts/ToastContext';
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
  Info,
  Mic,
  MicOff,
  Volume2,
  Lock,
  ArrowRight,
  Wifi,
  WifiOff,
  Loader2,
  Sparkles,
  Maximize
} from 'lucide-react';
import {
  getExamQuestions,
  getAssignedCodingProblems,
  logProctorEvent,
  uploadProctorEvidence,
  submitExamAnswers,
  runCandidateCode,
  submitCandidateCode,
  saveExamProgress,
  getExamState
} from '../services/candidateService';
import { getMediaUrl } from '../services/apiClient';

const STARTER_CODE = {
  PYTHON: '# Write your Python 3 solution here\ndef solution():\n    pass\n\nif __name__ == "__main__":\n    solution()\n',
  JAVA: 'import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}\n',
  CPP: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ code here\n    return 0;\n}\n',
  C: '#include <stdio.h>\n\nint main() {\n    // Write your C code here\n    return 0;\n}\n',
  JAVASCRIPT: '// Write your JavaScript solution here\nconst fs = require("fs");\n\nfunction main() {\n    // Read input and compute solution\n}\n\nmain();\n'
};

const ActiveExam = () => {
  const { enrollmentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Load Exam Configuration
  const [examConfig] = useState(() => {
    try {
      const stored = sessionStorage.getItem(`exam_config_${enrollmentId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });

  // Flow Stages:
  // 1. Permission Gate (permissionState: 'CHECKING' | 'GRANTED' | 'DENIED')
  // 2. Model Loading (modelsLoading: boolean)
  // 3. Exam Active
  const [permissionState, setPermissionState] = useState('CHECKING');
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelLoadStep, setModelLoadStep] = useState('Initializing AI Proctor engine...');

  // Network Offline / Online State
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);

  // Exam Data State
  const [examData, setExamData] = useState(null);
  const [questionsList, setQuestionsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Assessment Progress State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionKey]: "A" | "A,B" | "text" | code }
  const answersRef = useRef({});
  answersRef.current = answers;

  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [screenshotWarning, setScreenshotWarning] = useState(false);

  // Backend / Violation Termination State
  const [backendTerminated, setBackendTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');

  // Coding Workspace State
  const [codeLanguage, setCodeLanguage] = useState('PYTHON');
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [codeSubmitResult, setCodeSubmitResult] = useState(null);

  // Timers State
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);
  const timerRef = useRef(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(null);
  const questionTimerRef = useRef(null);
  const statePollRef = useRef(null);

  // Proctoring & Media Streams State
  const [proctorWarnings, setProctorWarnings] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);
  const [webcamActive, setWebcamActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [faceStatus, setFaceStatus] = useState('CHECKING'); // 'VERIFIED' | 'STANDBY'

  // Tab Switch Counter
  const tabSwitchCountRef = useRef(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Refs for AI Models & Media
  const hiddenVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioIntervalRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const isDetectingRef = useRef(false);
  const isRecordingAudioRef = useRef(false);
  const lastCooldownRef = useRef({}); // { [eventType]: timestamp }

  // TensorFlow Model Refs
  const blazefaceModelRef = useRef(null);
  const cocoSsdModelRef = useRef(null);

  const tabHiddenTimeRef = useRef(null);
  const hasSubmittedRef = useRef(false);

  // Max Tab Switches Allowed
  const maxAllowedTabSwitches = examConfig?.maxTabSwitches ?? 3;

  // Universal Teardown: ONLY called upon final submission / termination
  const performFinalTeardown = useCallback(() => {
    // 1. Clear Timers & Polling
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    if (statePollRef.current) {
      clearInterval(statePollRef.current);
      statePollRef.current = null;
    }
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    // 2. Stop Media Streams
    if (mediaStreamRef.current) {
      try {
        const tracks = mediaStreamRef.current.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }

    if (hiddenVideoRef.current && hiddenVideoRef.current.srcObject) {
      try {
        const tracks = hiddenVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        hiddenVideoRef.current.srcObject = null;
      } catch (_) {}
    }

    if (previewVideoRef.current && previewVideoRef.current.srcObject) {
      try {
        const tracks = previewVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        previewVideoRef.current.srcObject = null;
      } catch (_) {}
    }

    // 3. Close AudioContext
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (_) {}
      audioContextRef.current = null;
    }

    // 4. Exit Fullscreen on Final Submit
    if (document.fullscreenElement) {
      try {
        document.exitFullscreen().catch(() => {});
      } catch (_) {}
    }

    // 5. Clean localStorage timer
    localStorage.removeItem(`exam_start_${enrollmentId}`);
  }, [enrollmentId]);

  const handleAutoTerminationRef = useRef(null);
  const handleSubmitExamRef = useRef(null);

  // Handle Immediate Exam Termination (Backend or Violation)
  const handleAutoTermination = useCallback(
    async (reason) => {
      if (hasSubmittedRef.current) return;
      hasSubmittedRef.current = true;
      setIsSubmitting(true);

      performFinalTeardown();

      const finalReason = reason || 'Exam was automatically submitted by the system.';
      setTerminationReason(finalReason);
      setBackendTerminated(true);

      // Submit existing candidate responses to save their progress
      try {
        const currentAns = answersRef.current || {};
        const mcqAnswersOnly = {};
        Object.entries(currentAns).forEach(([key, val]) => {
          if (!String(key).startsWith('coding_')) {
            mcqAnswersOnly[key] = val;
          }
        });
        await submitExamAnswers(enrollmentId, mcqAnswersOnly);
      } catch (_) {}
    },
    [performFinalTeardown, enrollmentId]
  );

  // Normal Candidate Submit Action
  const handleSubmitExam = useCallback(async () => {
    if (isSubmitting || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setIsSubmitting(true);

    try {
      const currentAns = answersRef.current || {};
      const mcqAnswersOnly = {};
      Object.entries(currentAns).forEach(([key, val]) => {
        if (!String(key).startsWith('coding_')) {
          mcqAnswersOnly[key] = val;
        }
      });

      performFinalTeardown();

      await submitExamAnswers(enrollmentId, mcqAnswersOnly);

      navigate(`/candidate/result/${enrollmentId}`);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to submit exam answers.';
      if (
        errMsg.toLowerCase().includes('already submitted') ||
        errMsg.toLowerCase().includes('expired') ||
        errMsg.toLowerCase().includes('no longer open')
      ) {
        handleAutoTermination(errMsg);
      } else {
        showToast(errMsg, 'error');
        setIsSubmitting(false);
        hasSubmittedRef.current = false;
      }
    }
  }, [enrollmentId, isSubmitting, navigate, performFinalTeardown, handleAutoTermination]);

  handleAutoTerminationRef.current = handleAutoTermination;
  handleSubmitExamRef.current = handleSubmitExam;

  // Centralized Send Proctor Log with Evidence & Auto-Submit Reaction
  const sendProctorLog = useCallback(
    async (eventType, details = '', imageUrl = null, audioUrl = null) => {
      if (hasSubmittedRef.current) return;

      // Anti-spam cooldown check (8 seconds per eventType)
      const now = Date.now();
      const lastTime = lastCooldownRef.current[eventType] || 0;
      if (now - lastTime < 8000 && !['TAB_SWITCH', 'FULL_SCREEN_EXIT', 'NO_CAMERA', 'NO_MIC'].includes(eventType)) {
        return;
      }
      lastCooldownRef.current[eventType] = now;

      try {
        const res = await logProctorEvent(enrollmentId, eventType, details, imageUrl, audioUrl);
        if (res?.data?.autoSubmitted === true) {
          handleAutoTerminationRef.current?.(
            'Multiple proctoring violations were detected. Your exam has been automatically submitted.'
          );
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || '';
        if (
          msg.toLowerCase().includes('not ongoing') ||
          msg.toLowerCase().includes('already submitted') ||
          msg.toLowerCase().includes('expired') ||
          msg.toLowerCase().includes('no longer open')
        ) {
          handleAutoTerminationRef.current?.(msg || 'Your exam was automatically submitted.');
        }
      }
    },
    [enrollmentId]
  );

  // Helper to Capture Current Frame from hidden video and upload as evidence
  const captureAndUploadEvidence = useCallback(async () => {
    if (!hiddenVideoRef.current || hiddenVideoRef.current.readyState < 2) return null;
    try {
      const video = hiddenVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!blob) return null;

      const uploadRes = await uploadProctorEvidence(blob, 'image');
      return uploadRes?.data?.url || null;
    } catch (err) {
      console.warn('[Proctor Evidence Upload Error]:', err);
      return null;
    }
  }, []);

  // Network Offline / Online Monitor Listener
  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedToast(true);
      setTimeout(() => setShowReconnectedToast(false), 4000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // STEP A: Pre-Exam Permission Gate
  const requestMediaPermissions = useCallback(async () => {
    setPermissionState('CHECKING');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });

      mediaStreamRef.current = stream;

      // Attach stream to hidden video & preview video
      if (hiddenVideoRef.current) {
        hiddenVideoRef.current.srcObject = stream;
      }
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }

      setWebcamActive(true);
      setMicActive(true);
      setPermissionState('GRANTED');

      // Hardware Loss Mid-Exam Listeners (track.onended)
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      videoTracks.forEach((track) => {
        track.addEventListener('ended', () => {
          setWebcamActive(false);
          sendProctorLog('NO_CAMERA', 'Camera track was lost or disconnected.');
          setProctorWarnings((prev) => [
            ...prev,
            {
              type: 'NO_CAMERA',
              message: 'Camera feed disconnected! Please reconnect your camera immediately.',
              timestamp: new Date()
            }
          ]);
        });
      });

      audioTracks.forEach((track) => {
        track.addEventListener('ended', () => {
          setMicActive(false);
          sendProctorLog('NO_MIC', 'Microphone track was lost or disconnected.');
          setProctorWarnings((prev) => [
            ...prev,
            {
              type: 'NO_MIC',
              message: 'Microphone feed disconnected! Please reconnect your microphone.',
              timestamp: new Date()
            }
          ]);
        });
      });
    } catch (err) {
      console.warn('[Permission Gate Denied]:', err);
      setPermissionState('DENIED');
      setWebcamActive(false);
      setMicActive(false);
    }
  }, [sendProctorLog]);

  // Initial Permission Request on Mount
  useEffect(() => {
    requestMediaPermissions();
  }, [requestMediaPermissions]);

  // Ensure stream is attached to video elements once they render
  useEffect(() => {
    if (mediaStreamRef.current) {
      if (hiddenVideoRef.current && hiddenVideoRef.current.srcObject !== mediaStreamRef.current) {
        hiddenVideoRef.current.srcObject = mediaStreamRef.current;
      }
      if (previewVideoRef.current && previewVideoRef.current.srcObject !== mediaStreamRef.current) {
        previewVideoRef.current.srcObject = mediaStreamRef.current;
      }
    }
  });

  // STEP B: Load TensorFlow AI Models (blazeface + coco-ssd)
  useEffect(() => {
    if (permissionState !== 'GRANTED') return;
    let isMounted = true;

    const loadModels = async () => {
      setModelsLoading(true);
      try {
        setModelLoadStep('Configuring WebGL acceleration...');
        try {
          await tf.setBackend('webgl');
        } catch (_) {
          await tf.setBackend('cpu');
        }
        await tf.ready();

        if (!isMounted) return;
        
        setModelLoadStep('Loading AI Proctoring Engine...');
        if (!globalBlazefaceModel) {
          globalBlazefaceModel = await blazeface.load();
        }
        const faceModel = globalBlazefaceModel;

        if (!isMounted) return;
        setModelLoadStep('Loading AI Proctoring Engine...');
        let objModel = globalCocoSsdModel;
        if (!objModel) {
          try {
            objModel = await cocoSsd.load({ base: 'mobilenet_v2' });
          } catch (_) {
            objModel = await cocoSsd.load();
          }
          globalCocoSsdModel = objModel;
        }

        if (!isMounted) return;
        blazefaceModelRef.current = faceModel;
        cocoSsdModelRef.current = objModel;
        setFaceStatus('VERIFIED');
        setModelsLoading(false);
      } catch (err) {
        console.warn('[TensorFlow Models Load Warning]:', err);
        if (isMounted) {
          // Allow proceeding even if model load had a transient issue
          setModelsLoading(false);
        }
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, [permissionState]);

  // 1. Fetch Exam, MCQ Questions, and Coding Problems (Runs ONCE per enrollmentId)
  useEffect(() => {
    let isMounted = true;

    const fetchExamAndQuestions = async () => {
      setIsLoading(true);
      setError('');
      try {
        // Fetch Primary Exam MCQ Questions
        const res = await getExamQuestions(enrollmentId);
        if (!isMounted) return;

        const data = res.data;
        setExamData(data);

        // Prepopulate saved MCQ answers
        const initialAnswers = {};
        const mcqQuestions = (data.questions || []).map((q) => {
          if (q.savedAnswer) {
            initialAnswers[q.id] = q.savedAnswer;
          }
          return {
            ...q,
            isCoding: false
          };
        });

        // Determine Exam ID for Coding Questions pool
        const examIdFromUrl = searchParams.get('examId');
        const examId =
          examIdFromUrl ||
          sessionStorage.getItem(`exam_id_${enrollmentId}`) ||
          sessionStorage.getItem('currentExamId') ||
          localStorage.getItem(`exam_id_${enrollmentId}`);

        let codingProblems = [];
        if (examId) {
          try {
            const codingRes = await getAssignedCodingProblems(examId);
            if (codingRes.data && Array.isArray(codingRes.data)) {
              codingProblems = codingRes.data.map((cp, idx) => {
                const questionKey = `coding_${cp.id}`;
                if (cp.savedCode) {
                  initialAnswers[questionKey] = cp.savedCode;
                }
                let langs = cp.allowedLanguages;
                if (typeof langs === 'string') {
                  try { langs = JSON.parse(langs); } catch(e) { langs = langs.split(',').map(s=>s.trim()); }
                }
                let tcs = cp.testCases;
                if (typeof tcs === 'string') {
                  try { tcs = JSON.parse(tcs); } catch(e) { tcs = []; }
                }
                
                return {
                  id: questionKey,
                  rawCodingId: cp.id,
                  questionText: cp.title || `Coding Problem #${idx + 1}`,
                  title: cp.title,
                  description: cp.description,
                  constraints: cp.constraints,
                  sampleInput: cp.sampleInput,
                  sampleOutput: cp.sampleOutput,
                  explanation: cp.explanation,
                  allowedLanguages: Array.isArray(langs) ? langs : ['PYTHON', 'JAVA', 'CPP', 'C', 'JAVASCRIPT'],
                  timeLimitSeconds: cp.timeLimitSeconds || 2,
                  memoryLimitMb: cp.memoryLimitMb || 256,
                  marks: cp.marks || 10,
                  negativeMarks: 0,
                  type: 'CODING',
                  isCoding: true,
                  savedCode: cp.savedCode,
                  savedLanguage: cp.savedLanguage,
                  testCases: Array.isArray(tcs) ? tcs : []
                };
              });

              // Restore candidate's preferred/saved language
              const firstWithLang = codingProblems.find((cp) => cp.savedLanguage);
              if (firstWithLang?.savedLanguage) {
                setCodeLanguage(firstWithLang.savedLanguage);
              }
            }
          } catch (_) {
            // No coding problems in pool
          }
        }

        const allQuestions = [...mcqQuestions, ...codingProblems];
        if (!isMounted) return;

        setQuestionsList(allQuestions);
        setAnswers(initialAnswers);

        // Initialize Timer
        const storageKey = `exam_start_${enrollmentId}`;
        const storedStartTime = localStorage.getItem(storageKey);
        const totalDurationSec = (data.durationMinutes || 60) * 60;

        let remainingSec = totalDurationSec;
        if (data.remainingSeconds !== undefined && data.remainingSeconds !== null) {
          remainingSec = Math.max(0, data.remainingSeconds);
        } else if (storedStartTime) {
          const elapsedSec = Math.floor((Date.now() - parseInt(storedStartTime, 10)) / 1000);
          remainingSec = Math.max(0, totalDurationSec - elapsedSec);
        } else {
          localStorage.setItem(storageKey, Date.now().toString());
        }

        setTimeLeftSeconds(remainingSec);
      } catch (err) {
        if (!isMounted) return;
        const msg = err.response?.data?.message || err.message || 'Failed to load assessment data.';
        if (
          msg.toLowerCase().includes('already submitted') ||
          msg.toLowerCase().includes('expired') ||
          msg.toLowerCase().includes('no longer open')
        ) {
          handleAutoTermination(msg);
        } else {
          setError(msg);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchExamAndQuestions();

    return () => {
      isMounted = false;
    };
  }, [enrollmentId]);

  // 2. Overall Countdown Timer Interval
  useEffect(() => {
    if (timeLeftSeconds === null || isSubmitting || backendTerminated || permissionState !== 'GRANTED' || modelsLoading) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmitExamRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeLeftSeconds !== null, isSubmitting, backendTerminated, permissionState, modelsLoading]);

  // 3. Per-Question Timer Hook
  useEffect(() => {
    if (!questionsList || !questionsList[currentIndex] || backendTerminated || isSubmitting || permissionState !== 'GRANTED' || modelsLoading) {
      return;
    }

    const currentQ = questionsList[currentIndex];
    const qTimeSec = currentQ.timeSeconds || (examData?.timerType === 'PER_QUESTION' ? 60 : null);

    if (qTimeSec && qTimeSec > 0) {
      setQuestionTimeLeft(qTimeSec);

      if (questionTimerRef.current) clearInterval(questionTimerRef.current);

      questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(questionTimerRef.current);
            if (currentIndex < questionsList.length - 1) {
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
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
    };
  }, [currentIndex, questionsList.length, backendTerminated, isSubmitting, permissionState, modelsLoading]);

  // 4. Backend State Polling (Runs quietly in background)
  useEffect(() => {
    if (isSubmitting || backendTerminated || !enrollmentId || permissionState !== 'GRANTED' || modelsLoading) return;

    statePollRef.current = setInterval(async () => {
      try {
        const stateRes = await getExamState(enrollmentId);
        if (stateRes.data) {
          const { status, remainingSeconds } = stateRes.data;
          if (status === 'SUBMITTED') {
            handleAutoTerminationRef.current?.('Exam was submitted by the system.');
          } else if (status === 'EXPIRED') {
            handleAutoTerminationRef.current?.('Exam time limit expired on the server.');
          } else if (remainingSeconds !== undefined && remainingSeconds !== null && remainingSeconds <= 0) {
            handleAutoTerminationRef.current?.('Exam time limit expired.');
          }
        }
      } catch (err) {
        const msg = err.response?.data?.message || '';
        if (
          msg.toLowerCase().includes('already submitted') ||
          msg.toLowerCase().includes('expired') ||
          msg.toLowerCase().includes('no longer open')
        ) {
          handleAutoTerminationRef.current?.(msg);
        }
      }
    }, 6000);

    return () => {
      if (statePollRef.current) {
        clearInterval(statePollRef.current);
        statePollRef.current = null;
      }
    };
  }, [enrollmentId, isSubmitting, backendTerminated, permissionState, modelsLoading]);

  // 5. STEP C: Live Proctoring (Face & Object Detection Loop + Audio Pipeline)
  useEffect(() => {
    if (permissionState !== 'GRANTED' || modelsLoading || backendTerminated) return;

    setIsFullscreen(!!document.fullscreenElement);

    // 5.1 Web Audio API RMS Volume Monitor
    if (mediaStreamRef.current) {
      try {
        const stream = mediaStreamRef.current;
        const audioTracks = stream.getAudioTracks();

        if (audioTracks.length > 0) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            audioAnalyserRef.current = analyser;

            const bufferLength = analyser.fftSize;
            const timeDomainData = new Uint8Array(bufferLength);

            audioIntervalRef.current = setInterval(async () => {
              if (!audioAnalyserRef.current || hasSubmittedRef.current) return;
              audioAnalyserRef.current.getByteTimeDomainData(timeDomainData);

              let sumSquares = 0;
              for (let i = 0; i < bufferLength; i++) {
                const norm = (timeDomainData[i] - 128) / 128;
                sumSquares += norm * norm;
              }
              const rms = Math.sqrt(sumSquares / bufferLength);
              setAudioLevel(Math.min(100, Math.round(rms * 250)));

              // RMS Threshold for Noise / Voice Activity (lowered to 0.05 to ensure normal speech is caught)
              if (rms > 0.05 && !isRecordingAudioRef.current) {
                const now = Date.now();
                const lastTime = lastCooldownRef.current['AUDIO_DETECTED'] || 0;
                if (now - lastTime >= 8000) {
                  isRecordingAudioRef.current = true;
                  lastCooldownRef.current['AUDIO_DETECTED'] = now;

                  try {
                    const audioStream = new MediaStream(audioTracks);
                    const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
                    const audioChunks = [];

                    recorder.ondataavailable = (e) => {
                      if (e.data && e.data.size > 0) {
                        audioChunks.push(e.data);
                      }
                    };

                    recorder.onstop = async () => {
                      isRecordingAudioRef.current = false;
                      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                      try {
                        const uploadRes = await uploadProctorEvidence(audioBlob, 'audio');
                        const audioUrl = uploadRes?.data?.url || null;

                        sendProctorLog('AUDIO_DETECTED', 'Speech or elevated ambient noise detected', null, audioUrl);

                        setProctorWarnings((prev) => [
                          ...prev,
                          {
                            type: 'AUDIO_DETECTED',
                            message: 'Elevated noise / speech activity detected in your environment. Please maintain silence.',
                            timestamp: new Date()
                          }
                        ]);
                      } catch (err) {
                        console.warn('[Audio Evidence Upload Error]:', err);
                      }
                    };

                    recorder.start();
                    setTimeout(() => {
                      if (recorder.state === 'recording') {
                        recorder.stop();
                      }
                    }, 3000);
                  } catch (recErr) {
                    isRecordingAudioRef.current = false;
                    console.warn('[MediaRecorder Error]:', recErr);
                  }
                }
              }
            }, 200);
          }
        }
      } catch (audioInitErr) {
        console.warn('[Audio Init Error]:', audioInitErr);
      }
    }

    // 5.2 4-Second Camera Pipeline (Face + Object Detection)
    detectionIntervalRef.current = setInterval(async () => {
      if (isDetectingRef.current || hasSubmittedRef.current) return;

      const video = hiddenVideoRef.current || previewVideoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      isDetectingRef.current = true;

      try {
        let faces = [];
        if (blazefaceModelRef.current) {
          faces = await blazefaceModelRef.current.estimateFaces(video, false);
        }

        let objects = [];
        if (cocoSsdModelRef.current) {
          objects = await cocoSsdModelRef.current.detect(video);
        }

        // Face Detection Decision Logic
        if (examConfig?.enableFaceDetection !== false) {
          if (faces.length === 0) {
            setFaceStatus('STANDBY');
            const evidenceUrl = await captureAndUploadEvidence();
            sendProctorLog('NO_FACE', 'No face detected in camera viewport', evidenceUrl, null);

            setProctorWarnings((prev) => [
              ...prev,
              {
                type: 'NO_FACE',
                message: 'No face detected in camera view. Ensure your face is centered and clearly visible.',
                timestamp: new Date()
              }
            ]);
          } else if (faces.length > 1) {
            setFaceStatus('VERIFIED');
            const evidenceUrl = await captureAndUploadEvidence();
            sendProctorLog('MULTIPLE_FACES', `Multiple faces detected in camera frame (${faces.length})`, evidenceUrl, null);

            setProctorWarnings((prev) => [
              ...prev,
              {
                type: 'MULTIPLE_FACES',
                message: `Multiple people detected in view (${faces.length} faces). Only the candidate is permitted.`,
                timestamp: new Date()
              }
            ]);
          } else {
            setFaceStatus('VERIFIED');
          }
        }

        // Object Detection: phone, laptop, book
        if (examConfig?.enableObjectDetection !== false) {
          const suspiciousObjects = objects.filter((obj) => {
            const label = String(obj.class).toLowerCase();
            const isTargetClass = ['cell phone', 'phone', 'laptop', 'book'].includes(label);
            return isTargetClass && obj.score >= 0.50;
          });

          if (suspiciousObjects.length > 0) {
            const detectedNames = suspiciousObjects.map((o) => `${o.class} (${Math.round(o.score * 100)}%)`).join(', ');
            const evidenceUrl = await captureAndUploadEvidence();
            sendProctorLog('OBJECT_DETECTED', `Prohibited object(s) detected: ${detectedNames}`, evidenceUrl, null);

            setProctorWarnings((prev) => [
              ...prev,
              {
                type: 'OBJECT_DETECTED',
                message: `Prohibited object detected in frame: ${detectedNames}. Remove all secondary devices.`,
                timestamp: new Date()
              }
            ]);
          }
        }
      } catch (detectErr) {
        console.warn('[Detection Tick Warning]:', detectErr);
      } finally {
        isDetectingRef.current = false;
      }
    }, 1000);

    // 5.3 Prevent Back Navigation
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setShowLeaveWarning(true);
    };
    window.addEventListener('popstate', handlePopState);

    // 5.4 Tab Switch / Visibility Change Guard
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenTimeRef.current = Date.now();
        tabSwitchCountRef.current += 1;
        const count = tabSwitchCountRef.current;
        setTabSwitchCount(count);

        sendProctorLog('TAB_SWITCH', `Candidate switched away from exam tab (Violation #${count})`);

        const maxAllowed = examConfig?.maxTabSwitches ?? 3;
        if (count > maxAllowed) {
          handleAutoTerminationRef.current?.(
            `Maximum violation limit exceeded (${count} of ${maxAllowed} allowed). Exam automatically submitted due to proctoring violation.`
          );
        } else {
          const remaining = maxAllowed - count;
          setProctorWarnings((prev) => [
            ...prev,
            {
              type: 'TAB_SWITCH',
              message: `Tab Switch Violation (${count}/${maxAllowed})! Stay on this screen. ${remaining} more violation(s) will terminate the exam!`,
              timestamp: new Date()
            }
          ]);
        }
      }
    };

    // 5.5 Fullscreen Exit Handler
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);

      if (!inFullscreen && !hasSubmittedRef.current && !backendTerminated) {
        tabSwitchCountRef.current += 1;
        const count = tabSwitchCountRef.current;
        setTabSwitchCount(count);

        sendProctorLog('FULL_SCREEN_EXIT', `Candidate exited full screen mode (Violation #${count})`);
        
        const maxAllowed = examConfig?.maxTabSwitches ?? 3;
        if (count > maxAllowed) {
          handleAutoTerminationRef.current?.(
            `Maximum violation limit exceeded (${count} of ${maxAllowed} allowed). Exam automatically submitted.`
          );
        } else {
          const remaining = maxAllowed - count;
          setProctorWarnings((prev) => [
            ...prev,
            {
              type: 'FULL_SCREEN_EXIT',
              message: `Full Screen Violation (${count}/${maxAllowed})! Please return to full screen. ${remaining} more violation(s) will terminate the exam!`,
              timestamp: new Date()
            }
          ]);
        }
      }
    };

    // 5.6 Right-Click Context Menu Prevention
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // 5.7 Copy / Paste / Screenshot Prevention
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        setScreenshotWarning(true);
        setTimeout(() => setScreenshotWarning(false), 3500);
        return false;
      }

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

    // 5.8 Before Unload Warning
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

      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [permissionState, modelsLoading, backendTerminated, sendProctorLog, captureAndUploadEvidence, examConfig]);

  // Request Fullscreen Button Handler
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

  // Answer Modification Handlers
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
      if (!String(questionId).startsWith('coding_')) {
        saveExamProgress(enrollmentId, updated).catch(() => {});
      }
      return updated;
    });
  };

  const handleClearAnswer = (questionId) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      if (!String(questionId).startsWith('coding_')) {
        saveExamProgress(enrollmentId, copy).catch(() => {});
      }
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
  const handleRunCandidateCode = async (rawCodingId, questionKey) => {
    const currentCode = answers[questionKey] || STARTER_CODE[codeLanguage] || '';
    handleTextAnswerChange(questionKey, currentCode);
    setIsRunningCode(true);
    setRunResult(null);

    try {
      const res = await runCandidateCode({
        codingQuestionId: rawCodingId,
        language: codeLanguage,
        sourceCode: currentCode,
        customInput: showCustomInput ? customInput : ''
      });
      setRunResult(res.data);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Execution error.';
      setRunResult({
        status: 'EXECUTION_ERROR',
        stderr: errMsg,
        passed: false
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  // Coding Question: Submit Code Solution Handler
  const handleSubmitCandidateCode = async (rawCodingId, questionKey) => {
    const currentCode = answers[questionKey] || STARTER_CODE[codeLanguage] || '';
    handleTextAnswerChange(questionKey, currentCode);
    setIsSubmittingCode(true);
    setCodeSubmitResult(null);

    try {
      const res = await submitCandidateCode({
        enrollmentId,
        codingQuestionId: rawCodingId,
        language: codeLanguage,
        sourceCode: currentCode
      });
      setCodeSubmitResult(res.data);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Submission error.';
      setCodeSubmitResult({
        status: 'SUBMISSION_ERROR',
        compileOutput: errMsg
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

  // STEP A: Permission Gate Screen (Blocking if Denied)
  if (permissionState === 'DENIED') {
    return (
      <div className="min-h-screen bg-[#F3EDE0] flex items-center justify-center p-6 text-center select-none font-sans">
        <div className="max-w-lg w-full bg-white p-8 md:p-10 rounded-3xl border border-secondary-200 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Camera className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-secondary-900 tracking-tight">
              Hardware Permissions Required
            </h2>
            <p className="text-secondary-600 text-sm leading-relaxed">
              AssessMate requires continuous webcam and microphone access during this assessment to ensure identity verification and proctoring compliance.
            </p>
          </div>

          <div className="bg-secondary-50 p-4 rounded-2xl border border-secondary-200 text-left space-y-2 text-xs text-secondary-700">
            <div className="flex items-center gap-2 font-bold text-secondary-900">
              <Shield className="w-4 h-4 text-brand-600" />
              <span>How to grant permission:</span>
            </div>
            <p>1. Click the camera icon in your browser address bar.</p>
            <p>2. Select <strong>&quot;Allow&quot;</strong> for camera and microphone access.</p>
            <p>3. Click the retry button below to start your exam.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/candidate/dashboard')}
              className="flex-1 py-3 px-4 rounded-xl border border-secondary-300 text-secondary-700 font-bold text-sm hover:bg-secondary-50"
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              onClick={requestMediaPermissions}
              className="flex-1 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Grant &amp; Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP B: AI Models Loading Screen
  if (permissionState === 'GRANTED' && modelsLoading) {
    return (
      <div className="min-h-screen bg-[#F3EDE0] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        {/* Hidden video element keeping stream active for model warmup */}
        <video
          ref={hiddenVideoRef}
          autoPlay
          playsInline
          muted
          style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', top: '-9999px' }}
        />

        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-brand-500/15 border-2 border-brand-500/30 flex items-center justify-center animate-pulse">
            <Shield className="w-10 h-10 text-brand-600 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 bg-brand-600 rounded-lg text-white shadow-md">
            <Sparkles className="w-3.5 h-3.5 animate-bounce" />
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-secondary-900 tracking-tight mb-2">
          Preparing Proctoring AI Engine
        </h2>
        <p className="text-secondary-600 text-sm max-w-md font-medium mb-4">
          {modelLoadStep}
        </p>

        <div className="w-64 h-2 bg-secondary-200 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 animate-pulse rounded-full w-4/5" />
        </div>
      </div>
    );
  }

  // Data Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3EDE0] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-600 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-secondary-900">Preparing Your Assessment Environment</h2>
        <p className="text-secondary-600 text-sm mt-1">Configuring examination questions...</p>
      </div>
    );
  }

  // Error Screen
  if (error || !examData || questionsList.length === 0) {
    if (!backendTerminated) {
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
  }

  const currentQuestion = questionsList[currentIndex] || {};
  const currentAnswer = answers[currentQuestion.id] || '';
  const isCurrentFlagged = flaggedQuestions.has(currentQuestion.id);

  // Status computation for palette
  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== '').length;
  const flaggedCount = flaggedQuestions.size;
  const remainingCount = Math.max(0, questionsList.length - answeredCount);

  const isTimeUrgent = timeLeftSeconds !== null && timeLeftSeconds < 300;

  return (
    <div className="min-h-screen bg-[#F3EDE0] text-secondary-900 font-sans flex flex-col select-none relative overflow-x-hidden">
      {/* Hidden continuous video element for AI detection pipeline */}
      <video
        ref={hiddenVideoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', top: '-9999px' }}
      />

      {/* Background Glowing Ambient Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#DEC430] rounded-full blur-[140px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-500 rounded-full blur-[140px] opacity-10 pointer-events-none" />

      {/* Network Disconnection Toast Banner */}
      {!isOnline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-400/30 animate-bounce">
          <WifiOff className="w-5 h-5 text-white flex-shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider">Network Disconnected</p>
            <p className="text-xs text-white/90">Your progress is cached locally and will sync once reconnected.</p>
          </div>
        </div>
      )}

      {showReconnectedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/30 animate-in fade-in slide-in-from-top-2">
          <Wifi className="w-5 h-5 text-white flex-shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider">Network Restored</p>
            <p className="text-xs text-white/90">Your connection is back online and progress is synced.</p>
          </div>
        </div>
      )}

      {/* Fullscreen Violation Overlay */}
      {!isFullscreen && !backendTerminated && permissionState === 'GRANTED' && (
        <div className="fixed inset-0 z-[110] bg-red-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-white p-8 rounded-3xl max-w-lg w-full shadow-2xl border-4 border-red-500 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Maximize className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-red-600 mb-4 tracking-tight">Full Screen Required</h2>
            <p className="text-secondary-600 font-medium mb-6 leading-relaxed">
              You have exited full-screen mode, which is a proctoring violation. Please return to full-screen mode immediately to continue your assessment.
            </p>
            <p className="text-sm font-bold text-red-500 mb-8 px-4 py-3 bg-red-50 rounded-xl border border-red-200">
              Multiple violations will result in automatic submission of your exam!
            </p>
            <button
              onClick={() => {
                const elem = document.documentElement;
                if (elem.requestFullscreen) elem.requestFullscreen();
                else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
                else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
              }}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white text-lg font-black rounded-xl transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Maximize className="w-5 h-5" />
              Return to Full Screen
            </button>
          </div>
        </div>
      )}

      {/* Auto-Submit / Violation Termination Modal (Strict) */}
      {backendTerminated && (
        <div className="fixed inset-0 z-[100] bg-secondary-950/85 backdrop-blur-md flex items-center justify-center p-4 select-text">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl border border-secondary-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-secondary-900 tracking-tight">
                Your Test Was Submitted Automatically
              </h2>
              <div className="bg-secondary-50 p-4 rounded-2xl border border-secondary-200 text-left space-y-1">
                <span className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider block">
                  Submission Reason
                </span>
                <p className="text-sm font-semibold text-secondary-800 leading-relaxed">
                  Reason: {terminationReason || 'Your exam was automatically submitted by the system.'}
                </p>
              </div>
            </div>

            <p className="text-xs text-secondary-500 leading-relaxed">
              All proctoring streams, questions, and timers have been terminated. You can now view your calculated evaluation report.
            </p>

            <button
              type="button"
              onClick={() => navigate(`/candidate/result/${enrollmentId}`)}
              className="w-full py-3.5 px-6 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <span>View Assessment Results</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Screenshot Warning Toast */}
      {screenshotWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
          <span className="text-xs font-bold">Screenshot attempts are monitored and logged to proctor audit.</span>
        </div>
      )}

      {/* Fullscreen Alert Banner */}
      {!isFullscreen && !backendTerminated && (
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
              {examData?.examTitle || 'Proctored Assessment'}
            </span>
          </div>
        </div>

        {/* Dynamic Timers & Action Header */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Per-Question Timer */}
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
            disabled={isSubmitting || backendTerminated}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
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
                  Question {currentIndex + 1} of {questionsList.length}
                </span>
                <span
                  className={`text-xs font-bold uppercase px-2.5 py-1 rounded-lg ${
                    currentQuestion.type === 'CODING'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-secondary-100 text-secondary-700'
                  }`}
                >
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

              {currentQuestion.description && currentQuestion.type === 'CODING' && (
                <div className="mt-3 text-secondary-700 text-sm leading-relaxed whitespace-pre-line bg-secondary-50/70 p-4 rounded-2xl border border-secondary-200">
                  {currentQuestion.description}
                </div>
              )}

              {currentQuestion.constraints && currentQuestion.type === 'CODING' && (
                <div className="mt-3 p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-900">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 block mb-1">Constraints:</span>
                  <pre className="font-mono whitespace-pre-wrap">{currentQuestion.constraints}</pre>
                </div>
              )}

              {currentQuestion.sampleInput && currentQuestion.type === 'CODING' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                  <div className="p-3 bg-secondary-50 rounded-xl border border-secondary-200">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-secondary-500 block mb-1">Sample Input:</span>
                    <pre className="font-mono bg-white p-2 rounded-lg border border-secondary-200 whitespace-pre-wrap">{currentQuestion.sampleInput}</pre>
                  </div>
                  <div className="p-3 bg-secondary-50 rounded-xl border border-secondary-200">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-secondary-500 block mb-1">Sample Output:</span>
                    <pre className="font-mono bg-white p-2 rounded-lg border border-secondary-200 whitespace-pre-wrap">{currentQuestion.sampleOutput}</pre>
                  </div>
                </div>
              )}

              {currentQuestion.imageUrl && (
                <div className="mt-4 rounded-2xl overflow-hidden border border-secondary-200 max-h-72">
                  <img src={getMediaUrl(currentQuestion.imageUrl)} alt="Question diagram" className="w-full object-contain max-h-72" />
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
                  {/* Language Selector Toolbar & Reset Button */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary-900 text-white p-3 rounded-2xl">
                    <div className="flex items-center gap-3">
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
                          {(currentQuestion.allowedLanguages || ['PYTHON', 'JAVA', 'CPP', 'C', 'JAVASCRIPT']).map((lang) => (
                            <option key={lang} value={lang}>
                              {lang === 'PYTHON'
                                ? 'Python 3'
                                : lang === 'JAVA'
                                ? 'Java (OpenJDK)'
                                : lang === 'CPP'
                                ? 'C++ (GCC)'
                                : lang === 'C'
                                ? 'C (GCC)'
                                : 'JavaScript (Node.js)'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Coding Editor "Reset to Template" Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Reset code for this question back to the initial starter template? Your current edits will be replaced.')) {
                            const template = STARTER_CODE[codeLanguage] || '';
                            handleTextAnswerChange(currentQuestion.id, template);
                          }
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-secondary-300 hover:text-white bg-secondary-800 hover:bg-secondary-700 rounded-lg transition-colors border border-secondary-700"
                        title="Reset code to starter template"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-brand-400" />
                        <span>Reset to Template</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRunCandidateCode(currentQuestion.rawCodingId || currentQuestion.id, currentQuestion.id)}
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
                        onClick={() => handleSubmitCandidateCode(currentQuestion.rawCodingId || currentQuestion.id, currentQuestion.id)}
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

                  {/* Code Editor Area */}
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
                          <span>Execution Console Output</span>
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
                            <p className="text-brand-300 font-bold">Marks Awarded: {codeSubmitResult.marksAwarded} pts</p>
                          )}
                          {codeSubmitResult.compileOutput && (
                            <pre className="p-2 bg-secondary-950 rounded-lg text-amber-300 whitespace-pre-wrap text-[11px]">
                              {codeSubmitResult.compileOutput}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Navigation & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-secondary-100 pt-6">
              <button
                type="button"
                onClick={() => handleClearAnswer(currentQuestion.id)}
                disabled={!currentAnswer || currentQuestion.type === 'CODING'}
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

                {currentIndex < questionsList.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(questionsList.length - 1, prev + 1))}
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
              <div className="flex items-center gap-2">
                {/* Audio Activity Sensor Indicator */}
                <span
                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    micActive
                      ? audioLevel > 40
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-secondary-100 text-secondary-600 border-secondary-200'
                  }`}
                  title={micActive ? `Microphone Active (Activity Level: ${audioLevel})` : 'Microphone Standby'}
                >
                  {micActive ? <Volume2 className="w-3 h-3 text-emerald-600" /> : <MicOff className="w-3 h-3 text-secondary-400" />}
                  <span>{micActive ? (audioLevel > 40 ? 'Voice Detected' : 'Mic Active') : 'Mic Off'}</span>
                </span>

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
            </div>

            {/* Camera Video Stream Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-secondary-900 aspect-video flex items-center justify-center border border-secondary-700">
              <video
                ref={previewVideoRef}
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

            {/* Tab Switch & Violation Summary */}
            <div className="p-3 bg-secondary-50 border border-secondary-200 rounded-xl flex items-center justify-between text-xs font-semibold">
              <span className="text-secondary-600">Tab Switch Violations:</span>
              <span
                className={`px-2 py-0.5 rounded-md font-bold ${
                  tabSwitchCount === 0
                    ? 'bg-green-100 text-green-800'
                    : tabSwitchCount >= maxAllowedTabSwitches
                    ? 'bg-red-100 text-red-800 font-black'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {tabSwitchCount} / {maxAllowedTabSwitches} Allowed
              </span>
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
                {answeredCount}/{questionsList.length} Answered
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
              {questionsList.map((q, idx) => {
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
                    {q.type === 'CODING' && (
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono text-purple-600 font-black">{'</>'}</span>
                    )}
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
              <p>• <strong>Full-Screen Enforced:</strong> Maintain full-screen mode throughout testing. Exits are monitored.</p>
              <p>• <strong>Strict Tab Switch Limit:</strong> You are allowed a maximum of <strong>{maxAllowedTabSwitches}</strong> tab switches before the test is automatically submitted.</p>
              <p>• <strong>Audio &amp; Mic Monitoring:</strong> Ambient noise and speech activity are detected in real-time.</p>
              <p>• <strong>Timer &amp; Auto-Submit:</strong> When the countdown reaches zero, all answers auto-submit immediately.</p>
              <p>• <strong>Coding Questions:</strong> Use &quot;Run Code&quot; to test with sample inputs before clicking &quot;Submit Solution&quot;.</p>
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

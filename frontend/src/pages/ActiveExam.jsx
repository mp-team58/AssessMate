import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Global cache to prevent re-downloading models on every render
let globalBlazefaceModel = null;
let globalCocoSsdModel = null;
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import ExamScreen from '../components/ExamScreen';
import { checkDeviceAccess, getDetectedClientType } from '../utils/deviceDetection';
import {
  getExamQuestions,
  getAssignedCodingProblems,
  logProctorEvent,
  uploadProctorEvidence,
  submitExamAnswers,
  runCandidateCode,
  submitCandidateCode,
  saveExamProgress,
  getExamState,
  expireExamQuestion,
  advanceExamQuestion
} from '../services/candidateService';

const STARTER_CODE = {
  PYTHON: '# Write your Python 3 solution here\ndef solution():\n    pass\n\nif __name__ == "__main__":\n    solution()\n',
  JAVA: 'import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}\n',
  CPP: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ code here\n    return 0;\n}\n',
  C: '#include <stdio.h>\n\nint main() {\n    // Write your C code here\n    return 0;\n}\n',
  JAVASCRIPT: '// Write your JavaScript solution here\nconst fs = require("fs");\n\nfunction main() {\n    // Read input and compute solution\n}\n\nmain();\n'
};

const EVIDENCE_MAX_WIDTH = 640;
const EVIDENCE_JPEG_QUALITY = 0.7;

const ActiveExam = () => {
  const { enrollmentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // Load Exam Configuration
  const [examConfig, setExamConfig] = useState(() => {
    try {
      const stored = sessionStorage.getItem(`exam_config_${enrollmentId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });

  const examConfigRef = useRef(examConfig);
  examConfigRef.current = examConfig;

  // Defensive Device Restriction State
  const [deviceRestriction, setDeviceRestriction] = useState(() => {
    try {
      const stored = sessionStorage.getItem(`exam_config_${enrollmentId}`);
      if (stored) {
        const cfg = JSON.parse(stored);
        if (cfg.deviceAccess) {
          const check = checkDeviceAccess(cfg.deviceAccess);
          if (!check.allowed) return check;
        }
      }
    } catch (_) { }
    return null;
  });

  // Flow Stages:
  // 1. Permission Gate (permissionState: 'CHECKING' | 'GRANTED' | 'DENIED')
  // 2. Model Loading (modelsLoading: boolean)
  // 3. Exam Active
  const [permissionState, setPermissionState] = useState('CHECKING');
  const [modelsLoading, setModelsLoading] = useState(() => {
    try {
      const stored = sessionStorage.getItem(`exam_config_${enrollmentId}`);
      if (stored) {
        const cfg = JSON.parse(stored);
        return Boolean(cfg.enableFaceDetection || cfg.enableObjectDetection);
      }
    } catch (_) { }
    return false;
  });
  const [modelLoadStep, setModelLoadStep] = useState('Initializing AI Proctor engine...');
  const [modelLoadError, setModelLoadError] = useState(null);
  const [modelRetryCount, setModelRetryCount] = useState(0);
  const isLoadingModelsRef = useRef(false);

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
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
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
  const [questionTimings, setQuestionTimings] = useState({});
  const clockOffsetRef = useRef(0);
  const isExpiringRef = useRef(false);

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
  const lastEvidenceTimeRef = useRef({});
  const lastAudioLevelUpdateRef = useRef(0);
  const autosaveTimeoutRef = useRef(null);

  // TensorFlow Model Refs
  const blazefaceModelRef = useRef(null);
  const cocoSsdModelRef = useRef(null);

  const tabHiddenTimeRef = useRef(null);
  const hasSubmittedRef = useRef(false);
  const proctoringWarmedUpRef = useRef(false);
  const hasSeenFaceOnceRef = useRef(false);

  // Max Tab Switches Allowed (null if unlimited / record-only)
  const maxAllowedTabSwitches = examConfig?.maxTabSwitches ?? null;

  // Current Question & Derived State
  const currentQuestion = questionsList[currentIndex] || {};
  const currentAnswer = answers[currentQuestion.id] || '';
  const isCurrentFlagged = flaggedQuestions.has(currentQuestion.id);
  const isCurrentQuestionExpired = Boolean(
    currentQuestion?.id &&
    !currentQuestion.isCoding &&
    examData?.timerType === 'PER_QUESTION' &&
    (questionTimings[currentQuestion.id]?.isExpired || currentQuestion.isExpired)
  );

  // Universal Teardown: ONLY called upon final submission / termination
  const performFinalTeardown = useCallback(() => {
    // 1. Clear Timers, Polling & Autosave
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
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    // 2. Stop Media & Screen Streams
    if (mediaStreamRef.current) {
      try {
        const tracks = mediaStreamRef.current.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (_) { }
      mediaStreamRef.current = null;
    }

    if (hiddenVideoRef.current && hiddenVideoRef.current.srcObject) {
      try {
        const tracks = hiddenVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        hiddenVideoRef.current.srcObject = null;
      } catch (_) { }
    }

    if (previewVideoRef.current && previewVideoRef.current.srcObject) {
      try {
        const tracks = previewVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        previewVideoRef.current.srcObject = null;
      } catch (_) { }
    }

    // 3. Close AudioContext
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (_) { }
      audioContextRef.current = null;
    }

    // 4. Exit Fullscreen on Final Submit
    if (document.fullscreenElement) {
      try {
        document.exitFullscreen().catch(() => { });
      } catch (_) { }
    }

    // 5. Clean localStorage timer & offline answers
    localStorage.removeItem(`exam_start_${enrollmentId}`);
    try {
      localStorage.removeItem(`offline_answers_${enrollmentId}`);
    } catch (_) { }
  }, [enrollmentId]);

  // Teardown media & timers if component unmounts prior to exam submission
  useEffect(() => {
    return () => {
      if (!hasSubmittedRef.current) {
        performFinalTeardown();
      }
    };
  }, [performFinalTeardown]);

  const handleAutoTerminationRef = useRef(null);
  const handleSubmitExamRef = useRef(null);

  // Debounced Autosave Pipeline
  const triggerDebouncedAutosave = useCallback(
    (updatedAnswers) => {
      // Local backup in case of immediate network crash
      try {
        localStorage.setItem(`offline_answers_${enrollmentId}`, JSON.stringify(updatedAnswers));
      } catch (_) { }

      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      autosaveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveExamProgress(enrollmentId, updatedAnswers);
        } catch (err) {
          console.warn('[Debounced Autosave Warning]:', err);
        }
      }, 800);
    },
    [enrollmentId]
  );

  // Handle Immediate Exam Termination (Backend or Violation)
  const handleAutoTermination = useCallback(
    async (reason) => {
      if (hasSubmittedRef.current) return;
      hasSubmittedRef.current = true;
      setIsSubmitting(true);
      setIsLoading(false);

      performFinalTeardown();

      const finalReason = reason || 'Exam was automatically submitted by the system.';
      setTerminationReason(finalReason);
      setBackendTerminated(true);
      setPermissionState('GRANTED');
      setModelsLoading(false);

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
      } catch (_) { }
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
  }, [enrollmentId, isSubmitting, navigate, performFinalTeardown, handleAutoTermination, showToast]);

  handleAutoTerminationRef.current = handleAutoTermination;
  handleSubmitExamRef.current = handleSubmitExam;

  // Server-Authoritative Question Expiration & Auto-Advance
  const handleQuestionExpire = useCallback(
    async (qId) => {
      if (isExpiringRef.current) return;
      isExpiringRef.current = true;
      try {
        if (answersRef.current) {
          await saveExamProgress(enrollmentId, answersRef.current).catch(() => { });
        }

        const res = await expireExamQuestion(enrollmentId, qId);
        const data = res?.data;

        setQuestionTimings((prev) => ({
          ...prev,
          [qId]: {
            ...(prev[qId] || {}),
            isExpired: true,
            remainingSeconds: 0,
          },
        }));

        setQuestionsList((prev) =>
          prev.map((q) => (q.id === qId ? { ...q, isExpired: true } : q))
        );

        if (data?.isExamCompleted || !data?.nextQuestionId) {
          const hasCoding = questionsList.some((q) => q.isCoding);
          const currentIsCoding = questionsList[currentIndex]?.isCoding;
          if (hasCoding && !currentIsCoding) {
            const firstCodingIdx = questionsList.findIndex((q) => q.isCoding);
            if (firstCodingIdx !== -1) {
              setCurrentIndex(firstCodingIdx);
              isExpiringRef.current = false;
              return;
            }
          }
          handleSubmitExamRef.current?.();
        } else if (data?.nextQuestionId) {
          const nextQId = data.nextQuestionId;
          setQuestionTimings((prev) => ({
            ...prev,
            [nextQId]: {
              deadline: data.nextQuestionDeadline,
              remainingSeconds: data.nextQuestionRemainingSeconds,
              isExpired: false,
            },
          }));

          const nextIdx = questionsList.findIndex((q) => q.id === nextQId);
          if (nextIdx !== -1) {
            setCurrentIndex(nextIdx);
          }
        }
      } catch (err) {
        console.error('Failed to expire question on server:', err);
      } finally {
        isExpiringRef.current = false;
      }
    },
    [enrollmentId, questionsList, currentIndex]
  );

  const handleAdvanceQuestion = useCallback(
    async () => {
      const currentQ = questionsList[currentIndex];
      if (!currentQ) return;

      if (currentQ.isCoding || examData?.timerType !== 'PER_QUESTION') {
        setCurrentIndex((prev) => Math.min(questionsList.length - 1, prev + 1));
        return;
      }

      if (questionTimings[currentQ.id]?.isExpired || currentQ.isExpired) {
        setCurrentIndex((prev) => Math.min(questionsList.length - 1, prev + 1));
        return;
      }

      try {
        if (answersRef.current) {
          await saveExamProgress(enrollmentId, answersRef.current).catch(() => { });
        }

        const res = await advanceExamQuestion(enrollmentId, currentQ.id);
        const data = res?.data;

        setQuestionTimings((prev) => ({
          ...prev,
          [currentQ.id]: {
            ...(prev[currentQ.id] || {}),
            isExpired: true,
            remainingSeconds: 0,
          },
        }));

        setQuestionsList((prev) =>
          prev.map((q) => (q.id === currentQ.id ? { ...q, isExpired: true } : q))
        );

        if (data?.isExamCompleted || !data?.nextQuestionId) {
          const hasCoding = questionsList.some((q) => q.isCoding);
          if (hasCoding) {
            const firstCodingIdx = questionsList.findIndex((q) => q.isCoding);
            if (firstCodingIdx !== -1) {
              setCurrentIndex(firstCodingIdx);
              return;
            }
          }
          setShowSubmitModal(true);
        } else if (data?.nextQuestionId) {
          const nextQId = data.nextQuestionId;
          setQuestionTimings((prev) => ({
            ...prev,
            [nextQId]: {
              deadline: data.nextQuestionDeadline,
              remainingSeconds: data.nextQuestionRemainingSeconds,
              isExpired: false,
            },
          }));

          const nextIdx = questionsList.findIndex((q) => q.id === nextQId);
          if (nextIdx !== -1) {
            setCurrentIndex(nextIdx);
          }
        }
      } catch (err) {
        console.error('Failed to advance question on server:', err);
        setCurrentIndex((prev) => Math.min(questionsList.length - 1, prev + 1));
      }
    },
    [currentIndex, questionsList, examData?.timerType, questionTimings, enrollmentId]
  );

  // Centralized Send Proctor Log with Evidence & Auto-Submit Reaction
  const sendProctorLog = useCallback(
    async (eventType, details = '', imageUrl = null, audioUrl = null) => {
      if (hasSubmittedRef.current) return;

      // Anti-spam cooldown check ONLY for non-media events (e.g. window blur, keystrokes).
      // If imageUrl or audioUrl is provided, it was explicitly captured for this violation and MUST be sent!
      if (!imageUrl && !audioUrl) {
        const now = Date.now();
        const lastTime = lastCooldownRef.current[eventType] || 0;
        const cooldownMs = [
          'WINDOW_BLUR',
          'WINDOW_FOCUS',
          'SCREENSHOT_ATTEMPT',
          'COPY_ATTEMPT',
          'PASTE_ATTEMPT',
          'CUT_ATTEMPT',
          'RIGHT_CLICK_ATTEMPT',
          'SHORTCUT_ATTEMPT',
        ].includes(eventType)
          ? 3000
          : 8000;
        if (now - lastTime < cooldownMs && !['TAB_SWITCH', 'FULL_SCREEN_EXIT', 'NO_CAMERA', 'NO_MIC'].includes(eventType)) {
          return;
        }
        lastCooldownRef.current[eventType] = now;
      }

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

  // Helper to Capture Current Frame from active video and upload as evidence
  const captureAndUploadEvidence = useCallback(async () => {
    const video = (previewVideoRef.current && previewVideoRef.current.readyState >= 2 && previewVideoRef.current.videoWidth > 0)
      ? previewVideoRef.current
      : hiddenVideoRef.current;
    if (!video || video.readyState < 2) return null;
    try {
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 480;
      const scale = Math.min(1, EVIDENCE_MAX_WIDTH / vWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vWidth * scale);
      canvas.height = Math.round(vHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', EVIDENCE_JPEG_QUALITY));
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

  // STEP A: Pre-Exam Permission Gate & Media Setup
  const requestMediaPermissions = useCallback(async (customConfig) => {
    if (deviceRestriction && !deviceRestriction.allowed) {
      return;
    }

    const cfg = customConfig || examConfigRef.current;
    const needsCamera = cfg ? Boolean(cfg.requireCamera || cfg.enableFaceDetection || cfg.enableObjectDetection) : true;
    const needsMic = cfg ? Boolean(cfg.requireMic || cfg.enableAudioDetection) : true;

    // If host disabled both camera and mic, skip media acquisition completely
    if (!needsCamera && !needsMic) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      setWebcamActive(false);
      setMicActive(false);
      setPermissionState('GRANTED');
      setModelsLoading(false);
      return;
    }

    // Reuse existing stream if it already contains active tracks for the required media
    const currentStream = mediaStreamRef.current;
    if (currentStream && currentStream.active) {
      const hasLiveVideo = currentStream.getVideoTracks().some((t) => t.readyState === 'live');
      const hasLiveAudio = currentStream.getAudioTracks().some((t) => t.readyState === 'live');
      if ((!needsCamera || hasLiveVideo) && (!needsMic || hasLiveAudio)) {
        setWebcamActive(needsCamera && hasLiveVideo);
        setMicActive(needsMic && hasLiveAudio);
        setPermissionState('GRANTED');
        return;
      }
    }

    setPermissionState('CHECKING');
    try {
      if (needsCamera || needsMic) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: needsCamera ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
          audio: needsMic
        });

        mediaStreamRef.current = stream;

        if (hiddenVideoRef.current && needsCamera) {
          hiddenVideoRef.current.srcObject = stream;
        }
        if (previewVideoRef.current && needsCamera) {
          previewVideoRef.current.srcObject = stream;
        }

        setWebcamActive(needsCamera);
        setMicActive(needsMic);

        // Hardware loss mid-exam listeners
        stream.getVideoTracks().forEach((track) => {
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

        stream.getAudioTracks().forEach((track) => {
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
      }

      setPermissionState('GRANTED');
    } catch (err) {
      console.warn('[Permission Gate Denied]:', err);
      setPermissionState('DENIED');
      setWebcamActive(false);
      setMicActive(false);
    }
  }, [deviceRestriction, sendProctorLog]);

  const handleModelErrorBack = useCallback(() => {
    performFinalTeardown();
    navigate('/candidate/dashboard');
  }, [performFinalTeardown, navigate]);

  const retryLoadModels = useCallback(() => {
    setModelLoadError(null);
    setModelsLoading(true);
    setModelLoadStep('Retrying AI Proctor engine initialization...');
    if (!mediaStreamRef.current || mediaStreamRef.current.getTracks().every((t) => t.readyState === 'ended')) {
      requestMediaPermissions();
    }
    setModelRetryCount((c) => c + 1);
  }, [requestMediaPermissions]);

  // Initial Permission Request on Mount
  useEffect(() => {
    if (deviceRestriction && !deviceRestriction.allowed) return;
    if (permissionState === 'GRANTED') return;
    requestMediaPermissions();
  }, [requestMediaPermissions, deviceRestriction, permissionState]);

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

  // STEP B: Dynamic Load of TensorFlow AI Models (BlazeFace + COCO-SSD)
  useEffect(() => {
    if (permissionState !== 'GRANTED') return;

    // Check if either face detection or object detection is actually enabled by host
    const needsFace = Boolean(examConfig?.enableFaceDetection);
    const needsObj = Boolean(examConfig?.enableObjectDetection);

    if (!needsFace && !needsObj) {
      setFaceStatus('STANDBY');
      setModelLoadError(null);
      setModelsLoading(false);
      return;
    }

    // If models are already loaded, verify immediately without re-initializing WebGL
    const faceReady = !needsFace || Boolean(blazefaceModelRef.current || globalBlazefaceModel);
    const objReady = !needsObj || Boolean(cocoSsdModelRef.current || globalCocoSsdModel);
    if (faceReady && objReady) {
      if (globalBlazefaceModel && !blazefaceModelRef.current) {
        blazefaceModelRef.current = globalBlazefaceModel;
      }
      if (globalCocoSsdModel && !cocoSsdModelRef.current) {
        cocoSsdModelRef.current = globalCocoSsdModel;
      }
      setFaceStatus('VERIFIED');
      setModelLoadError(null);
      setModelsLoading(false);
      return;
    }

    let isMounted = true;

    const loadModels = async () => {
      if (isLoadingModelsRef.current) return;
      isLoadingModelsRef.current = true;
      setModelsLoading(true);
      setModelLoadError(null);

      let currentComponent = needsFace ? 'face detection' : 'object detection';
      try {
        setModelLoadStep('Configuring WebGL acceleration...');
        try {
          await tf.setBackend('webgl');
        } catch (_) {
          await tf.setBackend('cpu');
        }
        await tf.ready();

        if (!isMounted) return;

        const loadTasks = [];

        if (needsFace && !globalBlazefaceModel) {
          setModelLoadStep('Loading Face Proctoring Engine...');
          loadTasks.push(
            (async () => {
              try {
                const model = await blazeface.load();
                globalBlazefaceModel = model;
                if (isMounted) blazefaceModelRef.current = model;
              } catch (err) {
                currentComponent = 'face detection';
                throw err;
              }
            })()
          );
        } else if (globalBlazefaceModel) {
          blazefaceModelRef.current = globalBlazefaceModel;
        }

        if (needsObj && !globalCocoSsdModel) {
          if (!needsFace) setModelLoadStep('Loading Object Proctoring Engine...');
          loadTasks.push(
            (async () => {
              try {
                // lite_mobilenet_v2 is ~2.5MB vs mobilenet_v2 which is ~21MB!
                const model = await cocoSsd.load({ base: 'mobilenet_v2' });
                globalCocoSsdModel = model;
                if (isMounted) cocoSsdModelRef.current = model;
              } catch (err) {
                currentComponent = 'object detection';
                throw err;
              }
            })()
          );
        } else if (globalCocoSsdModel) {
          cocoSsdModelRef.current = globalCocoSsdModel;
        }

        if (loadTasks.length > 0) {
          await Promise.all(loadTasks);
        }

        if (!isMounted) return;
        setFaceStatus('VERIFIED');
        setModelLoadError(null);
        setModelsLoading(false);
      } catch (err) {
        console.warn('[TensorFlow Dynamic Load Error]:', err);
        if (isMounted) {
          if (currentComponent === 'face detection') {
            blazefaceModelRef.current = null;
            globalBlazefaceModel = null;
          } else if (currentComponent === 'object detection') {
            cocoSsdModelRef.current = null;
            globalCocoSsdModel = null;
          }

          const errorMsg = currentComponent === 'face detection'
            ? 'Required face detection could not be initialized. Please retry or contact your exam administrator.'
            : 'Required object detection could not be initialized. Please retry or contact your exam administrator.';
          setModelLoadError(errorMsg);
          setModelsLoading(false);

          // Stop media streams if the candidate cannot enter the exam
          if (mediaStreamRef.current) {
            try {
              mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            } catch (_) { }
            mediaStreamRef.current = null;
          }
          setWebcamActive(false);
          setMicActive(false);
        }
      } finally {
        isLoadingModelsRef.current = false;
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, [permissionState, examConfig?.enableFaceDetection, examConfig?.enableObjectDetection, modelRetryCount]);

  // 1. Fetch Exam, MCQ Questions, and Coding Problems (Runs ONCE per enrollmentId)
  useEffect(() => {
    if (!enrollmentId) return;
    let isMounted = true;

    const fetchExamAndQuestions = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (deviceRestriction && !deviceRestriction.allowed) {
          setIsLoading(false);
          return;
        }

        // Fetch Primary Exam MCQ Questions
        const res = await getExamQuestions(enrollmentId);
        if (!isMounted) return;

        const data = res.data;
        setExamData(data);

        // Update Exam Config from server response & sync sessionStorage
        const updatedConfig = {
          ...(examConfigRef.current || {}),
          deviceAccess: data.deviceAccess,
          requireCamera: data.requireCamera,
          requireMic: data.requireMic,
          enableFaceDetection: data.enableFaceDetection,
          enableObjectDetection: data.enableObjectDetection,
          enableTabSwitchDetection: data.enableTabSwitchDetection,
          enableAudioDetection: data.enableAudioDetection,
          maxTabSwitches: data.maxTabSwitches,
          enableScreenCaptureProtection: data.enableScreenCaptureProtection,
          enableBrowserActivityDetection: data.enableBrowserActivityDetection,
          enableExamWatermark: data.enableExamWatermark,
          disableCopy: data.disableCopy,
          disablePaste: data.disablePaste,
          disableCut: data.disableCut,
          disableRightClick: data.disableRightClick,
          restrictBrowserShortcuts: data.restrictBrowserShortcuts,
        };
        examConfigRef.current = updatedConfig;
        setExamConfig(updatedConfig);
        try {
          sessionStorage.setItem(`exam_config_${enrollmentId}`, JSON.stringify(updatedConfig));
        } catch (_) { }

        // If host disabled media completely, release streams immediately
        const needsCamera = Boolean(data.requireCamera || data.enableFaceDetection || data.enableObjectDetection);
        const needsMic = Boolean(data.requireMic || data.enableAudioDetection);
        if (!needsCamera && !needsMic) {
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
          }
          setWebcamActive(false);
          setMicActive(false);
          setPermissionState('GRANTED');
          setModelsLoading(false);
        }

        // Restore verified violation count from server
        if (data.currentTabSwitches != null) {
          tabSwitchCountRef.current = data.currentTabSwitches;
          setTabSwitchCount(data.currentTabSwitches);
        }

        // Defensive Device Access Policy Check
        if (data?.deviceAccess) {
          const check = checkDeviceAccess(data.deviceAccess);
          if (!check.allowed) {
            setDeviceRestriction(check);
            setIsLoading(false);
            if (mediaStreamRef.current) {
              mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            }
            return;
          }
        }

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
                  try { langs = JSON.parse(langs); } catch (e) { langs = langs.split(',').map(s => s.trim()); }
                }
                let tcs = cp.testCases;
                if (typeof tcs === 'string') {
                  try { tcs = JSON.parse(tcs); } catch (e) { tcs = []; }
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

              const firstWithLang = codingProblems.find((cp) => cp.savedLanguage);
              if (firstWithLang?.savedLanguage) {
                setCodeLanguage(firstWithLang.savedLanguage);
              }
            }
          } catch (_) { }
        }

        const allQuestions = [...mcqQuestions, ...codingProblems];
        if (!isMounted) return;

        if (data.serverTime) {
          clockOffsetRef.current = new Date(data.serverTime).getTime() - Date.now();
        }

        const initialTimings = {};
        mcqQuestions.forEach((q) => {
          initialTimings[q.id] = {
            deadline: q.deadline,
            remainingSeconds: q.remainingSeconds,
            isExpired: Boolean(q.isExpired),
          };
        });
        setQuestionTimings(initialTimings);

        // Offline uncommitted answers recovery & merge with server saved answers
        let offlineAnswers = {};
        try {
          const offlineRaw = localStorage.getItem(`offline_answers_${enrollmentId}`);
          if (offlineRaw) {
            offlineAnswers = JSON.parse(offlineRaw);
          }
        } catch (_) { }

        const mergedAnswers = { ...initialAnswers, ...offlineAnswers };
        setQuestionsList(allQuestions);
        setAnswers(mergedAnswers);

        if (data.timerType === 'PER_QUESTION' && data.activeQuestionId) {
          const activeIdx = allQuestions.findIndex((q) => q.id === data.activeQuestionId);
          if (activeIdx !== -1) {
            setCurrentIndex(activeIdx);
          }
        }

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
        if (msg.toLowerCase().includes('restricted to desktop')) {
          setDeviceRestriction({
            allowed: false,
            required: 'DESKTOP',
            detected: getDetectedClientType(),
            message: 'This exam is restricted to Desktop devices only. Mobile phones and tablets are not permitted.'
          });
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          }
        } else if (msg.toLowerCase().includes('restricted to mobile')) {
          setDeviceRestriction({
            allowed: false,
            required: 'MOBILE',
            detected: getDetectedClientType(),
            message: 'This exam is restricted to Mobile devices only. Desktop and laptop computers are not permitted.'
          });
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          }
        } else if (
          msg.toLowerCase().includes('already submitted') ||
          msg.toLowerCase().includes('expired') ||
          msg.toLowerCase().includes('no longer open')
        ) {
          handleAutoTerminationRef.current?.(msg);
        } else {
          setError(msg);
        }
      } finally {
        setIsLoading(false);
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
  }, [timeLeftSeconds, isSubmitting, backendTerminated, permissionState, modelsLoading]);

  // 3. Server-Synchronized Per-Question Countdown Hook (PER_QUESTION mode)
  useEffect(() => {
    if (examData?.timerType !== 'PER_QUESTION') {
      setQuestionTimeLeft(null);
      return;
    }

    if (!questionsList || !questionsList[currentIndex] || backendTerminated || isSubmitting || permissionState !== 'GRANTED' || modelsLoading) {
      return;
    }

    const currentQ = questionsList[currentIndex];
    if (currentQ.isCoding) {
      setQuestionTimeLeft(null);
      return;
    }

    const timing = questionTimings[currentQ.id];
    const isExpired = Boolean(timing?.isExpired || currentQ.isExpired);

    if (isExpired) {
      setQuestionTimeLeft(0);
      return;
    }

    const deadline = timing?.deadline || currentQ.deadline;
    if (!deadline) {
      setQuestionTimeLeft(currentQ.timeSeconds || null);
      return;
    }

    const computeRemaining = () => {
      const now = Date.now() + clockOffsetRef.current;
      const targetTime = new Date(deadline).getTime();
      return Math.max(0, Math.floor((targetTime - now) / 1000));
    };

    const initialRemaining = computeRemaining();
    setQuestionTimeLeft(initialRemaining);

    if (initialRemaining <= 0) {
      handleQuestionExpire(currentQ.id);
      return;
    }

    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    questionTimerRef.current = setInterval(() => {
      const remaining = computeRemaining();
      setQuestionTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(questionTimerRef.current);
        handleQuestionExpire(currentQ.id);
      }
    }, 1000);

    return () => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
    };
  }, [
    examData?.timerType,
    currentIndex,
    currentQuestion?.id,
    questionTimings,
    backendTerminated,
    isSubmitting,
    permissionState,
    modelsLoading,
    handleQuestionExpire,
    questionsList
  ]);

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
    }, 25000);

    return () => {
      if (statePollRef.current) {
        clearInterval(statePollRef.current);
        statePollRef.current = null;
      }
    };
  }, [enrollmentId, isSubmitting, backendTerminated, permissionState, modelsLoading]);

  // 5. STEP C: Live Proctoring (Face, Object Detection & Audio Pipeline)
  useEffect(() => {
    if (permissionState !== 'GRANTED' || modelsLoading || modelLoadError || backendTerminated) return;

    setIsFullscreen(!!document.fullscreenElement);

    // Clear any existing intervals before establishing new pipelines
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }

    // 5.1 Web Audio API RMS Volume Monitor
    if (mediaStreamRef.current && examConfig?.requireMic !== false && examConfig?.enableAudioDetection !== false) {
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
              if (audioCtx.state === 'suspended') {
                try { await audioCtx.resume(); } catch (e) { }
              }
              audioAnalyserRef.current.getByteTimeDomainData(timeDomainData);

              let sumSquares = 0;
              for (let i = 0; i < bufferLength; i++) {
                const norm = (timeDomainData[i] - 128) / 128;
                sumSquares += norm * norm;
              }
              const rms = Math.sqrt(sumSquares / bufferLength);
              const computedLevel = Math.min(100, Math.round(rms * 250));

              // Throttle React state updates to prevent excessive re-renders
              const now = Date.now();
              if ((computedLevel > 40) !== (audioLevel > 40) || now - lastAudioLevelUpdateRef.current >= 2000) {
                lastAudioLevelUpdateRef.current = now;
                setAudioLevel(computedLevel);
              }

              // Sensitive RMS Threshold for Noise / Voice Activity (> 0.03)
              if (rms > 0.03 && !isRecordingAudioRef.current) {
                const now = Date.now();
                const lastAudio = lastEvidenceTimeRef.current['AUDIO_DETECTED'] || 0;
                if (now - lastAudio >= 10000) {
                  isRecordingAudioRef.current = true;
                  lastEvidenceTimeRef.current['AUDIO_DETECTED'] = now;

                  try {
                    let options = { mimeType: 'audio/webm' };
                    if (!MediaRecorder.isTypeSupported('audio/webm')) {
                      options = {};
                    }
                    const audioStream = new MediaStream(audioTracks);
                    const recorder = new MediaRecorder(audioStream, options);
                    const audioChunks = [];

                    recorder.ondataavailable = (e) => {
                      if (e.data && e.data.size > 0) {
                        audioChunks.push(e.data);
                      }
                    };

                    recorder.onstop = async () => {
                      isRecordingAudioRef.current = false;
                      const audioBlob = new Blob(audioChunks, { type: recorder.mimeType || 'audio/webm' });
                      try {
                        const uploadRes = await uploadProctorEvidence(audioBlob, 'audio').catch(() => null);
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
                        sendProctorLog('AUDIO_DETECTED', 'Speech or elevated ambient noise detected', null, null);
                      }
                    };

                    recorder.start();
                    setTimeout(() => {
                      if (recorder.state === 'recording') {
                        recorder.stop();
                      }
                    }, 2000);
                  } catch (recErr) {
                    isRecordingAudioRef.current = false;
                    console.warn('[MediaRecorder Error]:', recErr);
                  }
                }
              }
            }, 300);
          }
        }
      } catch (audioInitErr) {
        console.warn('[Audio Init Error]:', audioInitErr);
      }
    }

    // 5.2 Decoupled Detection Pipeline (Face every 2s, COCO-SSD every 4s)
    proctoringWarmedUpRef.current = false;
    hasSeenFaceOnceRef.current = false;
    const warmupTimer = setTimeout(() => {
      proctoringWarmedUpRef.current = true;
    }, 6000);

    let tickCount = 0;
    detectionIntervalRef.current = setInterval(async () => {
      if (isDetectingRef.current || hasSubmittedRef.current) return;

      const video = hiddenVideoRef.current || previewVideoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      isDetectingRef.current = true;
      tickCount += 1;
      const now = Date.now();

      try {
        // Face Detection (every 2s)
        if (examConfig?.enableFaceDetection !== false && blazefaceModelRef.current) {
          const faces = await blazefaceModelRef.current.estimateFaces(video, false);

          if (faces.length === 0) {
            setFaceStatus('STANDBY');
            if (proctoringWarmedUpRef.current && hasSeenFaceOnceRef.current) {
              const lastNoFace = lastEvidenceTimeRef.current['NO_FACE'] || 0;
              if (now - lastNoFace >= 10000) {
                lastEvidenceTimeRef.current['NO_FACE'] = now;
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
              }
            }
          } else if (faces.length > 1) {
            hasSeenFaceOnceRef.current = true;
            setFaceStatus('VERIFIED');
            const lastMultiFace = lastEvidenceTimeRef.current['MULTIPLE_FACES'] || 0;
            if (now - lastMultiFace >= 10000) {
              lastEvidenceTimeRef.current['MULTIPLE_FACES'] = now;
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
            }
          } else {
            hasSeenFaceOnceRef.current = true;
            setFaceStatus('VERIFIED');
          }
        }

        // Object Detection (every 4s = alternate ticks)
        if (examConfig?.enableObjectDetection !== false && cocoSsdModelRef.current && tickCount % 2 === 0) {
          const objects = await cocoSsdModelRef.current.detect(video);
          const suspiciousObjects = objects.filter((obj) => {
            const label = String(obj.class).toLowerCase();
            const isTargetClass =
              label.includes('phone') ||
              label === 'cell phone' ||
              label === 'remote' ||
              label === 'laptop' ||
              label === 'book';
            return isTargetClass && obj.score >= 0.35;
          });

          if (suspiciousObjects.length > 0) {
            const lastObj = lastEvidenceTimeRef.current['OBJECT_DETECTED'] || 0;
            if (now - lastObj >= 10000) {
              lastEvidenceTimeRef.current['OBJECT_DETECTED'] = now;
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
        }
      } catch (detectErr) {
        console.warn('[Detection Tick Warning]:', detectErr);
      } finally {
        isDetectingRef.current = false;
      }
    }, 2000);

    // 5.3 Prevent Back Navigation
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setShowLeaveWarning(true);
    };
    window.addEventListener('popstate', handlePopState);

    // 5.4 Tab Switch / Visibility Change Guard
    const handleVisibilityChange = async () => {
      if (examConfig?.enableTabSwitchDetection === false) {
        return;
      }

      if (document.hidden) {
        tabHiddenTimeRef.current = Date.now();
        tabSwitchCountRef.current += 1;
        const count = tabSwitchCountRef.current;
        setTabSwitchCount(count);

        sendProctorLog('TAB_SWITCH', `Candidate switched away from exam tab (Violation #${count})`, null);

        const maxAllowed = examConfig?.maxTabSwitches;
        if (maxAllowed && maxAllowed > 0 && count >= maxAllowed) {
          handleAutoTerminationRef.current?.(
            `Maximum violation limit exceeded (${count} of ${maxAllowed} allowed). Exam automatically submitted due to proctoring violation.`
          );
        } else if (maxAllowed && maxAllowed > 0) {
          const remaining = maxAllowed - count;
          setProctorWarnings((prev) => [
            ...prev,
            {
              type: 'TAB_SWITCH',
              message: `Tab Switch Violation (${count}/${maxAllowed})! Stay on this screen. ${remaining} more violation(s) will terminate the exam!`,
              timestamp: new Date()
            }
          ]);
        } else {
          setProctorWarnings((prev) => [
            ...prev,
            {
              type: 'TAB_SWITCH',
              message: `Tab switch detected (Violation #${count}). Please remain on the exam screen.`,
              timestamp: new Date()
            }
          ]);
        }
      }
    };

    // 5.5 Fullscreen Exit Handler
    const handleFullscreenChange = async () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);

      if (!inFullscreen && !hasSubmittedRef.current && !backendTerminated && examConfig?.enableTabSwitchDetection !== false) {
        tabSwitchCountRef.current += 1;
        const count = tabSwitchCountRef.current;
        setTabSwitchCount(count);

        sendProctorLog('FULL_SCREEN_EXIT', `Candidate exited full screen mode (Violation #${count})`, null);

        const maxAllowed = examConfig?.maxTabSwitches;
        if (maxAllowed && maxAllowed > 0 && count >= maxAllowed) {
          handleAutoTerminationRef.current?.(
            `Maximum violation limit exceeded (${count} of ${maxAllowed} allowed). Exam automatically submitted.`
          );
        } else if (maxAllowed && maxAllowed > 0) {
          const remaining = maxAllowed - count;
          setProctorWarnings((prev) => [
            ...prev,
            {
              type: 'FULL_SCREEN_EXIT',
              message: `Full Screen Violation (${count}/${maxAllowed})! Please return to full screen. ${remaining} more violation(s) will terminate the exam!`,
              timestamp: new Date()
            }
          ]);
        } else {
          setProctorWarnings((prev) => [
            ...prev,
            {
              type: 'FULL_SCREEN_EXIT',
              message: `Full screen exit recorded (Violation #${count}). Return to full screen to continue.`,
              timestamp: new Date()
            }
          ]);
        }
      }
    };

    // 5.6 Window Focus & Blur Activity Detection
    const handleWindowBlur = () => {
      if (hasSubmittedRef.current || backendTerminated) return;
      const cfg = examConfigRef.current || examConfig;
      if (cfg?.enableScreenCaptureProtection && cfg?.enableBrowserActivityDetection !== false) {
        sendProctorLog('WINDOW_BLUR', 'Candidate shifted window focus away from assessment.');
      }
    };

    const handleWindowFocus = () => {
      if (hasSubmittedRef.current || backendTerminated) return;
      const cfg = examConfigRef.current || examConfig;
      if (cfg?.enableScreenCaptureProtection && cfg?.enableBrowserActivityDetection !== false) {
        sendProctorLog('WINDOW_FOCUS', 'Candidate returned focus to assessment window.');
      }
    };

    // 5.7 Exam Browser Restrictions (Copy, Paste, Cut, Right-Click, Shortcuts)
    const handleCopy = (e) => {
      const cfg = examConfigRef.current || examConfig;
      if (cfg?.disableCopy) {
        e.preventDefault();
        sendProctorLog('COPY_ATTEMPT', 'Copy operation blocked by exam security policy.');
        return false;
      }
    };

    const handlePaste = (e) => {
      const cfg = examConfigRef.current || examConfig;
      if (cfg?.disablePaste) {
        e.preventDefault();
        sendProctorLog('PASTE_ATTEMPT', 'Paste operation blocked by exam security policy.');
        return false;
      }
    };

    const handleCut = (e) => {
      const cfg = examConfigRef.current || examConfig;
      if (cfg?.disableCut) {
        e.preventDefault();
        sendProctorLog('CUT_ATTEMPT', 'Cut operation blocked by exam security policy.');
        return false;
      }
    };

    const handleContextMenu = (e) => {
      const cfg = examConfigRef.current || examConfig;
      if (cfg?.disableRightClick) {
        e.preventDefault();
        sendProctorLog('RIGHT_CLICK_ATTEMPT', 'Right click context menu blocked by exam security policy.');
        return false;
      }
    };

    const handleKeyDown = (e) => {
      const cfg = examConfigRef.current || examConfig;
      // Screenshot detection
      const isScreenshotKey =
        e.key === 'PrintScreen' ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && ['3', '4', 's', 'S'].includes(e.key));

      if (isScreenshotKey && cfg?.enableScreenCaptureProtection && cfg?.enableBrowserActivityDetection !== false) {
        e.preventDefault();
        setScreenshotWarning(true);
        setTimeout(() => setScreenshotWarning(false), 3500);
        sendProctorLog('SCREENSHOT_ATTEMPT', 'Candidate attempted screen capture / shortcut.');
        return false;
      }

      // Shortcut restrictions
      if (cfg?.restrictBrowserShortcuts) {
        const isCtrlOrMeta = e.ctrlKey || e.metaKey;
        const isBlockedShortcut =
          (isCtrlOrMeta && ['c', 'v', 'x', 'p', 's', 'u', 'C', 'V', 'X', 'P', 'S', 'U'].includes(e.key)) ||
          e.key === 'F12' ||
          (isCtrlOrMeta && e.shiftKey && ['i', 'I', 'j', 'J', 'c', 'C'].includes(e.key));

        if (isBlockedShortcut) {
          e.preventDefault();
          sendProctorLog('SHORTCUT_ATTEMPT', `Browser shortcut blocked: ${e.key}`);
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

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('cut', handleCut);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      clearTimeout(warmupTimer);
    };
  }, [permissionState, modelsLoading, modelLoadError, backendTerminated, sendProctorLog, captureAndUploadEvidence, examConfig]);

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

  // Answer Modification Handlers (Debounced & side-effect free)
  const handleSingleChoiceSelect = (questionId, optionKey) => {
    if (isCurrentQuestionExpired) return;
    const updated = { ...answersRef.current, [questionId]: optionKey };
    setAnswers(updated);
    triggerDebouncedAutosave(updated);
  };

  const handleMultipleSelectToggle = (questionId, optionKey) => {
    if (isCurrentQuestionExpired) return;
    const currentVal = answersRef.current[questionId] || '';
    const selectedOptions = currentVal ? currentVal.split(',').filter(Boolean) : [];

    let newOptions;
    if (selectedOptions.includes(optionKey)) {
      newOptions = selectedOptions.filter((o) => o !== optionKey);
    } else {
      newOptions = [...selectedOptions, optionKey].sort();
    }

    const val = newOptions.join(',');
    const updated = { ...answersRef.current, [questionId]: val };
    setAnswers(updated);
    triggerDebouncedAutosave(updated);
  };

  const handleTextAnswerChange = (questionId, value) => {
    if (isCurrentQuestionExpired) return;
    const updated = { ...answersRef.current, [questionId]: value };
    setAnswers(updated);
    triggerDebouncedAutosave(updated);
  };

  const handleClearAnswer = (questionId) => {
    if (isCurrentQuestionExpired) return;
    const copy = { ...answersRef.current };
    delete copy[questionId];
    setAnswers(copy);
    triggerDebouncedAutosave(copy);
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

  return (
    <ExamScreen
      deviceRestriction={deviceRestriction}
      permissionState={permissionState}
      modelsLoading={modelsLoading}
      isLoading={isLoading}
      error={error}
      examData={examData}
      questionsList={questionsList}
      backendTerminated={backendTerminated}
      navigate={navigate}
      requestMediaPermissions={requestMediaPermissions}
      hiddenVideoRef={hiddenVideoRef}
      modelLoadStep={modelLoadStep}
      currentIndex={currentIndex}
      setCurrentIndex={setCurrentIndex}
      currentQuestion={currentQuestion}
      currentAnswer={currentAnswer}
      answers={answers}
      flaggedQuestions={flaggedQuestions}
      isCurrentFlagged={isCurrentFlagged}
      isCurrentQuestionExpired={isCurrentQuestionExpired}
      isSubmitting={isSubmitting}
      hasSubmitted={hasSubmittedRef.current}
      timeLeftSeconds={timeLeftSeconds}
      questionTimeLeft={questionTimeLeft}
      formatTime={formatTime}
      isFullscreen={isFullscreen}
      requestFullscreenAgain={requestFullscreenAgain}
      isOnline={isOnline}
      showReconnectedToast={showReconnectedToast}
      screenshotWarning={screenshotWarning}
      tabSwitchCount={tabSwitchCount}
      maxAllowedTabSwitches={maxAllowedTabSwitches}
      showSubmitModal={showSubmitModal}
      setShowSubmitModal={setShowSubmitModal}
      showInstructionsModal={showInstructionsModal}
      setShowInstructionsModal={setShowInstructionsModal}
      showLeaveWarning={showLeaveWarning}
      setShowLeaveWarning={setShowLeaveWarning}
      mobilePaletteOpen={mobilePaletteOpen}
      setMobilePaletteOpen={setMobilePaletteOpen}
      handleSubmitExam={handleSubmitExam}
      handleAdvanceQuestion={handleAdvanceQuestion}
      handleToggleFlag={handleToggleFlag}
      handleClearAnswer={handleClearAnswer}
      handleSingleChoiceSelect={handleSingleChoiceSelect}
      handleMultipleSelectToggle={handleMultipleSelectToggle}
      handleTextAnswerChange={handleTextAnswerChange}
      handleRunCandidateCode={handleRunCandidateCode}
      handleSubmitCandidateCode={handleSubmitCandidateCode}
      previewVideoRef={previewVideoRef}
      webcamActive={webcamActive}
      micActive={micActive}
      audioLevel={audioLevel}
      faceStatus={faceStatus}
      proctorWarnings={proctorWarnings}
      codeLanguage={codeLanguage}
      setCodeLanguage={setCodeLanguage}
      STARTER_CODE={STARTER_CODE}
      confirm={confirm}
      customInput={customInput}
      setCustomInput={setCustomInput}
      showCustomInput={showCustomInput}
      setShowCustomInput={setShowCustomInput}
      isRunningCode={isRunningCode}
      isSubmittingCode={isSubmittingCode}
      runResult={runResult}
      codeSubmitResult={codeSubmitResult}
      terminationReason={terminationReason}
      enrollmentId={enrollmentId}
      modelLoadError={modelLoadError}
      retryLoadModels={retryLoadModels}
      handleModelErrorBack={handleModelErrorBack}
      enableExamWatermark={Boolean(examConfig?.enableScreenCaptureProtection && examConfig?.enableExamWatermark)}
      examId={
        searchParams.get('examId') ||
        sessionStorage.getItem(`exam_id_${enrollmentId}`) ||
        localStorage.getItem(`exam_id_${enrollmentId}`) ||
        sessionStorage.getItem('currentExamId') ||
        examData?.examId ||
        examData?.id
      }
    />
  );
};

export default ActiveExam;

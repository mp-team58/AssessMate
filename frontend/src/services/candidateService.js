import { candidateApiClient } from './apiClient';

/**
 * Step 1: Exam Enrollment
 * Validates joinCode and links candidate to the exam, returning enrollment details.
 * Calls https://dxpb79fh-8080.inc1.devtunnels.ms/api/candidate/join/{joinCode}
 * @param {string} joinCode
 * @returns {Promise<{data: {enrollmentId: number, examTitle: string, subject: string, totalMarks: number, passingMarks: number, durationMinutes: number}}>}
 */
export const joinExamByCode = async (joinCode) => {
  return candidateApiClient.post(`/candidate/join/${encodeURIComponent(joinCode.trim())}`);
};

/**
 * Step 2: Fetch Exam Questions
 * Retrieves the randomized question set for the active exam.
 * Calls https://dxpb79fh-8080.inc1.devtunnels.ms/api/candidate/exam/{enrollmentId}/questions
 * @param {number|string} enrollmentId
 * @returns {Promise<{data: {enrollmentId: number, examTitle: string, durationMinutes: number, questions: Array<Object>}}>}
 */
export const getExamQuestions = async (enrollmentId) => {
  return candidateApiClient.get(`/candidate/exam/${enrollmentId}/questions`);
};

/**
 * Step 3A: Upload Proctoring Evidence (Image Snapshot or Audio Clip)
 * Calls POST /api/candidate/proctor/evidence
 * @param {Blob} fileBlob - image/jpeg or audio/webm Blob
 * @param {'image'|'audio'} type
 * @returns {Promise<{data: {url: string}}>}
 */
export const uploadProctorEvidence = async (fileBlob, type) => {
  const formData = new FormData();
  let filename = 'evidence_snapshot.jpg';
  if (type === 'audio') {
    filename = fileBlob.type.includes('mp4') ? 'evidence_audio.mp4' : 'evidence_audio.webm';
  }
  formData.append('file', fileBlob, filename);
  formData.append('type', type);
  return candidateApiClient.post('/candidate/proctor/evidence', formData);
};

/**
 * Step 3B: Log Proctoring Events
 * Sends abnormal candidate behaviors asynchronously.
 * Calls POST /api/candidate/proctor/log
 * Event types: NO_FACE, MULTIPLE_FACES, OBJECT_DETECTED, NO_CAMERA, NO_MIC, AUDIO_DETECTED, TAB_SWITCH, FULL_SCREEN_EXIT
 * @param {number|string} enrollmentId
 * @param {'NO_FACE'|'MULTIPLE_FACES'|'OBJECT_DETECTED'|'NO_CAMERA'|'NO_MIC'|'AUDIO_DETECTED'|'TAB_SWITCH'|'FULL_SCREEN_EXIT'} eventType
 * @param {string} details
 * @param {string|null} imageUrl
 * @param {string|null} audioUrl
 * @returns {Promise<{data: {autoSubmitted: boolean}}>}
 */
export const logProctorEvent = async (enrollmentId, eventType, details = '', imageUrl = null, audioUrl = null) => {
  try {
    return await candidateApiClient.post('/candidate/proctor/log', {
      enrollmentId: Number(enrollmentId),
      eventType,
      details,
      timestamp: new Date().toISOString(),
      imageUrl: imageUrl || null,
      audioUrl: audioUrl || null,
    });
  } catch (err) {
    // Non-blocking catch so background proctoring doesn't crash test experience
    console.warn('[Candidate Proctoring Log Warning]:', err.message || err);
  }
};

/**
 * Step 4: Submit Exam Answers
 * Submits the answers map for auto-grading.
 * Calls https://dxpb79fh-8080.inc1.devtunnels.ms/api/candidate/submit/{enrollmentId}
 * @param {number|string} enrollmentId
 * @param {Object.<string, string>} answers - Map of questionId to answer string
 */
export const submitExamAnswers = async (enrollmentId, answers) => {
  return candidateApiClient.post(`/candidate/submit/${enrollmentId}`, {
    answers,
  });
};

/**
 * Step 5A: Get Result & Personalized AI Feedback
 * Calls https://dxpb79fh-8080.inc1.devtunnels.ms/api/candidate/result/{enrollmentId}
 * @param {number|string} enrollmentId
 * @returns {Promise<{data: {enrollmentId: number, examTitle: string, totalScore: number, maxScore: number, percentage: number, passed: boolean, weakTopicsJson: string, aiFeedback: string}}>}
 */
export const getExamResult = async (enrollmentId) => {
  return candidateApiClient.get(`/candidate/result/${enrollmentId}`);
};

/**
 * Step 5B: Candidate Dashboard History
 * Calls /candidate/history
 * @returns {Promise<{data: Array<{enrollmentId: number, examTitle: string, subject: string, joinedAt: string, status: string, totalScore?: number, percentage?: number}>}>}
 */
export const getCandidateHistory = async () => {
  return candidateApiClient.get('/candidate/history');
};

/**
 * Candidate Dashboard Summary (Exams count, etc.)
 * Calls /candidate/dashboard
 */
export const getCandidateDashboard = async () => {
  return candidateApiClient.get('/candidate/dashboard');
};



/**
 * Get Ongoing Exam State
 * Calls /candidate/exam/{enrollmentId}/state
 */
export const getExamState = async (enrollmentId) => {
  return candidateApiClient.get(`/candidate/exam/${enrollmentId}/state`);
};

/**
 * Save Exam Progress
 * Calls /candidate/exam/{enrollmentId}/progress
 */
export const saveExamProgress = async (enrollmentId, answers) => {
  return candidateApiClient.post(`/candidate/exam/${enrollmentId}/progress`, { answers });
};

/**
 * Step 6A: Candidate Run Code (Sample test cases)
 * Calls /coding/run
 */
export const runCandidateCode = async ({ codingQuestionId, language, sourceCode, customInput = '' }) => {
  return candidateApiClient.post('/coding/run', {
    codingQuestionId: Number(codingQuestionId),
    language,
    sourceCode,
    customInput,
  });
};

/**
 * Step 6B: Candidate Submit Code (All test cases & grading)
 * Calls /coding/submit
 */
export const submitCandidateCode = async ({ enrollmentId, codingQuestionId, language, sourceCode }) => {
  return candidateApiClient.post('/coding/submit', {
    enrollmentId: Number(enrollmentId),
    codingQuestionId: Number(codingQuestionId),
    language,
    sourceCode,
  });
};

/**
 * Step 6C: Get Candidate Assigned Coding Problems
 * Calls /exams/{examId}/coding/candidate
 */
export const getAssignedCodingProblems = async (examId) => {
  return candidateApiClient.get(`/exams/${examId}/coding/candidate`);
};




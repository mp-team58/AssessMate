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
 * Step 3: Log Proctoring Events
 * Sends abnormal candidate behaviors asynchronously.
 * Calls https://dxpb79fh-8080.inc1.devtunnels.ms/api/candidate/proctor/log
 * Event types: FULLSCREEN_EXIT, TAB_SWITCH, MULTIPLE_FACES_DETECTED, NO_FACE_DETECTED, RIGHT_CLICK
 * @param {number|string} enrollmentId
 * @param {'FULLSCREEN_EXIT'|'TAB_SWITCH'|'MULTIPLE_FACES_DETECTED'|'NO_FACE_DETECTED'|'RIGHT_CLICK'} eventType
 * @param {string} details
 */
export const logProctorEvent = async (enrollmentId, eventType, details = '') => {
  try {
    return await candidateApiClient.post('/candidate/proctor/log', {
      enrollmentId: Number(enrollmentId),
      eventType,
      details,
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
 * Calls https://dxpb79fh-8080.inc1.devtunnels.ms/api/candidate/history
 * @returns {Promise<{data: Array<{enrollmentId: number, examTitle: string, subject: string, joinedAt: string, status: string, totalScore?: number, percentage?: number}>}>}
 */
export const getCandidateHistory = async () => {
  return candidateApiClient.get('/candidate/history');
};

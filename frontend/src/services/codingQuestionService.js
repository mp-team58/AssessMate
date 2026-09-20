import apiClient from './apiClient';

/**
 * Get all coding problems in an exam's pool
 * @param {number|string} examId
 * @returns {Promise<any>}
 */
export const getExamCodingProblems = async (examId) => {
  return apiClient.get(`/exams/${examId}/coding`);
};

/**
 * Add a coding problem directly to an exam's pool
 * @param {number|string} examId
 * @param {Object} problemData
 * @returns {Promise<any>}
 */
export const addCodingProblemToExam = async (examId, problemData) => {
  return apiClient.post(`/exams/${examId}/coding`, problemData);
};

/**
 * Copy coding problems from Global Coding Bank to an exam's pool
 * @param {number|string} examId
 * @param {Array<number|string>} questionIds
 * @returns {Promise<any>}
 */
export const addCodingProblemsFromBank = async (examId, questionIds) => {
  return apiClient.post(`/exams/${examId}/coding/from-bank`, {
    questionIds,
  });
};

/**
 * Get the host's global coding question bank
 * @returns {Promise<any>}
 */
export const getCodingBank = async () => {
  return apiClient.get('/coding/bank');
};

/**
 * Get the host's global coding question bank
 * @returns {Promise<any>}
 */
export const getQuestionBankStats = async () => {
  return apiClient.get('/questions/bank/stats');
};

/**
 * Generate an AI Coding Problem for an exam
 * @param {number|string} examId 
 * @param {Object} generationParams { input, inputType, difficulty, marks, timeLimitSeconds, memoryLimitMb, allowedLanguages, testCaseCount }
 * @returns {Promise<any>}
 */
export const generateAICodingProblem = async (examId, generationParams) => {
  return apiClient.post(`/exams/${examId}/coding/generate`, generationParams);
};

/**
 * Add a problem directly to the global coding question bank
 * @param {Object} problemData
 * @returns {Promise<any>}
 */
export const addCodingProblemToBank = async (problemData) => {
  return apiClient.post('/coding/bank', problemData);
};

/**
 * Edit a coding problem by ID
 * @param {number|string} id
 * @param {Object} problemData
 * @returns {Promise<any>}
 */
export const updateCodingProblem = async (id, problemData) => {
  return apiClient.put(`/coding/${id}`, problemData);
};

/**
 * Delete a coding problem by ID
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export const deleteCodingProblem = async (id) => {
  return apiClient.delete(`/coding/${id}`);
};

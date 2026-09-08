import apiClient from './apiClient';

/**
 * Add a question to the host's global bank only.
 * @param {FormData} formData - multipart/form-data containing 'data' and optional 'image'
 */
export const addQuestionToBank = async (formData) => {
  return apiClient.post('/questions/bank', formData);
};

/**
 * Get global bank questions with optional filters.
 * @param {Object} filters - difficulty, type, topic, search
 */
export const getBankQuestions = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return apiClient.get(`/questions/bank${params ? `?${params}` : ''}`);
};

/**
 * Add existing bank questions to an exam.
 * @param {number|string} examId 
 * @param {number[]} questionIds 
 */
export const addBankQuestionsToExam = async (examId, questionIds) => {
  return apiClient.post(`/exams/${examId}/questions/from-bank`, { questionIds });
};

/**
 * Add a new question manually to an exam (and optionally save to bank).
 * @param {FormData} formData - multipart/form-data containing 'data' (with examId, saveToBank) and optional 'image'
 */
export const addQuestionManually = async (examId, formData) => {
  return apiClient.post(`/exams/${examId}/questions`, formData);
};

/**
 * Get all questions for a specific exam.
 * @param {number|string} examId 
 */
export const getExamQuestions = async (examId) => {
  return apiClient.get(`/exams/${examId}/questions`);
};

/**
 * Get question stats/progress for an exam.
 * @param {number|string} examId 
 */
export const getExamQuestionStats = async (examId) => {
  return apiClient.get(`/exams/${examId}/questions/stats`);
};

/**
 * Edit an existing question.
 * @param {number|string} id 
 * @param {FormData} formData - multipart/form-data
 */
export const editQuestion = async (id, formData) => {
  return apiClient.put(`/questions/${id}`, formData);
};

/**
 * Delete a question.
 * @param {number|string} id 
 */
export const deleteQuestion = async (id) => {
  return apiClient.delete(`/questions/${id}`);
};

/**
 * Verify a question.
 * @param {number|string} id 
 */
export const verifyQuestion = async (id) => {
  return apiClient.patch(`/questions/${id}/verify`);
};

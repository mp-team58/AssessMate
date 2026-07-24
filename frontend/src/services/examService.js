import apiClient from './apiClient';

/**
 * @typedef {Object} CreateExamPayload
 * @property {string} title
 * @property {string} subject
 * @property {number} durationMinutes
 * @property {string} scheduledStart
 * @property {number} gracePeriodMinutes
 * @property {number} easyPercent
 * @property {number} mediumPercent
 * @property {number} hardPercent
 * @property {number} totalQuestions
 * @property {boolean} negativeMark
 * @property {number} negativeMarkValue
 * @property {string} deviceAccess
 */

export const createExam = async (payload) => {
  return apiClient.post('/exams/create', payload);
};

export const getMyExams = async () => {
  return apiClient.get('/exams/my');
};

export const getExamById = async (id) => {
  return apiClient.get(`/exams/${id}`);
};

export const deleteExam = async (id) => {
  return apiClient.delete(`/exams/${id}`);
};

export const publishExam = async (id) => {
  return apiClient.put(`/exams/${id}/publish`);
};

export const endExam = async (id) => {
  return apiClient.put(`/exams/${id}/end`);
};

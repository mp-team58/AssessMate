import apiClient from './apiClient';

/**
 * HOST ANALYTICS
 */
export const getHostAnalytics = async () => {
  return apiClient.get('/analytics/dashboard');
};

/**
 * HOST EXAM RESULTS
 */
export const getExamResults = async (examId) => {
  return apiClient.get(`/results/exam/${examId}`);
};

export const getExamLiveMonitor = async (examId) => {
  return apiClient.get(`/results/exam/${examId}/live`);
};

export const getCandidateReport = async (examId, enrollmentId) => {
  return apiClient.get(`/results/exam/${examId}/candidate/${enrollmentId}`);
};

/**
 * PROCTORING DASHBOARD
 */
export const getProctoringDashboard = async (examId) => {
  return apiClient.get(`/proctoring/exam/${examId}`);
};

export const getCandidateProctoringTimeline = async (examId, enrollmentId) => {
  return apiClient.get(`/proctoring/exam/${examId}/candidate/${enrollmentId}`);
};

export const getShareExamInfo = async (examId) => {
  return apiClient.get(`/exams/${examId}/share`);
};

import apiClient from './apiClient';

/**
 * Downloads the Excel template for bulk question upload
 */
export const downloadExcelTemplate = () => {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://08k7867x-8080.inc1.devtunnels.ms/api';
  const url = `${BASE_URL}/questions/excel/template`;
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'assessmate_question_template.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * Uploads an Excel file to bulk add questions to an exam
 * @param {number|string} examId 
 * @param {File} file 
 */
export const uploadExcel = async (examId, file) => {
  const formData = new FormData();
  formData.append('file', file);

  // apiClient automatically handles the Authorization header
  // and DO NOT set Content-Type manually when using FormData
  const response = await apiClient.post(`/exams/${examId}/questions/excel`, formData);
  return response.data || response;
};

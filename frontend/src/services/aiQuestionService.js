import apiClient from './apiClient';

/**
 * Generate AI questions from a topic only.
 */
export const generateQuestionsFromTopic = async ({ examId, ...payload }) => {
  return apiClient.post(`/exams/${examId}/questions/ai/topic`, {
    ...payload,
    inputType: 'TOPIC',
  });
};

/**
 * Generate AI questions from pasted text.
 */
export const generateQuestionsFromText = async ({ examId, ...payload }) => {
  return apiClient.post(`/exams/${examId}/questions/ai/text`, {
    ...payload,
    inputType: 'TEXT',
  });
};

/**
 * Generate AI questions from uploaded PDF, PPTX, DOCX, JPG, JPEG, or PNG.
 */
export const generateQuestionsFromFile = async ({
  examId,
  topic,
  totalQuestions,
  multipleSelectCount = 0,
  fillBlankCount = 0,
  numericalCount = 0,
  file,
  onUploadProgress,
}) => {
  const formData = new FormData();

  const data = {
    topic: topic?.trim() || null,
    totalQuestions: Number(totalQuestions),
    multipleSelectCount: Number(multipleSelectCount),
    fillBlankCount: Number(fillBlankCount),
    numericalCount: Number(numericalCount),
  };

  formData.append(
    'data',
    new Blob([JSON.stringify(data)], { type: 'application/json' })
  );

  formData.append('file', file);

  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
  const url = `${BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL}/exams/${examId}/questions/ai/file`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = localStorage.getItem('token');

    xhr.open('POST', url, true);
    if (token && token !== 'null' && token !== 'undefined') {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (onUploadProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onUploadProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      let responseData;
      try {
        responseData = JSON.parse(xhr.responseText);
      } catch (e) {
        responseData = xhr.responseText;
      }
      
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ data: responseData, status: xhr.status });
      } else {
        const error = new Error(responseData?.message || 'Upload failed');
        error.response = { status: xhr.status, data: responseData };
        reject(error);
      }
    };

    xhr.onerror = () => {
      const error = new Error('Network error during upload');
      error.response = { status: 0, data: { message: 'Network Error' } };
      reject(error);
    };

    xhr.send(formData);
  });
};

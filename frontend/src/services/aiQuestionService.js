import apiClient, { API_BASE_URL } from './apiClient';

/**
 * Get the status of an asynchronous AI generation job.
 */
export const getAIJobStatus = async (examId, jobId) => {
  return apiClient.get(`/exams/${examId}/questions/ai/jobs/${jobId}`);
};

/**
 * Helper to poll an AI job until completion or failure.
 */
const pollAIJob = async (examId, jobId, intervalMs = 1500, maxAttempts = 80) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const res = await getAIJobStatus(examId, jobId);
    const job = res.data;

    if (job.status === 'COMPLETED') {
      return { data: job.result, status: 200 };
    }
    if (job.status === 'FAILED') {
      const error = new Error(job.errorMessage || 'AI question generation failed');
      error.response = { status: 500, data: { message: job.errorMessage } };
      throw error;
    }
  }
  const timeoutError = new Error('AI question generation timed out. Please check again in a moment.');
  timeoutError.response = { status: 504, data: { message: 'Generation timed out' } };
  throw timeoutError;
};

/**
 * Generate AI questions from a topic only.
 * Dispatches an asynchronous job and polls until completion.
 */
export const generateQuestionsFromTopic = async ({ examId, ...payload }) => {
  const initialRes = await apiClient.post(`/exams/${examId}/questions/ai/topic`, {
    ...payload,
    inputType: 'TOPIC',
  });

  if (initialRes.data?.status === 'COMPLETED') {
    return { data: initialRes.data.result, status: 200 };
  }

  if (initialRes.data?.jobId) {
    return pollAIJob(examId, initialRes.data.jobId);
  }

  return initialRes;
};

/**
 * Generate AI questions from pasted text.
 * Dispatches an asynchronous job and polls until completion.
 */
export const generateQuestionsFromText = async ({ examId, ...payload }) => {
  const initialRes = await apiClient.post(`/exams/${examId}/questions/ai/text`, {
    ...payload,
    inputType: 'TEXT',
  });

  if (initialRes.data?.status === 'COMPLETED') {
    return { data: initialRes.data.result, status: 200 };
  }

  if (initialRes.data?.jobId) {
    return pollAIJob(examId, initialRes.data.jobId);
  }

  return initialRes;
};

/**
 * Generate AI questions from uploaded PDF, PPTX, DOCX, JPG, JPEG, or PNG.
 * Uploads file, dispatches an asynchronous job and polls until completion.
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

  const BASE_URL = API_BASE_URL;
  const url = `${BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL}/exams/${examId}/questions/ai/file`;

  const initialResponse = await new Promise((resolve, reject) => {
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

  if (initialResponse.data?.status === 'COMPLETED') {
    return { data: initialResponse.data.result, status: 200 };
  }

  if (initialResponse.data?.jobId) {
    return pollAIJob(examId, initialResponse.data.jobId);
  }

  return initialResponse;
};

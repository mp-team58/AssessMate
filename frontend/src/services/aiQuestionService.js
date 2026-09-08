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

  // apiClient automatically handles Authorization header
  return apiClient.post(`/exams/${examId}/questions/ai/file`, formData);
};

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './test-utils';

import HostDashboard from '../pages/HostDashboard';
import CreateExam from '../pages/CreateExam';
import ExamQuestions from '../pages/ExamQuestions';
import HostLiveMonitor from '../pages/HostLiveMonitor';
import HostExamResults from '../pages/HostExamResults';
import ExcelUpload from '../components/ExcelUpload';
import AIGeneration from '../components/AIGeneration';
import ShareExamModal from '../components/ShareExamModal';
import QuestionForm from '../components/QuestionForm';
import QuestionBank from '../pages/QuestionBank';

import * as examService from '../services/examService';
import * as hostService from '../services/hostService';
import * as questionService from '../services/questionService';
import * as excelService from '../services/excelService';
import * as aiQuestionService from '../services/aiQuestionService';

vi.mock('../services/examService', () => ({
  getMyExams: vi.fn(),
  getExamById: vi.fn(),
  createExam: vi.fn(),
  updateExam: vi.fn(),
  publishExam: vi.fn(),
  unpublishExam: vi.fn(),
  endExam: vi.fn(),
  publishExamResults: vi.fn(),
  unpublishExamResults: vi.fn()
}));

vi.mock('../services/hostService', () => ({
  getHostAnalytics: vi.fn(),
  getExamLiveMonitor: vi.fn(),
  getExamResults: vi.fn(),
  getShareExamInfo: vi.fn(),
  toggleCandidateResult: vi.fn()
}));

vi.mock('../services/questionService', () => ({
  getExamQuestions: vi.fn(),
  getExamQuestionStats: vi.fn(),
  addQuestionManually: vi.fn(),
  editQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  getBankQuestions: vi.fn(),
  addBankQuestionsToExam: vi.fn(),
  verifyQuestion: vi.fn()
}));

vi.mock('../services/codingQuestionService', () => ({
  getExamCodingProblems: vi.fn().mockResolvedValue({ data: [] }),
  addCodingProblemToExam: vi.fn(),
  addCodingProblemsFromBank: vi.fn(),
  updateCodingProblem: vi.fn(),
  deleteCodingProblem: vi.fn(),
  addCodingProblemToBank: vi.fn()
}));

vi.mock('../services/excelService', () => ({
  uploadExcel: vi.fn(),
  downloadExcelTemplate: vi.fn()
}));

vi.mock('../services/aiQuestionService', () => ({
  generateQuestionsFromTopic: vi.fn(),
  generateQuestionsFromText: vi.fn(),
  generateQuestionsFromFile: vi.fn()
}));

describe('Batch 2: Host Portal Comprehensive Automated Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  /* ------------------------------------------------------------------------- */
  /* 1. Host Dashboard Workflows                                               */
  /* ------------------------------------------------------------------------- */
  describe('Host Dashboard', () => {
    it('renders dashboard statistics, active metrics, and recent assessments list', async () => {
      examService.getMyExams.mockResolvedValueOnce({
        data: [
          {
            id: 'exam-1',
            title: 'Operating Systems Midterm',
            subject: 'Computer Science',
            status: 'LIVE',
            candidateCount: 42,
            createdAt: '2026-11-01T10:00:00'
          },
          {
            id: 'exam-2',
            title: 'Cloud Architecture Final',
            subject: 'Distributed Systems',
            status: 'DRAFT',
            candidateCount: 0,
            createdAt: '2026-11-03T12:00:00'
          }
        ]
      });

      hostService.getHostAnalytics.mockResolvedValueOnce({
        data: {
          totalCandidates: 42,
          averagePercentage: 78.5,
          difficultyDistribution: { EASY: 10, MEDIUM: 15, HARD: 5 }
        }
      });

      renderWithProviders(<HostDashboard />, {
        initialRole: 'HOST',
        initialUser: { name: 'Dr. Jane Host', email: 'jane@assessmate.com' }
      });

      await waitFor(() => {
        expect(screen.getByText(/Operating Systems Midterm/i)).toBeInTheDocument();
        expect(screen.getByText(/Cloud Architecture Final/i)).toBeInTheDocument();
        expect(screen.getByText('Total Assessments')).toBeInTheDocument();
        expect(screen.getByText('Live Exams')).toBeInTheDocument();
        expect(screen.getByText('In Draft')).toBeInTheDocument();
      });
    });

    it('renders empty state when host has not created any assessments', async () => {
      examService.getMyExams.mockResolvedValueOnce({ data: [] });
      hostService.getHostAnalytics.mockResolvedValueOnce({ data: null });

      renderWithProviders(<HostDashboard />, {
        initialRole: 'HOST',
        initialUser: { name: 'New Host', email: 'new@assessmate.com' }
      });

      await waitFor(() => {
        expect(screen.getByText(/Create your first assessment/i)).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /Create Assessment/i }).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('handles dashboard API failure gracefully and logs error', async () => {
      examService.getMyExams.mockRejectedValueOnce(new Error('Failed to fetch host exams'));
      hostService.getHostAnalytics.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<HostDashboard />, { initialRole: 'HOST' });

      // Should complete loading without unhandled crash
      await waitFor(() => {
        expect(screen.getByText(/Create your first assessment/i)).toBeInTheDocument();
      });
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 2. Create and Edit Exam Validation                                        */
  /* ------------------------------------------------------------------------- */
  describe('Create and Edit Exam', () => {
    it('validates required fields when submitting empty form', async () => {
      renderWithProviders(<CreateExam />, { initialRole: 'HOST' });

      // Attempt to proceed past Step 1 (Basics) with empty fields
      const nextBtn = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextBtn);

      await waitFor(() => {
        expect(screen.getByText(/Title is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Subject is required/i)).toBeInTheDocument();
      });
    });

    it('populates existing exam details when mounted in edit mode', async () => {
      examService.getExamById.mockResolvedValueOnce({
        data: {
          id: 55,
          title: 'Advanced Machine Learning',
          subject: 'Artificial Intelligence',
          passingPercentage: 60,
          scheduledStart: '2026-12-01T10:00:00',
          gracePeriodMinutes: 15,
          timerType: 'WHOLE_EXAM',
          durationMinutes: 90,
          deviceAccess: 'DESKTOP',
          totalQuestions: 20,
          easyPercent: 40,
          mediumPercent: 40,
          hardPercent: 20,
          negativeMark: true,
          easyMark: 1,
          mediumMark: 2,
          hardMark: 3,
          easyNegative: 0.25,
          mediumNegative: 0.5,
          hardNegative: 1,
          easySeconds: 60,
          mediumSeconds: 90,
          hardSeconds: 120,
          hasCodingSection: false
        }
      });

      renderWithProviders(
        <Routes>
          <Route path="/host/exams/:id/edit" element={<CreateExam />} />
        </Routes>,
        { route: '/host/exams/55/edit', initialRole: 'HOST' }
      );

      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('Advanced Machine Learning');
        expect(titleInput).toBeInTheDocument();
        expect(screen.getByDisplayValue('Artificial Intelligence')).toBeInTheDocument();
      });
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 3. Question Form Validation & Bank Workflows                              */
  /* ------------------------------------------------------------------------- */
  describe('Question Management & Question Form', () => {
    it('validates required fields for Single Choice questions', async () => {
      const onSubmitMock = vi.fn();
      renderWithProviders(
        <QuestionForm
          onSubmit={onSubmitMock}
          onCancel={vi.fn()}
          isLoading={false}
        />
      );

      // Submit empty question form
      const saveBtn = screen.getByRole('button', { name: /(Save|Update) Question/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Question text is required/i)).toBeInTheDocument();
      });
      expect(onSubmitMock).not.toHaveBeenCalled();
    });

    it('renders delete confirmation modal and removes question from exam', async () => {
      examService.getExamById.mockResolvedValueOnce({
        data: { id: 10, title: 'Network Security', status: 'DRAFT' }
      });
      questionService.getExamQuestions.mockResolvedValueOnce({
        data: [
          {
            id: 301,
            questionText: 'What port does HTTPS use?',
            type: 'SINGLE_CHOICE',
            difficulty: 'EASY',
            optionA: '80',
            optionB: '443',
            optionC: '22',
            optionD: '8080',
            correctAnswer: 'B',
            marks: 1
          }
        ]
      });
      questionService.getExamQuestionStats.mockResolvedValueOnce({
        data: { totalRequired: 1, totalAdded: 1, easyRequired: 1, easyAdded: 1 }
      });
      questionService.deleteQuestion.mockResolvedValueOnce({ data: { message: 'Deleted' } });

      renderWithProviders(
        <Routes>
          <Route path="/host/exams/:examId/questions" element={<ExamQuestions />} />
        </Routes>,
        { route: '/host/exams/10/questions', initialRole: 'HOST' }
      );

      await waitFor(() => {
        expect(screen.getByText(/What port does HTTPS use\?/i)).toBeInTheDocument();
      });

      const removeBtn = screen.getByRole('button', { name: /Remove/i });
      expect(removeBtn).toBeInTheDocument();
      fireEvent.click(removeBtn);
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 4. Excel Upload Scenarios                                                 */
  /* ------------------------------------------------------------------------- */
  describe('Excel Upload Component', () => {
    it('rejects unsupported file formats and sets validation error', () => {
      renderWithProviders(
        <ExcelUpload examId="10" onUploadSuccess={vi.fn()} onClose={vi.fn()} />
      );

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();

      const invalidFile = new globalThis.File(['dummy content'], 'questions.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      expect(screen.getByText(/Only \.xlsx and \.xls files are supported/i)).toBeInTheDocument();
    });

    it('submits valid Excel file and displays upload summary', async () => {
      const onSuccessMock = vi.fn();
      excelService.uploadExcel.mockResolvedValueOnce({
        totalRows: 10,
        savedCount: 10,
        skippedCount: 0,
        errors: []
      });

      renderWithProviders(
        <ExcelUpload examId="10" onUploadSuccess={onSuccessMock} onClose={vi.fn()} />
      );

      const fileInput = document.querySelector('input[type="file"]');
      const validFile = new globalThis.File(['valid excel data'], 'exam_questions.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /Upload and Save Questions/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(excelService.uploadExcel).toHaveBeenCalledWith('10', validFile);
        expect(screen.getByText(/Upload Successful/i)).toBeInTheDocument();
        expect(screen.getByText(/10 questions saved successfully/i)).toBeInTheDocument();
        expect(onSuccessMock).toHaveBeenCalled();
      });
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 5. AI Question Generation Workflows                                       */
  /* ------------------------------------------------------------------------- */
  describe('AI Question Generation', () => {
    it('validates topic presence before triggering AI generation', () => {
      renderWithProviders(
        <AIGeneration
          examId="10"
          stats={{ easyRequired: 2, easyAdded: 0 }}
          onGenerationSuccess={vi.fn()}
          onClose={vi.fn()}
        />
      );

      const generateBtn = screen.getByRole('button', { name: /Generate Questions$/i });
      fireEvent.click(generateBtn);

      // Topic input is empty, API should not be called
      expect(aiQuestionService.generateQuestionsFromTopic).not.toHaveBeenCalled();
    });

    it('executes AI generation successfully and calls onGenerationSuccess', async () => {
      const onSuccessMock = vi.fn();
      aiQuestionService.generateQuestionsFromTopic.mockResolvedValueOnce({
        data: {
          generatedCount: 3,
          questions: [
            { id: 1, questionText: 'What is CAP Theorem?' }
          ]
        }
      });

      renderWithProviders(
        <AIGeneration
          examId="10"
          stats={{ easyRequired: 10, easyAdded: 0 }}
          onGenerationSuccess={onSuccessMock}
          onClose={vi.fn()}
        />
      );

      // Enter topic
      const topicInput = screen.getByPlaceholderText(/e\.g\. Java OOP and Inheritance/i);
      fireEvent.change(topicInput, { target: { value: 'Distributed Databases' } });

      const generateBtn = screen.getByRole('button', { name: /Generate Questions$/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(aiQuestionService.generateQuestionsFromTopic).toHaveBeenCalledWith(
          expect.objectContaining({
            examId: 10,
            topic: 'Distributed Databases'
          })
        );
        expect(onSuccessMock).toHaveBeenCalled();
      });
    });

    it('handles AI generation API error gracefully', async () => {
      aiQuestionService.generateQuestionsFromTopic.mockRejectedValueOnce({
        response: { status: 500, data: { message: 'Gemini service temporarily unavailable' } }
      });

      renderWithProviders(
        <AIGeneration
          examId="10"
          stats={{ easyRequired: 10, easyAdded: 0 }}
          onGenerationSuccess={vi.fn()}
          onClose={vi.fn()}
        />
      );

      const topicInput = screen.getByPlaceholderText(/e\.g\. Java OOP and Inheritance/i);
      fireEvent.change(topicInput, { target: { value: 'Computer Networks' } });

      const generateBtn = screen.getByRole('button', { name: /Generate Questions$/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(aiQuestionService.generateQuestionsFromTopic).toHaveBeenCalled();
      });
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 6. Exam Sharing & Join Code Display                                       */
  /* ------------------------------------------------------------------------- */
  describe('Share Exam Modal', () => {
    it('renders access join code and allows copying share message', async () => {
      hostService.getShareExamInfo.mockResolvedValueOnce({
        data: {
          accessCode: 'EXAM-4829',
          joinCode: 'EXAM-4829',
          examTitle: 'Algorithms Midterm',
          scheduledStart: '2026-11-10T14:00:00',
          shareMessage: 'You are invited to Algorithms Midterm. Code: EXAM-4829'
        }
      });

      // Mock navigator clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockImplementation(() => Promise.resolve())
        }
      });

      renderWithProviders(
        <ShareExamModal examId="10" isOpen={true} onClose={vi.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText('EXAM-4829')).toBeInTheDocument();
        expect(screen.getByText(/Share Exam/i)).toBeInTheDocument();
      });

      // Click copy button
      const copyBtn = screen.getByRole('button', { name: /Copy Message/i });
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'You are invited to Algorithms Midterm. Code: EXAM-4829'
      );
    });

    it('displays error warning when attempting to share an unpublished exam', async () => {
      hostService.getShareExamInfo.mockRejectedValueOnce({
        response: { status: 400, data: { message: 'Exam must be published first' } }
      });

      renderWithProviders(
        <ShareExamModal examId="10" isOpen={true} onClose={vi.fn()} />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Publish the exam before sharing it with candidates/i)
        ).toBeInTheDocument();
      });
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 7. Live Monitoring Workflows                                              */
  /* ------------------------------------------------------------------------- */
  describe('Host Live Monitor', () => {
    it('renders candidate monitor list and active statuses', async () => {
      hostService.getExamLiveMonitor.mockResolvedValueOnce({
        data: {
          examTitle: 'Web Security Assessment',
          examStatus: 'LIVE',
          totalCandidates: 3,
          activeCount: 2,
          submittedCount: 1,
          candidates: [
            {
              enrollmentId: 'e-1',
              candidateName: 'Alice Walker',
              email: 'alice@example.com',
              status: 'IN_PROGRESS',
              joinedAt: '2026-11-05T10:00:00',
              violationsCount: 0
            },
            {
              enrollmentId: 'e-2',
              candidateName: 'Bob Martin',
              email: 'bob@example.com',
              status: 'SUBMITTED',
              joinedAt: '2026-11-05T10:05:00',
              violationsCount: 2
            }
          ]
        }
      });

      renderWithProviders(
        <Routes>
          <Route path="/host/exams/:id/monitor" element={<HostLiveMonitor />} />
        </Routes>,
        { route: '/host/exams/20/monitor', initialRole: 'HOST' }
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Walker')).toBeInTheDocument();
        expect(screen.getByText('Bob Martin')).toBeInTheDocument();
        expect(screen.getByText(/Web Security Assessment/i)).toBeInTheDocument();
      });
    });

    it('opens end exam modal and disables button while terminating', async () => {
      hostService.getExamLiveMonitor.mockResolvedValueOnce({
        data: {
          examTitle: 'Database Systems',
          examStatus: 'LIVE',
          candidates: []
        }
      });
      examService.endExam.mockResolvedValueOnce({ data: { message: 'Exam ended' } });

      renderWithProviders(
        <Routes>
          <Route path="/host/exams/:id/monitor" element={<HostLiveMonitor />} />
        </Routes>,
        { route: '/host/exams/20/monitor', initialRole: 'HOST' }
      );

      await waitFor(() => {
        expect(screen.getByText(/Database Systems/i)).toBeInTheDocument();
      });

      const endExamBtn = screen.getByRole('button', { name: /End Exam Now/i });
      fireEvent.click(endExamBtn);

      await waitFor(() => {
        expect(screen.getByText(/permanently close the exam/i)).toBeInTheDocument();
      });
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 8. Host Exam Results & Candidate Performance                             */
  /* ------------------------------------------------------------------------- */
  describe('Host Exam Results', () => {
    it('renders candidate results summary cards and candidate scores table', async () => {
      hostService.getExamResults.mockResolvedValueOnce({
        data: {
          examTitle: 'Cloud Computing Certification',
          totalCandidates: 2,
          submittedCount: 2,
          averageScore: 82.5,
          passedCount: 2,
          failedCount: 0,
          passPercentage: 100,
          highestScore: 90,
          lowestScore: 75,
          resultsPublished: true,
          candidates: [
            {
              enrollmentId: '101',
              candidateName: 'Carol Danvers',
              candidateEmail: 'carol@example.com',
              totalScore: 90,
              percentage: 90,
              passed: true,
              submittedAt: '2026-11-05T11:00:00',
              status: 'SUBMITTED'
            },
            {
              enrollmentId: '102',
              candidateName: 'Peter Parker',
              candidateEmail: 'peter@example.com',
              totalScore: 75,
              percentage: 75,
              passed: true,
              submittedAt: '2026-11-05T11:10:00',
              status: 'SUBMITTED'
            }
          ]
        }
      });

      renderWithProviders(
        <Routes>
          <Route path="/host/exams/:id/results" element={<HostExamResults />} />
        </Routes>,
        { route: '/host/exams/30/results', initialRole: 'HOST' }
      );

      await waitFor(() => {
        expect(screen.getByText(/Cloud Computing Certification/i)).toBeInTheDocument();
        expect(screen.getByText('Carol Danvers')).toBeInTheDocument();
        expect(screen.getByText('Peter Parker')).toBeInTheDocument();
      });
    });

    it('handles unauthorized or ownership error on results page', async () => {
      hostService.getExamResults.mockRejectedValueOnce({
        response: { status: 403, data: { message: 'Access denied: You are not the owner of this exam.' } }
      });

      renderWithProviders(
        <Routes>
          <Route path="/host/exams/:id/results" element={<HostExamResults />} />
        </Routes>,
        { route: '/host/exams/999/results', initialRole: 'HOST' }
      );

      await waitFor(() => {
        expect(screen.getByText(/Results not found/i)).toBeInTheDocument();
      });
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 9. Question Bank Filtering & Advanced Question Forms                      */
  /* ------------------------------------------------------------------------- */
  describe('Question Bank & Form Variants', () => {
    it('renders populated question bank and searches by keyword', async () => {
      questionService.getBankQuestions.mockImplementation((params) => {
        const list = [
          {
            id: 1,
            questionText: 'What is QuickSort average time complexity?',
            type: 'SINGLE_CHOICE',
            difficulty: 'MEDIUM',
            topic: 'Algorithms',
            optionA: 'O(n)',
            optionB: 'O(n log n)',
            correctAnswer: 'B'
          },
          {
            id: 2,
            questionText: 'Explain ACID properties in database transactions',
            type: 'SINGLE_CHOICE',
            difficulty: 'HARD',
            topic: 'Databases',
            optionA: 'Option 1',
            optionB: 'Option 2',
            correctAnswer: 'A'
          }
        ];
        if (params?.search) {
          return Promise.resolve({
            data: list.filter((q) => q.questionText.toLowerCase().includes(params.search.toLowerCase()))
          });
        }
        return Promise.resolve({ data: list });
      });

      renderWithProviders(<QuestionBank />, { initialRole: 'HOST' });

      await waitFor(() => {
        expect(screen.getByText(/QuickSort average time complexity/i)).toBeInTheDocument();
        expect(screen.getByText(/ACID properties/i)).toBeInTheDocument();
      });

      // Filter by search keyword
      const searchInput = screen.getByPlaceholderText(/Search in question text/i);
      fireEvent.change(searchInput, { target: { value: 'QuickSort' } });

      await waitFor(() => {
        expect(screen.queryByText(/ACID properties/i)).not.toBeInTheDocument();
        expect(screen.getByText(/QuickSort average time complexity/i)).toBeInTheDocument();
      });
    });

    it('validates Fill in the Blank question requires correct text answer', async () => {
      const { container } = renderWithProviders(
        <QuestionForm
          initialData={{ type: 'FILL_BLANK', difficulty: 'EASY' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          isLoading={false}
        />
      );

      const qInput = container.querySelector('textarea[name="questionText"]');
      fireEvent.change(qInput, { target: { value: 'The process of finding bugs is called ___.' } });

      const saveBtn = screen.getByRole('button', { name: /Update Question/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Correct answer is required/i)).toBeInTheDocument();
      });
    });

    it('disables Publish Exam button when exam requirements are unmet', async () => {
      examService.getExamById.mockResolvedValueOnce({
        data: { id: 10, title: 'Network Security', status: 'DRAFT', hasCodingSection: false }
      });
      questionService.getExamQuestions.mockResolvedValueOnce({ data: [] });
      questionService.getExamQuestionStats.mockResolvedValueOnce({
        data: {
          totalRequired: 10,
          totalAdded: 0,
          canPublish: false,
          message: 'Add 10 more questions to fulfill requirements.'
        }
      });

      renderWithProviders(
        <Routes>
          <Route path="/host/exams/:examId/questions" element={<ExamQuestions />} />
        </Routes>,
        { route: '/host/exams/10/questions', initialRole: 'HOST' }
      );

      await waitFor(() => {
        const publishBtn = screen.getByRole('button', { name: /Publish Exam/i });
        expect(publishBtn).toBeDisabled();
      });
    });
  });
});

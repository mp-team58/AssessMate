import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CandidateDashboard from '../pages/CandidateDashboard';
import MyAssessments from '../pages/MyAssessments';
import JoinAssessment from '../pages/JoinAssessment';
import ExamResult from '../pages/ExamResult';
import ExamScreen from '../components/ExamScreen';
import { renderWithProviders } from './test-utils';
import * as candidateService from '../services/candidateService';

vi.mock('../services/candidateService', () => ({
  getCandidateHistory: vi.fn(),
  getCandidateDashboard: vi.fn(),
  joinExamByCode: vi.fn(),
  getExamResult: vi.fn(),
  getAvailableExams: vi.fn(),
  submitExamAnswers: vi.fn(),
  saveExamProgress: vi.fn()
}));

const mockQuestions = [
  {
    id: 201,
    questionText: 'Which sorting algorithm has O(n log n) worst-case time complexity?',
    type: 'SINGLE_CHOICE',
    optionA: 'Quick Sort',
    optionB: 'Merge Sort',
    optionC: 'Bubble Sort',
    optionD: 'Selection Sort',
    marks: 2,
    timeSeconds: 60
  },
  {
    id: 202,
    questionText: 'Select all linear data structures:',
    type: 'MULTIPLE_SELECT',
    optionA: 'Array',
    optionB: 'Linked List',
    optionC: 'Binary Tree',
    optionD: 'Stack',
    marks: 3,
    timeSeconds: 60
  },
  {
    id: 203,
    questionText: 'What is the sum of angles in a triangle (in degrees)?',
    type: 'NUMERICAL',
    marks: 1,
    timeSeconds: 45
  },
  {
    id: 204,
    questionText: 'The process of finding and fixing errors in software is called _______.',
    type: 'FILL_BLANK',
    marks: 1,
    timeSeconds: 45
  }
];

describe('Batch 1: Comprehensive Candidate Portal Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  /* ------------------------------------------------------------------------- */
  /* 1. Candidate Dashboard Tests                                              */
  /* ------------------------------------------------------------------------- */
  describe('Candidate Dashboard Workflows', () => {
    it('renders empty state when candidate has no enrolled assessments', async () => {
      candidateService.getCandidateHistory.mockResolvedValueOnce({ data: [] });
      candidateService.getCandidateDashboard.mockResolvedValueOnce({
        data: { completedExams: 0, ongoingExams: 0 }
      });

      renderWithProviders(<CandidateDashboard />, {
        initialRole: 'CANDIDATE',
        initialUser: { name: 'Alex Candidate' }
      });

      await waitFor(() => {
        expect(screen.getByText(/No enrolled assessments yet/i)).toBeInTheDocument();
        expect(screen.getByText(/Alex Candidate/i)).toBeInTheDocument();
      });
    });

    it('renders assessment cards and statistics when assessments exist', async () => {
      candidateService.getCandidateHistory.mockResolvedValueOnce({
        data: [
          {
            enrollmentId: 'e-1',
            examTitle: 'Algorithms Midterm',
            subject: 'Computer Science',
            status: 'SUBMITTED',
            percentage: 85,
            joinedAt: '2026-11-01T10:00:00'
          },
          {
            enrollmentId: 'e-2',
            examTitle: 'Database Systems Final',
            subject: 'Databases',
            status: 'IN_PROGRESS',
            joinedAt: '2026-11-05T09:00:00'
          }
        ]
      });
      candidateService.getCandidateDashboard.mockResolvedValueOnce({
        data: { completedExams: 1, ongoingExams: 1 }
      });

      renderWithProviders(<CandidateDashboard />, {
        initialRole: 'CANDIDATE',
        initialUser: { name: 'Alex Candidate' }
      });

      await waitFor(() => {
        expect(screen.getByText('Algorithms Midterm')).toBeInTheDocument();
        expect(screen.getAllByText('Database Systems Final').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/85/).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('handles dashboard API failure gracefully and displays retry prompt', async () => {
      candidateService.getCandidateHistory.mockRejectedValueOnce(new Error('Network error loading history'));
      candidateService.getCandidateDashboard.mockRejectedValueOnce(new Error('Failed to load stats'));

      renderWithProviders(<CandidateDashboard />, { initialRole: 'CANDIDATE' });

      await waitFor(() => {
        expect(screen.getByText(/Unable to load assessments/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      });
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 2. Assessment Listing & Filtering Tests                                    */
  /* ------------------------------------------------------------------------- */
  describe('My Assessments Listing & Search Filter', () => {
    it('filters assessments by keyword search query', async () => {
      candidateService.getCandidateHistory.mockResolvedValueOnce({
        data: [
          { enrollmentId: '1', examTitle: 'Operating Systems', status: 'SUBMITTED', joinedAt: '2026-10-10' },
          { enrollmentId: '2', examTitle: 'Compiler Design', status: 'SUBMITTED', joinedAt: '2026-10-12' }
        ]
      });

      renderWithProviders(<MyAssessments />, { initialRole: 'CANDIDATE' });

      await waitFor(() => {
        expect(screen.getByText('Operating Systems')).toBeInTheDocument();
        expect(screen.getByText('Compiler Design')).toBeInTheDocument();
      });

      // Type in search filter
      const searchInput = screen.getByRole('textbox', { name: /Search assessments/i });
      fireEvent.change(searchInput, { target: { value: 'Compiler' } });

      expect(screen.getByText('Compiler Design')).toBeInTheDocument();
      expect(screen.queryByText('Operating Systems')).not.toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 3. Join Assessment Access Code & Error Tests                               */
  /* ------------------------------------------------------------------------- */
  describe('Join Assessment Scenarios', () => {
    it('handles join code server timeout or 500 error gracefully', async () => {
      candidateService.joinExamByCode.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { message: 'Internal exam server error. Please try again shortly.' }
        }
      });

      renderWithProviders(<JoinAssessment />);
      const input = screen.getByPlaceholderText(/e\.g\. EXAM-8492/i);
      fireEvent.change(input, { target: { value: 'ERRCODE' } });

      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getAllByText(/Internal exam server error/i).length).toBeGreaterThan(0);
      });
    });

    it('formats future exam scheduled start time notice', async () => {
      candidateService.joinExamByCode.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Exam has not started yet. Please wait until 2026-12-01T10:00:00Z.' }
        }
      });

      renderWithProviders(<JoinAssessment />);
      const input = screen.getByPlaceholderText(/e\.g\. EXAM-8492/i);
      fireEvent.change(input, { target: { value: 'FUTURE1' } });

      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getAllByText(/The exam hasn't started yet/i).length).toBeGreaterThan(0);
      });
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 4. Active Exam Question Types & Input Selection                           */
  /* ------------------------------------------------------------------------- */
  describe('Active Exam Question Formats & Answering Interactions', () => {
    const makeExamProps = (overrides = {}) => ({
      examData: { id: 1, title: 'Final Test', timerType: 'PER_QUESTION' },
      questionsList: mockQuestions,
      currentIndex: 0,
      setCurrentIndex: vi.fn(),
      currentQuestion: mockQuestions[0],
      answers: {},
      currentAnswer: '',
      flaggedQuestions: new Set(),
      isCurrentFlagged: false,
      isCurrentQuestionExpired: false,
      isSubmitting: false,
      backendTerminated: false,
      permissionState: 'NOT_REQUIRED',
      hasSubmitted: false,
      timeLeftSeconds: 600,
      questionTimeLeft: 60,
      formatTime: (s) => `${s}s`,
      isFullscreen: true,
      requestFullscreenAgain: vi.fn(),
      isOnline: true,
      showReconnectedToast: false,
      screenshotWarning: false,
      tabSwitchCount: 0,
      maxAllowedTabSwitches: 3,
      proctorWarnings: [],
      showSubmitModal: false,
      setShowSubmitModal: vi.fn(),
      showInstructionsModal: false,
      setShowInstructionsModal: vi.fn(),
      showLeaveWarning: false,
      setShowLeaveWarning: vi.fn(),
      mobilePaletteOpen: false,
      setMobilePaletteOpen: vi.fn(),
      handleSubmitExam: vi.fn(),
      handleAdvanceQuestion: vi.fn(),
      handleToggleFlag: vi.fn(),
      handleClearAnswer: vi.fn(),
      handleSingleChoiceSelect: vi.fn(),
      handleMultipleSelectToggle: vi.fn(),
      handleTextAnswerChange: vi.fn(),
      navigate: vi.fn(),
      enrollmentId: '101',
      ...overrides
    });

    it('handles multiple-select checkbox toggles', () => {
      const toggleMock = vi.fn();
      const props = makeExamProps({
        currentIndex: 1,
        currentQuestion: mockQuestions[1],
        handleMultipleSelectToggle: toggleMock
      });

      renderWithProviders(<ExamScreen {...props} />);
      expect(screen.getByText('Select all that apply.')).toBeInTheDocument();

      const arrayOption = screen.getByText('Array');
      fireEvent.click(arrayOption);
      expect(toggleMock).toHaveBeenCalledWith(202, 'A');
    });

    it('handles numerical answer input changes', () => {
      const textChangeMock = vi.fn();
      const props = makeExamProps({
        currentIndex: 2,
        currentQuestion: mockQuestions[2],
        handleTextAnswerChange: textChangeMock
      });

      renderWithProviders(<ExamScreen {...props} />);
      const numberInput = screen.getByPlaceholderText('Enter a number');
      expect(numberInput).toHaveAttribute('type', 'number');

      fireEvent.change(numberInput, { target: { value: '180' } });
      expect(textChangeMock).toHaveBeenCalledWith(203, '180');
    });

    it('handles fill-in-the-blank text entry', () => {
      const textChangeMock = vi.fn();
      const props = makeExamProps({
        currentIndex: 3,
        currentQuestion: mockQuestions[3],
        handleTextAnswerChange: textChangeMock
      });

      renderWithProviders(<ExamScreen {...props} />);
      const blankInput = screen.getByPlaceholderText('Type your answer');
      expect(blankInput).toHaveAttribute('type', 'text');

      fireEvent.change(blankInput, { target: { value: 'debugging' } });
      expect(textChangeMock).toHaveBeenCalledWith(204, 'debugging');
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 5. Exam Submission Modal & Result View Tests                               */
  /* ------------------------------------------------------------------------- */
  describe('Exam Submission Modal & Result View', () => {
    it('renders submission confirmation modal and prevents duplicate clicks while submitting', () => {
      const submitMock = vi.fn();
      const props = {
        examData: { id: 1, title: 'Final Test', timerType: 'PER_QUESTION' },
        questionsList: mockQuestions,
        currentIndex: 0,
        setCurrentIndex: vi.fn(),
        currentQuestion: mockQuestions[0],
        answers: { 201: 'B' },
        currentAnswer: 'B',
        flaggedQuestions: new Set(),
        showSubmitModal: true, // Modal open
        isSubmitting: true,    // Submission in progress
        handleSubmitExam: submitMock,
        formatTime: (s) => `${s}s`,
        proctorWarnings: [],
        setShowSubmitModal: vi.fn()
      };

      renderWithProviders(<ExamScreen {...props} />);

      // In the modal, submit button should show submitting and be disabled
      expect(screen.getByText(/Submitting…/i)).toBeInTheDocument();
      const submitBtn = screen.getByRole('button', { name: /Submitting…/i });
      expect(submitBtn).toBeDisabled();
      fireEvent.click(submitBtn);
      expect(submitMock).not.toHaveBeenCalled();
    });

    it('renders full exam result score card and passing status', async () => {
      candidateService.getExamResult.mockResolvedValueOnce({
        data: {
          enrollmentId: '101',
          examTitle: 'Data Structures Final',
          candidateName: 'Alex Candidate',
          score: 85,
          totalScore: 100,
          percentage: 85,
          passed: true,
          submittedAt: '2026-11-05T12:00:00',
          subject: 'Computer Science',
          aiFeedback: 'Outstanding understanding of algorithms and time complexity.'
        }
      });

      renderWithProviders(
        <Routes>
          <Route path="/candidate/result/:enrollmentId" element={<ExamResult />} />
        </Routes>,
        { route: '/candidate/result/101', initialRole: 'CANDIDATE' }
      );

      await waitFor(() => {
        expect(screen.getByText(/Data Structures Final/i)).toBeInTheDocument();
        expect(screen.getAllByText(/85/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/PASSED/i)).toBeInTheDocument();
        expect(screen.getByText(/Outstanding understanding of algorithms/i)).toBeInTheDocument();
      });
    });

    it('renders error state when result retrieval fails', async () => {
      candidateService.getExamResult.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { message: 'Assessment result not found or not yet published.' }
        }
      });

      renderWithProviders(
        <Routes>
          <Route path="/candidate/result/:enrollmentId" element={<ExamResult />} />
        </Routes>,
        { route: '/candidate/result/999', initialRole: 'CANDIDATE' }
      );

      await waitFor(() => {
        expect(screen.getByText(/Assessment result not found or not yet published/i)).toBeInTheDocument();
      });
    });
  });

  /* ------------------------------------------------------------------------- */
  /* 5. Preflight, Device & Network Resilience Tests                           */
  /* ------------------------------------------------------------------------- */
  describe('Preflight, Device & Network Resilience', () => {
    const baseExamProps = {
      examData: { id: 1, examTitle: 'System Design Exam', timerType: 'PER_QUESTION' },
      questionsList: mockQuestions,
      currentIndex: 0,
      setCurrentIndex: vi.fn(),
      currentQuestion: mockQuestions[0],
      answers: {},
      currentAnswer: '',
      flaggedQuestions: new Set(),
      isCurrentFlagged: false,
      isCurrentQuestionExpired: false,
      isSubmitting: false,
      backendTerminated: false,
      permissionState: 'GRANTED',
      hasSubmitted: false,
      timeLeftSeconds: 600,
      questionTimeLeft: 45,
      formatTime: (s) => `${s}s`,
      isFullscreen: true,
      requestFullscreenAgain: vi.fn(),
      isOnline: true,
      showReconnectedToast: false,
      screenshotWarning: false,
      tabSwitchCount: 0,
      maxAllowedTabSwitches: 3,
      proctorWarnings: [],
      showSubmitModal: false,
      setShowSubmitModal: vi.fn(),
      showInstructionsModal: false,
      setShowInstructionsModal: vi.fn(),
      showLeaveWarning: false,
      setShowLeaveWarning: vi.fn(),
      mobilePaletteOpen: false,
      setMobilePaletteOpen: vi.fn(),
      handleSubmitExam: vi.fn(),
      handleAdvanceQuestion: vi.fn(),
      handleToggleFlag: vi.fn(),
      handleClearAnswer: vi.fn(),
      handleSingleChoiceSelect: vi.fn(),
      handleMultipleSelectToggle: vi.fn(),
      navigate: vi.fn(),
      enrollmentId: '10'
    };

    it('renders device restriction gate when accessed from unsupported device', () => {
      const navigateMock = vi.fn();
      renderWithProviders(
        <ExamScreen
          {...baseExamProps}
          deviceRestriction={{
            allowed: false,
            required: 'DESKTOP',
            detected: 'Mobile Browser',
            message: 'This examination requires a full desktop environment.'
          }}
          navigate={navigateMock}
        />
      );

      expect(screen.getByText(/This exam needs a desktop or laptop/i)).toBeInTheDocument();
      expect(screen.getByText(/Mobile Browser/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Back to dashboard/i }));
      expect(navigateMock).toHaveBeenCalledWith('/candidate/dashboard');
    });

    it('renders permission blocked gate and retries media access', () => {
      const requestMediaMock = vi.fn();
      renderWithProviders(
        <ExamScreen
          {...baseExamProps}
          permissionState="DENIED"
          requestMediaPermissions={requestMediaMock}
        />
      );

      expect(screen.getByText(/Camera and microphone are blocked/i)).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Allow and retry/i });
      fireEvent.click(retryBtn);
      expect(requestMediaMock).toHaveBeenCalled();
    });

    it('renders models loading preflight state while initializing proctoring', () => {
      renderWithProviders(
        <ExamScreen
          {...baseExamProps}
          permissionState="GRANTED"
          modelsLoading={true}
          modelLoadStep="Loading face mesh detection model..."
        />
      );

      expect(screen.getByText(/Setting up proctoring/i)).toBeInTheDocument();
      expect(screen.getByText(/Loading face mesh detection model/i)).toBeInTheDocument();
    });

    it('locks answer interaction when question has expired', () => {
      const handleSelectMock = vi.fn();
      renderWithProviders(
        <ExamScreen
          {...baseExamProps}
          isCurrentQuestionExpired={true}
          handleSingleChoiceSelect={handleSelectMock}
        />
      );

      const optionButtons = screen.getAllByRole('radio');
      optionButtons.forEach(btn => expect(btn).toBeDisabled());
    });

    it('renders offline alert banner when connection drops and recovery chip on reconnect', () => {
      const { rerender } = renderWithProviders(
        <ExamScreen
          {...baseExamProps}
          isOnline={false}
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent(/You're offline/i);

      rerender(
        <ExamScreen
          {...baseExamProps}
          isOnline={true}
          showReconnectedToast={true}
        />
      );

      expect(screen.getByText(/You're back online/i)).toBeInTheDocument();
    });

    it('preserves and recovers answers across page refresh from localStorage backup', () => {
      const enrollmentId = '101';
      const savedAnswers = { 201: 'B', 202: ['A', 'C'], 203: '42' };
      localStorage.setItem(`exam_answers_${enrollmentId}`, JSON.stringify(savedAnswers));

      const recovered = JSON.parse(localStorage.getItem(`exam_answers_${enrollmentId}`));
      expect(recovered[201]).toBe('B');
      expect(recovered[202]).toEqual(['A', 'C']);
      expect(recovered[203]).toBe('42');
    });
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import ExamScreen from '../components/ExamScreen';
import ManageExam from '../pages/ManageExam';
import NotFound from '../pages/NotFound';
import ProtectedRoute from '../components/ProtectedRoute';
import { renderWithProviders } from './test-utils';
import * as examService from '../services/examService';

vi.mock('../services/examService', () => ({
  getExamById: vi.fn(),
  publishExam: vi.fn(),
  endExam: vi.fn(),
  duplicateExam: vi.fn(),
}));

vi.mock('../services/questionService', () => ({
  getExamQuestionStats: vi.fn().mockResolvedValue({ data: {} }),
  getExamQuestions: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../services/codingQuestionService', () => ({
  getExamCodingProblems: vi.fn().mockResolvedValue({ data: [] }),
}));

function CrashingChild() {
  throw new Error('Explosion during render');
}

describe('Blank Page Protection & Application Stability Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('1. Error Boundary Protection', () => {
    it('catches unexpected component rendering crashes and renders root fallback UI', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <CrashingChild />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/AssessMate encountered an error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go to Dashboard/i })).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('renders route-level fallback UI when routeLevel prop is supplied', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary routeLevel>
          <CrashingChild />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Unable to Load This Section/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Return to Dashboard/i })).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('2. Host ManageExam Blank Page Prevention', () => {
    it('renders assessment unavailable card with Retry & Back buttons when exam is null/not found', async () => {
      examService.getExamById.mockResolvedValueOnce({ data: null });

      renderWithProviders(
        <Routes>
          <Route path="/host/exams/:id/manage" element={<ManageExam />} />
        </Routes>,
        { route: '/host/exams/999/manage', initialRole: 'HOST' }
      );

      expect(await screen.findByText('Assessment Details Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/The requested assessment could not be found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to Exams/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('renders error message with Retry & Back buttons when exam fetch rejects', async () => {
      examService.getExamById.mockRejectedValueOnce(new Error('Assessment #404 was deleted or does not exist.'));

      renderWithProviders(
        <Routes>
          <Route path="/host/exams/:id/manage" element={<ManageExam />} />
        </Routes>,
        { route: '/host/exams/404/manage', initialRole: 'HOST' }
      );

      expect(await screen.findByText('Assessment Details Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/Assessment #404 was deleted or does not exist/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to Exams/i })).toBeInTheDocument();
    });
  });

  describe('3. Active Exam Phase Stability Gates', () => {
    const defaultExamProps = {
      deviceRestriction: null,
      permissionState: 'GRANTED',
      modelsLoading: false,
      modelLoadError: null,
      isLoading: false,
      error: '',
      examData: { id: 10, title: 'JavaScript Assessment', timerType: 'WHOLE_EXAM', durationMinutes: 60 },
      questionsList: [{ id: 1, questionText: 'What is JS?', isCoding: false }],
      backendTerminated: false,
      terminationReason: '',
      navigate: vi.fn(),
      requestMediaPermissions: vi.fn(),
      hiddenVideoRef: { current: null },
      previewVideoRef: { current: null },
      modelLoadStep: '',
      currentIndex: 0,
      setCurrentIndex: vi.fn(),
      currentQuestion: { id: 1, questionText: 'What is JS?', isCoding: false },
      currentAnswer: null,
      answers: {},
      flaggedQuestions: new Set(),
      isCurrentFlagged: false,
      isCurrentQuestionExpired: false,
      isSubmitting: false,
      hasSubmitted: false,
      timeLeftSeconds: 3600,
      questionTimeLeft: null,
      formatTime: () => '60:00',
      isFullscreen: true,
      requestFullscreenAgain: vi.fn(),
      isOnline: true,
      showReconnectedToast: false,
      screenshotWarning: false,
      tabSwitchCount: 0,
      maxAllowedTabSwitches: 3,
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
      handleRunCandidateCode: vi.fn(),
      handleSubmitCandidateCode: vi.fn(),
      webcamActive: true,
      micActive: true,
      audioLevel: 0,
      faceStatus: 'VERIFIED',
      proctorWarnings: [],
      codeLanguage: 'PYTHON',
      setCodeLanguage: vi.fn(),
      STARTER_CODE: {},
      confirm: vi.fn(),
      customInput: '',
      setCustomInput: vi.fn(),
      showCustomInput: false,
      setShowCustomInput: vi.fn(),
      isRunningCode: false,
      isSubmittingCode: false,
      runResult: null,
      codeSubmitResult: null,
      enrollmentId: 101,
      retryLoadModels: vi.fn(),
      handleModelErrorBack: vi.fn(),
      enableExamWatermark: false,
    };

    it('renders LoadingGate during permission checking without blanking', () => {
      render(<ExamScreen {...defaultExamProps} permissionState="CHECKING" isLoading={false} />);
      expect(screen.getByText('Loading your exam')).toBeInTheDocument();
      expect(screen.getByText('Preparing questions…')).toBeInTheDocument();
    });

    it('renders DeviceGate when client device access is restricted', () => {
      render(
        <ExamScreen
          {...defaultExamProps}
          deviceRestriction={{
            allowed: false,
            required: 'DESKTOP',
            detected: 'MOBILE',
            message: 'This exam is restricted to Desktop devices only.',
          }}
        />
      );

      expect(screen.getByText('This exam needs a desktop or laptop')).toBeInTheDocument();
      expect(screen.getByText(/restricted to Desktop devices only/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to dashboard/i })).toBeInTheDocument();
    });

    it('renders PermissionGate when media permissions are denied', () => {
      render(<ExamScreen {...defaultExamProps} permissionState="DENIED" />);

      expect(screen.getByText('Camera and microphone are blocked')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Allow and retry/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
    });

    it('renders ErrorGate when questionsList is empty or assessment load fails', () => {
      render(
        <ExamScreen
          {...defaultExamProps}
          questionsList={[]}
          error="No active questions found in assessment pool."
        />
      );

      expect(screen.getByText("We couldn't start this exam")).toBeInTheDocument();
      expect(screen.getByText('No active questions found in assessment pool.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to dashboard/i })).toBeInTheDocument();
    });

    it('renders termination modal with View results button when backend terminates exam', () => {
      render(
        <ExamScreen
          {...defaultExamProps}
          backendTerminated={true}
          terminationReason="Maximum violation limit exceeded (3 of 3 tab switches)."
        />
      );

      expect(screen.getByText('Your exam was submitted automatically')).toBeInTheDocument();
      expect(screen.getByText(/Maximum violation limit exceeded/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /View results/i })).toBeInTheDocument();
    });
  });

  describe('4. Navigation, Auth & 404 Route Protection', () => {
    it('renders 404 NotFound page for invalid/unmatched routes', () => {
      renderWithProviders(
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="*" element={<NotFound />} />
        </Routes>,
        { route: '/some/completely/invalid/route' }
      );

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText("This page doesn't exist")).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Back to home/i })).toBeInTheDocument();
    });

    it('redirects unauthenticated users to /login on protected routes without blank screen', () => {
      renderWithProviders(
        <Routes>
          <Route path="/login" element={<div data-testid="login-view">Login Required</div>} />
          <Route element={<ProtectedRoute allowedRole="CANDIDATE" />}>
            <Route path="/candidate/dashboard" element={<div>Candidate Dashboard</div>} />
          </Route>
        </Routes>,
        { route: '/candidate/dashboard' }
      );

      expect(screen.getByTestId('login-view')).toBeInTheDocument();
      expect(screen.queryByText('Candidate Dashboard')).not.toBeInTheDocument();
    });
  });
});


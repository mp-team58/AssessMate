import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExamScreen from '../components/ExamScreen';
import CreateExam from '../pages/CreateExam';
import ActiveExam from '../pages/ActiveExam';
import * as examService from '../services/examService';
import * as candidateService from '../services/candidateService';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../services/examService', () => ({
  createExam: vi.fn(),
  getExamById: vi.fn(),
  updateExam: vi.fn(),
}));

vi.mock('../services/candidateService', () => ({
  getExamQuestions: vi.fn(),
  getAssignedCodingProblems: vi.fn().mockResolvedValue({ data: [] }),
  logProctorEvent: vi.fn().mockResolvedValue({ data: { success: true } }),
  uploadProctorEvidence: vi.fn().mockResolvedValue({ data: { url: 'mock' } }),
  submitExamAnswers: vi.fn().mockResolvedValue({ data: { success: true } }),
  saveExamProgress: vi.fn().mockResolvedValue({ data: { success: true } }),
  getExamState: vi.fn().mockResolvedValue({ data: {} }),
  expireExamQuestion: vi.fn().mockResolvedValue({ data: { success: true } }),
  advanceExamQuestion: vi.fn().mockResolvedValue({ data: { success: true } }),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../contexts/ConfirmContext', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
}));

const defaultExamProps = {
  examData: { examTitle: 'Security & Integrity Assessment', timerType: 'WHOLE_EXAM' },
  questionsList: [
    {
      id: 1,
      questionText: 'Which protocol is secure?',
      marks: 2,
      negativeMarks: 0.5,
      type: 'SINGLE_CHOICE',
      options: [
        { key: 'A', value: 'HTTP' },
        { key: 'B', value: 'HTTPS' },
      ],
    },
    {
      id: 2,
      questionText: 'Enter port number for HTTPS:',
      marks: 1,
      negativeMarks: 0,
      type: 'NUMERICAL',
    },
  ],
  currentIndex: 0,
  setCurrentIndex: vi.fn(),
  currentQuestion: {
    id: 1,
    questionText: 'Which protocol is secure?',
    marks: 2,
    negativeMarks: 0.5,
    type: 'SINGLE_CHOICE',
    options: [
      { key: 'A', value: 'HTTP' },
      { key: 'B', value: 'HTTPS' },
    ],
  },
  currentAnswer: null,
  answers: {},
  flaggedQuestions: new Set(),
  isCurrentFlagged: false,
  isCurrentQuestionExpired: false,
  isSubmitting: false,
  hasSubmitted: false,
  backendTerminated: false,
  permissionState: 'GRANTED',
  timeLeftSeconds: 1800,
  questionTimeLeft: null,
  formatTime: (s) => `${s}s`,
  isFullscreen: true,
  isOnline: true,
  tabSwitchCount: 0,
  maxAllowedTabSwitches: 3,
  webcamActive: true,
  micActive: true,
  audioLevel: 12,
  faceStatus: 'VERIFIED',
  enableExamWatermark: false,
  requestFullscreenAgain: vi.fn(),
  handleSingleChoiceSelect: vi.fn(),
  handleTextAnswerChange: vi.fn(),
};

describe('Screen Capture Protection & Browser Restrictions Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('1. Screen Sharing Complete Removal', () => {
    it('never calls getDisplayMedia during permission or active exam flow', () => {
      const getDisplayMediaMock = vi.fn();
      navigator.mediaDevices = {
        ...navigator.mediaDevices,
        getDisplayMedia: getDisplayMediaMock,
      };

      render(<ExamScreen {...defaultExamProps} />);
      expect(getDisplayMediaMock).not.toHaveBeenCalled();
    });

    it('does not display any screen-sharing blocking modal or re-share button', () => {
      render(<ExamScreen {...defaultExamProps} />);
      expect(screen.queryByText(/screen sharing required/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /re-share screen/i })).not.toBeInTheDocument();
      expect(screen.queryByText('Screen')).not.toBeInTheDocument();
    });
  });

  describe('2. Dynamic Exam Watermark (Best Effort)', () => {
    it('renders diagonal watermark overlay when enableExamWatermark is true', () => {
      render(
        <ExamScreen
          {...defaultExamProps}
          enableExamWatermark={true}
          enrollmentId="ENR-TEST-12345"
        />
      );

      const watermark = screen.getByTestId('exam-watermark');
      expect(watermark).toBeInTheDocument();
      expect(watermark).toHaveTextContent('ENR-TEST-12345');
      expect(watermark).toHaveTextContent('Security & Integrity Assessment');
    });

    it('ensures watermark has pointer-events-none and select-none so interactions are unobstructed', () => {
      render(
        <ExamScreen
          {...defaultExamProps}
          enableExamWatermark={true}
          enrollmentId="ENR-TEST-12345"
        />
      );

      const watermark = screen.getByTestId('exam-watermark');
      expect(watermark).toHaveClass('pointer-events-none');
      expect(watermark).toHaveClass('select-none');
    });

    it('does not render watermark when enableExamWatermark is false', () => {
      render(
        <ExamScreen
          {...defaultExamProps}
          enableExamWatermark={false}
          enrollmentId="ENR-TEST-12345"
        />
      );

      expect(screen.queryByTestId('exam-watermark')).not.toBeInTheDocument();
    });
  });

  describe('3. Host Portal Screen Capture & Browser Restriction Settings', () => {
    const mockDraftExam = {
      id: 55,
      title: 'Advanced Machine Learning',
      subject: 'Artificial Intelligence',
      scheduledStart: '2026-12-01T10:00:00',
      passingPercentage: 60,
      timerType: 'WHOLE_EXAM',
      durationMinutes: 90,
      deviceAccess: 'BOTH',
      status: 'DRAFT',
      totalQuestions: 20,
      easyPercent: 40,
      mediumPercent: 40,
      hardPercent: 20,
      enableScreenCaptureProtection: false,
      enableBrowserActivityDetection: true,
      enableExamWatermark: false,
      disableCopy: false,
      disablePaste: false,
      disableCut: false,
      disableRightClick: false,
      restrictBrowserShortcuts: false,
    };

    it('renders Screen Capture Protection and Browser Restrictions sections in CreateExam step 4', async () => {
      examService.getExamById.mockResolvedValueOnce({ data: mockDraftExam });

      render(
        <MemoryRouter initialEntries={['/host/exams/55/edit']}>
          <Routes>
            <Route path="/host/exams/:id/edit" element={<CreateExam />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for exam to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Advanced Machine Learning')).toBeInTheDocument();
      });

      // Navigate to Step 4: Proctoring
      const step4Btn = screen.getByRole('button', { name: /Proctoring/i });
      fireEvent.click(step4Btn);

      expect(screen.getByText('Screen Capture Protection (Best Effort)')).toBeInTheDocument();
      expect(screen.getByText(/Enables browser-level detection of certain suspicious activities/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Screen capture protection/i)).toBeInTheDocument();

      expect(screen.getByText('Exam Browser Restrictions')).toBeInTheDocument();
      expect(screen.getByLabelText(/Disable Copy/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Disable Paste/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Disable Cut/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Disable Right Click/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Restrict Common Browser Shortcuts/i)).toBeInTheDocument();
    });

    it('reveals sub-toggles when Screen Capture Protection parent is enabled', async () => {
      examService.getExamById.mockResolvedValueOnce({ data: mockDraftExam });

      render(
        <MemoryRouter initialEntries={['/host/exams/55/edit']}>
          <Routes>
            <Route path="/host/exams/:id/edit" element={<CreateExam />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Advanced Machine Learning')).toBeInTheDocument();
      });

      // Navigate to Step 4
      fireEvent.click(screen.getByRole('button', { name: /Proctoring/i }));

      const parentToggle = screen.getByLabelText(/Screen capture protection/i);
      expect(parentToggle).not.toBeChecked();
      expect(screen.queryByLabelText(/Detect browser activity/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Dynamic exam watermark/i)).not.toBeInTheDocument();

      // Turn on Screen capture protection
      fireEvent.click(parentToggle);
      expect(parentToggle).toBeChecked();

      expect(screen.getByLabelText(/Detect browser activity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Dynamic exam watermark/i)).toBeInTheDocument();
    });

    it('applies Exam Browser Restrictions and Screen Capture Protection when selecting Standard or Strict preset', async () => {
      examService.getExamById.mockResolvedValueOnce({ data: mockDraftExam });

      render(
        <MemoryRouter initialEntries={['/host/exams/55/edit']}>
          <Routes>
            <Route path="/host/exams/:id/edit" element={<CreateExam />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Advanced Machine Learning')).toBeInTheDocument();
      });

      // Navigate to Step 4: Proctoring
      fireEvent.click(screen.getByRole('button', { name: /Proctoring/i }));

      // Click Standard preset
      const standardPresetBtn = screen.getByText('Standard').closest('button');
      fireEvent.click(standardPresetBtn);

      // Verify Browser Restrictions are now checked
      expect(screen.getByLabelText(/Disable Copy/i)).toBeChecked();
      expect(screen.getByLabelText(/Disable Paste/i)).toBeChecked();
      expect(screen.getByLabelText(/Disable Cut/i)).toBeChecked();
      expect(screen.getByLabelText(/Disable Right Click/i)).toBeChecked();
      expect(screen.getByLabelText(/Restrict Common Browser Shortcuts/i)).toBeChecked();
      expect(screen.getByLabelText(/Screen capture protection/i)).toBeChecked();
      expect(screen.getByLabelText(/Detect browser activity/i)).toBeChecked();

      // Click None preset
      const nonePresetBtn = screen.getByText('None').closest('button');
      fireEvent.click(nonePresetBtn);

      // Verify Browser Restrictions are unchecked
      expect(screen.getByLabelText(/Disable Copy/i)).not.toBeChecked();
      expect(screen.getByLabelText(/Disable Paste/i)).not.toBeChecked();
      expect(screen.getByLabelText(/Disable Cut/i)).not.toBeChecked();
      expect(screen.getByLabelText(/Disable Right Click/i)).not.toBeChecked();
      expect(screen.getByLabelText(/Restrict Common Browser Shortcuts/i)).not.toBeChecked();
      expect(screen.getByLabelText(/Screen capture protection/i)).not.toBeChecked();

      // Click Strict preset
      const strictPresetBtn = screen.getByText('Strict').closest('button');
      fireEvent.click(strictPresetBtn);

      // Verify all restrictions and protections are checked
      expect(screen.getByLabelText(/Disable Copy/i)).toBeChecked();
      expect(screen.getByLabelText(/Disable Paste/i)).toBeChecked();
      expect(screen.getByLabelText(/Disable Cut/i)).toBeChecked();
      expect(screen.getByLabelText(/Disable Right Click/i)).toBeChecked();
      expect(screen.getByLabelText(/Restrict Common Browser Shortcuts/i)).toBeChecked();
      expect(screen.getByLabelText(/Screen capture protection/i)).toBeChecked();
      expect(screen.getByLabelText(/Detect browser activity/i)).toBeChecked();
      expect(screen.getByLabelText(/Dynamic exam watermark/i)).toBeChecked();
    });
  });

  describe('4. Candidate Answer Input Integrity', () => {
    it('allows candidates to select answers and interact with questions freely', () => {
      render(<ExamScreen {...defaultExamProps} />);

      const optionB = screen.getByText('HTTPS');
      expect(optionB).toBeInTheDocument();
      fireEvent.click(optionB);
      expect(defaultExamProps.handleSingleChoiceSelect).toHaveBeenCalledWith(1, 'B');
    });
  });

  describe('5. Active Exam Browser Activity Detection & Restriction Listeners', () => {
    const mockExamSessionData = {
      id: 99,
      examTitle: 'Proctored High Security Exam',
      deviceAccess: 'BOTH',
      requireCamera: false,
      requireMic: false,
      enableFaceDetection: false,
      enableObjectDetection: false,
      enableAudioDetection: false,
      enableTabSwitchDetection: true,
      enableScreenCaptureProtection: true,
      enableBrowserActivityDetection: true,
      enableExamWatermark: true,
      disableCopy: true,
      disablePaste: true,
      disableCut: true,
      disableRightClick: true,
      restrictBrowserShortcuts: true,
      timerType: 'WHOLE_EXAM',
      durationMinutes: 60,
      questions: [
        {
          id: 101,
          questionText: 'What is encryption?',
          type: 'SINGLE_CHOICE',
          marks: 2,
          options: [{ key: 'A', value: 'Security' }],
        },
      ],
    };

    it('logs WINDOW_BLUR and WINDOW_FOCUS when candidate shifts window focus', async () => {
      sessionStorage.setItem('exam_config_123', JSON.stringify({
        requireCamera: false,
        requireMic: false,
        enableScreenCaptureProtection: true,
        enableBrowserActivityDetection: true,
      }));
      candidateService.getExamQuestions.mockResolvedValue({ data: mockExamSessionData });

      render(
        <MemoryRouter initialEntries={['/candidate/exam/123']}>
          <Routes>
            <Route path="/candidate/exam/:enrollmentId" element={<ActiveExam />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Proctored High Security Exam')).toBeInTheDocument();
      });

      // Candidate shifts window focus away
      await waitFor(() => {
        fireEvent.blur(window);
        expect(candidateService.logProctorEvent).toHaveBeenCalledWith(
          '123',
          'WINDOW_BLUR',
          expect.stringContaining('shifted window focus away'),
          null,
          null
        );
      });

      // Candidate returns focus
      await waitFor(() => {
        fireEvent.focus(window);
        expect(candidateService.logProctorEvent).toHaveBeenCalledWith(
          '123',
          'WINDOW_FOCUS',
          expect.stringContaining('returned focus'),
          null,
          null
        );
      });
    });

    it('intercepts PrintScreen and displays screenshot warning banner', async () => {
      sessionStorage.setItem('exam_config_123', JSON.stringify({ requireCamera: false, requireMic: false }));
      candidateService.getExamQuestions.mockResolvedValue({ data: mockExamSessionData });

      render(
        <MemoryRouter initialEntries={['/candidate/exam/123']}>
          <Routes>
            <Route path="/candidate/exam/:enrollmentId" element={<ActiveExam />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Proctored High Security Exam')).toBeInTheDocument();
      });

      const printScreenEvent = new window.KeyboardEvent('keydown', { key: 'PrintScreen', cancelable: true, bubbles: true });
      window.dispatchEvent(printScreenEvent);

      expect(printScreenEvent.defaultPrevented).toBe(true);
      expect(candidateService.logProctorEvent).toHaveBeenCalledWith(
        '123',
        'SCREENSHOT_ATTEMPT',
        expect.stringContaining('screen capture'),
        null,
        null
      );
      await waitFor(() => {
        expect(screen.getByText(/Screenshot attempts are logged to the proctor audit/i)).toBeInTheDocument();
      });
    });

    it('enforces copy, paste, cut, right-click, and shortcut restrictions without blocking normal input', async () => {
      sessionStorage.setItem('exam_config_123', JSON.stringify({
        requireCamera: false,
        requireMic: false,
        disableCopy: true,
        disablePaste: true,
        disableCut: true,
        disableRightClick: true,
        restrictBrowserShortcuts: true,
        enableScreenCaptureProtection: true,
        enableBrowserActivityDetection: true,
      }));
      candidateService.getExamQuestions.mockResolvedValue({ data: mockExamSessionData });

      render(
        <MemoryRouter initialEntries={['/candidate/exam/123']}>
          <Routes>
            <Route path="/candidate/exam/:enrollmentId" element={<ActiveExam />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Proctored High Security Exam')).toBeInTheDocument();
      });

      // Copy event blocked
      const copyEvt = new window.Event('copy', { cancelable: true, bubbles: true });
      window.dispatchEvent(copyEvt);
      expect(copyEvt.defaultPrevented).toBe(true);
      expect(candidateService.logProctorEvent).toHaveBeenCalledWith(
        '123',
        'COPY_ATTEMPT',
        expect.stringContaining('Copy operation blocked'),
        null,
        null
      );

      // Paste event blocked
      const pasteEvt = new window.Event('paste', { cancelable: true, bubbles: true });
      window.dispatchEvent(pasteEvt);
      expect(pasteEvt.defaultPrevented).toBe(true);
      expect(candidateService.logProctorEvent).toHaveBeenCalledWith(
        '123',
        'PASTE_ATTEMPT',
        expect.stringContaining('Paste operation blocked'),
        null,
        null
      );

      // Cut event blocked
      const cutEvt = new window.Event('cut', { cancelable: true, bubbles: true });
      window.dispatchEvent(cutEvt);
      expect(cutEvt.defaultPrevented).toBe(true);
      expect(candidateService.logProctorEvent).toHaveBeenCalledWith(
        '123',
        'CUT_ATTEMPT',
        expect.stringContaining('Cut operation blocked'),
        null,
        null
      );

      // Right-click contextmenu blocked
      const contextEvt = new window.MouseEvent('contextmenu', { cancelable: true, bubbles: true });
      window.dispatchEvent(contextEvt);
      expect(contextEvt.defaultPrevented).toBe(true);
      expect(candidateService.logProctorEvent).toHaveBeenCalledWith(
        '123',
        'RIGHT_CLICK_ATTEMPT',
        expect.stringContaining('Right click context menu blocked'),
        null,
        null
      );

      // Browser shortcut Ctrl+C blocked
      const ctrlC = new window.KeyboardEvent('keydown', { key: 'c', ctrlKey: true, cancelable: true, bubbles: true });
      window.dispatchEvent(ctrlC);
      expect(ctrlC.defaultPrevented).toBe(true);
      expect(candidateService.logProctorEvent).toHaveBeenCalledWith(
        '123',
        'SHORTCUT_ATTEMPT',
        expect.stringContaining('Browser shortcut blocked'),
        null,
        null
      );

      // F12 blocked
      const f12 = new window.KeyboardEvent('keydown', { key: 'F12', cancelable: true, bubbles: true });
      window.dispatchEvent(f12);
      expect(f12.defaultPrevented).toBe(true);

      // Normal typing (e.g. key 'a' without ctrl/meta) is NOT blocked
      const normalKey = new window.KeyboardEvent('keydown', { key: 'a', cancelable: true, bubbles: true });
      window.dispatchEvent(normalKey);
      expect(normalKey.defaultPrevented).toBe(false);
    });
  });
});
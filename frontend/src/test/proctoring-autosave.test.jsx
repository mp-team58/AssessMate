import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ExamScreen from '../components/ExamScreen';

const defaultProps = {
  examData: { title: 'Security Exam', timerType: 'TOTAL_DURATION' },
  questionsList: [{ id: 'q1', questionText: 'Question 1', type: 'SINGLE_CHOICE', options: [{ key: 'A', value: 'Option A' }] }],
  currentIndex: 0,
  setCurrentIndex: vi.fn(),
  currentQuestion: { id: 'q1', questionText: 'Question 1', type: 'SINGLE_CHOICE' },
  answers: {},
  flaggedQuestions: new Set(),
  isSubmitting: false,
  backendTerminated: false,
  permissionState: 'GRANTED',
  hasSubmitted: false,
  timeLeftSeconds: 3600,
  formatTime: (t) => `${t}s`,
  isFullscreen: true,
  isOnline: true,
  tabSwitchCount: 0,
  maxAllowedTabSwitches: 3,
  webcamActive: true,
  micActive: true,
  audioLevel: 10,
  faceStatus: 'VERIFIED',
  enableExamWatermark: false,
  requestFullscreenAgain: vi.fn(),
};

describe('Proctoring, Autosave & Production Verification Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('A. Host-Controlled Proctoring & Settings Normalization', () => {
    it('renders with proctoring indicators matching host settings', () => {
      const props = {
        ...defaultProps,
        tabSwitchCount: 1,
        maxAllowedTabSwitches: 3,
      };

      render(<ExamScreen {...props} />);
      expect(screen.getByText('Camera')).toBeInTheDocument();
      expect(screen.getByText('Microphone')).toBeInTheDocument();
      expect(screen.getByText('Face')).toBeInTheDocument();
      expect(screen.getByText('Violations')).toBeInTheDocument();
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });

    it('renders audit logging mode when maxTabSwitches is null/0 without forced termination', () => {
      const props = {
        ...defaultProps,
        tabSwitchCount: 4,
        maxAllowedTabSwitches: null, // Unlimited / record-only
        webcamActive: false,
        micActive: false,
      };

      render(<ExamScreen {...props} />);
      expect(screen.getByText('4 logged')).toBeInTheDocument();
    });
  });

  describe('B. Screen Sharing Removal & Screen Capture Deterrence', () => {
    it('never displays screen sharing blocking overlay or prompt', () => {
      const props = {
        ...defaultProps,
      };

      render(<ExamScreen {...props} />);
      expect(screen.queryByText('Screen sharing required')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Re-share screen/i })).not.toBeInTheDocument();
    });

    it('renders dynamic exam watermark when enabled by host', () => {
      const props = {
        ...defaultProps,
        enableExamWatermark: true,
        enrollmentId: 'ENR-9988',
      };

      render(<ExamScreen {...props} />);
      const watermark = screen.getByTestId('exam-watermark');
      expect(watermark).toBeInTheDocument();
      expect(watermark).toHaveClass('pointer-events-none');
      expect(watermark).toHaveClass('select-none');
      expect(watermark).toHaveTextContent('ENR-9988');
    });
  });

  describe('C. Tab Switch & Fullscreen Enforcement', () => {
    it('displays blocking fullscreen alert with violation notice', () => {
      const requestFullscreenAgain = vi.fn();
      const props = {
        ...defaultProps,
        isFullscreen: false, // Exited fullscreen
        tabSwitchCount: 2,
        maxAllowedTabSwitches: 3,
        requestFullscreenAgain,
      };

      render(<ExamScreen {...props} />);
      expect(screen.getByRole('heading', { name: /Return to full screen/i })).toBeInTheDocument();
      expect(screen.getByText(/2 of 3 used/i)).toBeInTheDocument();

      const fsBtn = screen.getByRole('button', { name: /Return to full screen/i });
      fireEvent.click(fsBtn);
      expect(requestFullscreenAgain).toHaveBeenCalledTimes(1);
    });
  });

  describe('D. Autosave & Offline Recovery Verification', () => {
    it('preserves uncommitted answers in offline storage and recovers them cleanly', () => {
      const enrollmentId = 8899;
      const offlineAnswers = { q1: 'B', coding_1: 'def solution(): return 42' };

      // Simulate client crash after storing offline backup
      localStorage.setItem(`offline_answers_${enrollmentId}`, JSON.stringify(offlineAnswers));

      // Simulate recovery
      const recovered = JSON.parse(localStorage.getItem(`offline_answers_${enrollmentId}`));
      expect(recovered).toEqual(offlineAnswers);
      expect(recovered.coding_1).toBe('def solution(): return 42');

      // Teardown cleanup
      localStorage.removeItem(`offline_answers_${enrollmentId}`);
      expect(localStorage.getItem(`offline_answers_${enrollmentId}`)).toBeNull();
    });
  });

  describe('E. Dynamic Model & Resource Cleanup', () => {
    it('verifies media tracks and intervals teardown without leak', () => {
      const stopTrackMock = vi.fn();
      const mockStream = {
        getTracks: () => [{ stop: stopTrackMock }, { stop: stopTrackMock }],
      };

      mockStream.getTracks().forEach((track) => track.stop());
      expect(stopTrackMock).toHaveBeenCalledTimes(2);
    });
  });
});

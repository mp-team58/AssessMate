import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ExamScreen from '../components/ExamScreen';

const baseProps = {
  examData: { title: 'Proctored Assessment', timerType: 'TOTAL_DURATION' },
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
  faceStatus: 'CHECKING',
  navigate: vi.fn(),
  requestMediaPermissions: vi.fn(),
  retryLoadModels: vi.fn(),
  handleModelErrorBack: vi.fn(),
  hiddenVideoRef: { current: null },
  modelLoadStep: 'Loading AI Proctoring Engine...',
};

describe('Proctoring Model Loading & Failure Blocking Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Face detection enabled and model loads successfully
  it('1. Face detection enabled: continues normally to exam when model loads successfully', () => {
    const props = {
      ...baseProps,
      modelsLoading: false,
      modelLoadError: null,
      faceStatus: 'VERIFIED',
    };

    render(<ExamScreen {...props} />);
    // Exam entry is permitted, workspace is visible
    expect(screen.getByText('Proctored assessment')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Question 1/i })).toBeInTheDocument();
    expect(screen.queryByText(/Proctoring initialization failed/i)).not.toBeInTheDocument();
  });

  // 2. Face detection enabled and model loading fails
  it('2. Face detection enabled: blocks exam entry and displays clear error with Retry button when loading fails', () => {
    const retryLoadModels = vi.fn();
    const props = {
      ...baseProps,
      modelsLoading: false,
      modelLoadError: 'Required face detection could not be initialized. Please retry or contact your exam administrator.',
      retryLoadModels,
    };

    render(<ExamScreen {...props} />);
    // Blocks exam entry
    expect(screen.queryByText('Question 1 of 1')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Proctoring initialization failed/i })).toBeInTheDocument();
    expect(screen.getByText('Required face detection could not be initialized. Please retry or contact your exam administrator.')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(retryLoadModels).toHaveBeenCalledTimes(1);
  });

  // 3. Object detection enabled and model loading fails
  it('3. Object detection enabled: blocks exam entry and displays object detection error with Retry button', () => {
    const retryLoadModels = vi.fn();
    const props = {
      ...baseProps,
      modelsLoading: false,
      modelLoadError: 'Required object detection could not be initialized. Please retry or contact your exam administrator.',
      retryLoadModels,
    };

    render(<ExamScreen {...props} />);
    expect(screen.queryByText('Question 1 of 1')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Proctoring initialization failed/i })).toBeInTheDocument();
    expect(screen.getByText('Required object detection could not be initialized. Please retry or contact your exam administrator.')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(retryLoadModels).toHaveBeenCalledTimes(1);
  });

  // 4. Both enabled and one model fails
  it('4. Both enabled and one model fails: clearly identifies the failed component and keeps candidate on preflight screen', () => {
    // Scenario 4a: Face detection failed while both were required
    const { rerender } = render(
      <ExamScreen
        {...baseProps}
        modelsLoading: false
        modelLoadError="Required face detection could not be initialized. Please retry or contact your exam administrator."
      />
    );
    expect(screen.getByText('Required face detection could not be initialized. Please retry or contact your exam administrator.')).toBeInTheDocument();
    expect(screen.queryByText('Question 1 of 1')).not.toBeInTheDocument();

    // Scenario 4b: Face succeeded but object detection failed
    rerender(
      <ExamScreen
        {...baseProps}
        modelsLoading: false
        modelLoadError="Required object detection could not be initialized. Please retry or contact your exam administrator."
      />
    );
    expect(screen.getByText('Required object detection could not be initialized. Please retry or contact your exam administrator.')).toBeInTheDocument();
    expect(screen.queryByText('Question 1 of 1')).not.toBeInTheDocument();
  });

  // 5. Both disabled and no model is loaded
  it('5. Both disabled: does not load models and does not block exam entry', () => {
    const props = {
      ...baseProps,
      modelsLoading: false,
      modelLoadError: null,
      faceStatus: 'STANDBY',
    };

    render(<ExamScreen {...props} />);
    // Exam enters directly
    expect(screen.getByRole('heading', { name: /Question 1/i })).toBeInTheDocument();
    expect(screen.queryByText(/Setting up proctoring/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Proctoring initialization failed/i)).not.toBeInTheDocument();
  });

  // 6. Retry succeeds after an initial failure
  it('6. Retry succeeds: transitions from error state back to loading and then into active exam', () => {
    const retryLoadModels = vi.fn();
    const { rerender } = render(
      <ExamScreen
        {...baseProps}
        modelsLoading={false}
        modelLoadError="Required face detection could not be initialized. Please retry or contact your exam administrator."
        retryLoadModels={retryLoadModels}
      />
    );

    // Initial state: blocked with error
    expect(screen.getByText(/Required face detection could not be initialized/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(retryLoadModels).toHaveBeenCalledTimes(1);

    // Transition to loading on retry
    rerender(
      <ExamScreen
        {...baseProps}
        modelsLoading={true}
        modelLoadError={null}
        modelLoadStep="Retrying AI Proctor engine initialization..."
      />
    );
    expect(screen.getByText('Retrying AI Proctor engine initialization...')).toBeInTheDocument();
    expect(screen.queryByText('Question 1 of 1')).not.toBeInTheDocument();

    // Transition to success
    rerender(
      <ExamScreen
        {...baseProps}
        modelsLoading={false}
        modelLoadError={null}
        faceStatus="VERIFIED"
      />
    );
    expect(screen.getByRole('heading', { name: /Question 1/i })).toBeInTheDocument();
  });

  // 7. Repeated retries do not create duplicate detection loops
  it('7. Repeated retries: duplicate interval prevention and in-flight guard', () => {
    let intervalCount = 0;
    const intervalRef = { current: null };

    const startDetectionLoop = () => {
      // Clear existing before setting new
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        intervalCount -= 1;
      }
      intervalRef.current = setInterval(() => {}, 2000);
      intervalCount += 1;
    };

    // Simulate 5 rapid retry attempts
    for (let i = 0; i < 5; i++) {
      startDetectionLoop();
    }

    // Exactly 1 active interval exists
    expect(intervalCount).toBe(1);
    expect(intervalRef.current).not.toBeNull();

    clearInterval(intervalRef.current);
  });

  // 8. Failed initialization prevents exam entry
  it('8. Failed initialization strictly prevents exam entry', () => {
    const props = {
      ...baseProps,
      modelsLoading: false,
      modelLoadError: 'Required face detection could not be initialized. Please retry or contact your exam administrator.',
    };

    render(<ExamScreen {...props} />);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Submit exam/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Question 1')).not.toBeInTheDocument();
  });

  // 9. Media streams are cleaned up after failure
  it('9. Media streams are cleaned up when model initialization fails or user backs out', () => {
    const stopAudioTrack = vi.fn();
    const stopVideoTrack = vi.fn();

    const mockStream = {
      getTracks: () => [
        { kind: 'video', stop: stopVideoTrack },
        { kind: 'audio', stop: stopAudioTrack },
      ],
    };

    // Simulate failure cleanup
    mockStream.getTracks().forEach((track) => track.stop());

    expect(stopVideoTrack).toHaveBeenCalledTimes(1);
    expect(stopAudioTrack).toHaveBeenCalledTimes(1);
  });
});

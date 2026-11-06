import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import React from 'react';
import ExamScreen from '../components/ExamScreen';

const mockQuestions = [
  {
    id: 101,
    questionText: 'What is the time complexity of binary search?',
    type: 'SINGLE_CHOICE',
    optionA: 'O(n)',
    optionB: 'O(log n)',
    optionC: 'O(n log n)',
    optionD: 'O(1)',
    marks: 2,
    timeSeconds: 60
  },
  {
    id: 102,
    questionText: 'Which data structure uses LIFO ordering?',
    type: 'SINGLE_CHOICE',
    optionA: 'Queue',
    optionB: 'Stack',
    optionC: 'Array',
    optionD: 'Graph',
    marks: 2,
    timeSeconds: 60
  }
];

describe('Active Exam Engine & Navigation Regression Tests', () => {
  const baseProps = {
    examData: {
      id: 1,
      title: 'Data Structures Final',
      timerType: 'PER_QUESTION'
    },
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
    timeLeftSeconds: 1200,
    questionTimeLeft: 60,
    formatTime: (s) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`,
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

  it('renders active question text, marks, and options', () => {
    render(<ExamScreen {...baseProps} />);
    expect(screen.getByText(/What is the time complexity of binary search\?/i)).toBeInTheDocument();
    expect(screen.getByText('O(log n)')).toBeInTheDocument();
  });

  it('enforces PER_QUESTION future lock: disables palette button for unstarted questions', () => {
    const setCurrentIndexMock = vi.fn();
    render(
      <ExamScreen
        {...baseProps}
        setCurrentIndex={setCurrentIndexMock}
      />
    );

    const q2Button = screen.getByRole('button', { name: /Question 2: Locked/i });
    expect(q2Button).toBeDisabled();
    fireEvent.click(q2Button);
    expect(setCurrentIndexMock).not.toHaveBeenCalled();
  });

  it('allows jumping freely in WHOLE_EXAM timer mode', () => {
    const setCurrentIndexMock = vi.fn();
    render(
      <ExamScreen
        {...baseProps}
        examData={{ ...baseProps.examData, timerType: 'WHOLE_EXAM' }}
        setCurrentIndex={setCurrentIndexMock}
      />
    );

    const q2Button = screen.getByRole('button', { name: /Question 2/i });
    expect(q2Button).not.toBeDisabled();
    fireEvent.click(q2Button);
    expect(setCurrentIndexMock).toHaveBeenCalledWith(1);
  });

  it('locks expired questions as read-only and displays expired notice', () => {
    render(
      <ExamScreen
        {...baseProps}
        isCurrentQuestionExpired={true}
      />
    );

    expect(screen.getByText(/Time for this question is over/i)).toBeInTheDocument();
  });

  it('calls handleSingleChoiceSelect when option row is clicked', () => {
    const selectMock = vi.fn();
    render(
      <ExamScreen
        {...baseProps}
        handleSingleChoiceSelect={selectMock}
      />
    );

    const optionText = screen.getByText('O(log n)');
    fireEvent.click(optionText);
    expect(selectMock).toHaveBeenCalledWith(101, 'B');
  });

  it('displays offline warning banner when disconnected', () => {
    render(
      <ExamScreen
        {...baseProps}
        isOnline={false}
      />
    );

    expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
  });
});

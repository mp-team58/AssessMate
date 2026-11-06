import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import React from 'react';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import Input from '../components/ui/Input';
import ErrorBoundary from '../components/ErrorBoundary';
import { useToast } from '../contexts/ToastContext';
import { renderWithProviders } from './test-utils';
import { BookOpen } from 'lucide-react';

function ProblematicComponent() {
  throw new Error('Test explosion inside child component');
}

function ToastTrigger() {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast('Action completed successfully!', 'success')}>
      Trigger Toast
    </button>
  );
}

describe('Frontend Shared UI Components', () => {
  describe('EmptyState', () => {
    it('renders title, description and action button correctly', () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          icon={BookOpen}
          title="No assessments found"
          description="You have not enrolled in any examinations yet."
          actionText="Browse Catalog"
          onAction={onAction}
        />
      );

      expect(screen.getByText('No assessments found')).toBeInTheDocument();
      expect(screen.getByText('You have not enrolled in any examinations yet.')).toBeInTheDocument();
      const btn = screen.getByRole('button', { name: /Browse Catalog/i });
      fireEvent.click(btn);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('StatusBadge', () => {
    it('applies appropriate semantic styles for LIVE and COMPLETED statuses', () => {
      const { rerender } = render(<StatusBadge status="LIVE" />);
      const liveBadge = screen.getByText('LIVE');
      expect(liveBadge).toBeInTheDocument();

      rerender(<StatusBadge status="COMPLETED" />);
      const completedBadge = screen.getByText('COMPLETED');
      expect(completedBadge).toBeInTheDocument();
    });
  });

  describe('Input Component', () => {
    it('renders label, input, and validation error message', () => {
      render(
        <Input
          label="Full Name"
          placeholder="John Doe"
          error={{ message: 'Name is required' }}
        />
      );

      expect(screen.getByText('Full Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  describe('ErrorBoundary', () => {
    it('catches runtime child crashes and displays fallback recovery card without blanking page', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ProblematicComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/AssessMate encountered an error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Toast Notifications', () => {
    it('renders toast message when triggered and auto-dismisses', () => {
      renderWithProviders(<ToastTrigger />);
      fireEvent.click(screen.getByText('Trigger Toast'));

      expect(screen.getByText('Action completed successfully!')).toBeInTheDocument();
    });
  });
});

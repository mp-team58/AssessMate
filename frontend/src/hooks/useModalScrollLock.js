import { useEffect } from 'react';

// Module-level state for reference counting across all active modals
let activeModalCount = 0;
let previousBodyOverflow = '';
let previousContainerOverflow = '';

/**
 * Hook to lock background scrolling on both document.body and AssessMate's #app-scroll-container
 * when a modal or dialog is open.
 * Uses reference counting so nested modals (e.g. ConfirmDialog opened from inside CodingProblemModal)
 * do not unlock scrolling prematurely when one closes.
 *
 * @param {boolean} isOpen Whether the modal is currently open
 */
export function useModalScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;

    if (activeModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';

      const scrollContainer = document.getElementById('app-scroll-container');
      if (scrollContainer) {
        previousContainerOverflow = scrollContainer.style.overflow || '';
        scrollContainer.style.overflow = 'hidden';
      }
    }

    activeModalCount++;

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);

      if (activeModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow;

        const scrollContainer = document.getElementById('app-scroll-container');
        if (scrollContainer) {
          scrollContainer.style.overflow = previousContainerOverflow;
        }
      }
    };
  }, [isOpen]);
}

export default useModalScrollLock;


import { useEffect, useRef } from 'react';

// Shared module-level stack to track active modals for nested modal management.
// The topmost modal in the stack is the only one that handles Tab and Escape events.
const activeModalStack = [];

let nextModalId = 1;

/**
 * Custom hook to provide full keyboard accessibility, focus trapping, Escape dismissal,
 * and focus restoration for modal dialogs. Supports nested modals via an active modal stack.
 *
 * @param {Object} options
 * @param {boolean} options.isOpen - Whether the modal is currently open
 * @param {Function} [options.onClose] - Callback when Escape is pressed
 * @param {React.RefObject} [options.dialogRef] - Optional ref to the modal dialog content container
 * @param {React.RefObject} [options.initialFocusRef] - Optional ref to the element that should receive initial focus
 * @param {boolean} [options.preventEscape=false] - Whether Escape should be blocked (e.g. while submitting or deleting)
 * @param {boolean} [options.restoreFocus=true] - Whether to restore focus to the trigger element on close
 * @param {boolean} [options.defaultFocusCancel=false] - Whether to prioritize focusing a Cancel button initially (recommended for destructive dialogs)
 * @returns {React.RefObject} The ref to attach to the modal dialog container
 */
export function useModalAccessibility({
  isOpen,
  onClose,
  dialogRef,
  initialFocusRef,
  preventEscape = false,
  restoreFocus = true,
  defaultFocusCancel = false,
}) {
  const internalRef = useRef(null);
  const triggerRef = useRef(null);
  const modalIdRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const effectiveRef = dialogRef || internalRef;

  if (modalIdRef.current === null) {
    modalIdRef.current = `modal_${nextModalId++}`;
  }

  useEffect(() => {
    if (!isOpen) return;

    // Capture the trigger element that currently has focus before opening
    if (document.activeElement && document.activeElement !== document.body) {
      triggerRef.current = document.activeElement;
    }

    const modalId = modalIdRef.current;
    activeModalStack.push(modalId);

    // Initial focus on mount / open
    const focusTimer = setTimeout(() => {
      const dialog = effectiveRef.current;
      if (!dialog) return;

      // 1. Explicit initialFocusRef
      if (initialFocusRef?.current && typeof initialFocusRef.current.focus === 'function') {
        initialFocusRef.current.focus();
        return;
      }

      // 2. Prioritize Cancel button if defaultFocusCancel is requested
      if (defaultFocusCancel) {
        const cancelBtn = dialog.querySelector(
          'button[data-cancel="true"], button:has(svg.lucide-x), button:not([disabled])'
        );
        if (cancelBtn && typeof cancelBtn.focus === 'function') {
          cancelBtn.focus();
          return;
        }
      }

      // 3. Elements with autofocus or data-autofocus
      const autoFocusEl = dialog.querySelector('[autofocus], [data-autofocus="true"]');
      if (autoFocusEl && typeof autoFocusEl.focus === 'function') {
        autoFocusEl.focus();
        return;
      }

      // 4. First focusable element inside the dialog
      const focusables = dialog.querySelectorAll(
        'button:not([disabled]):not([aria-hidden="true"]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), a[href]:not([disabled])'
      );

      if (focusables.length > 0) {
        focusables[0].focus();
      } else if (typeof dialog.focus === 'function') {
        dialog.focus();
      }
    }, 45);

    const handleKeyDown = (e) => {
      // Guard: Only the topmost modal handles keyboard events
      if (activeModalStack.length === 0 || activeModalStack[activeModalStack.length - 1] !== modalId) {
        return;
      }

      // Handle Escape dismissal
      if (e.key === 'Escape') {
        if (preventEscape) return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof onCloseRef.current === 'function') {
          onCloseRef.current();
        }
        return;
      }

      // Handle Tab key focus trapping
      if (e.key === 'Tab') {
        const dialog = effectiveRef.current;
        if (!dialog) return;

        const focusables = Array.from(
          dialog.querySelectorAll(
            'button:not([disabled]):not([aria-hidden="true"]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), a[href]:not([disabled])'
          )
        ).filter((el) => {
          return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
        });

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !dialog.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !dialog.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);

      // Remove this modal from the stack
      const index = activeModalStack.lastIndexOf(modalId);
      if (index !== -1) {
        activeModalStack.splice(index, 1);
      }

      // Restore focus to the trigger element
      if (restoreFocus && triggerRef.current && typeof triggerRef.current.focus === 'function') {
        const el = triggerRef.current;
        setTimeout(() => {
          if (document.contains(el)) {
            el.focus();
          }
        }, 50);
      }
    };
  }, [isOpen, preventEscape, restoreFocus, defaultFocusCancel]);

  return effectiveRef;
}

export default useModalAccessibility;


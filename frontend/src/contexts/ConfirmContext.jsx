import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import useModalScrollLock from '../hooks/useModalScrollLock';
import useModalAccessibility from '../hooks/useModalAccessibility';

const ConfirmContext = createContext();

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    message: '',
    title: 'Confirm Action',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDanger: true,
    resolve: null,
  });

  const triggerRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const dialogRef = useRef(null);
  const isSubmittingRef = useRef(false);

  const confirm = useCallback((options) => {
    triggerRef.current = document.activeElement;
    isSubmittingRef.current = false;

    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message: typeof options === 'string' ? options : options.message,
        title: options.title || 'Confirm Action',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isDanger: options.isDanger !== undefined ? options.isDanger : true,
        resolve,
      });
    });
  }, []);

  const closeDialog = useCallback((result) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setConfirmState((prev) => {
      if (prev.resolve) {
        prev.resolve(result);
      }
      return { ...prev, isOpen: false, resolve: null };
    });

    setTimeout(() => {
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
      isSubmittingRef.current = false;
    }, 50);
  }, []);

  const handleConfirm = useCallback(() => closeDialog(true), [closeDialog]);
  const handleCancel = useCallback(() => closeDialog(false), [closeDialog]);

  // Body & container scroll locking with reference counting
  useModalScrollLock(confirmState.isOpen);

  // Modal accessibility: focus trap, Escape cancel, focus restoration, nested modal stack
  useModalAccessibility({
    isOpen: confirmState.isOpen,
    onClose: () => handleCancel(),
    dialogRef,
    initialFocusRef: cancelBtnRef,
    defaultFocusCancel: true,
  });

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {confirmState.isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 w-screen h-screen supports-[height:100dvh]:h-dvh z-[9999] bg-secondary-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancel();
          }}
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-secondary-200 animate-in zoom-in-95 duration-200"
          >
            <div className="p-4 sm:p-6 md:p-8 flex items-start gap-3 sm:gap-4">
              {confirmState.isDanger ? (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
                </div>
              )}
              <div className="pt-0.5 sm:pt-1 min-w-0 flex-1">
                <h3 id="confirm-dialog-title" className="text-lg sm:text-xl font-bold text-secondary-900 mb-1.5 sm:mb-2 break-words">
                  {confirmState.title}
                </h3>
                <p id="confirm-dialog-desc" className="text-secondary-600 text-xs sm:text-sm leading-relaxed">
                  {confirmState.message}
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 p-4 sm:p-6 bg-secondary-50/50 border-t border-secondary-100 justify-end">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={handleCancel}
                className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] text-xs sm:text-sm font-bold text-secondary-700 hover:bg-secondary-100 bg-white border border-secondary-200 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary-400"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`w-full sm:w-auto px-5 py-2.5 min-h-[44px] text-xs sm:text-sm font-bold text-white rounded-xl transition-all shadow-sm cursor-pointer focus:outline-none focus:ring-2 ${
                  confirmState.isDanger 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20 focus:ring-red-400' 
                    : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20 focus:ring-brand-400'
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

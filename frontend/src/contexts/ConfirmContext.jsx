import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

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

  const confirm = useCallback((options) => {
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

  const handleConfirm = () => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }
    setConfirmState({ ...confirmState, isOpen: false });
  };

  const handleCancel = () => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    setConfirmState({ ...confirmState, isOpen: false });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-secondary-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-secondary-200 animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 flex items-start gap-4">
              {confirmState.isDanger ? (
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-brand-600" />
                </div>
              )}
              <div className="pt-1">
                <h3 className="text-xl font-bold text-secondary-900 mb-2">{confirmState.title}</h3>
                <p className="text-secondary-600 text-sm leading-relaxed">{confirmState.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 bg-secondary-50/50 border-t border-secondary-100 justify-end">
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 text-sm font-bold text-secondary-700 hover:bg-secondary-100 bg-white border border-secondary-200 rounded-xl transition-all"
              >
                {confirmState.cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-sm ${
                  confirmState.isDanger 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                    : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
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

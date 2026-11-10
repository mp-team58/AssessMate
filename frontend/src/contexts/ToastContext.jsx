import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toast = ({ id, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const colors = {
    success: 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-emerald-500/10',
    error: 'bg-red-50/90 border-red-200 text-red-900 shadow-red-500/10',
    warning: 'bg-amber-50/90 border-amber-200 text-amber-900 shadow-amber-500/10',
    info: 'bg-blue-50/90 border-blue-200 text-blue-900 shadow-blue-500/10'
  };

  return (
    <div className={`flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border backdrop-blur-md shadow-xl ${colors[type]} animate-in slide-in-from-top-4 sm:slide-in-from-bottom-4 fade-in duration-300 max-w-sm w-full pointer-events-auto transition-all`}>
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 text-xs sm:text-sm font-semibold leading-tight">{message}</div>
      <button 
        onClick={() => onClose(id)} 
        className="shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity cursor-pointer p-0.5"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    if (!message) return;
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => {
      // Prevent duplicate toasts with the identical message & type if one is already active
      if (prev.some((t) => t.message === message && t.type === type)) {
        return prev;
      }
      return [...prev, { id, message, type }];
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Show a message that was stored right before a full page redirect
  // (e.g. "session ended" -> login page).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pendingToast');
      if (raw) {
        sessionStorage.removeItem('pendingToast');
        const { message, type } = JSON.parse(raw);
        if (message) showToast(message, type || 'info');
      }
    } catch (_) { /* ignore malformed value */ }
  }, [showToast]);

  useEffect(() => {
    const handleGlobalToast = (e) => {
      showToast(e.detail.message, e.detail.type);
    };
    window.addEventListener('SHOW_TOAST', handleGlobalToast);
    return () => window.removeEventListener('SHOW_TOAST', handleGlobalToast);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-3 left-3 right-3 sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 z-[100] flex flex-col items-center sm:items-end gap-2 sm:gap-2.5 pointer-events-none" aria-live="polite" role="status">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

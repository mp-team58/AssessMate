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
    <div className={`flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-xl ${colors[type]} animate-in slide-in-from-right-8 fade-in duration-300 max-w-sm w-full pointer-events-auto transition-all`}>
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 text-sm font-semibold leading-tight">{message}</div>
      <button 
        onClick={() => onClose(id)} 
        className="shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

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
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
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

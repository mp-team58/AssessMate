import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = forwardRef(({ label, error, type, className = '', containerClassName = '', ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`mb-3.5 sm:mb-5 group ${containerClassName}`}>
      {label && <label className="block text-xs sm:text-sm font-semibold text-secondary-700 mb-1.5 sm:mb-2 group-focus-within:text-brand-600 transition-colors">{label}</label>}
      <div className="relative">
        <input
          ref={ref}
          type={effectiveType}
          className={`w-full px-3.5 sm:px-4 py-2.5 sm:py-3 min-h-[44px] text-[15px] bg-secondary-50/50 hover:bg-white focus:bg-white border rounded-xl focus:outline-none focus:ring-[3px] focus:border-brand-500 transition-all duration-300 shadow-sm ${
            isPassword ? 'pr-11' : ''
          } ${
            error ? 'border-red-400 focus:ring-red-500/20' : 'border-secondary-200 focus:ring-brand-500/15 hover:border-brand-400 text-secondary-900'
          } ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-700 transition-colors cursor-pointer p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && error.message && (
        <p className="mt-1.5 text-[13px] font-medium text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          {error.message}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

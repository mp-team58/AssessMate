import React, { forwardRef } from 'react';

const Input = forwardRef(({ label, error, className = '', containerClassName = '', ...props }, ref) => {
  return (
    <div className={`mb-5 group ${containerClassName}`}>
      {label && <label className="block text-sm font-semibold text-secondary-700 mb-2 group-focus-within:text-brand-600 transition-colors">{label}</label>}
      <input
        ref={ref}
        className={`w-full px-4 py-3 text-[15px] bg-secondary-50/50 hover:bg-white focus:bg-white border rounded-xl focus:outline-none focus:ring-[3px] focus:border-brand-500 transition-all duration-300 shadow-sm ${
          error ? 'border-red-400 focus:ring-red-500/20' : 'border-secondary-200 focus:ring-brand-500/15 hover:border-brand-400 text-secondary-900'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-[13px] font-medium text-red-500 flex items-center gap-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
        {error.message}
      </p>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

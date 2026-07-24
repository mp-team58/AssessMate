import React, { forwardRef } from 'react';

const Input = forwardRef(({ label, error, className = '', containerClassName = '', ...props }, ref) => {
  return (
    <div className={`mb-5 ${containerClassName}`}>
      {label && <label className="block text-sm font-semibold text-secondary-700 mb-2">{label}</label>}
      <input
        ref={ref}
        className={`w-full px-4 py-3 text-[15px] bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm ${
          error ? 'border-red-400 focus:ring-red-500' : 'border-secondary-300 hover:border-brand-400 text-secondary-900'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-2 text-sm font-medium text-red-500">{error.message}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

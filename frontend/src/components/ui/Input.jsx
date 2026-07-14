import React, { forwardRef } from 'react';

const Input = forwardRef(({ label, error, ...props }, ref) => {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <input
        ref={ref}
        className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

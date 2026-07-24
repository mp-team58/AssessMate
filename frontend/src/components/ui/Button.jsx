import React from 'react';

const Button = ({ children, type = 'button', disabled = false, className = '', ...props }) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

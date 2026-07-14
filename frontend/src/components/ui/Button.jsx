import React from 'react';

const Button = ({ children, type = 'button', disabled = false, className = '', ...props }) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

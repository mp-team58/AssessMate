import React from 'react';

const Button = ({ children, type = 'button', disabled = false, variant = 'primary', className = '', ...props }) => {
  const baseStyles = "font-bold py-2.5 px-5 rounded-xl text-[15px] transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white',
    outline: 'bg-white border-2 border-brand-600 text-brand-600 hover:bg-brand-50',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-secondary-800 hover:bg-secondary-900 text-white',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

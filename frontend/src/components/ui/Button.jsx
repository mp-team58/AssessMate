import React from 'react';

const Button = ({ children, type = 'button', disabled = false, variant = 'primary', className = '', ...props }) => {
  const baseStyles = "font-bold py-2.5 px-5 rounded-xl text-[15px] transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2";
  
  const variants = {
    primary: 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-brand-500/20 hover:shadow-brand-500/40',
    outline: 'bg-white border-2 border-brand-600 text-brand-600 hover:bg-brand-50',
    danger: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-red-500/20',
    secondary: 'bg-gradient-to-r from-secondary-800 to-secondary-700 hover:from-secondary-700 hover:to-secondary-600 text-white',
    cancel: 'bg-secondary-50 hover:bg-secondary-100 text-secondary-800 border border-secondary-200',
    'outline-secondary': 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50',
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

import React, { useState, useRef, useEffect } from 'react';

const Select = ({ label, error, className = '', options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedOption = options.find(opt => String(opt.value) === String(value)) || options[0] || { label: 'Select...' };

  return (
    <div className={`flex flex-col mb-5 ${className}`} ref={dropdownRef}>
      {label && <label className="text-[14px] font-semibold text-secondary-800 mb-2">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 text-[15px] appearance-none bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm flex items-center justify-between
            ${error ? 'border-red-400 focus:ring-red-500 text-red-900' : 'border-secondary-300 hover:border-brand-400 text-secondary-900'}
          `}
        >
          <span>{selectedOption.label}</span>
          <svg className={`w-5 h-5 text-secondary-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 w-full mt-2 bg-white border border-secondary-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
            {options.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`px-4 py-3 text-[15px] cursor-pointer transition-colors ${String(value) === String(opt.value) ? 'bg-brand-50 text-brand-700 font-bold' : 'text-secondary-700 hover:bg-secondary-50'}`}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-[13px] font-medium text-red-500 flex items-center gap-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
        {error.message}
      </p>}
    </div>
  );
};

export default Select;

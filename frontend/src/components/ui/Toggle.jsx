import React from 'react';

const Toggle = ({ activeRole, onChange }) => {
  return (
    <div className="relative flex p-1.5 bg-secondary-100/50 rounded-xl w-full mb-8">
      {/* Sliding background */}
      <div 
        className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-lg shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out ${
          activeRole === 'candidate' ? 'translate-x-full left-[3px]' : 'translate-x-0 left-[3px]'
        }`}
      />
      <button
        type="button"
        onClick={() => onChange('host')}
        className={`relative z-10 flex-1 py-3 text-sm font-bold rounded-lg transition-colors duration-300 ${
          activeRole === 'host'
            ? 'text-brand-600'
            : 'text-secondary-400 hover:text-secondary-700'
        }`}
      >
        Host
      </button>
      <button
        type="button"
        onClick={() => onChange('candidate')}
        className={`relative z-10 flex-1 py-3 text-sm font-bold rounded-lg transition-colors duration-300 ${
          activeRole === 'candidate'
            ? 'text-brand-600'
            : 'text-secondary-400 hover:text-secondary-700'
        }`}
      >
        Candidate
      </button>
    </div>
  );
};

export default Toggle;

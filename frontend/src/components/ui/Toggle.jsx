import React from 'react';

const Toggle = ({ activeRole, onChange }) => {
  return (
    <div className="flex p-1.5 bg-secondary-50 border border-secondary-100 rounded-xl w-full mb-8">
      <button
        type="button"
        onClick={() => onChange('host')}
        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
          activeRole === 'host'
            ? 'bg-white text-secondary-900 shadow-md'
            : 'text-secondary-400 hover:text-secondary-600'
        }`}
      >
        Host
      </button>
      <button
        type="button"
        onClick={() => onChange('candidate')}
        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
          activeRole === 'candidate'
            ? 'bg-white text-secondary-900 shadow-md'
            : 'text-secondary-400 hover:text-secondary-600'
        }`}
      >
        Candidate
      </button>
    </div>
  );
};

export default Toggle;

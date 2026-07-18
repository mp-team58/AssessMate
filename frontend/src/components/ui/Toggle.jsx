import React from 'react';

const Toggle = ({ activeRole, onChange }) => {
  return (
    <div className="flex p-1 bg-slate-100 rounded-lg w-full mb-6">
      <button
        type="button"
        onClick={() => onChange('host')}
        className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
          activeRole === 'host'
            ? 'bg-white text-brand-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Host
      </button>
      <button
        type="button"
        onClick={() => onChange('candidate')}
        className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
          activeRole === 'candidate'
            ? 'bg-white text-brand-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Candidate
      </button>
    </div>
  );
};

export default Toggle;

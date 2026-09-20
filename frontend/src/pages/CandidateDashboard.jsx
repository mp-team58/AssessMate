import React from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, FileText } from 'lucide-react';
import Button from '../components/ui/Button';

const CandidateDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Candidate Dashboard</h1>
        <p className="text-secondary-600 mt-2 text-base">Welcome to AssessMate Dashboard</p>
      </header>

      <div className="bg-white rounded-2xl p-8 text-center shadow-lg border border-secondary-200">
        <h3 className="text-xl font-bold text-secondary-900 mb-2">Dashboard</h3>
        <p className="text-secondary-600 text-base mb-6">More analytics and insights coming soon.</p>

        <div className="flex justify-center gap-4 flex-wrap">
          <Button onClick={() => navigate('/candidate/join')} className="!w-auto px-6 py-2.5 text-base">
            <KeyRound className="w-4 h-4" />
            <span>Join Assessment</span>
          </Button>
          <Button onClick={() => navigate('/candidate/my-assessments')} variant="outline" className="!w-auto px-6 py-2.5 text-base">
            <FileText className="w-4 h-4" />
            <span>My Assessments</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;

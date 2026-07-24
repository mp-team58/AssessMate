import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { getExamById } from '../services/examService';

const GenerateQuestions = () => {
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const examId = localStorage.getItem('currentExamId');

  useEffect(() => {
    if (!examId) {
      navigate('/host/dashboard');
      return;
    }

    const fetchExam = async () => {
      try {
        const response = await getExamById(examId);
        setExam(response.data);
      } catch (err) {
        console.error("Failed to load exam details", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExam();
  }, [examId, navigate]);

  return (
    <div className="max-w-4xl mx-auto font-sans relative z-10">
      <div className="w-full">
        <button onClick={() => navigate('/host/dashboard')} className="text-secondary-600 hover:text-brand-600 mb-6 flex items-center gap-2 font-bold text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-secondary-200 p-10 text-center">
          <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-secondary-900 mb-4">Generate Questions</h1>
          
          {isLoading ? (
            <p className="text-secondary-600 mb-8 font-medium">Loading exam details...</p>
          ) : (
            <>
              <p className="text-secondary-600 mb-8 text-lg">
                You are managing questions for: <strong className="text-brand-700">{exam?.title || `Exam #${examId}`}</strong>
              </p>
              
              <div className="bg-[#F9F2EA] border border-secondary-200 rounded-2xl p-10 mb-8 max-w-lg mx-auto">
                <p className="text-secondary-800 font-medium">
                  The automated question generation module will be implemented here in the next phase.
                </p>
              </div>
            </>
          )}

          <Button onClick={() => navigate('/host/dashboard')} className="px-8 py-3 text-lg">
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GenerateQuestions;

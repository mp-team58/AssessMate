import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyExams, deleteExam } from '../services/examService';
import Button from '../components/ui/Button';

const MyExams = () => {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchExams = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getMyExams();
      setExams(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch exams.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    try {
      await deleteExam(id);
      setExams(exams.filter(exam => exam.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete exam.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-secondary-900 tracking-tight">My Exams</h1>
          <p className="text-secondary-600 mt-2 text-lg">Manage your drafts and live assessments</p>
        </div>
      </header>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 shadow-sm border border-red-100">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-secondary-200">
            <h3 className="text-2xl font-bold text-secondary-900 mb-2">No exams yet</h3>
            <p className="text-secondary-600 mb-8 text-lg">Create your first exam to get started</p>
            <Button onClick={() => navigate('/host/create-exam')} className="w-auto px-8 py-3 text-lg">Create Exam</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <div 
                key={exam.id} 
                className="bg-white rounded-2xl p-6 shadow-md border border-secondary-200 hover:border-brand-500 hover:shadow-xl transition-all flex flex-col h-full group"
              >
                
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider
                    ${exam.status === 'LIVE' ? 'bg-green-100 text-green-700' : 
                      exam.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'}`}>
                    {exam.status}
                  </span>
                  
                  <div className="bg-brand-50 text-brand-700 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 shadow-inner border border-brand-100">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    {exam.joinCode}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-1">{exam.title}</h3>
                <p className="text-brand-600 font-medium text-sm mb-4">{exam.subject}</p>
                
                <div className="space-y-2 mb-6 flex-grow">
                  <div className="flex items-center text-slate-500 text-sm">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {exam.timerType === 'WHOLE_EXAM' 
                      ? `${exam.durationMinutes} min total`
                      : `${exam.easySeconds}/${exam.mediumSeconds}/${exam.hardSeconds} sec per question`}
                  </div>
                  <div className="flex items-center text-slate-500 text-sm">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(exam.scheduledStart).toLocaleString('en-US', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  <div className="flex items-center text-slate-500 text-sm">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {exam.totalQuestions} Questions
                  </div>
                </div>
                
                <div className="pt-5 border-t border-secondary-100 flex gap-2 flex-wrap">
                  <button 
                    onClick={() => navigate(`/host/exams/${exam.id}/manage`)}
                    className="flex-1 min-w-[120px] bg-secondary-900 hover:bg-secondary-800 text-[#F3EDE0] py-2 rounded-xl text-sm font-bold transition-all shadow-md"
                  >
                    Manage
                  </button>

                  <button 
                    onClick={() => handleDelete(exam.id)}
                    className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all border border-transparent hover:border-red-200"
                    title="Delete Exam"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default MyExams;

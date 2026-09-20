import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyExams, deleteExam } from '../services/examService';
import Button from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';

const MyExams = () => {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const response = await getMyExams();
      setExams(response.data);
    } catch (err) {
      showToast(err.message || 'Failed to fetch exams.', 'error');
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
      showToast('Exam deleted successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete exam.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">My Exams</h1>
          <p className="text-secondary-600 mt-2 text-base">Manage your drafts and live assessments</p>
        </div>
      </header>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-secondary-200/60 max-w-2xl mx-auto mt-10">
            <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-secondary-800 mb-3">No exams created yet</h3>
            <p className="text-secondary-500 mb-8 text-lg max-w-md mx-auto">Get started by creating your first assessment. It only takes a few minutes to set up.</p>
            <Button onClick={() => navigate('/host/create-exam')} className="w-auto px-8 py-3 text-lg rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all">
              Create First Exam
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <div 
                key={exam.id} 
                className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200/80 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-300 flex flex-col h-full group relative overflow-hidden"
              >
                {/* Top color bar depending on status */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  exam.status === 'LIVE' ? 'bg-green-500' : 
                  exam.status === 'DRAFT' ? 'bg-amber-400' : 
                  'bg-secondary-300'
                }`}></div>
                
                <div className="flex justify-between items-start mb-5 mt-2">
                  <span className={`px-3 py-1.5 text-xs font-bold rounded-md uppercase tracking-wider flex items-center gap-1.5
                    ${exam.status === 'LIVE' ? 'bg-green-50 text-green-700 border border-green-100' : 
                      exam.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                      'bg-secondary-50 text-secondary-600 border border-secondary-200'}`}>
                    {exam.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>}
                    {exam.status}
                  </span>
                  
                  <div className="bg-brand-50 text-brand-700 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 shadow-inner border border-brand-100">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    {exam.joinCode}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-secondary-800 mb-1">{exam.title}</h3>
                <p className="text-brand-600 font-medium text-sm mb-4">{exam.subject}</p>
                
                <div className="space-y-2 mb-6 flex-grow">
                  <div className="flex items-center text-secondary-500 text-sm">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {exam.timerType === 'WHOLE_EXAM' 
                      ? `${exam.durationMinutes} min total`
                      : `${exam.easySeconds}/${exam.mediumSeconds}/${exam.hardSeconds} sec per question`}
                  </div>
                  <div className="flex items-center text-secondary-500 text-sm">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(exam.scheduledStart).toLocaleString('en-US', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  <div className="flex items-center text-secondary-500 text-sm">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {exam.totalQuestions} Questions
                  </div>
                </div>
                
                <div className="mt-auto pt-5 border-t border-secondary-100 flex justify-between gap-3 relative z-10">
                  <Link 
                    to={`/host/exams/${exam.id}/manage`}
                    className="flex-1 bg-brand-50 text-brand-700 text-center py-2.5 rounded-xl font-bold text-sm hover:bg-brand-100 hover:text-brand-800 transition-colors"
                  >
                    Manage Exam
                  </Link>
                  <button 
                    onClick={() => handleDelete(exam.id)}
                    className="px-4 py-2.5 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
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

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyExams, deleteExam } from '../services/examService';
import Button from '../components/ui/Button';
import ShareExamModal from '../components/ShareExamModal';
import { useToast } from '../contexts/ToastContext';
import { Share2 } from 'lucide-react';

const MyExams = () => {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shareExamId, setShareExamId] = useState(null);
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
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-300 relative z-10 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
          <Button onClick={() => navigate('/host/create-exam')} className="w-auto px-8 py-3 text-lg rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 transition-all">
            Create First Exam
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 w-full">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white/80 backdrop-blur-xl rounded-[1.25rem] p-6 shadow-sm border border-secondary-200/60 hover:border-brand-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 flex flex-col h-full group relative overflow-hidden"
            >
              {/* Decorative accent blob */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-100 rounded-full blur-[40px] opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"></div>

              {/* Top soft gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 opacity-90 ${exam.status === 'LIVE' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                  exam.status === 'DRAFT' ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                    'bg-gradient-to-r from-secondary-300 to-secondary-400'
                }`}></div>

              <div className="flex justify-between items-start mb-5 mt-2 relative z-10">
                <span className={`px-3 py-1.5 text-[11px] font-black rounded-lg uppercase tracking-widest flex items-center gap-2 shadow-sm
                    ${exam.status === 'LIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' :
                    exam.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' :
                      'bg-secondary-50 text-secondary-600 border border-secondary-200/50'}`}>
                  {exam.status === 'LIVE' && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                  {exam.status}
                </span>

                <div className="bg-white text-secondary-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm border border-secondary-200/60 hover:text-brand-600 hover:border-brand-200 transition-colors cursor-default">
                  <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  {exam.joinCode}
                </div>
              </div>

              <div className="relative z-10 mb-6 flex-grow">
                <h3 className="text-xl font-bold text-secondary-900 mb-1.5 leading-tight group-hover:text-brand-600 transition-colors">{exam.title}</h3>
                <p className="text-brand-600 font-semibold text-sm mb-5 bg-brand-50 inline-block px-2.5 py-1 rounded-md">{exam.subject}</p>

                <div className="space-y-2.5">
                  <div className="flex items-center text-secondary-600 text-sm font-medium">
                    <div className="w-6 flex justify-center mr-1">
                      <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    {exam.timerType === 'WHOLE_EXAM'
                      ? `${exam.durationMinutes} min total`
                      : `${exam.easySeconds}/${exam.mediumSeconds}/${exam.hardSeconds} sec per question`}
                  </div>
                  <div className="flex items-center text-secondary-600 text-sm font-medium">
                    <div className="w-6 flex justify-center mr-1">
                      <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    {new Date(exam.scheduledStart).toLocaleString('en-US', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  <div className="flex items-center text-secondary-600 text-sm font-medium">
                    <div className="w-6 flex justify-center mr-1">
                      <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    {exam.totalQuestions || 0} General Qs
                  </div>
                  {exam.hasCodingSection && (
                    <div className="flex items-center text-indigo-600 text-sm font-medium">
                      <div className="w-6 flex justify-center mr-1">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      {exam.codingQuestionsCount || 0} Coding Qs
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-secondary-100 flex justify-between gap-2.5 relative z-10">
                <Link
                  to={`/host/exams/${exam.id}/manage`}
                  className="flex-1 bg-white border border-brand-200 text-brand-700 text-center py-2.5 rounded-xl font-bold text-sm hover:bg-brand-50 hover:border-brand-300 transition-colors shadow-sm"
                >
                  Manage Exam
                </Link>
                {(exam.status === 'ENDED' || exam.status === 'LIVE') && (
                  <Link
                    to={`/host/exams/${exam.id}/results`}
                    className="flex-1 bg-emerald-50 border border-emerald-200/50 text-emerald-700 text-center py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors shadow-sm"
                  >
                    View Results
                  </Link>
                )}
                {(exam.status === 'LIVE' || exam.status === 'SCHEDULED') && (
                  <button
                    onClick={() => setShareExamId(exam.id)}
                    className="px-4 py-2.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 border border-transparent hover:border-brand-100 rounded-xl transition-colors shadow-sm bg-white"
                    title="Share Exam"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(exam.id)}
                  className="px-4 py-2.5 text-secondary-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-colors shadow-sm bg-white"
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
      <ShareExamModal
        examId={shareExamId}
        isOpen={!!shareExamId}
        onClose={() => setShareExamId(null)}
      />
    </div>
  );
};

export default MyExams;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamById, publishExam, endExam, duplicateExam } from '../services/examService';
import { getExamQuestionStats, getExamQuestions } from '../services/questionService';
import { getExamCodingProblems } from '../services/codingQuestionService';
import Button from '../components/ui/Button';
import MarkdownViewer from '../components/MarkdownViewer';
import QuestionCard from '../components/QuestionCard';
import ShareExamModal from '../components/ShareExamModal';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { Share2, AlertCircle, RotateCw } from 'lucide-react';

const ManageExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [stats, setStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [codingQuestions, setCodingQuestions] = useState([]);
  const [codingQuestionsCount, setCodingQuestionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const fetchExam = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getExamById(id);
      setExam(response.data);
      const [statsRes, questionsRes] = await Promise.all([
        getExamQuestionStats(id),
        getExamQuestions(id)
      ]);
      setStats(statsRes.data || statsRes);
      setQuestions(questionsRes.data || questionsRes);
      
      if (response.data?.hasCodingSection) {
        try {
          const codingRes = await getExamCodingProblems(id);
          const cQuestions = codingRes.data || codingRes;
          setCodingQuestions(Array.isArray(cQuestions) ? cQuestions : []);
          setCodingQuestionsCount(Array.isArray(cQuestions) ? cQuestions.length : 0);
        } catch (cErr) {
          console.error("Failed to fetch coding questions:", cErr);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch exam details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExam();
  }, [id]);

  const handlePublish = async () => {
    if (stats?.unverifiedCount > 0) {
      showToast("You must verify all AI generated questions before publishing!", 'warning');
      return;
    }
    if (stats?.totalAdded < stats?.totalRequired) {
      showToast(`You need ${stats.totalRequired} general questions to publish this exam, but only have ${stats.totalAdded}.`, 'warning');
      return;
    }
    
    if (exam?.hasCodingSection) {
      const requiredCoding = exam.codingQuestionsCount || 0;
      if (codingQuestionsCount < requiredCoding) {
        showToast(`You need ${requiredCoding} coding questions to publish this exam, but only have ${codingQuestionsCount}.`, 'warning');
        return;
      }
    }
    
    try {
    const isConfirmed = await confirm({
      title: 'Publish Assessment',
      message: "Are you sure you want to publish this exam? You won't be able to edit questions after publishing.",
      confirmText: 'Publish Exam',
      cancelText: 'Cancel',
      isDanger: false,
    });
    if (!isConfirmed) return;

      const response = await publishExam(id);
      setExam({ ...exam, status: 'LIVE', startedAt: response.data.startedAt || new Date().toISOString() });
      showToast('Exam published successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to publish exam.', 'error');
    }
  };

  const handleEnd = async () => {
    const isConfirmed = await confirm({
      title: 'End Assessment',
      message: 'Are you sure you want to end this exam? Candidates will no longer be able to submit.',
      confirmText: 'End Exam',
      cancelText: 'Cancel',
      isDanger: true,
    });
    if (!isConfirmed) return;
    try {
      const response = await endExam(id);
      setExam({ ...exam, status: 'ENDED', endedAt: response.data.endedAt || new Date().toISOString() });
      showToast('Exam ended successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to end exam.', 'error');
    }
  };

  const handleDuplicate = async () => {
    const isConfirmed = await confirm({
      title: 'Duplicate Assessment',
      message: 'Are you sure you want to duplicate this exam? A draft copy will be created.',
      confirmText: 'Duplicate',
      cancelText: 'Cancel',
      isDanger: false,
    });
    if (!isConfirmed) return;
    try {
      const response = await duplicateExam(id);
      showToast('Exam duplicated successfully! You can now edit the new copy.', 'success');
      navigate(`/host/exams/${response.data.id}/edit`);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to duplicate exam.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-secondary-200 shadow-xl text-center space-y-4 my-12 animate-in fade-in duration-200">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-secondary-900">Assessment Details Unavailable</h2>
        <p className="text-secondary-600 text-sm">
          {error || 'The requested assessment could not be found or you do not have permission to view it.'}
        </p>
        <div className="flex gap-3 pt-2">
          <Button onClick={() => navigate('/host/my-exams')} variant="outline" className="flex-1">
            Back to Exams
          </Button>
          <Button onClick={fetchExam} className="flex-1">
            <RotateCw className="w-4 h-4 mr-1.5" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="relative bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-secondary-200 overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">

        <div className="relative z-10 w-full md:w-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm
              ${exam.status === 'LIVE' ? 'bg-green-50 text-green-700 border border-green-100' :
                exam.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                  'bg-secondary-100 text-secondary-700 border border-secondary-200'}`}>
              {exam.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>}
              {exam.status}
            </span>
            <div className="bg-brand-50 text-brand-700 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-bold flex items-center gap-1.5 border border-brand-100 shadow-sm">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span>{exam.joinCode}</span>
            </div>
          </div>
          
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-secondary-900 tracking-tight mb-1 sm:mb-2 break-words">{exam.title}</h1>
          <p className="text-secondary-500 font-medium text-sm sm:text-base md:text-lg flex items-center gap-2 break-words">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>{exam.subject}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 relative z-10 w-full md:w-auto">
          {exam.status === 'DRAFT' && (
            <>
              <Button onClick={() => navigate(`/host/exams/${id}/edit`)} variant="outline" className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-transform border-secondary-300 text-secondary-700 bg-white hover:bg-secondary-50 shadow-sm min-h-[42px]">
                Edit Exam
              </Button>
              <Button onClick={handlePublish} className="flex-1 sm:flex-none bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white shadow-md shadow-brand-500/20 border-0 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-transform min-h-[42px]">
                Publish Exam
              </Button>
            </>
          )}
          {exam.status === 'LIVE' && (
            <Button onClick={handleEnd} className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 border-0 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-transform min-h-[42px]">
              End Exam
            </Button>
          )}
          {(exam.status === 'LIVE' || exam.status === 'SCHEDULED') && (
            <Button onClick={() => setIsShareModalOpen(true)} className="flex-1 sm:flex-none bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 border-0 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-transform flex items-center gap-1.5 justify-center min-h-[42px]">
              <Share2 className="w-4 h-4 flex-shrink-0" /> <span>Share Exam</span>
            </Button>
          )}
          {(exam.status === 'LIVE' || exam.status === 'ENDED') && (
            <>
              <Button onClick={() => navigate(`/host/exams/${id}/results`)} variant="outline" className="flex-1 sm:flex-none border-secondary-300 text-brand-700 hover:bg-brand-50 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-transform shadow-sm min-h-[42px]">
                View Results
              </Button>
              <Button onClick={() => navigate(exam.status === 'LIVE' ? `/host/exams/${id}/live` : `/host/exams/${id}/proctoring`)} className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-transform shadow-sm min-h-[42px]">
                Proctoring & Live Monitor
              </Button>
            </>
          )}
          {(exam.status === 'ENDED' || exam.status === 'LIVE') && (
            <Button onClick={handleDuplicate} variant="outline" className="flex-1 sm:flex-none border-secondary-300 text-amber-600 hover:bg-amber-50 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-transform shadow-sm flex items-center gap-1.5 justify-center min-h-[42px]">
              Re-conduct / Clone
            </Button>
          )}
        </div>
      </div>

      {/* Split Grid for Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        
        {/* Left Column: Stats & Setup Info */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-secondary-200/80">
            <h3 className="text-lg font-bold text-secondary-800 mb-5 border-b border-secondary-100 pb-3">Exam Requirements</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-xl border border-secondary-100">
                <span className="text-secondary-500 font-medium text-sm">Timer Type</span>
                <span className="text-secondary-800 font-bold text-sm bg-white px-2 py-1 rounded-md shadow-sm">{exam.timerType === 'WHOLE_EXAM' ? 'Whole Exam' : 'Per Question'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-xl border border-secondary-100">
                <span className="text-secondary-500 font-medium text-sm">Duration</span>
                <span className="text-secondary-800 font-bold text-sm bg-white px-2 py-1 rounded-md shadow-sm">{exam.durationMinutes} Minutes</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-xl border border-secondary-100">
                <span className="text-secondary-500 font-medium text-sm">General Questions</span>
                <span className="text-secondary-800 font-bold text-sm bg-white px-2 py-1 rounded-md shadow-sm">
                  {exam.totalQuestions || 0}
                </span>
              </div>
              {exam.hasCodingSection && (
                <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <span className="text-indigo-600 font-medium text-sm">Coding Questions</span>
                  <span className="text-indigo-800 font-bold text-sm bg-white px-2 py-1 rounded-md shadow-sm border border-indigo-100">
                    {exam.codingQuestionsCount || 0}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-xl border border-secondary-100">
                <span className="text-secondary-500 font-medium text-sm">Passing Mark</span>
                <span className="text-secondary-800 font-bold text-sm bg-white px-2 py-1 rounded-md shadow-sm">{exam.passingPercentage ?? 50}%</span>
              </div>
            </div>
            
            {stats && (
              <div className="mt-6 pt-6 border-t border-secondary-100">
                <h4 className="text-sm font-bold text-secondary-500 uppercase tracking-wider mb-4">Question Progress</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-500 font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Easy ({exam.easyPercent}%)
                    </span>
                    <span className="font-bold text-secondary-700">{stats.easyAdded} / {stats.easyRequired}</span>
                  </div>
                  {/* Progress bar Easy */}
                  <div className="w-full bg-secondary-200 rounded-full h-2 mb-2 overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (stats.easyAdded / (stats.easyRequired || 1)) * 100)}%` }}></div>
                  </div>
                  
                  <div className="flex justify-between text-sm mt-3">
                    <span className="text-secondary-500 font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> Medium ({exam.mediumPercent}%)
                    </span>
                    <span className="font-bold text-secondary-700">{stats.mediumAdded} / {stats.mediumRequired}</span>
                  </div>
                  {/* Progress bar Medium */}
                  <div className="w-full bg-secondary-200 rounded-full h-2 mb-2 overflow-hidden">
                    <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (stats.mediumAdded / (stats.mediumRequired || 1)) * 100)}%` }}></div>
                  </div>
                  
                  <div className="flex justify-between text-sm mt-3">
                    <span className="text-secondary-500 font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> Hard ({exam.hardPercent}%)
                    </span>
                    <span className="font-bold text-secondary-700">{stats.hardAdded} / {stats.hardRequired}</span>
                  </div>
                  {/* Progress bar Hard */}
                  <div className="w-full bg-secondary-200 rounded-full h-2 mb-2 overflow-hidden">
                    <div className="bg-rose-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (stats.hardAdded / (stats.hardRequired || 1)) * 100)}%` }}></div>
                  </div>
                  
                  {exam.hasCodingSection && (
                    <>
                      <div className="flex justify-between text-sm mt-4">
                        <span className="text-secondary-500 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Coding
                        </span>
                        <span className="font-bold text-secondary-700">{codingQuestionsCount} / {exam.codingQuestionsCount || 0}</span>
                      </div>
                      {/* Progress bar Coding */}
                      <div className="w-full bg-secondary-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (codingQuestionsCount / (exam.codingQuestionsCount || 1)) * 100)}%` }}></div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Questions List */}
        <div className="lg:col-span-2">
          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-secondary-200/80 min-h-0 sm:min-h-[500px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-3 sm:gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-secondary-800">Questions List</h2>
                <p className="text-secondary-500 text-xs sm:text-sm mt-0.5 sm:mt-1">Review the questions currently in your exam</p>
              </div>
              {exam.status === 'DRAFT' && (
                <Button 
                  onClick={() => navigate(`/host/exams/${exam.id}/questions`)}
                  className="w-full sm:!w-auto flex-shrink-0 bg-secondary-900 hover:bg-secondary-800 text-white rounded-xl shadow-md transition-transform min-h-[42px]"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Manage Questions
                  </span>
                </Button>
              )}
            </div>

            {stats && stats.unverifiedCount > 0 && (
              <div className="mb-6 bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200/60 shadow-sm flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="font-bold text-amber-900">Action Required</h4>
                  <p className="text-amber-700/90 text-sm mt-0.5">{stats.unverifiedCount} question(s) need review before this exam can be published.</p>
                </div>
              </div>
            )}

            {questions.length === 0 && codingQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-secondary-200 rounded-2xl bg-secondary-50/50">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-secondary-100 mb-4 text-secondary-400">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-secondary-700">No questions added yet</h3>
                <p className="text-secondary-500 max-w-sm mt-1 text-sm">Click "Manage Questions" to add from the bank or generate new ones using AI.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {questions.map((q, index) => (
                  <QuestionCard 
                    key={q.id} 
                    question={q} 
                    showSource={true} 
                    index={index + 1} 
                  />
                ))}
                {codingQuestions.map((cq, index) => (
                  <div key={`coding-${cq.id}`} className="bg-white rounded-2xl border border-secondary-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-5 group relative">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-shrink-0 flex sm:flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm shadow-sm border border-indigo-100/50">
                          Q{questions.length + index + 1}
                        </div>
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200/50">
                          Coding
                        </span>
                      </div>
                      <div className="flex-grow space-y-3 min-w-0">
                        <h4 className="font-bold text-lg text-secondary-800 break-words">{cq.title}</h4>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-2.5 py-1 bg-secondary-100 text-secondary-700 rounded-lg text-xs font-medium border border-secondary-200/60 flex items-center gap-1">
                            Marks: {cq.marks || 10}
                          </span>
                          <span className="px-2.5 py-1 bg-secondary-100 text-secondary-700 rounded-lg text-xs font-medium border border-secondary-200/60 flex items-center gap-1">
                            Time: {cq.timeLimitSeconds}s
                          </span>
                          <span className="px-2.5 py-1 bg-secondary-100 text-secondary-700 rounded-lg text-xs font-medium border border-secondary-200/60 flex items-center gap-1">
                            Mem: {cq.memoryLimitMb}MB
                          </span>
                        </div>
                        <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-100">
                          <MarkdownViewer content={cq.description} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      <ShareExamModal 
        examId={id} 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
      />
    </>
  );
};

export default ManageExam;

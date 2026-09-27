import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCandidateReport } from '../services/hostService';
import { useToast } from '../contexts/ToastContext';
import { ArrowLeft, User, Mail, CheckCircle, XCircle, HelpCircle, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import Button from '../components/ui/Button';

const HostCandidateReport = () => {
  const { id: examId, enrollmentId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await getCandidateReport(examId, enrollmentId);
        setReport(response.data);
      } catch (error) {
        showToast('Unable to load candidate report.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [examId, enrollmentId, showToast]);

  if (isLoading) {
    return (
      <div className="w-full h-full p-8 animate-in fade-in flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!report || !report.result) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-secondary-800">Candidate report unavailable.</h2>
        <Button onClick={() => navigate(`/host/exams/${examId}/results`)} className="mt-4">Back to Results</Button>
      </div>
    );
  }

  const { result, answers, proctoringEvents } = report;

  // Safe parse weak topics
  let weakTopics = [];
  if (result.weakTopicsJson) {
    try {
      weakTopics = JSON.parse(result.weakTopicsJson);
      if (!Array.isArray(weakTopics)) weakTopics = [];
    } catch (e) {
      weakTopics = []; // Failed to parse
    }
  }

  const formatTime = (seconds) => {
    if (seconds === undefined || seconds === null) return 'N/A';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="w-full h-full space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Back Button */}
      <button onClick={() => navigate(`/host/exams/${examId}/results`)} className="text-brand-600 hover:text-brand-700 flex items-center gap-2 font-bold text-sm transition-colors bg-brand-50 px-3 py-1.5 rounded-lg w-fit hover:bg-brand-100">
        <ArrowLeft className="w-4 h-4" />
        Back to Results
      </button>

      {/* Header Profile */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-secondary-200/80 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center shrink-0">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-secondary-900">{report.candidateName}</h1>
            <p className="text-secondary-500 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" /> {report.candidateEmail}
            </p>
            <p className="text-sm font-semibold text-brand-700 bg-brand-50 inline-block px-2 py-0.5 rounded mt-2">
              {report.examTitle}
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="text-center bg-secondary-50 p-4 rounded-xl border border-secondary-200 min-w-[120px]">
            <p className="text-xs text-secondary-500 font-bold uppercase mb-1">Score</p>
            <p className="text-2xl font-extrabold text-secondary-900">{result.totalScore} <span className="text-sm text-secondary-500 font-normal">/ {result.maxScore}</span></p>
          </div>
          <div className="text-center bg-secondary-50 p-4 rounded-xl border border-secondary-200 min-w-[120px]">
            <p className="text-xs text-secondary-500 font-bold uppercase mb-1">Result</p>
            {result.passed ? (
              <p className="text-2xl font-extrabold text-emerald-600">PASSED</p>
            ) : (
              <p className="text-2xl font-extrabold text-red-600">FAILED</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Stats & Proctoring */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Performance Stats */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-200/80">
            <h3 className="text-lg font-bold text-secondary-800 mb-5 border-b border-secondary-100 pb-3">Performance</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-emerald-700 font-medium text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Correct</span>
                <span className="text-emerald-800 font-bold">{result.correctCount || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100">
                <span className="text-red-700 font-medium text-sm flex items-center gap-2"><XCircle className="w-4 h-4"/> Wrong</span>
                <span className="text-red-800 font-bold">{result.wrongCount || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-xl border border-secondary-200">
                <span className="text-secondary-600 font-medium text-sm flex items-center gap-2"><HelpCircle className="w-4 h-4"/> Unanswered</span>
                <span className="text-secondary-800 font-bold">{result.unansweredCount || 0}</span>
              </div>
              
              <div className="pt-2 border-t border-secondary-100 mt-2 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-secondary-500 font-medium flex items-center gap-2"><Clock className="w-4 h-4"/> Time Taken</span>
                  <span className="text-secondary-800 font-bold">{formatTime(result.timeTakenSeconds)}</span>
                </div>
                {result.lateSubmission && (
                  <div className="flex justify-between items-center text-sm text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                    <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Late Submission</span>
                    <span className="font-bold">Yes</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Feedback & Weak Topics */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-200/80">
            <h3 className="text-lg font-bold text-secondary-800 mb-4 border-b border-secondary-100 pb-3 flex items-center gap-2">
              ✨ AI Feedback
            </h3>
            {result.aiFeedback ? (
              <div className="bg-brand-50 p-4 rounded-xl border border-brand-100 text-brand-900 text-sm leading-relaxed mb-6">
                {result.aiFeedback}
              </div>
            ) : (
              <p className="text-secondary-500 text-sm mb-6 italic">Feedback is pending or unavailable.</p>
            )}

            <h4 className="font-bold text-secondary-700 mb-3 text-sm uppercase tracking-wider">Detected Weak Topics</h4>
            {weakTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((topic, i) => (
                  <span key={i} className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">
                    {topic}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-secondary-500 text-sm">No specific weak topics detected.</p>
            )}
          </div>

          {/* Proctoring Timeline */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-secondary-200/80">
            <div className="flex items-center justify-between mb-5 border-b border-secondary-100 pb-3">
              <h3 className="text-lg font-bold text-secondary-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-600" />
                Proctoring
              </h3>
              {report.proctoringFlagCount > 0 && (
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">{report.proctoringFlagCount} Flags</span>
              )}
            </div>

            {(!proctoringEvents || proctoringEvents.length === 0) ? (
              <p className="text-secondary-500 text-sm text-center py-4">No proctoring flags recorded.</p>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                {proctoringEvents.map((evt, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-purple-500 shrink-0"></div>
                    <div>
                      <p className="text-sm font-bold text-secondary-800">{evt.eventType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-secondary-500">{new Date(evt.flaggedAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Answers Review */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-secondary-200/80">
            <h2 className="text-2xl font-bold text-secondary-800 mb-6 border-b border-secondary-100 pb-4">Question Review</h2>
            
            {(!answers || answers.length === 0) ? (
              <p className="text-secondary-500">No answers recorded.</p>
            ) : (
              <div className="space-y-8">
                {answers.map((ans, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border ${ans.isCorrect ? 'border-emerald-200 bg-emerald-50/30' : (ans.candidateAnswer ? 'border-red-200 bg-red-50/30' : 'border-secondary-200 bg-secondary-50')}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2 items-center">
                        <span className="font-bold text-secondary-800">Q{idx + 1}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-secondary-200 text-secondary-600">{ans.difficulty}</span>
                        {ans.topic && <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-50 border border-brand-200 text-brand-700">{ans.topic}</span>}
                      </div>
                      <div className="text-sm font-bold bg-white px-2 py-1 rounded shadow-sm border border-secondary-200">
                        {ans.marksAwarded} / {ans.totalMarks} marks
                      </div>
                    </div>
                    
                    <p className="text-secondary-900 font-medium mb-4 whitespace-pre-wrap">{ans.questionText}</p>
                    
                    {ans.imageUrl && (
                      <img src={ans.imageUrl} alt="Question figure" className="max-w-full h-auto rounded-lg border border-secondary-200 mb-4 max-h-64 object-contain" />
                    )}

                    {ans.type === 'MCQ' && ans.options ? (
                      <div className="space-y-2 mb-4">
                        {ans.options.map((opt, oIdx) => {
                          const isCandidate = ans.candidateAnswer === opt;
                          const isCorrect = ans.correctAnswer === opt;
                          
                          let optClass = "p-3 rounded-lg border text-sm font-medium bg-white border-secondary-200 text-secondary-700";
                          if (isCorrect) optClass = "p-3 rounded-lg border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                          else if (isCandidate && !isCorrect) optClass = "p-3 rounded-lg border-2 border-red-500 bg-red-50 text-red-900 font-bold";

                          return (
                            <div key={oIdx} className={optClass}>
                              {opt}
                              {isCorrect && <span className="ml-2 text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded uppercase">Correct Answer</span>}
                              {isCandidate && !isCorrect && <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded uppercase">Candidate Answer</span>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white p-3 rounded-lg border border-secondary-200">
                          <p className="text-xs text-secondary-500 font-bold uppercase mb-1">Candidate Answer</p>
                          <p className={`font-medium ${!ans.candidateAnswer ? 'text-secondary-400 italic' : (ans.isCorrect ? 'text-emerald-700' : 'text-red-700')}`}>
                            {ans.candidateAnswer || 'Not answered'}
                          </p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                          <p className="text-xs text-emerald-700 font-bold uppercase mb-1">Correct Answer</p>
                          <p className="font-medium text-emerald-900">{ans.correctAnswer}</p>
                        </div>
                      </div>
                    )}

                    {ans.explanation && (
                      <div className="mt-4 text-sm bg-white p-3 rounded-lg border border-secondary-200 text-secondary-600">
                        <span className="font-bold text-secondary-800">Explanation:</span> {ans.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default HostCandidateReport;

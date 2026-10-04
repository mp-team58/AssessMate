import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getExamResults, toggleCandidateResult } from '../services/hostService';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import Button from '../components/ui/Button';
import { Users, CheckCircle, Target, TrendingUp, TrendingDown, ArrowLeft, AlertTriangle, Send, RefreshCw } from 'lucide-react';
import { publishExamResults, unpublishExamResults } from '../services/examService';

const HostExamResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  const intervalRef = useRef(null);

  const handlePublishResults = async () => {
    if (!(await confirm("Are you sure you want to publish these results? All candidates will be able to view their scores and AI diagnostics immediately."))) return;

    setIsPublishing(true);
    try {
      await publishExamResults(id);
      showToast('Results published successfully to candidates!', 'success');
      fetchResults();
    } catch (error) {
      showToast('Failed to publish results.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublishResults = async () => {
    if (!(await confirm("Are you sure you want to hide results? Candidates will no longer be able to see their scores."))) return;

    setIsPublishing(true);
    try {
      await unpublishExamResults(id);
      showToast('Results hidden successfully.', 'success');
      fetchResults();
    } catch (error) {
      showToast('Failed to hide results.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const fetchResults = async (isBackground = false) => {
    try {
      if (!isBackground && !results) setIsLoading(true);
      const response = await getExamResults(id);
      setResults(response.data);
    } catch (error) {
      if (!isBackground) showToast('Unable to load exam results. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleResult = async (enrollmentId) => {
    try {
      await toggleCandidateResult(id, enrollmentId);
      showToast('Candidate result toggled successfully.', 'success');
      fetchResults(true);
    } catch (error) {
      showToast('Failed to toggle result.', 'error');
    }
  };

  const startPolling = () => {
    stopPolling();
    intervalRef.current = setInterval(() => {
      fetchResults(true);
    }, 6000);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    fetchResults();
    startPolling();
    return () => {
      stopPolling();
    };
  }, [id, showToast]);

  if (isLoading) {
    return (
      <div className="w-full h-full p-8 animate-in fade-in">
        <div className="h-8 w-1/4 bg-secondary-200 rounded animate-pulse mb-8"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4,5,6,7].map(i => <div key={i} className="h-24 bg-secondary-200 rounded-xl animate-pulse"></div>)}
        </div>
        <div className="h-64 bg-secondary-200 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-secondary-800">Results not found.</h2>
        <Button onClick={() => navigate(`/host/exams/${id}/manage`)} className="mt-4">Back to Exam</Button>
      </div>
    );
  }

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="w-full h-full space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4">
        <button onClick={() => navigate(`/host/exams/${id}/manage`)} className="text-brand-600 hover:text-brand-700 flex items-center gap-2 font-bold text-sm transition-colors bg-brand-50 px-3 py-1.5 rounded-lg w-fit hover:bg-brand-100">
          <ArrowLeft className="w-4 h-4" />
          Back to Exam Details
        </button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-secondary-900 tracking-tight">{results.examTitle}</h1>
            <p className="text-secondary-500 mt-2 text-lg">Exam Results & Candidate Performance</p>
          </div>
          {results.resultsPublished ? (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold flex items-center gap-2 shadow-sm">
                <CheckCircle className="w-5 h-5" />
                Results Published
              </div>
              <Button onClick={handleUnpublishResults} disabled={isPublishing} variant="outline" className="border-secondary-300 text-secondary-600 hover:bg-secondary-50">
                {isPublishing ? 'Hiding...' : 'Hide Results'}
              </Button>
            </div>
          ) : (
            <Button onClick={handlePublishResults} disabled={isPublishing} className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              {isPublishing ? 'Publishing...' : 'Publish Results'}
            </Button>
          )}
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200">
          <p className="text-xs text-secondary-500 font-bold uppercase tracking-wider mb-1">Candidates</p>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-extrabold text-secondary-900">{results.totalCandidates}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200">
          <p className="text-xs text-secondary-500 font-bold uppercase tracking-wider mb-1">Submitted</p>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-2xl font-extrabold text-secondary-900">{results.submittedCount}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200">
          <p className="text-xs text-secondary-500 font-bold uppercase tracking-wider mb-1">Avg Score</p>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            <span className="text-2xl font-extrabold text-secondary-900">{Math.round(results.averageScore * 10) / 10}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200">
          <p className="text-xs text-secondary-500 font-bold uppercase tracking-wider mb-1">Avg %</p>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-500" />
            <span className="text-2xl font-extrabold text-secondary-900">{Math.round(results.averagePercentage)}%</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200">
          <p className="text-xs text-secondary-500 font-bold uppercase tracking-wider mb-1">Pass Rate</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-extrabold text-secondary-900">{Math.round(results.passRate)}%</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200">
          <p className="text-xs text-secondary-500 font-bold uppercase tracking-wider mb-1">Highest</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-extrabold text-secondary-900">{Math.round(results.highestPercentage)}%</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200">
          <p className="text-xs text-secondary-500 font-bold uppercase tracking-wider mb-1">Lowest</p>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <span className="text-2xl font-extrabold text-secondary-900">{Math.round(results.lowestPercentage)}%</span>
          </div>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden">
        <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
          <h2 className="text-xl font-bold text-secondary-800">Candidate Results</h2>
        </div>
        
        {(!results.candidates || results.candidates.length === 0) ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-secondary-100 text-secondary-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-secondary-700">No submissions yet</h3>
            <p className="text-secondary-500">Nobody has submitted this exam yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-secondary-50 text-secondary-600 text-xs uppercase tracking-wider border-b border-secondary-200">
                  <th className="p-4 font-bold">Candidate</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Score</th>
                  <th className="p-4 font-bold">Honesty</th>
                  <th className="p-4 font-bold">Result</th>
                  <th className="p-4 font-bold">Time Taken</th>
                  <th className="p-4 font-bold">Proctoring</th>
                  <th className="p-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {[...(results.candidates || [])].sort((a, b) => {
                  const aDone = a.enrollmentStatus === 'SUBMITTED';
                  const bDone = b.enrollmentStatus === 'SUBMITTED';
                  if (aDone !== bDone) return aDone ? -1 : 1;
                  if (!aDone) return 0;
                  return (b.percentage ?? 0) - (a.percentage ?? 0);
                }).map((candidate) => (
                  <tr key={candidate.enrollmentId} className="hover:bg-secondary-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-secondary-900">{candidate.candidateName}</div>
                      <div className="text-sm text-secondary-500">{candidate.candidateEmail}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${candidate.enrollmentStatus === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' : 'bg-secondary-100 text-secondary-600'}`}>
                        {candidate.enrollmentStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      {candidate.enrollmentStatus === 'SUBMITTED' ? (
                        <>
                          <div className="font-bold text-secondary-900">{candidate.totalScore} / {candidate.maxScore}</div>
                          <div className="text-sm text-secondary-500">{Math.round(candidate.percentage)}%</div>
                        </>
                      ) : (
                        <span className="text-secondary-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {candidate.enrollmentStatus === 'SUBMITTED' && candidate.honestyScore !== null && candidate.honestyScore !== undefined ? (
                        <div className={`font-bold ${candidate.honestyScore >= 80 ? 'text-emerald-600' : candidate.honestyScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {Math.round(candidate.honestyScore)}%
                        </div>
                      ) : (
                        <span className="text-secondary-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {candidate.enrollmentStatus === 'SUBMITTED' ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center">
                            {candidate.passed ? (
                              <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle className="w-4 h-4" /> Passed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-600 font-bold text-sm bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                                <X className="w-4 h-4" /> Failed
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleToggleResult(candidate.enrollmentId)}
                            className={`text-[10px] font-bold px-2 py-1 rounded w-fit transition-colors ${
                              candidate.passed 
                                ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50' 
                                : 'bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {candidate.passed ? 'MARK FAIL' : 'MARK PASS'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-secondary-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-secondary-700 font-medium">
                      {formatTime(candidate.timeTakenSeconds)}
                      {candidate.lateSubmission && <span className="ml-2 text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded font-bold">LATE</span>}
                    </td>
                    <td className="p-4">
                      {candidate.proctoringFlagCount > 0 ? (
                        <span className="flex items-center gap-1 text-amber-600 font-bold text-sm bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                          <AlertTriangle className="w-4 h-4" /> {candidate.proctoringFlagCount} Flags
                        </span>
                      ) : (
                        <span className="text-secondary-400 text-sm">Clear</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {candidate.enrollmentStatus === 'SUBMITTED' && (
                        <Link to={`/host/exams/${id}/results/${candidate.enrollmentId}`}>
                          <Button variant="outline" className="px-4 py-1.5 text-sm h-auto bg-white hover:bg-brand-50 border-secondary-300 text-brand-700 shadow-sm">
                            View Report
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Quick missing icons fix
const Activity = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const X = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;

export default HostExamResults;

import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getExamLiveMonitor } from '../services/hostService';
import { endExam } from '../services/examService';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import {
  Activity,
  Users,
  CheckCircle,
  Clock,
  ShieldAlert,
  Power,
  RefreshCcw,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';

const HostLiveMonitor = () => {
  const { id } = useParams();
  const { showToast } = useToast();
  
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  
  const intervalRef = useRef(null);

  const fetchLiveData = async (isBackground = false) => {
    try {
      if (!isBackground && !data) setIsLoading(true);
      const response = await getExamLiveMonitor(id);
      setData(response.data);
      setIsError(false);
      
      if (response.data.examStatus === 'ENDED') {
        stopPolling();
      }
    } catch (err) {
      console.error("Failed to fetch live monitor data", err);
      if (!isBackground) setIsError(true);
      if (isBackground && data) {
        showToast("Live sync interrupted. Showing last known state.", "warning");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    stopPolling();
    intervalRef.current = setInterval(() => {
      fetchLiveData(true);
    }, 6000);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    fetchLiveData();
    startPolling();
    
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEndExam = async () => {
    setIsEnding(true);
    try {
      await endExam(id);
      showToast('Exam ended successfully. System is processing remaining submissions.', 'success');
      setShowEndModal(false);
      // Fetch one last time to get the final state
      await fetchLiveData(false);
    } catch (error) {
      console.error("Failed to end exam", error);
      showToast(error?.response?.data?.message || 'Failed to end exam', 'error');
    } finally {
      setIsEnding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCcw className="w-12 h-12 text-brand-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-secondary-800">Connecting to Live Monitor...</h2>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-secondary-800 mb-2">Connection Failed</h2>
        <p className="text-secondary-600 mb-6">Could not establish connection to the live monitor.</p>
        <Button onClick={() => fetchLiveData()} variant="primary">Try Again</Button>
      </div>
    );
  }

  const isLive = data?.examStatus === 'LIVE';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to={`/host/exams/${id}/manage`} className="inline-flex items-center text-sm font-semibold text-secondary-500 hover:text-brand-600 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Exams
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">
              {data?.examTitle || 'Exam Monitor'}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase flex items-center gap-1.5 ${
              isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {isLive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
              {data?.examStatus}
            </span>
          </div>
        </div>
        
        {isLive && (
          <Button 
            variant="danger" 
            onClick={() => setShowEndModal(true)}
            className="flex items-center gap-2"
          >
            <Power className="w-4 h-4" />
            End Exam Now
          </Button>
        )}
      </div>

      {/* Warning if Ended */}
      {!isLive && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-800">
          <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Exam is Ended</p>
            <p className="text-sm mt-1">This exam is no longer accepting new candidates. Any remaining active submissions are currently being finalized by the system. Check the Results page for final scores.</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Users className="w-16 h-16 text-secondary-900" />
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-secondary-500">Total Joined</p>
            <p className="text-2xl font-extrabold text-secondary-900">{data?.joinedCount || 0}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Activity className="w-16 h-16 text-secondary-900" />
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-secondary-500">In Progress</p>
            <p className="text-2xl font-extrabold text-secondary-900">{data?.ongoingCount || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <CheckCircle className="w-16 h-16 text-secondary-900" />
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-secondary-500">Submitted</p>
            <p className="text-2xl font-extrabold text-secondary-900">{data?.submittedCount || 0}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <RefreshCcw className="w-16 h-16 text-secondary-900" />
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <RefreshCcw className={`w-6 h-6 ${isLive ? 'animate-spin-slow' : ''}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-secondary-500">Live Status</p>
            <p className="text-lg font-extrabold text-secondary-900">
              {isLive ? 'Syncing...' : 'Stopped'}
            </p>
          </div>
        </div>
      </div>

      {/* Candidate Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden">
        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50/50">
          <h2 className="text-lg font-bold text-secondary-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-500" />
            Live Candidate Feed
          </h2>
          {isLive && (
            <span className="text-xs font-semibold text-secondary-500 flex items-center gap-1">
              <RefreshCcw className="w-3 h-3 animate-spin" /> Auto-refreshing every 6s
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-secondary-200">
                <th className="px-6 py-4 text-xs font-extrabold text-secondary-500 uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-4 text-xs font-extrabold text-secondary-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-extrabold text-secondary-500 uppercase tracking-wider">Joined At</th>
                <th className="px-6 py-4 text-xs font-extrabold text-secondary-500 uppercase tracking-wider">Proctoring Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {(!data?.candidates || data.candidates.length === 0) ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-secondary-800">No candidates have joined yet.</h3>
                    <p className="text-sm text-secondary-500 mt-1">Share the exam link and code for candidates to join.</p>
                  </td>
                </tr>
              ) : (
                data.candidates.map((candidate) => (
                  <tr key={candidate.enrollmentId} className="hover:bg-secondary-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-secondary-900">{candidate.candidateName}</span>
                        <span className="text-xs text-secondary-500">{candidate.candidateEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider ${
                        candidate.status === 'ONGOING' ? 'bg-amber-100 text-amber-700' :
                        candidate.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {candidate.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-secondary-700">
                        <Clock className="w-4 h-4 text-secondary-400" />
                        {new Date(candidate.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert className={`w-4 h-4 ${candidate.totalFlags > 0 ? 'text-red-500' : 'text-secondary-300'}`} />
                        <span className={`font-bold ${candidate.totalFlags > 0 ? 'text-red-600' : 'text-secondary-500'}`}>
                          {candidate.totalFlags} flags
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* End Exam Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-6">
                <Power className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-secondary-900 mb-2">End Exam Now?</h3>
              <p className="text-secondary-600 text-[15px] leading-relaxed mb-6">
                This action will permanently close the exam. Candidates currently taking the test will be auto-submitted. This cannot be undone.
              </p>
              
              <div className="flex gap-3 mt-8">
                <Button 
                  variant="cancel" 
                  onClick={() => setShowEndModal(false)}
                  className="flex-1"
                  disabled={isEnding}
                >
                  Cancel
                </Button>
                <Button 
                  variant="danger"
                  onClick={handleEndExam}
                  className="flex-1"
                  disabled={isEnding}
                >
                  {isEnding ? 'Ending...' : 'End Exam'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostLiveMonitor;

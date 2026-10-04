import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProctoringDashboard, getCandidateProctoringTimeline } from '../services/hostService';
import { useToast } from '../contexts/ToastContext';
import { ShieldAlert, ArrowLeft, EyeOff, Users, Monitor, Maximize, AlertTriangle, Activity, Mic } from 'lucide-react';
import Button from '../components/ui/Button';
import { getMediaUrl } from '../services/apiClient';

const ProctoringRow = ({ candidate, examId }) => {
  const [timeline, setTimeline] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const toggleTimeline = async () => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }
    
    setIsExpanded(true);
    if (!timeline) {
      setIsLoading(true);
      try {
        const response = await getCandidateProctoringTimeline(examId, candidate.enrollmentId);
        setTimeline(response.data || []);
      } catch (err) {
        showToast('Unable to load timeline.', 'error');
        setTimeline([]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const hasFlags = candidate.totalFlags > 0;
  const isSevere = candidate.totalFlags > 5;

  return (
    <>
      <tr className={`hover:bg-secondary-50 transition-colors ${isExpanded ? 'bg-secondary-50' : ''}`}>
        <td className="p-4">
          <div className="font-bold text-secondary-900">{candidate.candidateName}</div>
          <div className="text-sm text-secondary-500">{candidate.candidateEmail}</div>
        </td>
        <td className="p-4 font-medium text-secondary-700">{candidate.noFaceCount || 0}</td>
        <td className="p-4 font-medium text-secondary-700">{candidate.multipleFacesCount || 0}</td>
        <td className="p-4 font-medium text-secondary-700">{candidate.gazeAwayCount || 0}</td>
        <td className="p-4 font-medium text-secondary-700">{candidate.audioDetectedCount || 0}</td>
        <td className="p-4 font-medium text-secondary-700">{candidate.tabSwitchCount || 0}</td>
        <td className="p-4">
          {hasFlags ? (
            <span className={`flex w-fit items-center gap-1 font-bold text-sm px-2 py-1 rounded-md border ${isSevere ? 'text-red-700 bg-red-100 border-red-200' : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
              <AlertTriangle className="w-4 h-4" /> {candidate.totalFlags} Flags
            </span>
          ) : (
            <span className="text-emerald-600 font-bold text-sm bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">Clear</span>
          )}
        </td>
        <td className="p-4 text-right">
          <Button onClick={toggleTimeline} variant="outline" className={`px-4 py-1.5 text-sm h-auto bg-white hover:bg-brand-50 shadow-sm ${isExpanded ? 'border-brand-500 text-brand-700' : 'border-secondary-300 text-secondary-700'}`}>
            {isExpanded ? 'Hide Timeline' : 'View Timeline'}
          </Button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan="8" className="p-0 border-b border-secondary-200">
            <div className="bg-secondary-50/80 p-6 border-l-4 border-brand-500 shadow-inner">
              <h4 className="font-bold text-secondary-800 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-600"/> Proctoring Timeline for {candidate.candidateName}
              </h4>
              {isLoading ? (
                <div className="text-secondary-500 text-sm animate-pulse">Loading events...</div>
              ) : (!timeline || timeline.length === 0) ? (
                <p className="text-secondary-500 text-sm">No proctoring events recorded for this candidate.</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {timeline.map((evt, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-4 rounded-xl border border-secondary-200 shadow-sm">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        evt.severity === 'HIGH' ? 'bg-red-100 text-red-600' :
                        evt.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-secondary-800 text-base">{evt.eventType.replace(/_/g, ' ')}</p>
                          <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                            evt.severity === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' :
                            evt.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {evt.severity}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-secondary-500">
                          {new Date(evt.flaggedAt).toLocaleString()}
                        </div>
                        {evt.details && (
                          <div className="mt-1 text-sm text-secondary-700 italic border-l-2 border-secondary-200 pl-2">
                            "{evt.details}"
                          </div>
                        )}
                      </div>
                      
                      {/* Media Evidences */}
                      <div className="flex gap-2 shrink-0 mt-3 sm:mt-0">
                        {evt.imageUrl && (
                          <div className="rounded-lg overflow-hidden border border-secondary-200 shadow-sm w-32 h-24 bg-secondary-100">
                            <img src={getMediaUrl(evt.imageUrl)} alt="Proctoring Evidence" className="w-full h-full object-cover" />
                          </div>
                        )}
                        {evt.audioUrl && (
                          <div className="flex items-center h-24">
                            <audio controls src={getMediaUrl(evt.audioUrl)} className="w-48 h-8 rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const HostProctoring = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProctoring = async () => {
      try {
        const response = await getProctoringDashboard(id);
        setData(response.data);
      } catch (error) {
        showToast('Unable to load proctoring data.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProctoring();
  }, [id, showToast]);

  if (isLoading) {
    return (
      <div className="w-full h-full p-8 animate-in fade-in flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-secondary-800">Proctoring data unavailable.</h2>
        <Button onClick={() => navigate(`/host/exams/${id}/manage`)} className="mt-4">Back to Exam</Button>
      </div>
    );
  }

  const cands = Array.isArray(data) ? data : data.candidates || [];
  
  // Calculate Totals
  const totalCandidates = cands.length;
  let totalFlags = 0;
  let candsWithFlags = 0;
  let totalTabSwitch = 0;
  let totalNoFace = 0;
  let totalMultiFace = 0;
  let totalGaze = 0;
  let totalMic = 0;

  cands.forEach(c => {
    totalFlags += c.totalFlags || 0;
    if (c.totalFlags > 0) candsWithFlags++;
    totalTabSwitch += c.tabSwitchCount || 0;
    totalNoFace += c.noFaceCount || 0;
    totalMultiFace += c.multipleFacesCount || 0;
    totalGaze += c.gazeAwayCount || 0;
    totalMic += c.audioDetectedCount || 0;
  });

  return (
    <div className="w-full h-full space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="mb-6 flex flex-col gap-4">
        <button onClick={() => navigate(`/host/exams/${id}/manage`)} className="text-brand-600 hover:text-brand-700 flex items-center gap-2 font-bold text-sm transition-colors bg-brand-50 px-3 py-1.5 rounded-lg w-fit hover:bg-brand-100">
          <ArrowLeft className="w-4 h-4" />
          Back to Exam Details
        </button>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-secondary-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-purple-600" />
            Proctoring
          </h1>
          <p className="text-secondary-500 mt-2 text-lg">Review candidate monitoring events and flagged activity for {data.examTitle}.</p>
        </div>
      </header>

      {/* Totals Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200">
          <p className="text-xs text-secondary-500 font-bold uppercase tracking-wider mb-1">Candidates</p>
          <span className="text-2xl font-extrabold text-secondary-900">{totalCandidates}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200">
          <p className="text-xs text-secondary-500 font-bold uppercase tracking-wider mb-1">With Flags</p>
          <span className="text-2xl font-extrabold text-secondary-900">{candsWithFlags}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-200 bg-purple-50">
          <p className="text-xs text-purple-700 font-bold uppercase tracking-wider mb-1">Total Flags</p>
          <span className="text-2xl font-extrabold text-purple-900">{totalFlags}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-secondary-500 mb-1">
            <Monitor className="w-4 h-4" /> <p className="text-xs font-bold uppercase tracking-wider">Tab Switch</p>
          </div>
          <span className="text-2xl font-extrabold text-secondary-900">{totalTabSwitch}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-secondary-500 mb-1">
            <EyeOff className="w-4 h-4" /> <p className="text-xs font-bold uppercase tracking-wider">No Face</p>
          </div>
          <span className="text-2xl font-extrabold text-secondary-900">{totalNoFace}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-secondary-500 mb-1">
            <Users className="w-4 h-4" /> <p className="text-xs font-bold uppercase tracking-wider">Multi Face</p>
          </div>
          <span className="text-2xl font-extrabold text-secondary-900">{totalMultiFace}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-secondary-500 mb-1">
            <Maximize className="w-4 h-4" /> <p className="text-xs font-bold uppercase tracking-wider">Gaze Away</p>
          </div>
          <span className="text-2xl font-extrabold text-secondary-900">{totalGaze}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-secondary-500 mb-1">
            <Mic className="w-4 h-4" /> <p className="text-xs font-bold uppercase tracking-wider">Mic Detect</p>
          </div>
          <span className="text-2xl font-extrabold text-secondary-900">{totalMic}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden">
        {cands.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-secondary-100 text-secondary-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-secondary-700">No candidates</h3>
            <p className="text-secondary-500">Nobody is enrolled in this exam.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-secondary-50 text-secondary-600 text-xs uppercase tracking-wider border-b border-secondary-200">
                  <th className="p-4 font-bold">Candidate</th>
                  <th className="p-4 font-bold">No Face</th>
                  <th className="p-4 font-bold">Multiple Faces</th>
                  <th className="p-4 font-bold">Gaze Away</th>
                  <th className="p-4 font-bold">Mic Detect</th>
                  <th className="p-4 font-bold">Tab Switch</th>
                  <th className="p-4 font-bold">Total Flags</th>
                  <th className="p-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {cands.map((candidate) => (
                  <ProctoringRow key={candidate.enrollmentId} candidate={candidate} examId={id} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostProctoring;

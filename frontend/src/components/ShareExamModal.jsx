import React, { useState, useEffect } from 'react';
import { getShareExamInfo } from '../services/hostService';
import { useToast } from '../contexts/ToastContext';
import Button from './ui/Button';
import { Share2, Copy, CheckCircle, Clock, Smartphone, Code2, AlertTriangle } from 'lucide-react';

const ShareExamModal = ({ examId, isOpen, onClose }) => {
  const [shareData, setShareData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchShareData();
    } else {
      setShareData(null);
      setError('');
      setIsCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, examId]);

  const fetchShareData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getShareExamInfo(examId);
      setShareData(response.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 400) {
        setError("Publish the exam before sharing it with candidates.");
      } else {
        setError(err.response?.data?.message || 'Failed to generate share link.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareData?.shareMessage) {
      navigator.clipboard.writeText(shareData.shareMessage);
      setIsCopied(true);
      showToast('Copied to clipboard!', 'success');
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-secondary-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-brand-600" />
            Share Exam
          </h2>
          <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600 transition-colors p-1 rounded-md hover:bg-secondary-50">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-4"></div>
              <p className="text-secondary-500 text-sm font-medium">Generating sharing details...</p>
            </div>
          ) : error ? (
            <div className="bg-amber-50 text-amber-800 p-6 rounded-2xl border border-amber-200 flex flex-col items-center text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
              <p className="font-bold mb-1">Cannot Share Exam</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : shareData ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm font-bold text-secondary-500 uppercase tracking-wider mb-2">Join Code</p>
                <div className="inline-block bg-brand-50 text-brand-700 font-mono text-4xl font-extrabold tracking-widest px-8 py-4 rounded-2xl border border-brand-200 shadow-inner">
                  {shareData.joinCode}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-secondary-500 uppercase tracking-wider mb-2">Invitation Message</p>
                <div className="bg-secondary-50 rounded-2xl p-4 border border-secondary-200 shadow-inner">
                  <textarea 
                    readOnly
                    className="w-full bg-transparent border-none text-secondary-800 resize-none focus:ring-0 p-0 text-sm h-32 custom-scrollbar"
                    value={shareData.shareMessage}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleCopy} 
                className="w-full h-12 text-lg shadow-md flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                variant={isCopied ? 'success' : 'primary'}
              >
                {isCopied ? (
                  <>
                    <CheckCircle className="w-5 h-5" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" /> Copy Message
                  </>
                )}
              </Button>

              <div className="pt-6 border-t border-secondary-100">
                <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-3">Exam Details Summary</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary-50 rounded-xl p-3 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Clock className="w-4 h-4" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-secondary-500">Duration</p>
                      <p className="text-sm font-bold text-secondary-800">{shareData.durationMinutes} min</p>
                    </div>
                  </div>
                  <div className="bg-secondary-50 rounded-xl p-3 flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Smartphone className="w-4 h-4" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-secondary-500">Device Access</p>
                      <p className="text-sm font-bold text-secondary-800">{shareData.deviceAccess}</p>
                    </div>
                  </div>
                  <div className="bg-secondary-50 rounded-xl p-3 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Code2 className="w-4 h-4" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-secondary-500">Coding Section</p>
                      <p className="text-sm font-bold text-secondary-800">{shareData.hasCodingSection ? 'Included' : 'None'}</p>
                    </div>
                  </div>
                  <div className="bg-secondary-50 rounded-xl p-3 flex items-center gap-3">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><Clock className="w-4 h-4" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-secondary-500">Grace Period</p>
                      <p className="text-sm font-bold text-secondary-800">{shareData.gracePeriodMinutes} min</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ShareExamModal;

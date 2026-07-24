import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamById, publishExam, endExam } from '../services/examService';
import Button from '../components/ui/Button';

const ManageExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchExam = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getExamById(id);
      setExam(response.data);
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
    // In the future: Check if questions exist before publishing
    // if (!exam.questions || exam.questions.length === 0) {
    //   alert("You must add questions before publishing!");
    //   return;
    // }
    try {
      const response = await publishExam(id);
      setExam({ ...exam, status: 'LIVE', startedAt: response.data.startedAt || new Date().toISOString() });
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to publish exam.');
    }
  };

  const handleEnd = async () => {
    try {
      const response = await endExam(id);
      setExam({ ...exam, status: 'ENDED', endedAt: response.data.endedAt || new Date().toISOString() });
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to end exam.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl shadow-sm border border-red-100">
        {error}
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">{exam.title}</h1>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider
              ${exam.status === 'LIVE' ? 'bg-green-100 text-green-700' : 
                exam.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 
                'bg-red-100 text-red-700'}`}>
              {exam.status}
            </span>
          </div>
          <p className="text-secondary-600 font-medium">{exam.subject}</p>
        </div>
        
        <div className="flex gap-3">
          {exam.status === 'DRAFT' && (
            <Button onClick={handlePublish} className="bg-brand-600 hover:bg-brand-700 text-white">
              Publish Exam
            </Button>
          )}
          {exam.status === 'LIVE' && (
            <Button onClick={handleEnd} className="bg-red-600 hover:bg-red-700 text-white">
              End Exam
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-secondary-800">Questions</h2>
          {exam.status === 'DRAFT' && (
            <Button 
              onClick={() => {
                localStorage.setItem('currentExamId', exam.id);
                navigate('/host/generate-questions');
              }} 
              variant="outline"
            >
              Add / Generate Questions
            </Button>
          )}
        </div>
        
        <div className="text-center py-12 bg-secondary-50 rounded-xl border border-dashed border-secondary-300">
          <p className="text-secondary-500 mb-2 font-medium">No questions added yet.</p>
          <p className="text-sm text-secondary-400">Add questions to this exam before publishing it to candidates.</p>
        </div>
      </div>
    </div>
  );
};

export default ManageExam;

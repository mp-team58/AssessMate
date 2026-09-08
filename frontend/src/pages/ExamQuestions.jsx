import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getExamQuestions, getExamQuestionStats, addQuestionManually,
  addBankQuestionsToExam, editQuestion, deleteQuestion, getBankQuestions, verifyQuestion
} from '../services/questionService';
import { getExamById, publishExam } from '../services/examService';
import QuestionForm from '../components/QuestionForm';
import QuestionCard from '../components/QuestionCard';
import ExcelUpload from '../components/ExcelUpload';
import AIGeneration from '../components/AIGeneration';
import Button from '../components/ui/Button';
import { Edit2, Trash2, Plus, Cpu, Library, Search, Filter, Rocket, FileSpreadsheet } from 'lucide-react';

const ExamQuestions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [examInfo, setExamInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(null); // 'manual', 'bank', 'ai'
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Bank Tab State
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [bankFilters, setBankFilters] = useState({ difficulty: '', type: '', search: '' });
  const [isBankLoading, setIsBankLoading] = useState(false);

  const fetchExamData = async () => {
    setIsLoading(true);
    try {
      const [examRes, questionsRes, statsRes] = await Promise.all([
        getExamById(examId),
        getExamQuestions(examId),
        getExamQuestionStats(examId)
      ]);
      setExamInfo(examRes.data || examRes);
      setQuestions(questionsRes.data || questionsRes);
      setStats(statsRes.data || statsRes);
    } catch (error) {
      console.error('Failed to fetch exam data', error);
      alert('Error loading exam data. It might not be in DRAFT status or you are not authorized.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExamData();
  }, [examId]);

  // Fetch bank questions when Bank tab is active
  useEffect(() => {
    if (activeTab === 'bank') {
      const fetchBank = async () => {
        setIsBankLoading(true);
        try {
          const activeFilters = Object.fromEntries(
            Object.entries(bankFilters).filter(([_, v]) => v !== '')
          );
          const res = await getBankQuestions(activeFilters);
          setBankQuestions(res.data || res);
        } catch (error) {
          console.error('Failed to fetch bank questions', error);
        } finally {
          setIsBankLoading(false);
        }
      };
      const delay = setTimeout(fetchBank, 400);
      return () => clearTimeout(delay);
    }
  }, [activeTab, bankFilters]);

  const handleManualSubmit = async (formData) => {
    try {
      await addQuestionManually(examId, formData);
      setActiveTab(null);
      fetchExamData();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to add question');
    }
  };

  const handleEditSubmit = async (formData) => {
    try {
      await editQuestion(editingQuestion.id, formData);
      setEditingQuestion(null);
      fetchExamData();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to edit question');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await deleteQuestion(id);
        fetchExamData();
      } catch (error) {
        console.error(error);
        alert(error.message || 'Failed to delete question');
      }
    }
  };

  const handleVerify = async (id) => {
    try {
      await verifyQuestion(id);
      fetchExamData();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to verify question');
    }
  };

  const handleBankSubmit = async () => {
    if (selectedBankIds.length === 0) return;
    try {
      await addBankQuestionsToExam(parseInt(examId), selectedBankIds);
      setSelectedBankIds([]);
      setActiveTab(null);
      fetchExamData();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to add from bank');
    }
  };

  const handlePublish = async () => {
    if (!stats?.canPublish) return;
    if (window.confirm("Are you sure you want to publish this exam? You won't be able to edit questions after publishing.")) {
      try {
        await publishExam(examId);
        navigate('/host/my-exams');
      } catch (error) {
        console.error(error);
        alert(error.message || 'Failed to publish exam');
      }
    }
  };

  const renderProgressBar = (label, added, required, status) => {
    const percent = required > 0 ? Math.min((added / required) * 100, 100) : 0;
    const isExcess = status === 'EXCESS';
    const isComplete = status === 'COMPLETE';

    let colorClass = 'bg-brand-500';
    if (isExcess) colorClass = 'bg-red-500';
    if (isComplete) colorClass = 'bg-green-500';

    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm font-medium mb-1">
          <span className="text-secondary-700">{label}</span>
          <span className={isExcess ? 'text-red-600 font-bold' : isComplete ? 'text-green-600 font-bold' : 'text-secondary-600'}>
            {added} / {required} {isComplete && '✅'}
          </span>
        </div>
        <div className="w-full bg-secondary-100 rounded-full h-2">
          <div
            className={`${colorClass} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${percent}%` }}
          ></div>
        </div>
      </div>
    );
  };

  if (isLoading && !examInfo) {
    return <div className="p-8 text-center text-gray-500">Loading exam data...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">

      {/* Top Section: Exam Info & Stats */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">{examInfo?.title || `Exam #${examId}`}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-secondary-600">
              <span className="bg-brand-50 text-brand-700 px-2 py-1 rounded-md font-medium">{examInfo?.subject || 'Subject'}</span>
              <span className="font-mono text-xs bg-secondary-100 px-2 py-1 rounded-md">Join Code: {examInfo?.joinCode || 'N/A'}</span>
            </div>
          </div>
        </div>

        {stats && (
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Question Requirements</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {renderProgressBar('Easy Questions', stats.easyAdded, stats.easyRequired, stats.easyStatus)}
              {renderProgressBar('Medium Questions', stats.mediumAdded, stats.mediumRequired, stats.mediumStatus)}
              {renderProgressBar('Hard Questions', stats.hardAdded, stats.hardRequired, stats.hardStatus)}
              {renderProgressBar('Total Questions', stats.totalAdded, stats.totalRequired, stats.canPublish ? 'COMPLETE' : 'INCOMPLETE')}
            </div>

            <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${stats.canPublish && stats.unverifiedCount === 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
              {stats.canPublish && stats.unverifiedCount === 0 ? "All questions verified. Ready to publish!" : stats.message}
            </div>
          </div>
        )}

        {stats?.unverifiedCount > 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900">
            <span className="text-xl">⚠️</span>
            <p className="font-semibold text-sm pt-0.5">{stats.unverifiedCount} question(s) need review before publish.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={() => { setActiveTab(activeTab === 'manual' ? null : 'manual'); setEditingQuestion(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'manual'
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50'
              }`}
          >
            <Plus className="w-5 h-5" /> Add Manually
          </button>
          <button
            onClick={() => { setActiveTab(activeTab === 'bank' ? null : 'bank'); setEditingQuestion(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'bank'
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50'
              }`}
          >
            <Library className="w-5 h-5" /> From Bank
          </button>
          <button
            onClick={() => { setActiveTab(activeTab === 'excel' ? null : 'excel'); setEditingQuestion(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'excel'
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50'
              }`}
          >
            <FileSpreadsheet className="w-5 h-5" /> Excel Upload
          </button>
          <button
            onClick={() => { setActiveTab(activeTab === 'ai' ? null : 'ai'); setEditingQuestion(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'ai'
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50'
              }`}
          >
            <Cpu className="w-5 h-5" /> AI Generate
          </button>
        </div>
      </div>

      {/* Editing / Adding Manual Section */}
      {(activeTab === 'manual' || editingQuestion) && (
        <div className="bg-white rounded-2xl shadow-sm border border-brand-200 p-6 md:p-8 relative">
          <button
            onClick={() => { setActiveTab(null); setEditingQuestion(null); }}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
          >
            Close
          </button>
          <h2 className="text-xl font-bold text-secondary-900 mb-6 flex items-center gap-2">
            {editingQuestion ? <><Edit2 className="text-brand-600 w-6 h-6" /> Edit Question</> : <><Plus className="text-brand-600 w-6 h-6" /> Add New Question</>}
          </h2>

          <QuestionForm
            initialData={editingQuestion}
            onSubmit={editingQuestion ? handleEditSubmit : handleManualSubmit}
            onCancel={() => { setActiveTab(null); setEditingQuestion(null); }}
            isExamContext={true}
            examId={examId}
          />
        </div>
      )}

      {/* Excel Upload Section */}
      {activeTab === 'excel' && (
        <div className="bg-white rounded-2xl shadow-sm border border-brand-200 p-6 md:p-8 relative">
          <button
            onClick={() => setActiveTab(null)}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
          >
            Close
          </button>
          <h2 className="text-xl font-bold text-secondary-900 mb-6 flex items-center gap-2">
            <FileSpreadsheet className="text-brand-600 w-6 h-6" /> Upload Questions via Excel
          </h2>

          <ExcelUpload
            examId={examId}
            onUploadSuccess={() => {
              fetchExamData();
            }}
            onClose={() => setActiveTab(null)}
          />
        </div>
      )}

      {/* Add From Bank Section */}
      {activeTab === 'bank' && !editingQuestion && (
        <div className="bg-white rounded-2xl shadow-sm border border-purple-200 p-6 md:p-8 relative">
          <button
            onClick={() => setActiveTab(null)}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
          >
            Close
          </button>
          <h2 className="text-xl font-bold text-secondary-900 mb-6 flex items-center gap-2">
            <Library className="text-purple-600 w-6 h-6" /> Select from Question Bank
          </h2>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bank..."
                  value={bankFilters.search}
                  onChange={(e) => setBankFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <select
              value={bankFilters.difficulty}
              onChange={(e) => setBankFilters(prev => ({ ...prev, difficulty: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
            <select
              value={bankFilters.type}
              onChange={(e) => setBankFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Types</option>
              <option value="SINGLE_CHOICE">Single Choice</option>
              <option value="MULTIPLE_SELECT">Multiple Select</option>
            </select>
          </div>

          <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3 mb-6 border-y border-gray-100 py-4">
            {isBankLoading ? (
              <div className="text-center text-gray-500 py-8">Loading bank questions...</div>
            ) : bankQuestions.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No matching questions found in bank.</div>
            ) : (
              bankQuestions.map(q => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  selectable={true}
                  selected={selectedBankIds.includes(q.id)}
                  onSelect={(id) => {
                    setSelectedBankIds(prev =>
                      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                    );
                  }}
                />
              ))
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">
              {selectedBankIds.length} question(s) selected
            </span>
            <Button
              onClick={handleBankSubmit}
              disabled={selectedBankIds.length === 0}
            >
              Add Selected Questions
            </Button>
          </div>
        </div>
      )}

      {/* AI Generate Section */}
      {activeTab === 'ai' && (
        <AIGeneration
          examId={examId}
          stats={stats}
          onGenerationSuccess={fetchExamData}
          onEdit={(q) => { setEditingQuestion(q); setActiveTab(null); window.scrollTo(0, 0); }}
          onDelete={handleDelete}
          onClose={() => setActiveTab(null)}
        />
      )}

      {/* Questions List */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-bold text-secondary-900">
          Exam Questions ({questions.length})
        </h3>

        {questions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
            <p className="text-gray-500">No questions added yet. Add some to get started!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {questions.map((q, index) => (
              <div key={q.id} className="relative group">
                <div className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm border border-brand-200">
                  {index + 1}
                </div>
                <div className="pl-10">
                  <QuestionCard
                    question={q}
                    showSource={true}
                    onEdit={() => { setEditingQuestion(q); setActiveTab(null); window.scrollTo(0, 0); }}
                    onDelete={handleDelete}
                    onVerify={handleVerify}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Publish Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className={`text-sm font-medium ${stats?.canPublish && stats?.unverifiedCount === 0 ? 'text-green-600' : 'text-amber-600'}`}>
            {stats?.canPublish && stats?.unverifiedCount === 0 ? "All questions verified. Ready to publish!" : (stats?.message || 'Checking publish requirements...')}
          </div>
          <div className="relative group">
            <Button
              onClick={handlePublish}
              disabled={!stats?.canPublish || stats?.unverifiedCount > 0}
              className={`flex items-center gap-2 px-8 ${stats?.canPublish && stats?.unverifiedCount === 0 ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20 shadow-lg' : ''}`}
            >
              <Rocket className="w-5 h-5" /> Publish Exam
            </Button>
            {stats?.unverifiedCount > 0 && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Verify all questions before publishing
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default ExamQuestions;

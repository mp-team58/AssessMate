import React, { useState, useEffect } from 'react';
import { getBankQuestions, addQuestionToBank, editQuestion, deleteQuestion } from '../services/questionService';
import QuestionCard from '../components/QuestionCard';
import QuestionForm from '../components/QuestionForm';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Plus, Search, Filter, X, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const BankQuestionRow = ({ question, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getOptionLetter = (index) => String.fromCharCode(65 + index);

  return (
    <div className="bg-white border border-secondary-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header / Summary Row */}
      <div 
        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-secondary-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md uppercase tracking-wider
              ${question.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                question.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'}`}>
              {question.difficulty}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-gray-100 text-gray-600 border border-gray-200">
              {question.type.replace('_', ' ')}
            </span>
            {question.topic && (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                {question.topic}
              </span>
            )}
          </div>
          <h3 className="text-[15px] font-semibold text-secondary-900 line-clamp-2 pr-4">
            {question.questionText}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          <button 
            onClick={() => onEdit(question)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 hover:border-brand-200 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button 
            onClick={() => onDelete(question.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-2"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 border-t border-secondary-100 text-sm">
          {question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_SELECT' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {['optionA', 'optionB', 'optionC', 'optionD'].map((optKey, idx) => {
                if (!question[optKey]) return null;
                const letter = String.fromCharCode(65 + idx);
                const isCorrect = question.correctAnswer?.includes(letter);
                  
                return (
                  <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <span className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-md text-xs font-bold ${isCorrect ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {letter}
                    </span>
                    <span className={`leading-relaxed ${isCorrect ? 'text-green-900 font-medium' : 'text-gray-700'}`}>
                      {question[optKey]}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : question.type === 'FILL_BLANK' ? (
             <div className="mt-2 p-3 bg-white border border-gray-200 rounded-xl">
               <span className="font-semibold text-gray-500 mr-2">Acceptable Answers:</span>
               <div className="flex flex-wrap gap-2 mt-2">
                 {question.acceptableAnswers?.map((ans, idx) => (
                   <span key={idx} className="px-3 py-1 bg-green-50 text-green-800 border border-green-200 rounded-lg font-medium">
                     {ans}
                   </span>
                 ))}
               </div>
             </div>
          ) : (
             <div className="mt-2 p-3 bg-white border border-gray-200 rounded-xl inline-block">
               <span className="font-semibold text-gray-500 mr-2">Correct Answer:</span>
               <span className="px-3 py-1 bg-green-50 text-green-800 border border-green-200 rounded-lg font-bold">
                 {question.correctAnswer}
               </span>
             </div>
          )}
          
          {question.explanation && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-900">
              <span className="font-bold block mb-1">Explanation:</span>
              {question.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const [filters, setFilters] = useState({
    difficulty: '',
    type: '',
    topic: '',
    search: '',
  });

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      // Clean up empty filters
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const res = await getBankQuestions(activeFilters);
      setQuestions(res.data || res); // Depending on apiClient response format
    } catch (error) {
      console.error('Failed to fetch questions', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchQuestions();
    }, 500); // Debounce search

    return () => clearTimeout(delayDebounceFn);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleAddSubmit = async (formData) => {
    try {
      await addQuestionToBank(formData);
      setIsModalOpen(false);
      fetchQuestions();
    } catch (error) {
      console.error('Failed to add question', error);
      alert(error.message || 'Failed to add question');
    }
  };

  const handleEditSubmit = async (formData) => {
    try {
      await editQuestion(editingQuestion.id, formData);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      console.error('Failed to edit question', error);
      alert(error.message || 'Failed to edit question');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteQuestion(id);
        fetchQuestions();
      } catch (error) {
        console.error('Failed to delete question', error);
        alert(error.message || 'Failed to delete question');
      }
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#362E20] tracking-tight">Question Bank</h1>
          <p className="text-secondary-600 mt-1">Manage your global repository of questions.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-5 h-5" /> Add to Bank
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-secondary-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-[13px] font-medium text-gray-500 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search in question text..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="w-full md:w-48">
          <label className="block text-[13px] font-medium text-gray-500 mb-1">Topic</label>
          <input
            type="text"
            placeholder="e.g. Java Basics"
            value={filters.topic}
            onChange={(e) => handleFilterChange('topic', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
          />
        </div>

        <div className="w-full md:w-36">
          <label className="block text-[13px] font-medium text-gray-500 mb-1">Difficulty</label>
          <select
            value={filters.difficulty}
            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm bg-white"
          >
            <option value="">All</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        <div className="w-full md:w-44">
          <label className="block text-[13px] font-medium text-gray-500 mb-1">Type</label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm bg-white"
          >
            <option value="">All Types</option>
            <option value="SINGLE_CHOICE">Single Choice</option>
            <option value="MULTIPLE_SELECT">Multiple Select</option>
            <option value="FILL_BLANK">Fill in Blank</option>
            <option value="NUMERICAL">Numerical</option>
          </select>
        </div>
      </div>

      {/* Question List */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-20 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
            Loading questions...
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <Filter className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No questions found</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-md text-center">
              Adjust your filters or add a new question to your bank to see it here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map(q => (
              <BankQuestionRow
                key={q.id}
                question={q}
                onEdit={setEditingQuestion}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isModalOpen || editingQuestion) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">

            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editingQuestion ? 'Edit Question' : 'Add to Question Bank'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); setEditingQuestion(null); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <QuestionForm
                initialData={editingQuestion}
                onSubmit={editingQuestion ? handleEditSubmit : handleAddSubmit}
                onCancel={() => { setIsModalOpen(false); setEditingQuestion(null); }}
                isExamContext={false}
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default QuestionBank;

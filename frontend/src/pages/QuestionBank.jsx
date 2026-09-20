import React, { useState, useEffect } from 'react';
import { getBankQuestions, addQuestionToBank, editQuestion, deleteQuestion } from '../services/questionService';
import {
  getCodingBank,
  addCodingProblemToBank,
  updateCodingProblem,
  deleteCodingProblem
} from '../services/codingQuestionService';
import QuestionCard from '../components/QuestionCard';
import QuestionForm from '../components/QuestionForm';
import CodingProblemModal from '../components/CodingProblemModal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import {
  Plus, Search, Filter, X, Pencil, Trash2, ChevronDown, ChevronUp,
  Code2, HelpCircle, Clock, HardDrive, Eye, EyeOff, CheckCircle2
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const BankQuestionRow = ({ question, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white border border-secondary-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-secondary-100 text-secondary-600 border border-secondary-200">
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
            className="p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors ml-2"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="p-4 bg-secondary-50 border-t border-secondary-100 text-sm">
          {question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_SELECT' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {['optionA', 'optionB', 'optionC', 'optionD'].map((optKey, idx) => {
                if (!question[optKey]) return null;
                const letter = String.fromCharCode(65 + idx);
                const isCorrect = question.correctAnswer?.includes(letter);
                  
                return (
                  <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-white border-secondary-200'}`}>
                    <span className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-md text-xs font-bold ${isCorrect ? 'bg-green-200 text-green-800' : 'bg-secondary-100 text-secondary-600'}`}>
                      {letter}
                    </span>
                    <span className={`leading-relaxed ${isCorrect ? 'text-green-900 font-medium' : 'text-secondary-700'}`}>
                      {question[optKey]}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : question.type === 'FILL_BLANK' ? (
             <div className="mt-2 p-3 bg-white border border-secondary-200 rounded-xl">
               <span className="font-semibold text-secondary-500 mr-2">Acceptable Answers:</span>
               <div className="flex flex-wrap gap-2 mt-2">
                 {question.acceptableAnswers?.map((ans, idx) => (
                   <span key={idx} className="px-3 py-1 bg-green-50 text-green-800 border border-green-200 rounded-lg font-medium">
                     {ans}
                   </span>
                 ))}
               </div>
             </div>
          ) : (
             <div className="mt-2 p-3 bg-white border border-secondary-200 rounded-xl inline-block">
               <span className="font-semibold text-secondary-500 mr-2">Correct Answer:</span>
               <span className="font-bold text-green-700">{question.correctAnswer}</span>
             </div>
          )}

          {question.explanation && (
            <div className="mt-3 p-3 bg-white border border-secondary-200 rounded-xl text-xs text-secondary-600">
              <span className="font-semibold text-secondary-700 block mb-1">Explanation:</span>
              {question.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CodingBankProblemRow = ({ problem, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white border border-secondary-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header / Summary Row */}
      <div
        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-secondary-50/60 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 rounded-md">
              {problem.marks || 10} Marks
            </span>
            {problem.partialMarking && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                Partial Marking
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-secondary-500 ml-1">
              <Clock className="w-3.5 h-3.5 text-secondary-400" />
              <span>{problem.timeLimitSeconds ?? 2}s</span>
              <span className="text-secondary-300">•</span>
              <HardDrive className="w-3.5 h-3.5 text-secondary-400" />
              <span>{problem.memoryLimitMb ?? 256}MB</span>
              <span className="text-secondary-300">•</span>
              <Eye className="w-3.5 h-3.5 text-secondary-400" />
              <span>{problem.testCases?.length || 0} Test Cases</span>
            </div>
          </div>

          <h3 className="text-base font-bold text-[#362E20] truncate pr-4">
            {problem.title}
          </h3>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {problem.allowedLanguages?.map(lang => (
              <span key={lang} className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-secondary-100 text-secondary-700 border border-secondary-200">
                {lang}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onEdit(problem)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 hover:border-brand-200 rounded-xl transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={() => onDelete(problem.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-xl transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors ml-1"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 bg-secondary-50/50 border-t border-secondary-100 text-sm space-y-4">
          <div>
            <span className="text-xs font-bold text-secondary-700 uppercase tracking-wider block mb-1">
              Description
            </span>
            <p className="text-xs text-secondary-800 whitespace-pre-line leading-relaxed bg-white p-3.5 rounded-xl border border-secondary-200">
              {problem.description}
            </p>
          </div>

          {problem.constraints && (
            <div>
              <span className="text-xs font-bold text-secondary-700 uppercase tracking-wider block mb-1">
                Constraints
              </span>
              <div className="bg-white p-2.5 rounded-xl border border-secondary-200 font-mono text-xs text-secondary-800">
                {problem.constraints}
              </div>
            </div>
          )}

          {(problem.sampleInput || problem.sampleOutput) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-secondary-700 uppercase tracking-wider block mb-1">
                  Sample Input
                </span>
                <pre className="bg-white p-3 rounded-xl border border-secondary-200 font-mono text-xs text-secondary-800 whitespace-pre-wrap overflow-x-auto">
                  {problem.sampleInput || 'None'}
                </pre>
              </div>
              <div>
                <span className="text-xs font-bold text-secondary-700 uppercase tracking-wider block mb-1">
                  Sample Output
                </span>
                <pre className="bg-white p-3 rounded-xl border border-secondary-200 font-mono text-xs text-secondary-800 whitespace-pre-wrap overflow-x-auto">
                  {problem.sampleOutput || 'None'}
                </pre>
              </div>
            </div>
          )}

          {problem.explanation && (
            <div>
              <span className="text-xs font-bold text-secondary-700 uppercase tracking-wider block mb-1">
                Sample Explanation
              </span>
              <p className="text-xs text-secondary-700 bg-white p-3 rounded-xl border border-secondary-200">
                {problem.explanation}
              </p>
            </div>
          )}

          {problem.testCases && problem.testCases.length > 0 && (
            <div>
              <span className="text-xs font-bold text-secondary-700 uppercase tracking-wider block mb-1.5">
                Configured Test Cases ({problem.testCases.length})
              </span>
              <div className="space-y-2">
                {problem.testCases.map((tc, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-secondary-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-secondary-800">#{idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tc.isHidden ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {tc.isHidden ? 'Hidden' : 'Public'}
                      </span>
                      <span className="text-secondary-600 font-medium">({tc.points ?? 0} pts)</span>
                    </div>
                    <div className="flex items-center gap-3 text-secondary-500 font-mono text-[11px] truncate">
                      <span>In: {tc.input?.replace(/\n/g, ' ') || 'None'}</span>
                      <span>→</span>
                      <span>Out: {tc.expectedOutput?.replace(/\n/g, ' ') || 'None'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const QuestionBank = () => {
  // Active Bank Tab: 'mcq' or 'coding'
  const [activeBankTab, setActiveBankTab] = useState('mcq');
  const { showToast } = useToast();

  // MCQ State
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    topic: '',
    difficulty: '',
    type: ''
  });

  // Coding Bank State
  const [codingProblems, setCodingProblems] = useState([]);
  const [isCodingLoading, setIsCodingLoading] = useState(false);
  const [isCodingModalOpen, setIsCodingModalOpen] = useState(false);
  const [editingCodingProblem, setEditingCodingProblem] = useState(null);
  const [isSubmittingCoding, setIsSubmittingCoding] = useState(false);
  const [codingFilters, setCodingFilters] = useState({
    search: '',
    language: ''
  });

  // Fetch MCQ Questions
  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const res = await getBankQuestions(activeFilters);
      setQuestions(res.data || res || []);
    } catch (error) {
      console.error('Failed to fetch questions', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Coding Problems
  const fetchCodingProblems = async () => {
    setIsCodingLoading(true);
    try {
      const res = await getCodingBank();
      const list = res.data || res || [];
      setCodingProblems(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to fetch coding bank', error);
    } finally {
      setIsCodingLoading(false);
    }
  };

  useEffect(() => {
    if (activeBankTab === 'mcq') {
      const delayDebounceFn = setTimeout(() => {
        fetchQuestions();
      }, 400);
      return () => clearTimeout(delayDebounceFn);
    } else {
      fetchCodingProblems();
    }
  }, [filters, activeBankTab]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCodingFilterChange = (key, value) => {
    setCodingFilters(prev => ({ ...prev, [key]: value }));
  };

  // MCQ Action Handlers
  const handleAddSubmit = async (formData) => {
    try {
      await addQuestionToBank(formData);
      setIsModalOpen(false);
      fetchQuestions();
      showToast('Question added successfully', 'success');
    } catch (error) {
      console.error('Failed to add question', error);
      showToast(error.message || 'Failed to add question', 'error');
    }
  };

  const handleEditSubmit = async (formData) => {
    try {
      await editQuestion(editingQuestion.id, formData);
      setEditingQuestion(null);
      fetchQuestions();
      showToast('Question updated successfully', 'success');
    } catch (error) {
      console.error('Failed to edit question', error);
      showToast(error.message || 'Failed to edit question', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this question from the bank?')) {
      try {
        await deleteQuestion(id);
        fetchQuestions();
        showToast('Question deleted successfully', 'success');
      } catch (error) {
        console.error('Failed to delete question', error);
        showToast(error.message || 'Failed to delete question', 'error');
      }
    }
  };

  // Coding Action Handlers
  const handleAddCodingSubmit = async (formData) => {
    setIsSubmittingCoding(true);
    try {
      if (editingCodingProblem) {
        await updateCodingProblem(editingCodingProblem.id, formData);
      } else {
        await addCodingProblemToBank(formData);
      }
      setIsCodingModalOpen(false);
      setEditingCodingProblem(null);
      fetchCodingProblems();
      showToast('Coding problem saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save coding problem', error);
      showToast(error.message || 'Failed to save coding problem', 'error');
    } finally {
      setIsSubmittingCoding(false);
    }
  };

  const handleDeleteCoding = async (id) => {
    if (window.confirm('Are you sure you want to delete this coding problem from the global bank?')) {
      try {
        await deleteCodingProblem(id);
        fetchCodingProblems();
        showToast('Coding problem deleted', 'success');
      } catch (error) {
        console.error('Failed to delete coding problem', error);
        showToast(error.message || 'Failed to delete coding problem', 'error');
      }
    }
  };

  // Filtered Coding Problems
  const filteredCodingProblems = codingProblems.filter(p => {
    if (codingFilters.search) {
      const q = codingFilters.search.toLowerCase();
      const matchesTitle = p.title?.toLowerCase().includes(q);
      const matchesDesc = p.description?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesDesc) return false;
    }
    if (codingFilters.language) {
      if (!p.allowedLanguages?.includes(codingFilters.language)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#362E20] tracking-tight">Question Bank</h1>
          <p className="text-secondary-600 mt-1">Manage your global repository of MCQs and coding challenges.</p>
        </div>

        <div className="flex items-center gap-3">
          {activeBankTab === 'mcq' ? (
            <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add MCQ to Bank
            </Button>
          ) : (
            <Button
              onClick={() => {
                setEditingCodingProblem(null);
                setIsCodingModalOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add Coding Problem
            </Button>
          )}
        </div>
      </div>

      {/* Tab Switcher: MCQ Bank vs Coding Problem Bank */}
      <div className="flex items-center gap-3 border-b border-secondary-200 pb-2">
        <button
          onClick={() => setActiveBankTab('mcq')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            activeBankTab === 'mcq'
              ? 'bg-[#362E20] text-amber-300 shadow-sm'
              : 'bg-white text-secondary-600 hover:bg-secondary-50 border border-secondary-200'
          }`}
        >
          <span>MCQ Bank</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeBankTab === 'mcq' ? 'bg-amber-400/20 text-amber-300' : 'bg-secondary-100 text-secondary-600'
          }`}>
            {questions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveBankTab('coding')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            activeBankTab === 'coding'
              ? 'bg-[#362E20] text-amber-300 shadow-sm'
              : 'bg-white text-secondary-600 hover:bg-secondary-50 border border-secondary-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Coding Problem Bank</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeBankTab === 'coding' ? 'bg-amber-400/20 text-amber-300' : 'bg-secondary-100 text-secondary-600'
          }`}>
            {codingProblems.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* MCQ BANK VIEW                                            */}
      {/* ======================================================== */}
      {activeBankTab === 'mcq' && (
        <div className="space-y-6">
          {/* MCQ Filters */}
          <div className="bg-white p-4 rounded-2xl border border-secondary-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[13px] font-medium text-secondary-500 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search in question text..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <label className="block text-[13px] font-medium text-secondary-500 mb-1">Topic</label>
              <input
                type="text"
                placeholder="e.g. Java Basics"
                value={filters.topic}
                onChange={(e) => handleFilterChange('topic', e.target.value)}
                className="w-full px-3 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
              />
            </div>

            <div className="w-full md:w-36">
              <label className="block text-[13px] font-medium text-secondary-500 mb-1">Difficulty</label>
              <select
                value={filters.difficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm bg-white"
              >
                <option value="">All</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div className="w-full md:w-44">
              <label className="block text-[13px] font-medium text-secondary-500 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm bg-white"
              >
                <option value="">All Types</option>
                <option value="SINGLE_CHOICE">Single Choice</option>
                <option value="MULTIPLE_SELECT">Multiple Select</option>
                <option value="FILL_BLANK">Fill in Blank</option>
                <option value="NUMERICAL">Numerical</option>
              </select>
            </div>
          </div>

          {/* MCQ Question List */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-20 text-secondary-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
                Loading questions...
              </div>
            ) : questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-secondary-200 shadow-sm max-w-2xl mx-auto mt-4">
                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-8 h-8 text-brand-500" />
                </div>
                <h3 className="text-xl font-bold text-secondary-800">No questions found</h3>
                <p className="text-secondary-500 text-sm mt-2 max-w-sm text-center">
                  Adjust your filters or add a new question to your bank to see it here.
                </p>
                <Button onClick={() => setIsModalOpen(true)} className="mt-6 px-6 shadow-md shadow-brand-500/20 hover:-translate-y-0.5 transition-transform text-sm">
                  <Plus className="w-4 h-4 mr-1.5" /> Add First Question
                </Button>
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
        </div>
      )}

      {/* ======================================================== */}
      {/* CODING PROBLEM BANK VIEW                                 */}
      {/* ======================================================== */}
      {activeBankTab === 'coding' && (
        <div className="space-y-6">
          {/* Coding Filters */}
          <div className="bg-white p-4 rounded-2xl border border-secondary-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[13px] font-medium text-secondary-500 mb-1">Search Problem</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search problem title or description..."
                  value={codingFilters.search}
                  onChange={(e) => handleCodingFilterChange('search', e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="w-full md:w-56">
              <label className="block text-[13px] font-medium text-secondary-500 mb-1">Programming Language</label>
              <select
                value={codingFilters.language}
                onChange={(e) => handleCodingFilterChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm bg-white"
              >
                <option value="">All Languages</option>
                <option value="PYTHON">Python</option>
                <option value="JAVA">Java</option>
                <option value="CPP">C++</option>
                <option value="C">C</option>
                <option value="JAVASCRIPT">JavaScript</option>
              </select>
            </div>
          </div>

          {/* Coding Problems List */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {isCodingLoading ? (
              <div className="flex justify-center items-center py-20 text-secondary-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
                Loading coding problems...
              </div>
            ) : filteredCodingProblems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-secondary-200 shadow-sm max-w-2xl mx-auto mt-4">
                <div className="w-16 h-16 bg-secondary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Code2 className="w-8 h-8 text-brand-400" />
                </div>
                <h3 className="text-xl font-bold text-secondary-800">No coding problems found</h3>
                <p className="text-secondary-500 text-sm mt-2 max-w-sm text-center">
                  Adjust your search filters or add a new coding problem to your bank.
                </p>
                <Button
                  onClick={() => {
                    setEditingCodingProblem(null);
                    setIsCodingModalOpen(true);
                  }}
                  className="mt-6 px-6 bg-secondary-900 hover:bg-secondary-800 text-white shadow-md hover:-translate-y-0.5 transition-transform text-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add First Problem
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredCodingProblems.map(problem => (
                  <CodingBankProblemRow
                    key={problem.id}
                    problem={problem}
                    onEdit={(p) => {
                      setEditingCodingProblem(p);
                      setIsCodingModalOpen(true);
                    }}
                    onDelete={handleDeleteCoding}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MCQ Add / Edit Modal */}
      {(isModalOpen || editingQuestion) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-secondary-800">
                {editingQuestion ? 'Edit MCQ Question' : 'Add MCQ to Question Bank'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); setEditingQuestion(null); }}
                className="p-2 hover:bg-secondary-100 rounded-full transition-colors text-secondary-500"
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

      {/* Coding Add / Edit Modal */}
      <CodingProblemModal
        isOpen={isCodingModalOpen}
        onClose={() => {
          setIsCodingModalOpen(false);
          setEditingCodingProblem(null);
        }}
        onSubmit={handleAddCodingSubmit}
        initialData={editingCodingProblem}
        showSaveToBank={false}
        isSubmitting={isSubmittingCoding}
      />

    </div>
  );
};

export default QuestionBank;

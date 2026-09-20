import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getExamQuestions, getExamQuestionStats, addQuestionManually,
  addBankQuestionsToExam, editQuestion, deleteQuestion, getBankQuestions, verifyQuestion
} from '../services/questionService';
import { getExamById, publishExam } from '../services/examService';
import {
  getExamCodingProblems,
  addCodingProblemToExam,
  addCodingProblemsFromBank,
  updateCodingProblem,
  deleteCodingProblem
} from '../services/codingQuestionService';
import QuestionForm from '../components/QuestionForm';
import QuestionCard from '../components/QuestionCard';
import ExcelUpload from '../components/ExcelUpload';
import AIGeneration from '../components/AIGeneration';
import CodingProblemModal from '../components/CodingProblemModal';
import PickCodingBankModal from '../components/PickCodingBankModal';
import Button from '../components/ui/Button';
import {
  Edit2, Trash2, Plus, Cpu, Library, Search, Filter, Rocket,
  FileSpreadsheet, Code2, AlertTriangle, Clock, HardDrive, Eye,
  CheckCircle2, HelpCircle, Sparkles
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import AICodingProblemModal from '../components/AICodingProblemModal';

const ExamQuestions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [examInfo, setExamInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  // Section Tab: 'mcq' or 'coding'
  const [sectionTab, setSectionTab] = useState('mcq');

  // MCQ Tab Actions ('manual', 'bank', 'excel', 'ai')
  const [activeTab, setActiveTab] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Bank Tab State for MCQ
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [bankFilters, setBankFilters] = useState({ difficulty: '', type: '', search: '' });
  const [isBankLoading, setIsBankLoading] = useState(false);

  // Coding Section State
  const [codingProblems, setCodingProblems] = useState([]);
  const [isCodingLoading, setIsCodingLoading] = useState(false);
  const [isCodingModalOpen, setIsCodingModalOpen] = useState(false);
  const [isPickBankModalOpen, setIsPickBankModalOpen] = useState(false);
  const [editingCodingProblem, setEditingCodingProblem] = useState(null);
  const [isSubmittingCoding, setIsSubmittingCoding] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const fetchCodingData = async () => {
    setIsCodingLoading(true);
    try {
      const res = await getExamCodingProblems(examId);
      const list = res.data || res || [];
      setCodingProblems(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch coding problems for exam', err);
    } finally {
      setIsCodingLoading(false);
    }
  };

  const fetchExamData = async () => {
    setIsLoading(true);
    try {
      const [examRes, questionsRes, statsRes] = await Promise.all([
        getExamById(examId),
        getExamQuestions(examId),
        getExamQuestionStats(examId)
      ]);
      const exam = examRes.data || examRes;
      setExamInfo(exam);
      setQuestions(questionsRes.data || questionsRes);
      setStats(statsRes.data || statsRes);

      if (exam?.hasCodingSection) {
        await fetchCodingData();
      }
    } catch (error) {
      console.error('Failed to fetch exam data', error);
      showToast('Error loading exam data. It might not be in DRAFT status or you are not authorized.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExamData();
  }, [examId]);

  // Fetch MCQ bank questions when Bank tab is active
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

  // MCQ Handlers
  const handleManualSubmit = async (formData) => {
    try {
      await addQuestionManually(examId, formData);
      setActiveTab(null);
      fetchExamData();
      showToast('Question added successfully', 'success');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Failed to add question', 'error');
    }
  };

  const handleEditSubmit = async (formData) => {
    try {
      await editQuestion(editingQuestion.id, formData);
      setEditingQuestion(null);
      fetchExamData();
      showToast('Question updated successfully', 'success');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Failed to edit question', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await deleteQuestion(id);
        fetchExamData();
        showToast('Question deleted successfully', 'success');
      } catch (error) {
        console.error(error);
        showToast(error.message || 'Failed to delete question', 'error');
      }
    }
  };

  const handleVerify = async (id) => {
    try {
      await verifyQuestion(id);
      fetchExamData();
      showToast('Question verified', 'success');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Failed to verify question', 'error');
    }
  };

  const handleBankSubmit = async () => {
    if (selectedBankIds.length === 0) return;
    try {
      await addBankQuestionsToExam(parseInt(examId), selectedBankIds);
      setSelectedBankIds([]);
      setActiveTab(null);
      fetchExamData();
      showToast('Questions added from bank', 'success');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Failed to add from bank', 'error');
    }
  };

  // Coding Handlers
  const handleCreateCodingProblem = async (formData) => {
    setIsSubmittingCoding(true);
    try {
      if (editingCodingProblem) {
        await updateCodingProblem(editingCodingProblem.id, formData);
      } else {
        await addCodingProblemToExam(examId, formData);
      }
      setIsCodingModalOpen(false);
      setEditingCodingProblem(null);
      await fetchCodingData();
      showToast('Coding problem saved', 'success');
    } catch (error) {
      console.error('Failed to save coding problem', error);
      showToast(error.message || 'Failed to save coding problem', 'error');
    } finally {
      setIsSubmittingCoding(false);
    }
  };

  const handleAIProblemSave = async (generatedData) => {
    try {
      await addCodingProblemToExam(examId, generatedData);
      setIsAIModalOpen(false);
      await fetchCodingData();
      showToast('AI Generated Problem added successfully', 'success');
    } catch (error) {
      console.error('Failed to save AI generated problem', error);
      showToast(error.message || 'Failed to save problem', 'error');
    }
  };

  const handleDeleteCodingProblem = async (problemId) => {
    if (window.confirm("Are you sure you want to remove this coding problem from the exam pool?")) {
      try {
        await deleteCodingProblem(problemId);
        await fetchCodingData();
        showToast('Coding problem deleted', 'success');
      } catch (error) {
        console.error('Failed to delete coding problem', error);
        showToast(error.message || 'Failed to delete coding problem', 'error');
      }
    }
  };

  const handlePickCodingFromBank = async (selectedIds) => {
    setIsSubmittingCoding(true);
    try {
      await addCodingProblemsFromBank(examId, selectedIds);
      setIsPickBankModalOpen(false);
      await fetchCodingData();
      showToast('Problems added from bank', 'success');
    } catch (error) {
      console.error('Failed to add problems from bank', error);
      showToast(error.message || 'Failed to add problems from coding bank', 'error');
    } finally {
      setIsSubmittingCoding(false);
    }
  };

  // Publish Guard Evaluation
  const requiredCodingCount = examInfo?.codingQuestionsCount || 1;
  const codingPoolCount = codingProblems.length;
  const isCodingSufficient = !examInfo?.hasCodingSection || codingPoolCount >= requiredCodingCount;
  const isMcqSufficient = stats?.canPublish && stats?.unverifiedCount === 0;
  const canPublishFinal = isMcqSufficient && isCodingSufficient;

  const handlePublish = async () => {
    if (!canPublishFinal) {
      if (!isMcqSufficient) {
        showToast('Cannot publish: MCQ requirements not fulfilled or unverified questions remain.', 'warning');
        return;
      }
      if (!isCodingSufficient) {
        showToast(`Cannot publish: Coding pool requires at least ${requiredCodingCount} problems (currently ${codingPoolCount}).`, 'warning');
        return;
      }
      return;
    }

    if (window.confirm("Are you sure you want to publish this exam? You won't be able to edit questions after publishing.")) {
      try {
        await publishExam(examId);
        showToast('Exam published successfully', 'success');
        navigate('/host/my-exams');
      } catch (error) {
        console.error(error);
        showToast(error.message || 'Failed to publish exam', 'error');
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
    <div className="w-full h-full space-y-6 animate-in fade-in duration-500 pb-28">

      {/* Top Header Section */}
      <div className="relative bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-secondary-800 tracking-tight">{examInfo?.title || `Exam #${examId}`}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-md text-sm font-bold border border-brand-100 shadow-sm">{examInfo?.subject || 'Subject'}</span>
              <span className="font-mono text-sm bg-secondary-100 px-3 py-1 rounded-md font-bold text-secondary-700 border border-secondary-200 shadow-sm">Code: {examInfo?.joinCode || 'N/A'}</span>
              {examInfo?.hasCodingSection && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-bold bg-secondary-900 text-white shadow-sm">
                  <Code2 className="w-4 h-4 text-brand-400" /> Coding Enabled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs (MCQ vs Coding Section) */}
        {examInfo?.hasCodingSection && (
          <div className="flex items-center gap-2 mt-6 pt-6 border-t border-secondary-100">
            <button
              onClick={() => setSectionTab('mcq')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                sectionTab === 'mcq'
                  ? 'bg-[#362E20] text-amber-300 shadow-sm'
                  : 'bg-secondary-50 text-secondary-600 hover:bg-secondary-100 border border-secondary-200'
              }`}
            >
              <span>MCQ Section</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                sectionTab === 'mcq' ? 'bg-amber-400/20 text-amber-300' : 'bg-secondary-200 text-secondary-700'
              }`}>
                {questions.length} / {stats?.totalRequired || 0}
              </span>
            </button>

            <button
              onClick={() => setSectionTab('coding')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                sectionTab === 'coding'
                  ? 'bg-[#362E20] text-amber-300 shadow-sm'
                  : 'bg-secondary-50 text-secondary-600 hover:bg-secondary-100 border border-secondary-200'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Coding Section</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                isCodingSufficient
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                Pool: {codingPoolCount}/{requiredCodingCount}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* CODING SECTION TAB VIEW                                  */}
      {/* ======================================================== */}
      {sectionTab === 'coding' && examInfo?.hasCodingSection && (
        <div className="space-y-6">
          {/* Coding Pool Stats & Publish Guard Banner */}
          <div className="bg-white rounded-3xl p-6 border border-secondary-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-[#362E20]">Coding Problem Pool Overview</h3>
                <p className="text-xs text-secondary-500 mt-0.5">
                  Problems in this pool are randomly assigned to candidates during their exam session.
                </p>
              </div>

              {/* Action Buttons for Coding */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => {
                    setEditingCodingProblem(null);
                    setIsCodingModalOpen(true);
                  }}
                  className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-white text-secondary-700 border border-secondary-200 hover:bg-secondary-50 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Manually
                </button>
                <Button
                  onClick={() => setIsAIModalOpen(true)}
                  className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20 transition-all"
                >
                  <Sparkles className="w-4 h-4" /> Generate with AI
                </Button>
                <button
                  onClick={() => setIsPickBankModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-white text-secondary-700 border border-secondary-200 hover:bg-secondary-50 transition-all shadow-sm"
                >
                  <Library className="w-4 h-4 text-brand-600" /> Pick from Coding Bank
                </button>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 bg-secondary-50/70 rounded-2xl border border-secondary-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider block">
                    Problems in Pool
                  </span>
                  <span className="text-2xl font-black text-[#362E20] mt-0.5 block">
                    {codingPoolCount}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white border border-secondary-200 flex items-center justify-center text-brand-600 font-bold">
                  {codingPoolCount >= requiredCodingCount ? '✓' : '!'}
                </div>
              </div>

              <div className="p-4 bg-secondary-50/70 rounded-2xl border border-secondary-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider block">
                    Required per Candidate
                  </span>
                  <span className="text-2xl font-black text-brand-700 mt-0.5 block">
                    {requiredCodingCount}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white border border-secondary-200 flex items-center justify-center text-secondary-600">
                  <Eye className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-secondary-50/70 rounded-2xl border border-secondary-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider block">
                    Candidate Duration
                  </span>
                  <span className="text-2xl font-black text-secondary-800 mt-0.5 block">
                    {examInfo.codingDurationMinutes || 30}m
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white border border-secondary-200 flex items-center justify-center text-secondary-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Publish Guard Alert */}
            {!isCodingSufficient ? (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900">Publish Guard Warning</h4>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    You must add at least <strong>{requiredCodingCount}</strong> coding problem(s) to the pool before publishing this exam. Currently you have <strong>{codingPoolCount}</strong> in the pool.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Coding pool meets candidate requirement ({codingPoolCount} available ≥ {requiredCodingCount} required). Ready to publish!</span>
              </div>
            )}
          </div>

          {/* Coding Problem List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-secondary-900">
              Exam Coding Problems ({codingPoolCount})
            </h3>

            {isCodingLoading ? (
              <div className="flex justify-center items-center py-16 bg-white rounded-3xl border border-secondary-200">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-brand-500 border-t-transparent mr-3"></div>
                <span className="text-sm text-secondary-500">Loading coding problem pool...</span>
              </div>
            ) : codingProblems.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-secondary-200 p-8">
                <Code2 className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-secondary-800">No coding problems in pool</h4>
                <p className="text-xs text-secondary-500 mt-1 max-w-sm mx-auto">
                  Add custom coding problems or pick existing ones from your global coding bank.
                </p>
                <div className="flex justify-center gap-3 mt-5">
                  <Button
                    onClick={() => {
                      setEditingCodingProblem(null);
                      setIsCodingModalOpen(true);
                    }}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Problem Manually
                  </Button>
                  <button
                    onClick={() => setIsPickBankModalOpen(true)}
                    className="px-4 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-800 rounded-xl text-xs font-semibold transition-all"
                  >
                    Pick from Bank
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {codingProblems.map((problem, index) => (
                  <div
                    key={problem.id || index}
                    className="bg-white border border-secondary-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#362E20] text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <h4 className="text-base font-bold text-[#362E20] truncate mr-2">
                            {problem.title}
                          </h4>
                          <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 rounded-md">
                            {problem.marks || 10} Marks
                          </span>
                          {problem.partialMarking && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                              Partial Marking
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-secondary-600 line-clamp-2 leading-relaxed">
                          {problem.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-secondary-500">
                          {problem.allowedLanguages && problem.allowedLanguages.length > 0 && (
                            <div className="flex items-center gap-1 bg-secondary-50 px-2 py-0.5 rounded border border-secondary-100">
                              <Code2 className="w-3 h-3 text-secondary-500" />
                              <span className="font-medium text-secondary-700">{problem.allowedLanguages.join(', ')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-secondary-400" />
                            <span>{problem.timeLimitSeconds ?? 2}s</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <HardDrive className="w-3.5 h-3.5 text-secondary-400" />
                            <span>{problem.memoryLimitMb ?? 256}MB</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-secondary-400" />
                            <span>{problem.testCases?.length || 0} Test Cases</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => {
                          setEditingCodingProblem(problem);
                          setIsCodingModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 rounded-xl transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCodingProblem(problem.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MCQ SECTION TAB VIEW                                     */}
      {/* ======================================================== */}
      {sectionTab === 'mcq' && (
        <div className="space-y-6">
          {/* MCQ Requirements Stats */}
          {stats && (
            <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 p-6 md:p-8">
              <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">MCQ Requirements</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                {renderProgressBar('Easy Questions', stats.easyAdded, stats.easyRequired, stats.easyStatus)}
                {renderProgressBar('Medium Questions', stats.mediumAdded, stats.mediumRequired, stats.mediumStatus)}
                {renderProgressBar('Hard Questions', stats.hardAdded, stats.hardRequired, stats.hardStatus)}
                {renderProgressBar('Total Questions', stats.totalAdded, stats.totalRequired, stats.canPublish ? 'COMPLETE' : 'INCOMPLETE')}
              </div>

              <div className={`mt-4 p-3.5 rounded-xl text-xs font-semibold ${stats.canPublish && stats.unverifiedCount === 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                {stats.canPublish && stats.unverifiedCount === 0 ? "All MCQ questions verified. Ready to publish!" : stats.message}
              </div>

              {stats?.unverifiedCount > 0 && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-900">
                  <span className="text-xl">⚠️</span>
                  <p className="font-semibold text-xs pt-0.5">{stats.unverifiedCount} question(s) need review before publish.</p>
                </div>
              )}

              {/* Action Buttons for MCQ */}
              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={() => { setActiveTab(activeTab === 'manual' ? null : 'manual'); setEditingQuestion(null); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${activeTab === 'manual'
                      ? 'bg-brand-600 text-white shadow-brand-500/30'
                      : 'bg-white text-secondary-700 border border-secondary-200 hover:bg-secondary-50'
                    }`}
                >
                  <Plus className="w-4 h-4" /> Add Manually
                </button>
                <button
                  onClick={() => setActiveTab(activeTab === 'bank' ? null : 'bank')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${activeTab === 'bank'
                      ? 'bg-brand-600 text-white shadow-brand-500/30'
                      : 'bg-white text-secondary-700 border border-secondary-200 hover:bg-secondary-50'
                    }`}
                >
                  <Library className="w-4 h-4 text-indigo-500" /> From Bank
                </button>
                <button
                  onClick={() => setActiveTab(activeTab === 'excel' ? null : 'excel')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${activeTab === 'excel'
                      ? 'bg-brand-600 text-white shadow-brand-500/30'
                      : 'bg-white text-secondary-700 border border-secondary-200 hover:bg-secondary-50'
                    }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Excel Upload
                </button>
                <button
                  onClick={() => setActiveTab(activeTab === 'ai' ? null : 'ai')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${activeTab === 'ai'
                      ? 'bg-brand-600 text-white shadow-brand-500/30'
                      : 'bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200 text-amber-900 hover:from-amber-200 hover:to-amber-100'
                    }`}
                >
                  <Rocket className="w-4 h-4 text-amber-600" /> Generate AI
                </button>
              </div>
            </div>
          )}

          {/* Editing / Adding Manual Section */}
          {(activeTab === 'manual' || editingQuestion) && (
            <div className="bg-white rounded-3xl shadow-sm border border-brand-200 p-6 md:p-8 relative">
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
            <div className="bg-white rounded-3xl shadow-sm border border-brand-200 p-6 md:p-8 relative">
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
            <div className="bg-white rounded-3xl shadow-sm border border-purple-200 p-6 md:p-8 relative">
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

          {/* MCQ Questions List */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xl font-bold text-secondary-900">
              Exam Questions ({questions.length})
            </h3>

            {questions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300">
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
        </div>
      )}

      {/* Modals for Coding Section */}
      <CodingProblemModal
        isOpen={isCodingModalOpen}
        onClose={() => {
          setIsCodingModalOpen(false);
          setEditingCodingProblem(null);
        }}
        onSubmit={handleCreateCodingProblem}
        initialData={editingCodingProblem}
        showSaveToBank={false}
        isSubmitting={isSubmittingCoding}
      />

      <PickCodingBankModal
        isOpen={isPickBankModalOpen}
        onClose={() => setIsPickBankModalOpen(false)}
        onAdd={handlePickCodingFromBank}
        alreadyInPoolIds={codingProblems.map(p => p.id)}
        isSubmitting={isSubmittingCoding}
      />

      <AICodingProblemModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSave={handleAIProblemSave}
        examId={examId}
      />

      {/* Bottom Publish Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 shadow-[0_-4px_12px_-1px_rgba(0,0,0,0.08)] z-40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-semibold">
            {canPublishFinal ? (
              <span className="text-green-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                All requirements fulfilled. Exam is ready to publish!
              </span>
            ) : !isMcqSufficient ? (
              <span className="text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                {stats?.message || 'MCQ requirements incomplete or unverified questions remain.'}
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Publish Guard: Coding pool needs {requiredCodingCount} problems (currently {codingPoolCount}).
              </span>
            )}
          </div>

          <div className="relative group">
            <Button
              onClick={handlePublish}
              disabled={!canPublishFinal}
              className={`flex items-center gap-2 px-8 ${
                canPublishFinal ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20 shadow-lg text-white' : ''
              }`}
            >
              <Rocket className="w-4 h-4" /> Publish Exam
            </Button>
            {!canPublishFinal && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
                {!isMcqSufficient ? 'Fulfill MCQ requirements & verify all questions' : `Add at least ${requiredCodingCount} coding problems to pool`}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default ExamQuestions;

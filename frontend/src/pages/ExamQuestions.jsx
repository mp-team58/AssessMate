import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { Edit2, Trash2, Plus, Cpu, FileText, CheckCircle } from 'lucide-react';

const ExamQuestions = () => {
  const { examId } = useParams();
  
  // Mock exam info
  const [examInfo] = useState({
    title: 'Midterm Assessment 2026',
    subject: 'Computer Science',
    id: examId || 'EXM-1234',
    totalQuestions: 20
  });

  const [questions, setQuestions] = useState([
    {
      id: '1',
      text: 'What is the Virtual DOM in React?',
      type: 'MCQ',
      difficulty: 'MEDIUM',
      topic: 'React Core',
      explanation: 'The Virtual DOM is a lightweight copy of the actual DOM used for performance optimization.',
      options: {
        A: 'A direct copy of the browser DOM',
        B: 'A lightweight JavaScript representation of the DOM',
        C: 'A new HTML5 feature',
        D: 'A database for React state'
      },
      correctAnswer: 'B'
    },
    {
      id: '2',
      text: 'Which hook is used to manage side effects in React?',
      type: 'MCQ',
      difficulty: 'EASY',
      topic: 'React Hooks',
      explanation: 'useEffect is used for side effects like fetching data, subscriptions, or manually changing the DOM.',
      options: {
        A: 'useState',
        B: 'useContext',
        C: 'useEffect',
        D: 'useReducer'
      },
      correctAnswer: 'C'
    }
  ]);
  const [activeTab, setActiveTab] = useState('manual'); // 'manual', 'ai', 'excel'
  
  const initialFormState = {
    text: '',
    type: 'MCQ',
    difficulty: 'EASY',
    topic: '',
    explanation: '',
    options: {
      A: '',
      B: '',
      C: '',
      D: ''
    },
    correctAnswer: 'A'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (['A', 'B', 'C', 'D'].includes(name)) {
      setFormData(prev => ({
        ...prev,
        options: {
          ...prev.options,
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    if (!formData.text.trim()) return false;
    if (!formData.options.A.trim() || !formData.options.B.trim() || !formData.options.C.trim() || !formData.options.D.trim()) return false;
    return true;
  };

  const handleSave = (addAnother = false) => {
    if (!validateForm()) {
      alert("Please fill in all required fields (Question Text and all 4 Options).");
      return;
    }

    if (isEditing) {
      setQuestions(questions.map(q => q.id === editingId ? { ...formData, id: editingId } : q));
      setIsEditing(false);
      setEditingId(null);
    } else {
      const newQuestion = { ...formData, id: Date.now().toString() };
      setQuestions([...questions, newQuestion]);
    }

    if (addAnother || isEditing) {
      setFormData(initialFormState);
    }
  };

  const handleEdit = (question) => {
    setIsEditing(true);
    setEditingId(question.id);
    setFormData(question);
    setActiveTab('manual');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      setQuestions(questions.filter(q => q.id !== id));
      if (isEditing && editingId === id) {
        handleReset();
      }
    }
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setEditingId(null);
  };

  const progressPercentage = (questions.length / examInfo.totalQuestions) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Top Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-secondary-900">{examInfo.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-secondary-600">
              <span className="bg-brand-50 text-brand-700 px-2 py-1 rounded-md font-medium">{examInfo.subject}</span>
              <span className="font-mono text-xs bg-secondary-100 px-2 py-1 rounded-md">ID: {examInfo.id}</span>
            </div>
          </div>
          <div className="w-full md:w-64">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="text-secondary-700">Progress</span>
              <span className="text-brand-600">{questions.length} of {examInfo.totalQuestions} added</span>
            </div>
            <div className="w-full bg-secondary-100 rounded-full h-2.5">
              <div 
                className="bg-brand-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Add Question Methods */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'manual' 
                ? 'bg-brand-600 text-white shadow-md' 
                : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50'
            }`}
          >
            <Plus /> Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'ai' 
                ? 'bg-brand-600 text-white shadow-md' 
                : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50'
            }`}
          >
            <Cpu /> AI Generate
          </button>
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'excel' 
                ? 'bg-brand-600 text-white shadow-md' 
                : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50'
            }`}
          >
            <FileText /> Excel Upload
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'manual' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6 md:p-8">
          <h2 className="text-lg font-bold text-secondary-900 mb-6 flex items-center gap-2">
            {isEditing ? <><Edit2 className="text-brand-600"/> Edit Question</> : <><Plus className="text-brand-600"/> Add New Question</>}
          </h2>
          
          <div className="space-y-6">
            {/* Row 1: Type, Difficulty, Topic */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Select
                  label="Question Type"
                  value={formData.type}
                  onChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
                  options={[
                    { value: 'MCQ', label: 'Multiple Choice (MCQ)' }
                  ]}
                  className="!mb-0"
                />
              </div>
              <div>
                <Select
                  label="Difficulty"
                  value={formData.difficulty}
                  onChange={(val) => setFormData(prev => ({ ...prev, difficulty: val }))}
                  options={[
                    { value: 'EASY', label: 'Easy' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HARD', label: 'Hard' }
                  ]}
                  className="!mb-0"
                />
              </div>
              <div>
                <Input 
                  label="Topic (Optional)" 
                  name="topic" 
                  value={formData.topic} 
                  onChange={handleInputChange}
                  placeholder="e.g. React Hooks"
                  containerClassName="mb-0"
                />
              </div>
            </div>

            {/* Row 2: Question Text */}
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">Question Text *</label>
              <textarea
                name="text"
                value={formData.text}
                onChange={handleInputChange}
                className="w-full px-4 py-3 text-[15px] bg-white border border-secondary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[100px]"
                placeholder="Type your question here..."
              ></textarea>
            </div>

            {/* Row 3: Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['A', 'B', 'C', 'D'].map((opt) => (
                <div key={opt}>
                  <Input 
                    label={`Option ${opt} *`}
                    name={opt}
                    value={formData.options[opt]}
                    onChange={handleInputChange}
                    placeholder={`Enter option ${opt}`}
                    containerClassName="mb-0"
                  />
                </div>
              ))}
            </div>

            {/* Row 4: Correct Answer & Explanation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-secondary-700 mb-2">Correct Answer *</label>
                <div className="flex gap-2">
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, correctAnswer: opt }))}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                        formData.correctAnswer === opt
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-secondary-700 mb-2">Explanation (Optional)</label>
                <textarea
                  name="explanation"
                  value={formData.explanation}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-[15px] bg-white border border-secondary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[60px]"
                  placeholder="Explain why the correct answer is right..."
                ></textarea>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-secondary-100">
              <div className="w-full md:w-auto">
                <Button onClick={() => handleSave(false)} className="w-full">
                  {isEditing ? 'Update Question' : 'Save Question'}
                </Button>
              </div>
              {!isEditing && (
                <div className="w-full md:w-auto">
                  <Button 
                    onClick={() => handleSave(true)}
                    className="w-full bg-secondary-800 hover:bg-secondary-900"
                  >
                    Save & Add Another
                  </Button>
                </div>
              )}
              <div className="w-full md:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full px-6 py-3 font-bold text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-xl transition-all"
                >
                  {isEditing ? 'Cancel Edit' : 'Reset Form'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-50 text-brand-600 mb-4">
            {activeTab === 'ai' ? <Cpu size={32} /> : <FileText size={32} />}
          </div>
          <h2 className="text-lg font-bold text-secondary-900 mb-2">
            {activeTab === 'ai' ? 'AI Generate Questions' : 'Excel Upload'}
          </h2>
          <p className="text-secondary-500 mb-6">
            This feature is coming soon. Stay tuned!
          </p>
          <span className="inline-block bg-brand-100 text-brand-700 text-sm font-semibold px-4 py-1.5 rounded-full">
            Coming Soon
          </span>
        </div>
      )}

      {/* Questions List */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-secondary-900 flex items-center justify-between">
            <span>Added Questions ({questions.length})</span>
          </h3>
          
          <div className="grid gap-4">
            {questions.map((q, index) => (
              <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-5 hover:border-brand-300 transition-all group">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-brand-600">Q{index + 1}.</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        q.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                        q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {q.difficulty}
                      </span>
                      {q.topic && (
                        <span className="text-xs font-medium bg-secondary-100 text-secondary-600 px-2.5 py-0.5 rounded-full">
                          {q.topic}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-secondary-900 text-[15px] leading-relaxed mb-4">
                      {q.text}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <div key={opt} className={`px-3 py-2 rounded-lg border ${
                          q.correctAnswer === opt 
                            ? 'bg-green-50 border-green-200 text-green-800 font-medium flex items-center justify-between' 
                            : 'bg-secondary-50 border-secondary-200 text-secondary-700'
                        }`}>
                          <span><span className="font-bold mr-2">{opt}.</span> {q.options[opt]}</span>
                          {q.correctAnswer === opt && <CheckCircle className="text-green-600" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex md:flex-col gap-2 md:w-32 md:border-l md:border-secondary-100 md:pl-4 justify-start md:justify-center">
                    <button 
                      onClick={() => handleEdit(q)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-all"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(q.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamQuestions;

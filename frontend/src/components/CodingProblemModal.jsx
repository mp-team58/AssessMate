import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Code2, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import Button from './ui/Button';

const AVAILABLE_LANGUAGES = [
  { id: 'PYTHON', label: 'Python 3' },
  { id: 'JAVA', label: 'Java' },
  { id: 'CPP', label: 'C++' },
  { id: 'C', label: 'C' },
  { id: 'JAVASCRIPT', label: 'JavaScript (Node)' }
];

const DEFAULT_PROBLEM = {
  title: '',
  description: '',
  constraints: '',
  sampleInput: '',
  sampleOutput: '',
  explanation: '',
  allowedLanguages: ['PYTHON', 'JAVA', 'CPP', 'C', 'JAVASCRIPT'],
  timeLimitSeconds: 2,
  memoryLimitMb: 256,
  marks: 10,
  partialMarking: true,
  saveToBank: false,
  testCases: [
    { input: '', expectedOutput: '', isHidden: false, points: 5 },
    { input: '', expectedOutput: '', isHidden: true, points: 5 }
  ]
};

const CodingProblemModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  showSaveToBank = true,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState(DEFAULT_PROBLEM);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        constraints: initialData.constraints || '',
        sampleInput: initialData.sampleInput || '',
        sampleOutput: initialData.sampleOutput || '',
        explanation: initialData.explanation || '',
        allowedLanguages: initialData.allowedLanguages?.length
          ? initialData.allowedLanguages
          : ['PYTHON', 'JAVA', 'CPP', 'C', 'JAVASCRIPT'],
        timeLimitSeconds: initialData.timeLimitSeconds ?? 2,
        memoryLimitMb: initialData.memoryLimitMb ?? 256,
        marks: initialData.marks ?? 10,
        partialMarking: initialData.partialMarking ?? true,
        saveToBank: false,
        testCases: initialData.testCases?.length
          ? initialData.testCases.map(tc => ({
              input: tc.input || '',
              expectedOutput: tc.expectedOutput || '',
              isHidden: !!tc.isHidden,
              points: tc.points ?? 5
            }))
          : [
              { input: '', expectedOutput: '', isHidden: false, points: 5 },
              { input: '', expectedOutput: '', isHidden: true, points: 5 }
            ]
      });
    } else {
      setFormData(DEFAULT_PROBLEM);
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleLanguage = (langId) => {
    setFormData(prev => {
      const current = prev.allowedLanguages || [];
      const updated = current.includes(langId)
        ? current.filter(l => l !== langId)
        : [...current, langId];
      return { ...prev, allowedLanguages: updated };
    });
  };

  const handleTestCaseChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.testCases];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, testCases: updated };
    });
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      testCases: [
        ...prev.testCases,
        { input: '', expectedOutput: '', isHidden: true, points: 5 }
      ]
    }));
  };

  const removeTestCase = (index) => {
    if (formData.testCases.length <= 1) {
      setError('At least one testcase is required.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index)
    }));
  };

  const totalTestCasePoints = formData.testCases.reduce(
    (acc, tc) => acc + (Number(tc.points) || 0),
    0
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Please provide a problem title.');
      return;
    }
    if (!formData.description.trim()) {
      setError('Please provide a problem description.');
      return;
    }
    if (!formData.allowedLanguages || formData.allowedLanguages.length === 0) {
      setError('Please select at least one allowed programming language.');
      return;
    }
    if (!formData.testCases || formData.testCases.length === 0) {
      setError('At least one testcase is required.');
      return;
    }
    const hasEmptyTc = formData.testCases.some(
      tc => !tc.input.trim() || !tc.expectedOutput.trim()
    );
    if (hasEmptyTc) {
      setError('All test cases must have both Input and Expected Output defined.');
      return;
    }

    const payload = {
      ...formData,
      marks: Number(formData.marks) || 10,
      timeLimitSeconds: Number(formData.timeLimitSeconds) || 2,
      memoryLimitMb: Number(formData.memoryLimitMb) || 256,
      testCases: formData.testCases.map(tc => ({
        ...tc,
        points: Number(tc.points) || 0
      }))
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col my-auto border border-secondary-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-secondary-200 bg-secondary-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#362E20] text-amber-300 flex items-center justify-center shadow-sm">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#362E20]">
                {initialData ? 'Edit Coding Problem' : 'Create Coding Problem'}
              </h2>
              <p className="text-xs text-secondary-600">
                Configure problem statement, execution constraints, and evaluation test cases.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-200/60 rounded-full transition-colors text-secondary-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 md:p-8 overflow-y-auto space-y-6 custom-scrollbar">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Title & Basic Marks */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8">
                <label className="block text-xs font-semibold text-secondary-700 uppercase tracking-wider mb-1.5">
                  Problem Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reverse a Linked List, Two Sum..."
                  value={formData.title}
                  onChange={e => handleChange('title', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all font-medium text-secondary-900"
                  required
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-secondary-700 uppercase tracking-wider mb-1.5">
                  Total Marks <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={formData.marks}
                  onChange={e => handleChange('marks', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all font-medium text-secondary-900"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-secondary-700 uppercase tracking-wider mb-1.5">
                Problem Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Explain the problem statement clearly. Detail the expected behavior, input format, and output format..."
                value={formData.description}
                onChange={e => handleChange('description', e.target.value)}
                className="w-full p-4 bg-white border border-secondary-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-secondary-900 leading-relaxed font-sans"
                required
              />
            </div>

            {/* Constraints */}
            <div>
              <label className="block text-xs font-semibold text-secondary-700 uppercase tracking-wider mb-1.5">
                Constraints
              </label>
              <textarea
                rows={2}
                placeholder="e.g. 1 <= nums.length <= 10^4, -10^9 <= target <= 10^9"
                value={formData.constraints}
                onChange={e => handleChange('constraints', e.target.value)}
                className="w-full p-3 font-mono text-xs bg-secondary-50/50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-secondary-900"
              />
            </div>

            {/* Sample Input & Sample Output */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-secondary-700 uppercase tracking-wider mb-1.5">
                  Sample Input (Console Stdin)
                </label>
                <textarea
                  rows={4}
                  placeholder="4&#10;2 7 11 15&#10;9"
                  value={formData.sampleInput}
                  onChange={e => handleChange('sampleInput', e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-secondary-50/50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-secondary-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-700 uppercase tracking-wider mb-1.5">
                  Sample Output (Console Stdout)
                </label>
                <textarea
                  rows={4}
                  placeholder="0 1"
                  value={formData.sampleOutput}
                  onChange={e => handleChange('sampleOutput', e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-secondary-50/50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-secondary-900"
                />
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-xs font-semibold text-secondary-700 uppercase tracking-wider mb-1.5">
                Sample Explanation (Optional)
              </label>
              <input
                type="text"
                placeholder="Because nums[0] + nums[1] == 9, we return [0, 1]."
                value={formData.explanation}
                onChange={e => handleChange('explanation', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-secondary-900"
              />
            </div>

            {/* Allowed Languages */}
            <div>
              <label className="block text-xs font-semibold text-secondary-700 uppercase tracking-wider mb-2">
                Allowed Programming Languages <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {AVAILABLE_LANGUAGES.map(lang => {
                  const isSelected = formData.allowedLanguages?.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => toggleLanguage(lang.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-[#362E20] text-amber-300 border-[#362E20] shadow-sm'
                          : 'bg-white text-secondary-600 border-secondary-200 hover:bg-secondary-50'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-amber-400/20 text-amber-300' : 'bg-secondary-100 text-secondary-400'
                      }`}>
                        {isSelected ? '✓' : '+'}
                      </span>
                      {lang.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Execution Limits & Grading Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary-50/70 rounded-2xl border border-secondary-200">
              <div>
                <label className="block text-[11px] font-semibold text-secondary-600 uppercase tracking-wider mb-1">
                  Time Limit (Sec)
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={formData.timeLimitSeconds}
                  onChange={e => handleChange('timeLimitSeconds', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-secondary-200 rounded-lg text-sm text-secondary-900 focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-secondary-600 uppercase tracking-wider mb-1">
                  Memory Limit (MB)
                </label>
                <input
                  type="number"
                  min="64"
                  max="1024"
                  step="32"
                  value={formData.memoryLimitMb}
                  onChange={e => handleChange('memoryLimitMb', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-secondary-200 rounded-lg text-sm text-secondary-900 focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                />
              </div>

              <div className="flex flex-col justify-center">
                <label className="flex items-center gap-2.5 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={formData.partialMarking}
                    onChange={e => handleChange('partialMarking', e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded border-secondary-300 focus:ring-brand-500"
                  />
                  <span className="text-xs font-semibold text-secondary-800">Partial Marking</span>
                </label>
                <span className="text-[10px] text-secondary-500 ml-6">Award points per passed testcase</span>
              </div>

              {showSaveToBank && (
                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2.5 cursor-pointer mt-3">
                    <input
                      type="checkbox"
                      checked={formData.saveToBank}
                      onChange={e => handleChange('saveToBank', e.target.checked)}
                      className="w-4 h-4 text-brand-600 rounded border-secondary-300 focus:ring-brand-500"
                    />
                    <span className="text-xs font-semibold text-secondary-800">Save to Bank</span>
                  </label>
                  <span className="text-[10px] text-secondary-500 ml-6">Add to global question bank</span>
                </div>
              )}
            </div>

            {/* Test Cases Section */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wider">
                    Evaluation Test Cases ({formData.testCases.length})
                  </h3>
                  <p className="text-xs text-secondary-500 mt-0.5">
                    Total Test Points: <span className="font-semibold text-brand-700">{totalTestCasePoints}</span> / {formData.marks} Marks
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addTestCase}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 rounded-xl text-xs font-semibold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Test Case
                </button>
              </div>

              <div className="space-y-3">
                {formData.testCases.map((tc, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-secondary-200 rounded-2xl shadow-sm space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-secondary-100 text-secondary-800 font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          tc.isHidden ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {tc.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {tc.isHidden ? 'Hidden (Grading)' : 'Public (Sample)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-secondary-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tc.isHidden}
                            onChange={e => handleTestCaseChange(idx, 'isHidden', e.target.checked)}
                            className="w-3.5 h-3.5 text-purple-600 rounded border-secondary-300"
                          />
                          <span>Hidden</span>
                        </label>

                        <div className="flex items-center gap-1">
                          <span className="text-xs text-secondary-500">Pts:</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={tc.points}
                            onChange={e => handleTestCaseChange(idx, 'points', e.target.value)}
                            className="w-16 px-2 py-1 text-xs border border-secondary-200 rounded-lg text-center font-medium"
                          />
                        </div>

                        {formData.testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTestCase(idx)}
                            className="text-secondary-400 hover:text-red-600 p-1 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="block text-[11px] font-semibold text-secondary-600 mb-1">
                          Input Stdin
                        </span>
                        <textarea
                          rows={2}
                          value={tc.input}
                          placeholder="Input passed to stdin..."
                          onChange={e => handleTestCaseChange(idx, 'input', e.target.value)}
                          className="w-full p-2.5 font-mono text-xs bg-secondary-50/60 border border-secondary-200 rounded-xl focus:ring-1 focus:ring-brand-500 outline-none"
                        />
                      </div>

                      <div>
                        <span className="block text-[11px] font-semibold text-secondary-600 mb-1">
                          Expected Output Stdout
                        </span>
                        <textarea
                          rows={2}
                          value={tc.expectedOutput}
                          placeholder="Expected stdout..."
                          onChange={e => handleTestCaseChange(idx, 'expectedOutput', e.target.value)}
                          className="w-full p-2.5 font-mono text-xs bg-secondary-50/60 border border-secondary-200 rounded-xl focus:ring-1 focus:ring-brand-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-secondary-200 bg-secondary-50/50 flex justify-between items-center rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 font-bold rounded-xl text-sm text-secondary-600 bg-white border border-secondary-200 hover:bg-secondary-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {initialData ? 'Save Changes' : 'Create Problem'}
                </>
              )}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default CodingProblemModal;

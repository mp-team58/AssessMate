import React, { useState } from 'react';
import { 
  X, Sparkles, Settings, Wand2, Plus, Trash2, 
  ChevronDown, ChevronUp, AlertTriangle, Eye, EyeOff 
} from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { useToast } from '../contexts/ToastContext';
import { generateAICodingProblem } from '../services/codingQuestionService';

const AVAILABLE_LANGUAGES = [
  { id: 'PYTHON', label: 'Python 3' },
  { id: 'JAVA', label: 'Java' },
  { id: 'CPP', label: 'C++' },
  { id: 'C', label: 'C' },
  { id: 'JAVASCRIPT', label: 'JavaScript (Node)' }
];

const AICodingProblemModal = ({ isOpen, onClose, onSave, examId }) => {
  const { showToast } = useToast();
  
  // Step Management: 1 = Input, 2 = Generating, 3 = Review
  const [step, setStep] = useState(1);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // --- Step 1: Input State ---
  const [promptInput, setPromptInput] = useState('');
  const [settings, setSettings] = useState({
    difficulty: '',
    marks: '',
    timeLimitSeconds: '',
    memoryLimitMb: 256,
    allowedLanguages: ['PYTHON', 'JAVA', 'CPP', 'C', 'JAVASCRIPT'],
    testCaseCount: 4
  });

  // --- Step 3: Review State ---
  const [generatedProblem, setGeneratedProblem] = useState(null);

  // Reset modal state when closed
  React.useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setPromptInput('');
      setGeneratedProblem(null);
      setIsAdvancedOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleLanguage = (langId) => {
    setSettings(prev => {
      const current = prev.allowedLanguages || [];
      const updated = current.includes(langId)
        ? current.filter(l => l !== langId)
        : [...current, langId];
      return { ...prev, allowedLanguages: updated };
    });
  };

  const handleGenerate = async () => {
    if (!promptInput.trim()) return;
    
    setStep(2); // Loading state
    try {
      const payload = {
        input: promptInput,
        inputType: 'AUTO',
        difficulty: settings.difficulty || undefined,
        marks: settings.marks ? parseInt(settings.marks) : undefined,
        timeLimitSeconds: settings.timeLimitSeconds ? parseInt(settings.timeLimitSeconds) : undefined,
        memoryLimitMb: settings.memoryLimitMb ? parseInt(settings.memoryLimitMb) : undefined,
        allowedLanguages: settings.allowedLanguages,
        testCaseCount: settings.testCaseCount ? parseInt(settings.testCaseCount) : 4
      };

      const response = await generateAICodingProblem(examId, payload);
      
      const generated = response.data?.generated || response.generated;

      if (generated) {
        // Prepare generated data for the review form
        setGeneratedProblem({
          title: generated.title || '',
          description: generated.description || '',
          constraints: generated.constraints || '',
          sampleInput: generated.sampleInput || '',
          sampleOutput: generated.sampleOutput || '',
          explanation: generated.explanation || '',
          allowedLanguages: generated.allowedLanguages || settings.allowedLanguages,
          timeLimitSeconds: generated.timeLimitSeconds || settings.timeLimitSeconds || 2,
          memoryLimitMb: generated.memoryLimitMb || settings.memoryLimitMb || 256,
          marks: generated.marks || settings.marks || 10,
          testCases: generated.testCases?.map(tc => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            isHidden: !!tc.isHidden,
            points: tc.points ?? 5
          })) || []
        });
        setStep(3); // Review state
        showToast('Problem generated successfully. Please review carefully.', 'success');
      } else {
        throw new Error('Invalid response from AI');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      showToast(error.message || 'Generation failed. Please try again or rephrase your input.', 'error');
      setStep(1); // Go back to input step without clearing prompt
    }
  };

  const handleReviewChange = (field, value) => {
    setGeneratedProblem(prev => ({ ...prev, [field]: value }));
  };

  const handleTestCaseChange = (index, field, value) => {
    setGeneratedProblem(prev => {
      const updated = [...prev.testCases];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, testCases: updated };
    });
  };

  const handleFinalSave = () => {
    // Validation
    if (!generatedProblem.title.trim()) {
      showToast('Please provide a problem title.', 'error');
      return;
    }
    if (!generatedProblem.testCases || generatedProblem.testCases.length === 0) {
      showToast('At least one test case is required.', 'error');
      return;
    }
    const hasEmptyTc = generatedProblem.testCases.some(
      tc => !tc.input.trim() || !tc.expectedOutput.trim()
    );
    if (hasEmptyTc) {
      showToast('Test case inputs and expected outputs cannot be empty.', 'error');
      return;
    }

    onSave(generatedProblem);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-secondary-200 bg-gradient-to-r from-purple-50 to-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-secondary-900 tracking-tight">
                {step === 3 ? 'Review AI Generated Problem' : 'Generate with AI'}
              </h2>
              <p className="text-sm text-secondary-500 font-medium">
                {step === 3 ? 'Verify and edit the generated problem before saving' : 'Let AI create a complete coding challenge for you'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* STEP 1: Input */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-secondary-700 mb-2">
                  Enter a topic or describe the problem
                </label>
                <textarea
                  className="w-full p-4 bg-secondary-50 border border-secondary-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm min-h-[160px] resize-none"
                  placeholder="e.g., 'Binary Search' or 'I need a problem where candidates must find duplicate numbers in an array using O(n) time complexity.'"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                />
                <p className="text-xs text-secondary-500 mt-2 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-purple-500" />
                  The AI will automatically detect if you entered a short topic or a detailed description.
                </p>
              </div>

              {/* Advanced Settings */}
              <div className="border border-secondary-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <button 
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="w-full flex items-center justify-between p-4 bg-secondary-50/50 hover:bg-secondary-50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-secondary-700">
                    <Settings className="w-4 h-4" /> Advanced Settings
                  </div>
                  {isAdvancedOpen ? <ChevronUp className="w-4 h-4 text-secondary-500" /> : <ChevronDown className="w-4 h-4 text-secondary-500" />}
                </button>
                
                {isAdvancedOpen && (
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-[#EBE3D5] bg-[#F8F5F0]">
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1.5">Difficulty</label>
                      <select 
                        className="w-full px-4 py-2.5 bg-white border border-[#EBE3D5] rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium text-secondary-800 shadow-sm"
                        value={settings.difficulty}
                        onChange={(e) => setSettings({...settings, difficulty: e.target.value})}
                      >
                        <option value="">AI Decides</option>
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1.5">Marks</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2.5 bg-white border border-[#EBE3D5] rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium text-secondary-800 shadow-sm"
                        placeholder="AI Suggests"
                        value={settings.marks}
                        onChange={(e) => setSettings({...settings, marks: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1.5">Time Limit (seconds)</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2.5 bg-white border border-[#EBE3D5] rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium text-secondary-800 shadow-sm"
                        placeholder="AI Suggests"
                        value={settings.timeLimitSeconds}
                        onChange={(e) => setSettings({...settings, timeLimitSeconds: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1.5">Memory Limit (MB)</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2.5 bg-white border border-[#EBE3D5] rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium text-secondary-800 shadow-sm"
                        value={settings.memoryLimitMb}
                        onChange={(e) => setSettings({...settings, memoryLimitMb: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 mb-1.5">Test Case Count</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2.5 bg-white border border-[#EBE3D5] rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium text-secondary-800 shadow-sm"
                        value={settings.testCaseCount}
                        onChange={(e) => setSettings({...settings, testCaseCount: e.target.value})}
                      />
                    </div>
                    
                    <div className="md:col-span-2 pt-2">
                      <label className="block text-sm font-semibold text-secondary-700 mb-3">Allowed Languages</label>
                      <div className="flex flex-wrap gap-2.5">
                        {AVAILABLE_LANGUAGES.map(lang => (
                          <button
                            key={lang.id}
                            type="button"
                            onClick={() => toggleLanguage(lang.id)}
                            className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all shadow-sm ${
                              settings.allowedLanguages?.includes(lang.id)
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : 'bg-white text-secondary-600 border-secondary-200 hover:bg-secondary-50'
                            }`}
                          >
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Loading State */}
          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 bg-purple-100 rounded-full animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Sparkles className="w-10 h-10 text-purple-600 animate-bounce" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-secondary-900 mb-2">Generating Problem...</h3>
                <p className="text-secondary-500">This might take a few seconds as our AI writes the code, explanation, and test cases.</p>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Edit State */}
          {step === 3 && generatedProblem && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* WARNING BANNER */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 shadow-sm">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-800">⚠️ AI Generated Content</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Please review the problem statement and carefully verify all test cases and expected outputs before saving. The AI may occasionally make mistakes.
                  </p>
                </div>
              </div>

              {/* Editable Form */}
              <div className="bg-white p-5 rounded-2xl border border-secondary-200 shadow-sm space-y-4">
                <h3 className="font-bold text-secondary-900 text-lg border-b border-secondary-100 pb-2">Problem Details</h3>
                
                <Input 
                  label="Problem Title" 
                  value={generatedProblem.title}
                  onChange={(e) => handleReviewChange('title', e.target.value)}
                  className="font-bold text-lg"
                />
                
                <div>
                  <label className="block text-sm font-bold text-secondary-700 mb-1">Description</label>
                  <textarea
                    className="w-full px-4 py-3 bg-white border border-secondary-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm min-h-[150px]"
                    value={generatedProblem.description}
                    onChange={(e) => handleReviewChange('description', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-secondary-700 mb-1">Constraints</label>
                  <textarea
                    className="w-full px-4 py-3 bg-secondary-50 font-mono border border-secondary-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm min-h-[80px]"
                    value={generatedProblem.constraints}
                    onChange={(e) => handleReviewChange('constraints', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-secondary-700 mb-1">Sample Input</label>
                    <textarea
                      className="w-full px-4 py-3 bg-secondary-50 font-mono border border-secondary-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm h-32"
                      value={generatedProblem.sampleInput}
                      onChange={(e) => handleReviewChange('sampleInput', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-secondary-700 mb-1">Sample Output</label>
                    <textarea
                      className="w-full px-4 py-3 bg-secondary-50 font-mono border border-secondary-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm h-32"
                      value={generatedProblem.sampleOutput}
                      onChange={(e) => handleReviewChange('sampleOutput', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-secondary-700 mb-1">Explanation</label>
                  <textarea
                    className="w-full px-4 py-3 bg-white border border-secondary-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm min-h-[80px]"
                    value={generatedProblem.explanation}
                    onChange={(e) => handleReviewChange('explanation', e.target.value)}
                  />
                </div>
              </div>

              {/* Editable Test Cases */}
              <div className="bg-white p-5 rounded-2xl border border-secondary-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-secondary-100 pb-2">
                  <h3 className="font-bold text-secondary-900 text-lg">Test Cases</h3>
                  <button
                    onClick={() => {
                      setGeneratedProblem(prev => ({
                        ...prev,
                        testCases: [...prev.testCases, { input: '', expectedOutput: '', isHidden: true, points: 5 }]
                      }));
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Test Case
                  </button>
                </div>
                
                <div className="space-y-4 mt-4">
                  {generatedProblem.testCases?.map((tc, index) => (
                    <div key={index} className="p-4 bg-secondary-50 border border-secondary-200 rounded-xl relative group">
                      <div className="absolute -top-3 -left-3 w-7 h-7 bg-white border-2 border-secondary-200 text-secondary-700 font-black rounded-full flex items-center justify-center text-xs shadow-sm">
                        {index + 1}
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <button
                          onClick={() => handleTestCaseChange(index, 'isHidden', !tc.isHidden)}
                          className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-bold ${
                            tc.isHidden ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title="Toggle visibility to candidates"
                        >
                          {tc.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {tc.isHidden ? 'Hidden' : 'Public'}
                        </button>
                        <button
                          onClick={() => {
                            setGeneratedProblem(prev => ({
                              ...prev,
                              testCases: prev.testCases.filter((_, i) => i !== index)
                            }));
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Delete test case"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <label className="block text-xs font-bold text-secondary-600 mb-1">Input</label>
                          <textarea
                            className="w-full px-3 py-2 bg-white font-mono text-xs border border-secondary-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none h-20 resize-none"
                            value={tc.input}
                            onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                            placeholder="Input values..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-secondary-600 mb-1">Expected Output</label>
                          <textarea
                            className="w-full px-3 py-2 bg-white font-mono text-xs border border-secondary-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none h-20 resize-none"
                            value={tc.expectedOutput}
                            onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                            placeholder="Expected output..."
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center gap-3">
                        <label className="text-xs font-bold text-secondary-600 shrink-0">Points</label>
                        <input
                          type="number"
                          className="w-20 px-3 py-1.5 text-sm font-bold border border-secondary-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                          value={tc.points}
                          onChange={(e) => handleTestCaseChange(index, 'points', Number(e.target.value))}
                          min="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-secondary-100 bg-secondary-50/50 rounded-b-3xl flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 font-bold rounded-xl text-[15px] text-secondary-600 bg-white border border-secondary-200 hover:bg-secondary-50 transition-colors shadow-sm">
            Cancel
          </button>
          
          {step === 1 && (
            <Button 
              onClick={handleGenerate}
              disabled={!promptInput.trim()}
              className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-purple-500/30 flex items-center gap-2 transition-all hover:scale-105"
            >
              <Sparkles className="w-4 h-4" /> Generate Problem
            </Button>
          )}

          {step === 2 && (
            <Button disabled className="px-8 bg-secondary-300 text-white font-bold flex items-center gap-2 cursor-not-allowed">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating...
            </Button>
          )}

          {step === 3 && (
            <Button 
              onClick={handleFinalSave}
              className="px-8 bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-lg shadow-brand-500/30 flex items-center gap-2"
            >
              💾 Save Problem
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AICodingProblemModal;

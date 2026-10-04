import React, { useState, useRef } from 'react';
import {
  Zap,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react';
import Button from './ui/Button';
import QuestionCard from './QuestionCard';
import {
  generateQuestionsFromTopic,
  generateQuestionsFromText,
  generateQuestionsFromFile
} from '../services/aiQuestionService';

const ALLOWED_FILE_EXTENSIONS = ['pdf', 'pptx', 'docx', 'jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

const getStageLabel = (stage) => {
  const labels = {
    TOPIC_ONLY: "Topic-only AI knowledge",
    FULL_TEXT: "Full text / document context",
    KEYWORD_MATCH: "Topic-relevant content found",
    FALLBACK_BEGINNING: "Topic not found — beginning content used",
    IMAGE_GENERATION: "Image or scanned-content generation",
  };
  return labels[stage] || stage;
};

const getInputTypeLabel = (inputType) => {
  const labels = {
    TOPIC: "Topic Only",
    TEXT: "Pasted Text",
    FILE: "Uploaded File",
  };
  return labels[inputType] || inputType;
};

const AIGeneration = ({ examId, stats, questions = [], onGenerationSuccess, onEdit, onDelete, onClose }) => {
  const [aiMode, setAiMode] = useState("TOPIC");
  const [aiForm, setAiForm] = useState({
    topic: "",
    text: "",
    totalQuestions: 5,
    multipleSelectCount: 0,
    fillBlankCount: 0,
    numericalCount: 0,
  });

  const [selectedAiFile, setSelectedAiFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [generationError, setGenerationError] = useState("");
  const fileInputRef = useRef(null);

  const easyRemaining = Math.max(0, (stats?.easyRequired || 0) - (stats?.easyAdded || 0));
  const mediumRemaining = Math.max(0, (stats?.mediumRequired || 0) - (stats?.mediumAdded || 0));
  const hardRemaining = Math.max(0, (stats?.hardRequired || 0) - (stats?.hardAdded || 0));
  const totalRemaining = easyRemaining + mediumRemaining + hardRemaining;

  const total = Number(aiForm.totalQuestions || 0);
  const otherTypeCount =
    Number(aiForm.multipleSelectCount || 0) +
    Number(aiForm.fillBlankCount || 0) +
    Number(aiForm.numericalCount || 0);
  const singleChoiceCount = total - otherTypeCount;

  const pastedWordCount = aiForm.text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAiForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAiFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop().toLowerCase();

    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      setGenerationError("Unsupported file type. Please upload PDF, PPTX, DOCX, JPG, JPEG, or PNG.");
      setSelectedAiFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setGenerationError("File is too large. Maximum allowed file size is 50 MB.");
      setSelectedAiFile(null);
      return;
    }

    setGenerationError("");
    setSelectedAiFile(file);
  };

  const validateForm = () => {
    if (!Number.isInteger(total) || total < 1 || total > 30) {
      setGenerationError("Please enter a number of questions between 1 and 30.");
      return false;
    }

    if (total > totalRemaining) {
      setGenerationError(`Only ${totalRemaining} slots remaining. Please enter ${totalRemaining} or less.`);
      return false;
    }

    if (otherTypeCount > total) {
      setGenerationError("Multiple Select + Fill Blank + Numerical counts cannot exceed total questions.");
      return false;
    }

    if (aiMode === "TOPIC" && !aiForm.topic.trim()) {
      setGenerationError("Topic is required for Topic-only generation.");
      return false;
    }

    if (aiMode === "TEXT" && pastedWordCount < 50) {
      setGenerationError("At least 50 words are required for text generation.");
      return false;
    }

    if (aiMode === "FILE" && !selectedAiFile) {
      setGenerationError("Please upload a file.");
      return false;
    }

    setGenerationError("");
    return true;
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    setGenerationError("");
    setGenerationResult(null);

    const commonPayload = {
      examId: Number(examId),
      topic: aiForm.topic.trim() || null,
      totalQuestions: total,
      multipleSelectCount: Number(aiForm.multipleSelectCount || 0),
      fillBlankCount: Number(aiForm.fillBlankCount || 0),
      numericalCount: Number(aiForm.numericalCount || 0),
    };

    try {
      let response;
      if (aiMode === "TOPIC") {
        response = await generateQuestionsFromTopic(commonPayload);
      } else if (aiMode === "TEXT") {
        response = await generateQuestionsFromText({
          ...commonPayload,
          text: aiForm.text.trim(),
        });
      } else if (aiMode === "FILE") {
        response = await generateQuestionsFromFile({
          ...commonPayload,
          file: selectedAiFile,
        });
      }

      const responseData = response.data || response;
      setGenerationResult(responseData);
      onGenerationSuccess();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        // apiClient handles 401 redirect
      } else if (status === 403) {
        setGenerationError("You do not have permission to generate questions for this exam.");
      } else if (status === 500) {
        setGenerationError(err?.response?.data?.message || "AI generation failed. Please try again in a moment.");
      } else {
        setGenerationError(getErrorMessage(err));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const renderResult = () => {
    if (!generationResult) return null;

    const {
      requestedCount,
      generatedCount,
      inputType,
      stage,
      warning,
      verifiedQuestions: apiVerified = [],
      unverifiedQuestions: apiUnverified = []
    } = generationResult;

    const latestQuestionsMap = (questions || []).reduce((acc, q) => {
      acc[q.id] = q;
      return acc;
    }, {});

    const allGeneratedIds = [...apiVerified, ...apiUnverified].map(q => q.id);
    const currentGeneratedQuestions = allGeneratedIds
      .map(id => latestQuestionsMap[id] || [...apiVerified, ...apiUnverified].find(q => q.id === id))
      .filter(q => latestQuestionsMap[q.id] !== undefined); // Only keep if still exists in main list

    const verifiedQuestions = currentGeneratedQuestions.filter(q => q.isVerified);
    const unverifiedQuestions = currentGeneratedQuestions.filter(q => !q.isVerified);
    const verifiedCount = verifiedQuestions.length;
    const unverifiedCount = unverifiedQuestions.length;

    const allGenerated = [...verifiedQuestions, ...unverifiedQuestions];
    const generatedEasy = allGenerated.filter(q => q.difficulty === 'EASY').length;
    const generatedMedium = allGenerated.filter(q => q.difficulty === 'MEDIUM').length;
    const generatedHard = allGenerated.filter(q => q.difficulty === 'HARD').length;

    return (
      <div className="mt-8 space-y-6 animate-in fade-in duration-300">
        {/* Summary Card */}
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-brand-900 flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-brand-600" /> AI Question Generation Complete
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-brand-800">
            <div>
              <p className="mb-1"><span className="font-semibold">Requested:</span> {requestedCount} questions</p>
              <p className="mb-1"><span className="font-semibold">Generated & Saved:</span> {generatedCount} questions <span className="text-gray-500 text-xs">({generatedEasy} Easy, {generatedMedium} Medium, {generatedHard} Hard)</span></p>
              <p className="mb-1 flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-600" /> Source-supported: {verifiedCount}</p>
              <p className="mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-500" /> Needs review: {unverifiedCount}</p>
            </div>
            <div>
              <p className="mb-1"><span className="font-semibold">Input:</span> {getInputTypeLabel(inputType)}</p>
              <p className="mb-1"><span className="font-semibold">Retrieval:</span> {getStageLabel(stage)}</p>
            </div>
          </div>
        </div>

        {generatedCount > 0 && generatedCount < requestedCount && (
          <div className="bg-amber-100 border-l-4 border-amber-500 rounded-r-xl p-4 flex gap-3 text-amber-900">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold">Shortfall Notice</h4>
              <p className="text-sm mt-1">Requested {requestedCount} questions, but only {generatedCount} were saved. See the warning below for details.</p>
            </div>
          </div>
        )}

        {/* Warning Banner */}
        {warning && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex gap-3 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm font-medium whitespace-pre-line">{warning}</p>
          </div>
        )}

        {/* Verified Questions */}
        {verifiedQuestions.length > 0 && (
          <div>
            <h4 className="text-md font-bold text-green-800 flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5" /> Source-Supported Questions ({verifiedQuestions.length})
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              These answers have supporting evidence in the supplied source material. They are still AI-generated and should be reviewed before publishing.
            </p>
            <div className="space-y-4">
              {verifiedQuestions.map(q => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unverified Questions */}
        {unverifiedQuestions.length > 0 && (
          <div>
            <h4 className="text-md font-bold text-amber-800 flex items-center gap-2 mb-2 mt-8">
              <AlertTriangle className="w-5 h-5" /> Questions Needing Review ({unverifiedQuestions.length})
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              The backend could not confidently find supporting evidence for the expected answer in the supplied source material. Review these questions carefully.
            </p>
            <div className="space-y-4">
              {unverifiedQuestions.map(q => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-200 p-6 md:p-8 relative">
      <button
        onClick={onClose}
        disabled={isGenerating}
        className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 disabled:opacity-50"
      >
        Close
      </button>

      <h2 className="text-xl font-extrabold text-secondary-900 mb-6 flex items-center justify-center gap-2">
        <Zap className="text-brand-600 w-6 h-6 fill-brand-600" /> Generate Questions with AI
      </h2>

      {/* Capacity Banner */}
      <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-indigo-900">
        <div>
          <p className="font-bold text-sm">Remaining Capacity in Exam:</p>
          <p className="text-xs mt-1">Easy: <span className="font-semibold">{easyRemaining}</span> | Medium: <span className="font-semibold">{mediumRemaining}</span> | Hard: <span className="font-semibold">{hardRemaining}</span></p>
        </div>
        <div className="mt-2 sm:mt-0 px-3 py-1.5 bg-indigo-100 rounded-md border border-indigo-200">
          <p className="text-sm font-bold text-indigo-800">Total: {totalRemaining} slots remaining</p>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex bg-secondary-100/50 p-1.5 rounded-2xl gap-1 shadow-inner border border-secondary-200">
          {[
            { id: 'TOPIC', label: '💡 Topic Only' },
            { id: 'TEXT', label: '📝 Paste Text' },
            { id: 'FILE', label: '📁 Upload File' }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => { setAiMode(mode.id); setGenerationError(""); setGenerationResult(null); }}
              disabled={isGenerating}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${aiMode === mode.id
                  ? 'bg-white text-brand-700 shadow-sm border border-secondary-200/50 scale-100'
                  : 'text-secondary-500 hover:text-secondary-900 hover:bg-secondary-200/50 border border-transparent scale-95'
                } disabled:opacity-50`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {generationError && (
        <div className="mb-6 bg-red-50 border border-red-300 rounded-lg p-4 flex gap-3 text-red-900">
          <X className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{generationError}</p>
        </div>
      )}

      {/* Form Area */}
      <div className="flex flex-col gap-6 relative w-full">
        {isGenerating && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
            <p className="font-semibold text-brand-800">Generating questions with AI.</p>
            <p className="text-sm text-brand-600 mt-1">This may take a moment...</p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 md:p-8 border border-secondary-200 shadow-sm space-y-6">
          <h3 className="text-xs font-black text-secondary-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-6 h-px bg-secondary-300"></span> Source Material
          </h3>

          {/* Topic Field */}
          <div>
            <label className="block text-xs font-bold text-secondary-700 uppercase tracking-wider mb-2">
              Topic / Focus Area {aiMode === "TOPIC" ? <span className="text-red-500">*</span> : "(Optional)"}
            </label>
            <input
              type="text"
              name="topic"
              value={aiForm.topic}
              onChange={handleInputChange}
              disabled={isGenerating}
              placeholder="e.g. Java OOP and Inheritance"
              className="w-full px-5 py-3 rounded-xl border border-secondary-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-medium shadow-sm"
            />
          </div>

          {/* Text Area (Paste Text Mode) */}
          {aiMode === "TEXT" && (
            <div>
              <label className="block text-xs font-bold text-secondary-700 uppercase tracking-wider mb-2">
                Paste Source Material <span className="text-red-500">*</span>
              </label>
              <textarea
                name="text"
                value={aiForm.text}
                onChange={handleInputChange}
                disabled={isGenerating}
                rows={8}
                placeholder="Paste your notes, documentation, or chapter content here (min 50 words)..."
                className="w-full px-5 py-4 rounded-xl border border-secondary-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none font-medium shadow-sm"
              />
              <p className={`text-xs mt-2 font-bold ${pastedWordCount < 50 ? 'text-red-500' : 'text-secondary-500'}`}>
                Word count: {pastedWordCount} words {pastedWordCount < 50 && "(At least 50 words are required.)"}
              </p>
            </div>
          )}

          {/* File Upload (File Mode) */}
          {aiMode === "FILE" && (
            <div>
              <label className="block text-xs font-bold text-secondary-700 uppercase tracking-wider mb-2">
                Upload Source File <span className="text-red-500">*</span>
              </label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative cursor-pointer
                  ${selectedAiFile ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'}`}
                onClick={() => { if (!selectedAiFile && !isGenerating) fileInputRef.current?.click(); }}
              >
                {selectedAiFile && !isGenerating && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAiFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                <Upload className={`w-8 h-8 mx-auto mb-3 ${selectedAiFile ? 'text-brand-500' : 'text-gray-400'}`} />
                {selectedAiFile ? (
                  <div>
                    <p className="font-semibold text-brand-700 break-words px-4">Selected: {selectedAiFile.name}</p>
                    <p className="text-xs text-brand-500 mt-1">{(selectedAiFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-secondary-700">Drag and drop your file</p>
                    <p className="text-sm text-secondary-500 mt-1">or click to browse</p>
                    <p className="text-xs text-secondary-400 mt-2">PDF, PPTX, DOCX, JPG, JPEG, PNG (Max 50MB)</p>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf,.pptx,.docx,.jpg,.jpeg,.png"
                  onChange={handleAiFileChange}
                  className="hidden"
                  ref={fileInputRef}
                  disabled={isGenerating}
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 border border-secondary-200 shadow-sm space-y-6">
          <h3 className="text-xs font-black text-secondary-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-6 h-px bg-secondary-300"></span> Configuration
          </h3>

          <div>
            <label className="block text-xs font-bold text-secondary-700 uppercase tracking-wider mb-2">
              Number of Questions <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="totalQuestions"
              value={aiForm.totalQuestions}
              onChange={handleInputChange}
              disabled={isGenerating}
              min={1}
              max={totalRemaining}
              className="w-full px-5 py-3 rounded-xl border border-secondary-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-bold shadow-sm"
            />
          </div>

          <div className="bg-secondary-50 rounded-2xl p-6 border border-secondary-200 shadow-inner">
            <h4 className="text-sm font-black text-secondary-800 mb-5">Question Type Distribution</h4>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-secondary-700">Multiple Select</label>
                <input
                  type="number"
                  name="multipleSelectCount"
                  value={aiForm.multipleSelectCount}
                  onChange={handleInputChange}
                  disabled={isGenerating}
                  min={0}
                  className="w-20 px-3 py-1.5 font-bold rounded-lg border border-secondary-300 outline-none focus:ring-2 focus:ring-brand-500 text-center"
                />
              </div>

              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-secondary-700">Fill in the Blank</label>
                <input
                  type="number"
                  name="fillBlankCount"
                  value={aiForm.fillBlankCount}
                  onChange={handleInputChange}
                  disabled={isGenerating}
                  min={0}
                  className="w-20 px-3 py-1.5 font-bold rounded-lg border border-secondary-300 outline-none focus:ring-2 focus:ring-brand-500 text-center"
                />
              </div>

              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-secondary-700">Numerical</label>
                <input
                  type="number"
                  name="numericalCount"
                  value={aiForm.numericalCount}
                  onChange={handleInputChange}
                  disabled={isGenerating}
                  min={0}
                  className="w-20 px-3 py-1.5 font-bold rounded-lg border border-secondary-300 outline-none focus:ring-2 focus:ring-brand-500 text-center"
                />
              </div>

              <div className="pt-4 mt-2 border-t border-secondary-200 flex justify-between items-center">
                <label className="text-sm font-black text-secondary-900">Single Choice</label>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${singleChoiceCount < 0 ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700'}`}>
                  {singleChoiceCount} (automatic)
                </span>
              </div>
            </div>
          </div>

          {aiMode === "TOPIC" && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-blue-800 text-sm flex gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
              <p className="font-medium leading-relaxed">
                <strong className="font-bold">Note:</strong> Topic-only questions are generated using AI knowledge. They are not verified against uploaded study material. Please review every question before publishing.
              </p>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || singleChoiceCount < 0 || (aiMode === "TEXT" && pastedWordCount < 50)}
            className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow-lg shadow-brand-500/30 border-0 h-14 text-lg mt-4"
          >
            <Zap className={`w-5 h-5 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate Questions'}
          </Button>
        </div>
      </div>

      {renderResult()}
    </div>
  );
};

export default AIGeneration;

import React from 'react';
import { Pencil, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

const getDifficultyColor = (difficulty) => {
  switch (difficulty) {
    case 'EASY': return 'bg-green-100 text-green-800 border-green-200';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'HARD': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getTypeLabel = (type) => {
  switch (type) {
    case 'SINGLE_CHOICE': return 'Single Choice';
    case 'MULTIPLE_SELECT': return 'Multiple Select';
    case 'FILL_BLANK': return 'Fill Blank';
    case 'NUMERICAL': return 'Numerical';
    default: return type;
  }
};

const getSourceColor = (source) => {
  switch (source) {
    case 'MANUAL': return 'bg-blue-100 text-blue-800';
    case 'BANK': return 'bg-purple-100 text-purple-800';
    case 'AI': return 'bg-indigo-100 text-indigo-800';
    case 'EXCEL': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const QuestionCard = ({
  question,
  onEdit,
  onDelete,
  showSource = false,
  selectable = false,
  selected = false,
  onSelect,
  onVerify,
}) => {
  return (
    <div className={`p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow relative flex ${selectable && selected ? 'ring-2 ring-brand-500 border-transparent' : 'border-secondary-200'}`}>
      
      {/* Main Content Area */}
      <div className={`flex flex-col gap-3 flex-1 ${selectable ? 'pr-8' : ''}`}>
        
        {/* Header Badges */}
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className={`px-2 py-1 rounded-md border ${getDifficultyColor(question.difficulty)}`}>
            {question.difficulty}
          </span>
          <span className="px-2 py-1 rounded-md border bg-gray-50 text-gray-600 border-gray-200">
            {getTypeLabel(question.type)}
          </span>
          {question.topic && (
            <span className="px-2 py-1 rounded-md border bg-blue-50 text-blue-700 border-blue-200">
              {question.topic}
            </span>
          )}
          {showSource && question.source && (
            <span className={`px-2 py-1 rounded-md ${getSourceColor(question.source)}`}>
              {question.source}
            </span>
          )}
          
          <div className="ml-auto flex items-center gap-1 text-xs mr-2">
            {question.isVerified && question.source === 'AI' && (
              <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                <CheckCircle className="w-3 h-3 mr-1" /> Verified
              </span>
            )}
            {question.isVerified === false && (
              <span className="flex items-center text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                <AlertTriangle className="w-3 h-3 mr-1" /> Needs Review
              </span>
            )}
          </div>
        </div>

        {/* Question Text */}
        <p className="text-gray-800 text-[15px] font-medium leading-relaxed">
          {question.questionText}
        </p>

        {/* Optional Image */}
        {question.imageUrl && (
          <div className="mt-2 mb-1 border-2 border-gray-100 rounded-xl overflow-hidden bg-gray-50 flex justify-center max-h-[300px]">
            <img 
              src={question.imageUrl.startsWith('http') ? question.imageUrl : `https://08k7867x-8080.inc1.devtunnels.ms${question.imageUrl.startsWith('/') ? '' : '/'}${question.imageUrl}`} 
              alt="Question Context" 
              className="max-w-full max-h-[300px] object-contain p-2"
            />
          </div>
        )}

        {/* Options / Answers */}
        <div className="mt-1">
          {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_SELECT') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {question.optionA && (
                <div className={`text-sm p-2 rounded-lg border ${question.correctAnswer?.includes('A') ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="font-bold text-gray-500 mr-2">A</span> {question.optionA}
                </div>
              )}
              {question.optionB && (
                <div className={`text-sm p-2 rounded-lg border ${question.correctAnswer?.includes('B') ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="font-bold text-gray-500 mr-2">B</span> {question.optionB}
                </div>
              )}
              {question.optionC && (
                <div className={`text-sm p-2 rounded-lg border ${question.correctAnswer?.includes('C') ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="font-bold text-gray-500 mr-2">C</span> {question.optionC}
                </div>
              )}
              {question.optionD && (
                <div className={`text-sm p-2 rounded-lg border ${question.correctAnswer?.includes('D') ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="font-bold text-gray-500 mr-2">D</span> {question.optionD}
                </div>
              )}
            </div>
          )}

          {(question.type === 'FILL_BLANK' || question.type === 'NUMERICAL') && (
            <div className="text-sm p-3 mt-2 rounded-lg bg-green-50 border border-green-200 inline-block">
              <span className="font-bold text-green-700 mr-2">Answer:</span> 
              <span className="text-green-900">{question.correctAnswer}</span>
              {question.type === 'NUMERICAL' && question.tolerance > 0 && (
                <span className="text-green-600 ml-2 text-xs">(±{question.tolerance})</span>
              )}
            </div>
          )}
        </div>

        {/* Verification Banner */}
        {question.isVerified === false && onVerify && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              {question.source === 'AI' ? (
                <p className="text-[13px] text-amber-800 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  This question was AI generated and needs your review. Click verify if the answer is correct.
                </p>
              ) : (
                <p className="text-[13px] text-amber-800 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  This question needs review. Please verify it before publishing.
                </p>
              )}
            </div>
            <button 
              onClick={() => onVerify(question.id)}
              className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-green-700 bg-green-100 hover:bg-green-200 border border-green-200 rounded-md transition-all"
            >
              <CheckCircle className="w-4 h-4" /> Mark as Verified
            </button>
          </div>
        )}
      </div>

      {/* Right Side Actions Panel */}
      {selectable ? (
        <div className="flex flex-col justify-start ml-4 pl-4 border-l border-gray-100">
          <input 
            type="checkbox" 
            checked={selected}
            onChange={() => onSelect(question.id)}
            className="w-5 h-5 mt-1 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
          />
        </div>
      ) : (
        <div className="flex flex-col justify-between gap-3 ml-5 pl-5 border-l border-gray-100 shrink-0 min-w-[110px]">
          {onEdit ? (
            <button 
              onClick={() => onEdit(question)}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 text-[13px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 hover:border-brand-200 rounded-lg transition-all mb-auto"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
          ) : <div />}
          
          {onDelete ? (
            <button 
              onClick={() => onDelete(question.id)}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 text-[13px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-lg transition-all mt-auto"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          ) : <div />}
        </div>
      )}
    </div>
  );
};

export default QuestionCard;

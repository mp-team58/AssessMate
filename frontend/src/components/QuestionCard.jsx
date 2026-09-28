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
  index = null,
}) => {
  return (
    <div className={`p-5 bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all relative flex flex-col md:flex-row gap-4 ${selectable && selected ? 'ring-2 ring-brand-500 border-transparent bg-brand-50/10' : 'border-secondary-200'}`}>

      {/* Main Content Area */}
      <div className={`flex items-start gap-3.5 flex-1 min-w-0 ${selectable ? 'pr-8' : ''}`}>

        {index !== null && (
          <div className="w-8 h-8 rounded-xl bg-[#362E20] text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
            {index}
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-wider">
            <span className={`px-2.5 py-0.5 rounded-md border ${getDifficultyColor(question.difficulty)}`}>
              {question.difficulty}
            </span>
            <span className="px-2.5 py-0.5 rounded-md border bg-secondary-50 text-secondary-600 border-secondary-200">
              {getTypeLabel(question.type)}
            </span>
            {question.topic && (
              <span className="px-2.5 py-0.5 rounded-md border bg-blue-50 text-blue-700 border-blue-100">
                {question.topic}
              </span>
            )}
            {showSource && question.source && (
              <span className={`px-2.5 py-0.5 rounded-md ${getSourceColor(question.source)}`}>
                {question.source}
              </span>
            )}

            <div className="ml-auto flex items-center gap-1">
              {question.isVerified && question.source === 'AI' && (
                <span className="flex items-center text-green-700 bg-green-50 px-2.5 py-0.5 rounded-md border border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" /> Verified
                </span>
              )}
              {question.isVerified === false && (
                <span className="flex items-center text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Needs Review
                </span>
              )}
            </div>
          </div>

          {/* Question Text */}
          <h4 className="text-[15px] font-bold text-[#362E20] mb-3 leading-relaxed break-words whitespace-pre-wrap">
            {question.questionText}
          </h4>

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
          <div className="mt-2">
            {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_SELECT') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {question.optionA && (
                  <div className={`flex items-center text-sm p-3 rounded-xl border transition-colors ${question.correctAnswer?.includes('A') ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' : 'bg-secondary-50/50 border-secondary-200 text-secondary-800'}`}>
                    <span className={`flex items-center justify-center shrink-0 w-6 h-6 rounded border mr-3 font-bold text-[11px] ${question.correctAnswer?.includes('A') ? 'bg-emerald-200 border-emerald-300 text-emerald-800' : 'bg-white border-secondary-200 text-secondary-500 shadow-sm'}`}>A</span>
                    <span>{question.optionA}</span>
                  </div>
                )}
                {question.optionB && (
                  <div className={`flex items-center text-sm p-3 rounded-xl border transition-colors ${question.correctAnswer?.includes('B') ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' : 'bg-secondary-50/50 border-secondary-200 text-secondary-800'}`}>
                    <span className={`flex items-center justify-center shrink-0 w-6 h-6 rounded border mr-3 font-bold text-[11px] ${question.correctAnswer?.includes('B') ? 'bg-emerald-200 border-emerald-300 text-emerald-800' : 'bg-white border-secondary-200 text-secondary-500 shadow-sm'}`}>B</span>
                    <span>{question.optionB}</span>
                  </div>
                )}
                {question.optionC && (
                  <div className={`flex items-center text-sm p-3 rounded-xl border transition-colors ${question.correctAnswer?.includes('C') ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' : 'bg-secondary-50/50 border-secondary-200 text-secondary-800'}`}>
                    <span className={`flex items-center justify-center shrink-0 w-6 h-6 rounded border mr-3 font-bold text-[11px] ${question.correctAnswer?.includes('C') ? 'bg-emerald-200 border-emerald-300 text-emerald-800' : 'bg-white border-secondary-200 text-secondary-500 shadow-sm'}`}>C</span>
                    <span>{question.optionC}</span>
                  </div>
                )}
                {question.optionD && (
                  <div className={`flex items-center text-sm p-3 rounded-xl border transition-colors ${question.correctAnswer?.includes('D') ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' : 'bg-secondary-50/50 border-secondary-200 text-secondary-800'}`}>
                    <span className={`flex items-center justify-center shrink-0 w-6 h-6 rounded border mr-3 font-bold text-[11px] ${question.correctAnswer?.includes('D') ? 'bg-emerald-200 border-emerald-300 text-emerald-800' : 'bg-white border-secondary-200 text-secondary-500 shadow-sm'}`}>D</span>
                    <span>{question.optionD}</span>
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
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <p className="text-[13px] text-amber-800 font-medium">
                  {question.source === 'AI'
                    ? 'This question was AI generated and needs your review.'
                    : 'This question needs review before publishing.'}
                </p>
              </div>
              <button
                onClick={() => onVerify(question.id)}
                className="shrink-0 px-4 py-1.5 text-xs font-bold text-amber-700 bg-amber-100/80 hover:bg-amber-200 border border-amber-200 rounded-md transition-colors shadow-sm flex items-center gap-2"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark as Verified
              </button>
            </div>
          )}
        </div> {/* Closes flex-1 min-w-0 flex flex-col */}
      </div>

      {/* Right Side Actions Panel */}
      {selectable ? (
        <div className="flex flex-col justify-start ml-4 pl-4 border-l border-gray-100 shrink-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(question.id)}
            className="w-5 h-5 mt-1 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
          />
        </div>
      ) : (onEdit || onDelete) ? (
        <div className="flex items-center gap-2 self-end md:self-center shrink-0 mt-4 md:mt-0 md:ml-4">
          {onEdit && (
            <button
              onClick={() => onEdit(question)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-secondary-600 bg-white hover:bg-secondary-50 border border-secondary-200 hover:border-secondary-300 rounded-xl transition-all"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(question.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-xl transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default QuestionCard;

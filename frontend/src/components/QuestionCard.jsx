import React, { useState } from 'react';
import { Pencil, Trash2, CheckCircle2, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { getMediaUrl } from '../services/apiClient';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

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
    case 'SINGLE_CHOICE': return 'Single choice';
    case 'MULTIPLE_SELECT': return 'Multiple select';
    case 'FILL_BLANK': return 'Fill in the blank';
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

const titleCase = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '');

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
  reviewNote = null, // optional sentence explaining why this question was flagged
}) => {
  const [verifying, setVerifying] = useState(false);
  const isAI = question.addedBy === 'AI' || question.source === 'AI';
  const needsReview = question.isVerified === false;
  const showVerified = question.isVerified === true && isAI;

  const handleVerify = async () => {
    if (verifying) return;
    setVerifying(true);
    try { await onVerify(question.id); } finally { setVerifying(false); }
  };

  return (
    <div
      className={`p-5 bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all relative flex flex-col md:flex-row gap-4 ${
        selectable && selected ? 'ring-2 ring-brand-500 border-transparent bg-brand-50/10' : needsReview ? 'border-amber-200' : 'border-secondary-200'
      }`}
    >
      {/* Main content */}
      <div className={`flex items-start gap-3.5 flex-1 min-w-0 ${selectable ? 'pr-8' : ''}`}>
        {index !== null && (
          <div className="w-8 h-8 rounded-xl bg-[#16241F] text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
            {index}
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Badges and review status */}
          <div className="flex flex-wrap items-center gap-2 mb-2 text-xs font-semibold">
            <span className={`px-2.5 py-0.5 rounded-md border ${getDifficultyColor(question.difficulty)}`}>
              {titleCase(question.difficulty)}
            </span>
            <span className="px-2.5 py-0.5 rounded-md border bg-secondary-50 text-secondary-600 border-secondary-200">
              {getTypeLabel(question.type)}
            </span>
            {question.topic && (
              <span className="px-2.5 py-0.5 rounded-md border bg-blue-50 text-blue-700 border-blue-100">{question.topic}</span>
            )}
            {showSource && (question.addedBy || question.source) && (
              <span className={`px-2.5 py-0.5 rounded-md ${getSourceColor(question.source)}`}>{question.addedBy || question.source}</span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {showVerified && (
                <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2.5 py-0.5 rounded-md border border-green-200">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Verified
                </span>
              )}
              {needsReview && (
                <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Needs review
                </span>
              )}
              {needsReview && onVerify && (
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifying}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition"
                >
                  {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                  Mark verified
                </button>
              )}
            </div>
          </div>

          {reviewNote && (
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
              <span>{reviewNote}</span>
            </p>
          )}

          {/* Question text */}
          <h4 className="text-[15px] font-bold text-[#16241F] mb-3 leading-relaxed break-words whitespace-pre-wrap">
            {question.questionText}
          </h4>

          {question.imageUrl && (
            <div className="mt-2 mb-1 border-2 border-gray-100 rounded-xl overflow-hidden bg-gray-50 flex justify-center max-h-[300px]">
              <img src={getMediaUrl(question.imageUrl)} alt="Question context" className="max-w-full max-h-[300px] object-contain p-2" />
            </div>
          )}

          {/* Options and answer */}
          <div className="mt-2">
            {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_SELECT') && (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {OPTION_KEYS.map((k) => {
                  const text = question[`option${k}`];
                  if (!text) return null;
                  const correct = Boolean(question.correctAnswer?.includes(k));
                  return (
                    <li
                      key={k}
                      className={`flex items-center text-sm p-3 rounded-xl border ${
                        correct ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm' : 'bg-secondary-50/50 border-secondary-200 text-secondary-800'
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center shrink-0 w-6 h-6 rounded border mr-3 font-bold text-xs ${
                          correct ? 'bg-emerald-200 border-emerald-300 text-emerald-800' : 'bg-white border-secondary-200 text-secondary-500'
                        }`}
                      >
                        {k}
                      </span>
                      <span className="flex-1">{text}</span>
                      {correct && (
                        <>
                          <Check className="w-4 h-4 text-emerald-700 shrink-0 ml-2" aria-hidden="true" />
                          <span className="sr-only">Correct answer</span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
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
        </div>
      </div>

      {/* Right-side actions */}
      {selectable ? (
        <div className="flex flex-col justify-start ml-4 pl-4 border-l border-gray-100 shrink-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(question.id)}
            aria-label="Select this question"
            className="w-5 h-5 mt-1 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
          />
        </div>
      ) : onEdit || onDelete ? (
        <div className="flex items-center gap-2 self-end md:self-center shrink-0 mt-4 md:mt-0 md:ml-4">
          {onEdit && (
            <button
              onClick={() => onEdit(question)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-secondary-600 bg-white hover:bg-secondary-50 border border-secondary-200 hover:border-secondary-300 rounded-xl transition-all"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(question.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-xl transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Remove
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default QuestionCard;

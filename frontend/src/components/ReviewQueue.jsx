// Place at: src/components/ReviewQueue.jsx
// One place to review every question that still needs review: one question at a time,
// with Approve / Edit / Remove in a fixed action bar, progress, and keyboard shortcuts.
import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Pencil, Trash2 } from 'lucide-react';
import QuestionCard from './QuestionCard';

const reasonFor = (q) =>
  q.source === 'AI' || q.addedBy === 'AI'
    ? "AI generated this question and we couldn't find support for the marked answer in your source material. Check the highlighted answer before you verify it."
    : 'This question needs your review before the exam can be published.';

const ReviewQueue = ({ questions, onVerify, onVerifyAll, onEdit, onDelete, sectionRef }) => {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const startTotal = useRef(questions.length); // size of the queue when it first appeared

  useEffect(() => {
    if (questions.length > startTotal.current) startTotal.current = questions.length;
  }, [questions.length]);

  // When the current question leaves the queue (verified, removed) the next one slides into
  // the same index, so the host just keeps pressing Approve. Clamp at the end.
  useEffect(() => {
    if (index > questions.length - 1) setIndex(Math.max(0, questions.length - 1));
  }, [questions.length, index]);

  const current = questions[index];
  const total = questions.length;
  const done = Math.max(0, startTotal.current - total);
  const pct = startTotal.current ? Math.round((done / startTotal.current) * 100) : 0;

  const approve = async () => {
    if (busy || !current) return;
    setBusy(true);
    try { await onVerify(current.id); } finally { setBusy(false); }
  };
  const approveAll = async () => {
    if (busy || !total) return;
    setBusy(true);
    try { await onVerifyAll(questions.map((q) => q.id)); } finally { setBusy(false); }
  };
  const move = (delta) => setIndex((i) => Math.min(total - 1, Math.max(0, i + delta)));

  // Shortcuts: ← → move, A approve, E edit. Ignored while typing or while a dialog is open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowright') { e.preventDefault(); move(1); }
      else if (k === 'arrowleft') { e.preventDefault(); move(-1); }
      else if (k === 'a') { e.preventDefault(); approve(); }
      else if (k === 'e' && current) { e.preventDefault(); onEdit(current); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!current) return null;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="review-queue-title"
      className="scroll-mt-4 bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden"
    >
      {/* Header: what's left, and how far along you are */}
      <header className="px-6 md:px-8 pt-6 pb-5 bg-amber-50/70 border-b border-amber-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="review-queue-title" className="text-lg font-bold text-secondary-900">Review before publishing</h3>
              <p aria-live="polite" className="text-sm text-secondary-600 mt-0.5">
                {total} question{total > 1 ? 's' : ''} still need{total === 1 ? 's' : ''} your review
                {done > 0 && <> · {done} of {startTotal.current} done</>}
              </p>
            </div>
          </div>
          {total > 1 && onVerifyAll && (
            <button
              type="button"
              onClick={approveAll}
              disabled={busy}
              className="text-sm font-semibold text-amber-900 hover:text-amber-950 underline underline-offset-2 disabled:opacity-50"
            >
              Mark all {total} as verified
            </button>
          )}
        </div>

        <div className="mt-4 h-1.5 rounded-full bg-amber-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Review progress">
          <div className="h-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>

        {total > 1 && (
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Questions to review">
            {questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Review question ${i + 1} of ${total}`}
                onClick={() => setIndex(i)}
                className={`shrink-0 min-w-[2rem] h-8 px-2 rounded-lg text-xs font-bold border transition ${
                  i === index
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* The question under review */}
      <div className="px-6 md:px-8 py-6">
        <p className="text-sm font-semibold text-secondary-500 mb-3">Question {index + 1} of {total} to review</p>
        <QuestionCard key={current.id} question={current} showSource reviewNote={reasonFor(current)} />
      </div>

      {/* Actions */}
      <footer className="px-6 md:px-8 py-4 bg-secondary-50 border-t border-secondary-200 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={index === 0}
            aria-label="Previous question"
            className="p-2 rounded-lg border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-100 disabled:opacity-40 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={index >= total - 1}
            aria-label="Next question"
            className="p-2 rounded-lg border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-100 disabled:opacity-40 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onEdit(current)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-secondary-300 bg-white text-sm font-semibold text-secondary-800 hover:bg-secondary-100 transition"
        >
          <Pencil className="w-4 h-4" aria-hidden="true" /> Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(current.id)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" /> Remove
        </button>

        <span className="hidden lg:block text-xs text-secondary-500 ml-2">Shortcuts: A verify · E edit · ← → move</span>

        <button
          type="button"
          onClick={approve}
          disabled={busy}
          className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
          {total > 1 ? 'Mark verified & next' : 'Mark verified'}
        </button>
      </footer>
    </section>
  );
};

export default ReviewQueue;


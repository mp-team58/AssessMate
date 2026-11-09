// Purely presentational. All state, timers, proctoring and API calls stay in pages/ActiveExam.jsx.
import React, { useEffect, useState } from 'react';
import {
  Clock, Shield, AlertTriangle, ChevronLeft, ChevronRight, Flag, RotateCcw, Send, Camera,
  Maximize, CheckCircle2, HelpCircle, AlertCircle, BookOpenCheck, Code2, Play, Terminal,
  Info, Mic, MicOff, LayoutGrid, X, Lock, ArrowRight, WifiOff, Wifi, Monitor, Smartphone,
  ShieldAlert, Loader2, Eye,
} from 'lucide-react';
import MarkdownViewer from './MarkdownViewer';
import { getMediaUrl } from '../services/apiClient';
import { SecureImage } from './SecureMedia';

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                  */
/* ------------------------------------------------------------------ */
const LANG_LABEL = {
  PYTHON: 'Python 3',
  JAVA: 'Java (OpenJDK)',
  CPP: 'C++ (GCC)',
  C: 'C (GCC)',
  JAVASCRIPT: 'JavaScript (Node.js)',
};

const TYPE_LABEL = {
  SINGLE_CHOICE: 'Single choice',
  MULTIPLE_SELECT: 'Multiple select',
  FILL_BLANK: 'Fill in the blank',
  NUMERICAL: 'Numerical',
  CODING: 'Coding',
};

const isAnswered = (v) => v !== undefined && v !== null && v !== '';

const getOptions = (q) =>
  q.options && q.options.length
    ? q.options
    : ['A', 'B', 'C', 'D'].map((k) => ({ key: k, value: q[`option${k}`] })).filter((o) => o.value);

const TIME_TONES = {
  ok: 'bg-white/10 text-white',
  warn: 'bg-amber-400/20 text-amber-200',
  critical: 'bg-rose-500/30 text-rose-100',
};

const STATUS_STYLES = {
  answered: 'bg-emerald-600 text-white border-emerald-700',
  flagged: 'bg-amber-500 text-white border-amber-600',
  notAnswered: 'bg-rose-50 text-rose-700 border-rose-300',
  notVisited: 'bg-secondary-100 text-secondary-700 border-secondary-200',
};

const LEGEND = [
  { key: 'answered', label: 'Answered', swatch: 'bg-emerald-600' },
  { key: 'notAnswered', label: 'Not answered', swatch: 'bg-rose-50 border border-rose-300' },
  { key: 'notVisited', label: 'Not visited', swatch: 'bg-secondary-100 border border-secondary-200' },
  { key: 'flagged', label: 'Marked for review', swatch: 'bg-amber-500' },
];

/* ------------------------------------------------------------------ */
/* Full-screen gates (before the exam starts)                           */
/* ------------------------------------------------------------------ */
const GateShell = ({ children }) => (
  <div className="min-h-screen bg-surface flex items-center justify-center p-6 font-sans select-none">
    <div className="w-full max-w-md bg-white rounded-2xl border border-secondary-200 shadow-lg p-8 text-center">
      {children}
    </div>
  </div>
);

const HiddenVideo = ({ videoRef }) => (
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', top: '-9999px' }}
  />
);

const DeviceGate = ({ deviceRestriction, navigate }) => (
  <GateShell>
    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
      {deviceRestriction.required === 'DESKTOP' ? <Monitor className="w-7 h-7" /> : <Smartphone className="w-7 h-7" />}
    </div>
    <h2 className="text-xl font-extrabold text-secondary-900">
      {deviceRestriction.required === 'DESKTOP' ? 'This exam needs a desktop or laptop' : 'This exam needs a mobile phone'}
    </h2>
    <p className="text-sm text-secondary-600 mt-2 leading-relaxed">{deviceRestriction.message}</p>
    <dl className="mt-5 bg-secondary-50 rounded-xl border border-secondary-100 text-left text-xs divide-y divide-secondary-200/70">
      <div className="flex justify-between gap-4 p-3">
        <dt className="text-secondary-500 font-medium">Required</dt>
        <dd className="font-bold text-secondary-900 text-right">
          {deviceRestriction.required === 'DESKTOP' ? 'Desktop or laptop' : 'Mobile phone'}
        </dd>
      </div>
      <div className="flex justify-between gap-4 p-3">
        <dt className="text-secondary-500 font-medium">Your device</dt>
        <dd className="font-bold text-red-600 text-right">{deviceRestriction.detected || 'Not supported'}</dd>
      </div>
    </dl>
    <div className="mt-6 space-y-2">
      <button onClick={() => navigate('/candidate/dashboard')} className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition">
        Back to dashboard
      </button>
      <button onClick={() => navigate('/candidate/my-assessments')} className="w-full py-2.5 rounded-xl text-secondary-700 hover:bg-secondary-100 font-semibold text-sm transition">
        View my assessments
      </button>
    </div>
  </GateShell>
);

const PermissionGate = ({ navigate, requestMediaPermissions }) => (
  <GateShell>
    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
      <Camera className="w-7 h-7" />
    </div>
    <h2 className="text-xl font-extrabold text-secondary-900">Camera and microphone are blocked</h2>
    <p className="text-sm text-secondary-600 mt-2 leading-relaxed">
      This exam is proctored. You need to allow both so your attempt can be monitored for the whole session.
    </p>
    <ol className="mt-5 bg-secondary-50 rounded-xl border border-secondary-200 p-4 text-left text-xs text-secondary-700 space-y-1.5 list-decimal list-inside">
      <li>Click the camera icon in your browser's address bar.</li>
      <li>Choose <strong>Allow</strong> for camera and microphone.</li>
      <li>Select <strong>Allow and retry</strong> below.</li>
    </ol>
    <div className="mt-6 flex gap-3">
      <button type="button" onClick={() => navigate('/candidate/dashboard')} className="flex-1 py-3 rounded-xl border border-secondary-300 text-secondary-700 font-bold text-sm hover:bg-secondary-50 transition">
        Back
      </button>
      <button type="button" onClick={requestMediaPermissions} className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition flex items-center justify-center gap-2">
        <RotateCcw className="w-4 h-4" /> Allow and retry
      </button>
    </div>
  </GateShell>
);

const ModelsGate = ({ hiddenVideoRef, modelLoadStep, modelLoadError, onRetry, navigate, onBack }) => (
  <GateShell>
    <HiddenVideo videoRef={hiddenVideoRef} />
    <div className={`w-14 h-14 rounded-2xl ${modelLoadError ? 'bg-rose-50 border border-rose-200 text-rose-600' : 'bg-brand-50 border border-brand-200 text-brand-600'} flex items-center justify-center mx-auto mb-4`}>
      {modelLoadError ? <AlertCircle className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
    </div>
    <h2 className="text-xl font-extrabold text-secondary-900">
      {modelLoadError ? 'Proctoring initialization failed' : 'Setting up proctoring'}
    </h2>
    <p role="status" className={`text-sm ${modelLoadError ? 'text-rose-600 font-medium' : 'text-secondary-600'} mt-2 leading-relaxed`}>
      {modelLoadError || modelLoadStep}
    </p>
    {modelLoadError ? (
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack || (() => navigate('/candidate/dashboard'))}
          className="flex-1 py-3 rounded-xl border border-secondary-300 text-secondary-700 font-bold text-sm hover:bg-secondary-50 transition"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
      </div>
    ) : (
      <>
        <div className="mt-5 h-1.5 bg-secondary-200 rounded-full overflow-hidden">
          <div className="h-full w-2/5 bg-brand-500 rounded-full animate-pulse" />
        </div>
        <p className="text-xs text-secondary-500 mt-3">Keep this tab open. This usually takes a few seconds.</p>
      </>
    )}
  </GateShell>
);

const LoadingGate = () => (
  <GateShell>
    <Loader2 className="w-9 h-9 text-brand-600 animate-spin mx-auto mb-4" />
    <h2 className="text-lg font-bold text-secondary-900">Loading your exam</h2>
    <p role="status" className="text-sm text-secondary-600 mt-1">Preparing questions…</p>
  </GateShell>
);

const ErrorGate = ({ error, navigate }) => (
  <GateShell>
    <AlertCircle className="w-11 h-11 text-red-500 mx-auto mb-3" />
    <h2 className="text-lg font-bold text-secondary-900">We couldn't start this exam</h2>
    <p className="text-sm text-secondary-600 mt-2">{error || 'No questions are available for this exam.'}</p>
    <button onClick={() => navigate('/candidate/dashboard')} className="mt-6 w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition">
      Back to dashboard
    </button>
  </GateShell>
);

/* ------------------------------------------------------------------ */
/* Small building blocks for the exam screen                            */
/* ------------------------------------------------------------------ */
const TimeChip = ({ label, value, tone = 'ok', title }) => (
  <div role="timer" aria-label={`${label}: ${value}`} title={title} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${TIME_TONES[tone]}`}>
    <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
    <span className="hidden md:inline text-xs opacity-80">{label}</span>
    <span className="font-mono tabular-nums text-sm font-bold">{value}</span>
  </div>
);

const StatusPill = ({ icon: Icon, label, value, tone }) => (
  <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${tone}`}>
    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
    <span className="min-w-0">
      <span className="block text-[11px] opacity-75 leading-tight">{label}</span>
      <span className="block text-xs font-bold leading-tight truncate">{value}</span>
    </span>
  </div>
);

const GOOD = 'bg-emerald-50 text-emerald-800';
const WARN = 'bg-amber-50 text-amber-800';
const BAD = 'bg-rose-50 text-rose-700';
const IDLE = 'bg-secondary-100 text-secondary-600';

const ProctorPanel = ({
  previewVideoRef, webcamActive, micActive, audioLevel, faceStatus,
  tabSwitchCount, maxAllowedTabSwitches, proctorWarnings = [],
}) => {
  const warningsList = proctorWarnings || [];
  const last = warningsList[warningsList.length - 1];
  const violationTone = tabSwitchCount === 0 ? GOOD : (maxAllowedTabSwitches && tabSwitchCount >= maxAllowedTabSwitches) ? BAD : WARN;
  return (
    <div className="p-4 border-b border-secondary-200">
      <div className="relative rounded-xl overflow-hidden bg-secondary-900 aspect-video flex items-center justify-center">
        <video
          ref={previewVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover [transform:scaleX(-1)] ${webcamActive ? 'block' : 'hidden'}`}
        />
        {!webcamActive && (
          <div className="text-center space-y-1">
            <Camera className="w-7 h-7 text-secondary-500 mx-auto" aria-hidden="true" />
            <p className="text-xs text-secondary-400">Camera is off</p>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <StatusPill icon={Camera} label="Camera" value={webcamActive ? 'On' : 'Off'} tone={webcamActive ? GOOD : BAD} />
        <StatusPill
          icon={micActive ? Mic : MicOff}
          label="Microphone"
          value={micActive ? (audioLevel > 40 ? 'Noise detected' : 'On') : 'Off'}
          tone={!micActive ? BAD : audioLevel > 40 ? WARN : GOOD}
        />
        <StatusPill icon={Eye} label="Face" value={faceStatus === 'VERIFIED' ? 'In view' : 'Searching'} tone={faceStatus === 'VERIFIED' ? GOOD : IDLE} />
        <StatusPill icon={ShieldAlert} label="Violations" value={maxAllowedTabSwitches ? `${tabSwitchCount} of ${maxAllowedTabSwitches}` : `${tabSwitchCount} logged`} tone={violationTone} />
      </div>

      {last && (
        <div role="status" className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <p className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            {proctorWarnings.length} alert{proctorWarnings.length > 1 ? 's' : ''} so far
          </p>
          <p className="mt-1 line-clamp-3">{last.message}</p>
        </div>
      )}
    </div>
  );
};

const QuestionGrid = ({ questions, statusOf, currentIndex, onSelect, answers, isUnstarted, cols = 'grid-cols-5', size = 'h-10' }) => (
  <div className={`grid ${cols} gap-2 p-1`}>
    {questions.map((q, idx) => {
      const status = statusOf(q, idx);
      const current = idx === currentIndex;
      const unstarted = isUnstarted ? isUnstarted(q, idx) : false;
      return (
        <button
          key={q.id}
          type="button"
          disabled={unstarted}
          onClick={() => !unstarted && onSelect(idx)}
          aria-current={current ? 'true' : undefined}
          aria-disabled={unstarted ? 'true' : undefined}
          title={unstarted ? 'This question opens when you reach it' : undefined}
          aria-label={`Question ${idx + 1}: ${unstarted ? 'Locked until reached' : LEGEND.find((l) => l.key === status)?.label || status}${current ? ', current' : ''}`}
          className={`relative ${size} w-full min-w-0 rounded-lg border text-sm font-semibold transition flex items-center justify-center ${
            unstarted ? 'bg-secondary-100 text-secondary-400 border-secondary-200 cursor-not-allowed opacity-50' : STATUS_STYLES[status]
          } ${
            current ? 'ring-2 ring-brand-600 ring-offset-2 font-black' : unstarted ? '' : 'hover:brightness-95'
          }`}
        >
          {idx + 1}
          {q.isCoding && <span className="absolute bottom-0.5 right-1 text-[8px] font-mono opacity-70">{'</>'}</span>}
          {status === 'flagged' && isAnswered(answers[q.id]) && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-300 border border-white" aria-hidden="true" />
          )}
          {unstarted && (
            <Lock className="w-2.5 h-2.5 absolute top-1 right-1 opacity-60 text-secondary-500" aria-hidden="true" />
          )}
        </button>
      );
    })}
  </div>
);

const Legend = ({ counts }) => (
  <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-secondary-700 px-1">
    {LEGEND.map((l) => (
      <li key={l.key} className="flex items-center gap-2">
        <span className={`w-4 h-4 rounded ${l.swatch}`} aria-hidden="true" />
        <span>{l.label} <span className="font-semibold text-secondary-900">({counts[l.key]})</span></span>
      </li>
    ))}
    <li className="flex items-center gap-2">
      <span className="w-4 h-4 rounded bg-white ring-2 ring-brand-600" aria-hidden="true" />
      <span>Current</span>
    </li>
  </ul>
);

const OptionRow = ({ letter, text, selected, multi, disabled, onClick }) => (
  <button
    type="button"
    role={multi ? 'checkbox' : 'radio'}
    aria-checked={selected}
    disabled={disabled}
    onClick={onClick}
    className={`w-full text-left flex items-center gap-4 px-5 py-3.5 min-h-[58px] sm:min-h-[62px] rounded-xl border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
      disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
    } ${selected ? 'border-brand-600 bg-brand-50/70 shadow-sm' : 'border-secondary-200 bg-white hover:border-brand-300 hover:bg-secondary-50/80'}`}
  >
    <span
      className={`shrink-0 w-8 h-8 flex items-center justify-center border-2 text-sm font-bold transition ${
        multi ? 'rounded-md' : 'rounded-full'
      } ${selected ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-secondary-300 text-secondary-700'}`}
    >
      {multi && selected ? <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> : letter}
    </span>
    <span className="text-[16px] sm:text-[17px] font-medium text-secondary-900 leading-snug pt-0.5">{text}</span>
  </button>
);

/* ------------------------------------------------------------------ */
/* Question bodies                                                      */
/* ------------------------------------------------------------------ */
const McqBody = (p) => {
  const { currentQuestion: q, currentAnswer, isCurrentQuestionExpired: expired } = p;
  const type = q.type || 'SINGLE_CHOICE';
  const options = getOptions(q);
  const selectedList = currentAnswer ? String(currentAnswer).split(',') : [];

  return (
    <div className="w-full max-w-[760px] mx-auto px-4 sm:px-8 py-8 my-auto space-y-7">
      {expired && (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-sm font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
          Time for this question is over. Your answer was saved and can't be changed.
        </div>
      )}

      <div className="text-[19px] sm:text-[21px] font-bold text-secondary-900 leading-relaxed tracking-tight">
        <MarkdownViewer content={q.questionText} />
      </div>

      {q.imageUrl && (
        <div className="rounded-2xl overflow-hidden border border-secondary-200 bg-white shadow-sm">
          <SecureImage src={q.imageUrl} alt="Diagram for this question" className="w-full object-contain max-h-80" />
        </div>
      )}

      {(type === 'SINGLE_CHOICE' || type === 'MULTIPLE_SELECT') && (
        <div
          role={type === 'SINGLE_CHOICE' ? 'radiogroup' : 'group'}
          aria-label={type === 'SINGLE_CHOICE' ? 'Choose one answer' : 'Choose all that apply'}
          className="space-y-3 pt-1"
        >
          {type === 'MULTIPLE_SELECT' && (
            <p className="text-sm font-semibold text-secondary-600 mb-2">Select all that apply.</p>
          )}
          {options.map((opt) => (
            <OptionRow
              key={opt.key}
              letter={opt.key}
              text={opt.value}
              multi={type === 'MULTIPLE_SELECT'}
              disabled={expired}
              selected={type === 'MULTIPLE_SELECT' ? selectedList.includes(opt.key) : currentAnswer === opt.key}
              onClick={() =>
                type === 'MULTIPLE_SELECT'
                  ? p.handleMultipleSelectToggle(q.id, opt.key)
                  : p.handleSingleChoiceSelect(q.id, opt.key)
              }
            />
          ))}
        </div>
      )}

      {(type === 'FILL_BLANK' || type === 'NUMERICAL') && (
        <div className="pt-1">
          <label htmlFor="exam-text-answer" className="block text-sm font-semibold text-secondary-700 mb-2">
            Your answer
          </label>
          <input
            id="exam-text-answer"
            type={type === 'NUMERICAL' ? 'number' : 'text'}
            value={currentAnswer}
            disabled={expired}
            onChange={(e) => p.handleTextAnswerChange(q.id, e.target.value)}
            placeholder={type === 'NUMERICAL' ? 'Enter a number' : 'Type your answer'}
            className="select-text w-full px-5 py-4 min-h-[58px] rounded-xl border-2 border-secondary-200 bg-white text-[16px] sm:text-[17px] text-secondary-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-secondary-50"
          />
        </div>
      )}
    </div>
  );
};

const CodingBody = (p) => {
  const {
    currentQuestion: q, currentAnswer, codeLanguage, setCodeLanguage, STARTER_CODE, confirm,
    handleTextAnswerChange, customInput, setCustomInput, showCustomInput, setShowCustomInput,
    isRunningCode, isSubmittingCode, runResult, codeSubmitResult,
    handleRunCandidateCode, handleSubmitCandidateCode,
  } = p;
  const rawId = q.rawCodingId || q.id;
  const code = currentAnswer || STARTER_CODE[codeLanguage] || '';

  const onTab = (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const el = e.currentTarget;
    const s = el.selectionStart;
    const next = el.value.slice(0, s) + '    ' + el.value.slice(el.selectionEnd);
    handleTextAnswerChange(q.id, next);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 4; });
  };

  return (
    <div className="px-4 sm:px-6 py-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
      {/* Problem statement */}
      <section aria-label="Problem statement" className="space-y-4 min-w-0 xl:max-h-[calc(100dvh-15rem)] xl:overflow-y-auto xl:pr-2">
        <div className="text-lg font-semibold text-secondary-900 leading-relaxed">
          <MarkdownViewer content={q.questionText} />
        </div>
        {q.description && (
          <div className="bg-white p-4 rounded-xl border border-secondary-200">
            <MarkdownViewer content={q.description} />
          </div>
        )}
        {q.constraints && (
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
            <p className="font-bold mb-1">Constraints</p>
            <pre className="font-mono whitespace-pre-wrap">{q.constraints}</pre>
          </div>
        )}
        {q.sampleInput && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-secondary-200">
              <p className="font-bold text-secondary-600 mb-1.5">Sample input</p>
              <pre className="font-mono bg-secondary-50 p-2 rounded-lg whitespace-pre-wrap">{q.sampleInput}</pre>
            </div>
            <div className="p-3 bg-white rounded-xl border border-secondary-200">
              <p className="font-bold text-secondary-600 mb-1.5">Sample output</p>
              <pre className="font-mono bg-secondary-50 p-2 rounded-lg whitespace-pre-wrap">{q.sampleOutput}</pre>
            </div>
          </div>
        )}
        <p className="text-xs text-secondary-500">
          Limits: {q.timeLimitSeconds}s per test, {q.memoryLimitMb} MB memory.
        </p>
      </section>

      {/* Editor */}
      <section aria-label="Code editor" className="space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary-900 text-white p-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-brand-400" aria-hidden="true" />
            <label htmlFor="code-language" className="sr-only">Language</label>
            <select
              id="code-language"
              value={codeLanguage}
              onChange={(e) => {
                const lang = e.target.value;
                setCodeLanguage(lang);
                if (!currentAnswer) handleTextAnswerChange(q.id, STARTER_CODE[lang] || '');
              }}
              className="bg-secondary-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-secondary-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {(q.allowedLanguages || Object.keys(LANG_LABEL)).map((lang) => (
                <option key={lang} value={lang}>{LANG_LABEL[lang] || lang}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Reset code',
                  message: 'Replace your code with the starter template? Your current edits will be lost.',
                  confirmText: 'Reset code',
                  cancelText: 'Cancel',
                  isDanger: true,
                });
                if (ok) handleTextAnswerChange(q.id, STARTER_CODE[codeLanguage] || '');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-secondary-200 hover:text-white bg-secondary-800 hover:bg-secondary-700 rounded-lg border border-secondary-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Reset
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleRunCandidateCode(rawId, q.id)}
              disabled={isRunningCode}
              className="px-3 py-1.5 bg-secondary-700 hover:bg-secondary-600 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              {isRunningCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              Run
            </button>
            <button
              type="button"
              onClick={() => handleSubmitCandidateCode(rawId, q.id)}
              disabled={isSubmittingCode}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              {isSubmittingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Submit solution
            </button>
          </div>
        </div>

        <textarea
          aria-label="Code editor"
          rows={18}
          value={code}
          onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
          onKeyDown={onTab}
          spellCheck="false"
          placeholder="// Write your solution here"
          className="select-text w-full min-h-[22rem] p-4 rounded-xl border border-secondary-800 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        />

        <div>
          <button type="button" onClick={() => setShowCustomInput(!showCustomInput)} className="text-xs font-bold text-secondary-600 hover:text-brand-700">
            {showCustomInput ? 'Hide custom input' : 'Test with custom input'}
          </button>
          {showCustomInput && (
            <textarea
              aria-label="Custom input"
              rows={3}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Standard input for “Run”"
              className="select-text mt-2 w-full p-3 rounded-xl border border-secondary-300 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}
        </div>

        {(runResult || codeSubmitResult) && (
          <div role="status" className="bg-secondary-900 text-secondary-100 rounded-xl p-4 space-y-3 font-mono text-xs border border-secondary-800">
            <div className="flex items-center justify-between border-b border-secondary-800 pb-2">
              <span className="flex items-center gap-2 font-bold text-white">
                <Terminal className="w-4 h-4 text-brand-400" aria-hidden="true" /> Console
              </span>
              {runResult?.status && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${runResult.passed ? 'bg-green-900/80 text-green-300' : 'bg-red-900/80 text-red-300'}`}>
                  {runResult.status}
                </span>
              )}
            </div>
            {runResult?.stdout && (
              <div>
                <p className="text-secondary-400 text-[11px] font-bold mb-1">Output</p>
                <pre className="p-2 bg-secondary-950 rounded-lg text-emerald-300 whitespace-pre-wrap">{runResult.stdout}</pre>
              </div>
            )}
            {runResult?.stderr && (
              <div>
                <p className="text-red-400 text-[11px] font-bold mb-1">Errors</p>
                <pre className="p-2 bg-secondary-950 rounded-lg text-red-300 whitespace-pre-wrap">{runResult.stderr}</pre>
              </div>
            )}
            {runResult?.executionTimeMs && <p className="text-secondary-400 text-[11px]">Ran in {runResult.executionTimeMs} ms</p>}
            {codeSubmitResult && (
              <div className="space-y-1.5 border-t border-secondary-800 pt-2 text-white">
                <p className="font-bold text-green-400">
                  Test cases passed: {codeSubmitResult.testCasesPassed ?? 0} / {codeSubmitResult.totalTestCases ?? 'all'}
                </p>
                {codeSubmitResult.marksAwarded !== undefined && (
                  <p className="text-brand-300 font-bold">Marks awarded: {codeSubmitResult.marksAwarded}</p>
                )}
                {codeSubmitResult.compileOutput && (
                  <pre className="p-2 bg-secondary-950 rounded-lg text-amber-300 whitespace-pre-wrap text-[11px]">{codeSubmitResult.compileOutput}</pre>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Modal shell                                                          */
/* ------------------------------------------------------------------ */
const Modal = ({ labelledBy, onBackdrop, children, z = 'z-50' }) => (
  <div
    className={`fixed inset-0 ${z} bg-secondary-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto`}
    onClick={(e) => { if (onBackdrop && e.target === e.currentTarget) onBackdrop(); }}
    role="dialog"
    aria-modal="true"
    aria-labelledby={labelledBy}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* Watermark overlay                                                   */
/* ------------------------------------------------------------------ */
const ExamWatermark = ({ enrollmentId, examId, examTitle }) => {
  const formatTime = () => {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const [currentTime, setCurrentTime] = useState(formatTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const storedExamId = (enrollmentId && typeof window !== 'undefined')
    ? (sessionStorage.getItem(`exam_id_${enrollmentId}`) || localStorage.getItem(`exam_id_${enrollmentId}`))
    : null;
  const rawExamVal = examId || storedExamId || examTitle || 'N/A';
  const cleanEnrollment = String(enrollmentId || 'N/A').replace(/^#+/, '');
  const cleanExam = String(rawExamVal).replace(/^#+/, '');

  const watermarkText = `ASSESSMATE • ENROLLMENT #${cleanEnrollment} • EXAM #${cleanExam} • ${currentTime}`;

  return (
    <div
      data-testid="exam-watermark"
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none z-30 overflow-hidden flex flex-wrap justify-around items-center opacity-[0.04] font-mono text-xs tracking-wider"
      style={{ userSelect: 'none' }}
    >
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="transform -rotate-45 m-8 whitespace-nowrap text-secondary-900 font-bold"
        >
          {watermarkText}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Main exam workspace                                                  */
/* ------------------------------------------------------------------ */
const ExamWorkspace = (p) => {
  const {
    examData, questionsList, currentIndex, setCurrentIndex, currentQuestion, answers, flaggedQuestions,
    isCurrentFlagged, isCurrentQuestionExpired, isSubmitting, backendTerminated, permissionState, hasSubmitted,
    timeLeftSeconds, questionTimeLeft, formatTime, isFullscreen, requestFullscreenAgain,
    isOnline, showReconnectedToast, screenshotWarning, tabSwitchCount, maxAllowedTabSwitches,
    showSubmitModal, setShowSubmitModal, showInstructionsModal, setShowInstructionsModal,
    showLeaveWarning, setShowLeaveWarning, mobilePaletteOpen, setMobilePaletteOpen,
    handleSubmitExam, handleAdvanceQuestion, handleToggleFlag, handleClearAnswer,
    terminationReason, navigate, enrollmentId, hiddenVideoRef,
  } = p;

  // "Not visited" vs "Not answered" needs to remember which questions were opened.
  const [visited, setVisited] = useState(() => new Set());
  useEffect(() => {
    const id = currentQuestion?.id;
    if (id) setVisited((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, [currentQuestion?.id]);

  const total = questionsList.length;
  const perQuestion = examData?.timerType === 'PER_QUESTION';
  const isCoding = Boolean(currentQuestion.isCoding);

  const statusOf = (q) => {
    if (flaggedQuestions.has(q.id)) return 'flagged';
    if (isAnswered(answers[q.id])) return 'answered';
    if (visited.has(q.id)) return 'notAnswered';
    return 'notVisited';
  };
  const counts = { answered: 0, notAnswered: 0, notVisited: 0, flagged: 0 };
  questionsList.forEach((q) => { counts[statusOf(q)] += 1; });
  const answeredTotal = questionsList.filter((q) => isAnswered(answers[q.id])).length;
  const unansweredList = questionsList.map((q, i) => ({ q, i })).filter(({ q }) => !isAnswered(answers[q.id]));

  const firstCoding = questionsList.findIndex((q) => q.isCoding);
  const hasCoding = firstCoding !== -1;
  const hasMcq = questionsList.some((q) => !q.isCoding);
  const mcqCount = questionsList.filter((q) => !q.isCoding).length;

  const totalTone = !perQuestion && timeLeftSeconds !== null ? (timeLeftSeconds < 60 ? 'critical' : timeLeftSeconds < 300 ? 'warn' : 'ok') : 'ok';
  const qTone = questionTimeLeft !== null && questionTimeLeft <= 10 ? 'critical' : questionTimeLeft !== null && questionTimeLeft <= 20 ? 'warn' : 'ok';
  const qTotal = currentQuestion.timeSeconds || null;
  const qPct = qTotal && questionTimeLeft !== null ? Math.max(0, Math.min(100, (questionTimeLeft / qTotal) * 100)) : null;

  const isLast = currentIndex === total - 1;
  const canSubmit = !isSubmitting && !backendTerminated;
  const type = currentQuestion.type || 'SINGLE_CHOICE';

  const isUnstarted = (q, idx) => {
    if (!perQuestion || q.isCoding) return false;
    if (q.isExpired || q.deadline || visited.has(q.id) || isAnswered(answers[q.id])) return false;
    if (idx === currentIndex) return false;
    return true;
  };

  const goTo = (idx) => {
    const target = questionsList[idx];
    if (target && isUnstarted(target, idx)) return;
    setCurrentIndex(idx);
    setMobilePaletteOpen(false);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-surface text-secondary-900 font-sans select-none overflow-hidden relative">
      <HiddenVideo videoRef={hiddenVideoRef} />
      {p.enableExamWatermark && (
        <ExamWatermark
          enrollmentId={enrollmentId}
          examId={p.examId || examData?.examId || examData?.id}
          examTitle={examData?.examTitle}
        />
      )}

      {/* Header */}
      <header className="shrink-0 bg-[#16241F] text-[#F1F4F2] border-b border-black/30">
        <div className="h-14 px-3 sm:px-5 flex items-center gap-3">
          <BookOpenCheck className="w-5 h-5 text-brand-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight truncate max-w-[36vw] sm:max-w-sm">
              {examData?.examTitle || 'Proctored assessment'}
            </h1>
            <p className="text-xs text-secondary-400 leading-tight hidden sm:block">
              Question {currentIndex + 1} of {total}
            </p>
          </div>

          <div className="flex-1" />

          {perQuestion && questionTimeLeft !== null && (
            <TimeChip label="This question" value={`${questionTimeLeft}s`} tone={qTone} />
          )}
          <TimeChip
            label={perQuestion ? 'Total' : 'Time left'}
            value={formatTime(timeLeftSeconds)}
            tone={totalTone}
            title={perQuestion ? 'Overall exam deadline' : 'Exam time remaining'}
          />

          <button
            type="button"
            onClick={() => setShowInstructionsModal(true)}
            className="p-2 rounded-lg text-secondary-300 hover:text-white hover:bg-white/10 transition"
            aria-label="Exam instructions"
            title="Exam instructions"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setMobilePaletteOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold transition"
            aria-label="Open question palette"
          >
            <LayoutGrid className="w-4 h-4 text-brand-400" aria-hidden="true" />
            <span className="font-mono tabular-nums">{answeredTotal}/{total}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            disabled={!canSubmit}
            className="lg:hidden px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition"
          >
            Submit
          </button>
        </div>

        {!isOnline && (
          <div role="alert" className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
            You're offline. Keep working: your answers are sent with your next change or when you submit. Don't refresh this page.
          </div>
        )}
        {showReconnectedToast && isOnline && (
          <div role="status" className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-2">
            <Wifi className="w-4 h-4 shrink-0" aria-hidden="true" /> You're back online.
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 flex">
        {/* Question area */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Question header */}
          <div className="shrink-0 bg-white border-b border-secondary-200">
            {hasCoding && hasMcq && (
              <div className="px-4 sm:px-6 pt-2 flex gap-1" role="tablist" aria-label="Exam sections">
                {[
                  { label: 'Questions', count: mcqCount, active: !isCoding, go: () => goTo(questionsList.findIndex((q) => !q.isCoding)) },
                  { label: 'Coding', count: total - mcqCount, active: isCoding, go: () => goTo(firstCoding) },
                ].map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    role="tab"
                    aria-selected={t.active}
                    onClick={t.go}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition ${
                      t.active ? 'border-brand-600 text-brand-800' : 'border-transparent text-secondary-500 hover:text-secondary-800'
                    }`}
                  >
                    {t.label} <span className="text-xs font-bold opacity-70">({t.count})</span>
                  </button>
                ))}
              </div>
            )}
            <div className="px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-bold text-secondary-900">Question {currentIndex + 1}</h2>
              <span className="px-2.5 py-0.5 rounded-md bg-secondary-100 text-secondary-700 text-xs font-semibold">
                {TYPE_LABEL[type] || 'Single choice'}
              </span>
              <span className="ml-auto flex items-center gap-3 text-sm font-semibold">
                <span className="text-emerald-700">+{currentQuestion.marks || 1}</span>
                {currentQuestion.negativeMarks > 0 && <span className="text-rose-600">−{currentQuestion.negativeMarks}</span>}
              </span>
            </div>
            {perQuestion && !isCoding && qPct !== null && (
              <div className="h-1 bg-secondary-100" role="presentation">
                <div
                  className={`h-full transition-[width] duration-1000 ease-linear ${qTone === 'critical' ? 'bg-rose-500' : qTone === 'warn' ? 'bg-amber-500' : 'bg-brand-500'}`}
                  style={{ width: `${qPct}%` }}
                />
              </div>
            )}
          </div>

          {/* Question body */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {isCoding ? <CodingBody {...p} /> : <McqBody {...p} />}
          </div>

          {/* Action bar */}
          <div className="shrink-0 bg-white border-t border-secondary-200 px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => handleToggleFlag(currentQuestion.id)}
              aria-pressed={isCurrentFlagged}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-semibold transition ${
                isCurrentFlagged ? 'bg-amber-50 border-amber-400 text-amber-800' : 'border-secondary-300 text-secondary-700 hover:bg-secondary-50'
              }`}
            >
              <Flag className={`w-4 h-4 ${isCurrentFlagged ? 'fill-current' : ''}`} aria-hidden="true" />
              <span className="hidden sm:inline">{isCurrentFlagged ? 'Marked for review' : 'Mark for review'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleClearAnswer(currentQuestion.id)}
              disabled={!isAnswered(answers[currentQuestion.id]) || isCoding || isCurrentQuestionExpired}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-40 text-sm font-semibold transition"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Clear response</span>
            </button>

            <span className="hidden xl:flex items-center gap-1.5 text-xs text-secondary-500 ml-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> Answers save automatically
            </span>

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-secondary-300 text-secondary-800 hover:bg-secondary-50 disabled:opacity-40 text-sm font-semibold transition"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" /> <span className="hidden sm:inline">Previous</span>
            </button>
            {!isLast ? (
              <button
                type="button"
                onClick={handleAdvanceQuestion}
                className="flex items-center gap-1 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition"
              >
                Save &amp; next <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition"
              >
                Review &amp; submit <Send className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </main>

        {/* Sidebar (desktop) */}
        <aside aria-label="Proctoring and question palette" className="hidden lg:flex w-80 shrink-0 flex-col bg-white border-l border-secondary-200">
          <ProctorPanel {...p} />
          <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
            <h2 className="text-sm font-bold text-secondary-900">Question palette</h2>
            <Legend counts={counts} />
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <QuestionGrid questions={questionsList} statusOf={statusOf} currentIndex={currentIndex} onSelect={goTo} answers={answers} isUnstarted={isUnstarted} />
            </div>
          </div>
          <div className="p-4 border-t border-secondary-200 bg-secondary-50">
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" aria-hidden="true" /> Submit exam
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile palette drawer */}
      {mobilePaletteOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-secondary-950/70 flex flex-col justify-end"
          onClick={(e) => { if (e.target === e.currentTarget) setMobilePaletteOpen(false); }}
        >
          <div role="dialog" aria-modal="true" aria-label="Question palette" className="bg-white rounded-t-2xl max-h-[85dvh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-secondary-100">
              <div>
                <h2 className="text-sm font-bold text-secondary-900">Question palette</h2>
                <p className="text-xs text-secondary-500">{answeredTotal} of {total} answered</p>
              </div>
              <button type="button" onClick={() => setMobilePaletteOpen(false)} className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100" aria-label="Close palette">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <StatusPill icon={Camera} label="Camera" value={p.webcamActive ? 'On' : 'Off'} tone={p.webcamActive ? GOOD : BAD} />
                <StatusPill icon={ShieldAlert} label="Violations" value={maxAllowedTabSwitches ? `${tabSwitchCount} of ${maxAllowedTabSwitches}` : `${tabSwitchCount} logged`} tone={tabSwitchCount === 0 ? GOOD : (maxAllowedTabSwitches && tabSwitchCount >= maxAllowedTabSwitches) ? BAD : WARN} />
              </div>
              <Legend counts={counts} />
              <QuestionGrid questions={questionsList} statusOf={statusOf} currentIndex={currentIndex} onSelect={goTo} answers={answers} isUnstarted={isUnstarted} cols="grid-cols-5 sm:grid-cols-6" size="h-11" />
            </div>
          </div>
        </div>
      )}

      {/* Screenshot notice */}
      {screenshotWarning && (
        <div role="alert" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" /> Screenshot attempts are logged to the proctor audit.
        </div>
      )}

      {/* Full screen required (blocking) */}
      {!isFullscreen && !backendTerminated && !isSubmitting && !hasSubmitted && permissionState === 'GRANTED' && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="fs-title" className="fixed inset-0 z-[110] bg-red-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl border-t-4 border-rose-500">
            <Maximize className="w-10 h-10 text-rose-600 mx-auto mb-4" aria-hidden="true" />
            <h2 id="fs-title" className="text-2xl font-extrabold text-secondary-900">Return to full screen</h2>
            <p className="text-sm text-secondary-600 mt-2 leading-relaxed">
              Leaving full screen was recorded as a violation. Your timer is still running. Go back to full screen to continue.
            </p>
            <p className="mt-4 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
              {maxAllowedTabSwitches ? `Too many violations submit your exam automatically (${tabSwitchCount} of ${maxAllowedTabSwitches} used).` : `Fullscreen exits are recorded in the proctor audit (${tabSwitchCount} recorded).`}
            </p>
            <button
              type="button"
              onClick={requestFullscreenAgain}
              className="mt-6 w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition flex items-center justify-center gap-2"
            >
              <Maximize className="w-5 h-5" aria-hidden="true" /> Return to full screen
            </button>
          </div>
        </div>
      )}

      {/* Auto-submitted */}
      {backendTerminated && (
        <Modal labelledBy="terminated-title" z="z-[100]">
          <div className="select-text bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl border border-secondary-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h2 id="terminated-title" className="text-xl font-extrabold text-secondary-900">Your exam was submitted automatically</h2>
            <div className="mt-4 bg-secondary-50 p-4 rounded-xl border border-secondary-200 text-left">
              <p className="text-xs font-semibold text-secondary-500 mb-1">Reason</p>
              <p className="text-sm font-medium text-secondary-800 leading-relaxed">
                {terminationReason || 'Your exam was automatically submitted by the system.'}
              </p>
            </div>
            <p className="text-xs text-secondary-500 mt-4">Camera, microphone and timers have been stopped.</p>
            <button
              type="button"
              onClick={() => navigate(`/candidate/result/${enrollmentId}`)}
              className="mt-5 w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition flex items-center justify-center gap-2"
            >
              View results <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </Modal>
      )}

      {/* Instructions */}
      {showInstructionsModal && (
        <Modal labelledBy="instructions-title" onBackdrop={() => setShowInstructionsModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-secondary-200">
            <div className="flex items-center justify-between pb-3 border-b border-secondary-100">
              <h2 id="instructions-title" className="flex items-center gap-2 text-lg font-bold text-secondary-900">
                <Info className="w-5 h-5 text-brand-600" aria-hidden="true" /> Exam rules
              </h2>
              <button type="button" onClick={() => setShowInstructionsModal(false)} className="p-1.5 rounded-lg text-secondary-500 hover:bg-secondary-100" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-secondary-700 leading-relaxed list-disc pl-5">
              {maxAllowedTabSwitches ? (
                <li><strong>Stay in full screen.</strong> Leaving full screen or switching tabs counts as a violation. After <strong>{maxAllowedTabSwitches}</strong> violations, the next one submits your exam automatically.</li>
              ) : (
                <li><strong>Stay in full screen.</strong> Leaving full screen or switching tabs is monitored and recorded in the proctoring audit log.</li>
              )}
              <li><strong>Camera and microphone</strong> stay on. Keep your face in view and your surroundings quiet.</li>
              <li><strong>Answers save automatically.</strong> Use “Mark for review” to come back to a question later.</li>
              <li><strong>When time runs out</strong>, your answers are submitted automatically.</li>
              <li><strong>Coding questions:</strong> use “Run” to test with sample or custom input, then “Submit solution” when you're done.</li>
              <li>Feedback on your performance appears on the results page after you submit.</li>
            </ul>
            <button type="button" onClick={() => setShowInstructionsModal(false)} className="mt-6 w-full py-2.5 rounded-xl bg-secondary-900 hover:bg-secondary-800 text-white text-sm font-bold transition">
              Back to exam
            </button>
          </div>
        </Modal>
      )}

      {/* Leave warning */}
      {showLeaveWarning && (
        <Modal labelledBy="leave-title">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-secondary-200">
            <AlertTriangle className="w-9 h-9 text-amber-500 mx-auto mb-2" aria-hidden="true" />
            <h2 id="leave-title" className="text-lg font-bold text-secondary-900">Don't leave the exam</h2>
            <p className="text-sm text-secondary-600 mt-1.5">Using the browser's back button interrupts your proctored session.</p>
            <button type="button" onClick={() => setShowLeaveWarning(false)} className="mt-5 w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition">
              Continue exam
            </button>
          </div>
        </Modal>
      )}

      {/* Submit confirmation */}
      {showSubmitModal && (
        <Modal labelledBy="submit-title" onBackdrop={() => { if (!isSubmitting) setShowSubmitModal(false); }}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-secondary-200">
            <h2 id="submit-title" className="text-xl font-extrabold text-secondary-900">Submit your exam?</h2>
            <p className="text-sm text-secondary-600 mt-1">You can't change your answers after submitting.</p>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Answered', value: answeredTotal, cls: 'text-emerald-700 bg-emerald-50' },
                { label: 'Not answered', value: unansweredList.length, cls: 'text-rose-700 bg-rose-50' },
                { label: 'Marked', value: flaggedQuestions.size, cls: 'text-amber-800 bg-amber-50' },
              ].map((c) => (
                <div key={c.label} className={`rounded-xl py-3 ${c.cls}`}>
                  <p className="text-2xl font-black tabular-nums">{c.value}</p>
                  <p className="text-xs font-semibold">{c.label}</p>
                </div>
              ))}
            </div>

            {unansweredList.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                  {unansweredList.length} question{unansweredList.length > 1 ? 's' : ''} still unanswered. Tap a number to go there.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {unansweredList.map(({ i, q }) => {
                    const unstarted = isUnstarted(q, i);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={unstarted}
                        onClick={() => {
                          if (!unstarted) {
                            setShowSubmitModal(false);
                            setCurrentIndex(i);
                          }
                        }}
                        title={unstarted ? 'This question opens when you reach it' : undefined}
                        className={`min-w-[2rem] h-8 px-2 rounded-lg border text-xs font-bold transition ${
                          unstarted
                            ? 'bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed opacity-60'
                            : 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100'
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-secondary-300 text-secondary-800 hover:bg-secondary-50 text-sm font-semibold transition"
              >
                Back to exam
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white text-sm font-bold transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Submitting…</>) : (<>Submit exam <CheckCircle2 className="w-4 h-4" aria-hidden="true" /></>)}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Entry: picks the right screen                                        */
/* ------------------------------------------------------------------ */
const ExamScreen = (props) => {
  const { deviceRestriction, permissionState, modelsLoading, isLoading, error, examData, questionsList, backendTerminated } = props;

  if (deviceRestriction && !deviceRestriction.allowed) return <DeviceGate deviceRestriction={deviceRestriction} navigate={props.navigate} />;
  if (backendTerminated) {
    return (
      <Modal labelledBy="terminated-title" z="z-[100]">
        <div className="select-text bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl border border-secondary-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 id="terminated-title" className="text-xl font-extrabold text-secondary-900">Your exam was submitted automatically</h2>
          <div className="mt-4 bg-secondary-50 p-4 rounded-xl border border-secondary-200 text-left">
            <p className="text-xs font-semibold text-secondary-500 mb-1">Reason</p>
            <p className="text-sm font-medium text-secondary-800 leading-relaxed">
              {props.terminationReason || 'Your exam was automatically submitted by the system.'}
            </p>
          </div>
          <p className="text-xs text-secondary-500 mt-4">Camera, microphone and timers have been stopped.</p>
          <button
            type="button"
            onClick={() => props.navigate(`/candidate/result/${props.enrollmentId}`)}
            className="mt-5 w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition flex items-center justify-center gap-2"
          >
            View results <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </Modal>
    );
  }
  if (permissionState === 'DENIED') return <PermissionGate navigate={props.navigate} requestMediaPermissions={props.requestMediaPermissions} />;
  if (permissionState === 'GRANTED' && (modelsLoading || props.modelLoadError)) {
    return (
      <ModelsGate
        hiddenVideoRef={props.hiddenVideoRef}
        modelLoadStep={props.modelLoadStep}
        modelLoadError={props.modelLoadError}
        onRetry={props.retryLoadModels}
        navigate={props.navigate}
        onBack={props.handleModelErrorBack}
      />
    );
  }
  if (permissionState === 'CHECKING' || isLoading) return <LoadingGate />;
  if ((error || !examData || questionsList.length === 0) && !backendTerminated) return <ErrorGate error={error} navigate={props.navigate} />;
  return <ExamWorkspace {...props} />;
};

export default ExamScreen;
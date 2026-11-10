// Place at: src/pages/CreateExam.jsx  (helpers live in src/utils/examForm.js)
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Code2, ShieldAlert, AlertTriangle, CheckCircle, Info,
  Camera, Mic, Monitor, UserCheck, Eye, Volume2, Smartphone, Copy,
  Scissors, Clipboard, MousePointer, Keyboard, Layers,
} from 'lucide-react';
import useModalScrollLock from '../hooks/useModalScrollLock';
import useModalAccessibility from '../hooks/useModalAccessibility';
import { createExam, getExamById, updateExam } from '../services/examService';
import { useToast } from '../contexts/ToastContext';
import {
  tomorrowISODate, toLocalISODate, parseScheduledStart, buildScheduledStart, scheduleToDate,
  isFutureSchedule, addMinutes, formatDateTime, formatTimeOnly, formatMinutes,
  questionCounts, maxMarks, timeEstimate, crossFieldIssues, advisoryWarnings,
  PROCTORING_FLAGS, PROCTORING_PRESETS, matchPreset, countProctoringChecks,
} from '../utils/examForm';

/* ------------------------------------------------------------------ */
/* Validation (single fields). Cross-field rules live in utils/examForm */
/* ------------------------------------------------------------------ */
const emptyToNull = (value, original) =>
  original === '' || original === null || original === undefined ? null : value;

const whole = (min = 0) =>
  yup.number().typeError('Enter a number').integer('Whole numbers only').min(min, `Must be at least ${min}`).required('Required');

const schema = yup.object().shape({
  title: yup.string().trim().required('Title is required'),
  subject: yup.string().trim().required('Subject is required'),
  passingPercentage: yup.number().typeError('Enter a number').min(0, 'Min 0').max(100, 'Max 100').required('Passing percentage is required'),
  scheduledDate: yup.string().required('Pick a date'),
  scheduledTime: yup.string().matches(/^([01]\d|2[0-3]):[0-5]\d$/, 'Pick a valid time').required('Pick a time'),
  gracePeriodMinutes: whole(0),
  timerType: yup.string().oneOf(['WHOLE_EXAM', 'PER_QUESTION']).required(),
  durationMinutes: yup.number().typeError('Enter a number').when('timerType', {
    is: 'WHOLE_EXAM',
    then: (s) => s.integer('Whole numbers only').min(1, 'Must be at least 1').required('Duration is required'),
    otherwise: (s) => s.notRequired().nullable(),
  }),
  deviceAccess: yup.string().oneOf(['MOBILE', 'DESKTOP', 'BOTH']).required(),

  totalQuestions: whole(1),
  easyPercent: whole(0).max(100, 'Max 100'),
  mediumPercent: whole(0).max(100, 'Max 100'),
  hardPercent: whole(0).max(100, 'Max 100'),
  negativeMark: yup.boolean(),
  easyMark: yup.number().typeError('Required').min(0).required('Required'),
  mediumMark: yup.number().typeError('Required').min(0).required('Required'),
  hardMark: yup.number().typeError('Required').min(0).required('Required'),
  easyNegative: yup.number().typeError('Required').min(0).required('Required'),
  mediumNegative: yup.number().typeError('Required').min(0).required('Required'),
  hardNegative: yup.number().typeError('Required').min(0).required('Required'),
  easySeconds: whole(1),
  mediumSeconds: whole(1),
  hardSeconds: whole(1),

  hasCodingSection: yup.boolean(),
  codingDurationMinutes: yup.number().typeError('Enter a number').when('hasCodingSection', {
    is: true,
    then: (s) => s.integer('Whole numbers only').min(1, 'Must be at least 1').required('Coding duration is required'),
    otherwise: (s) => s.notRequired().nullable(),
  }),
  codingQuestionsCount: yup.number().typeError('Enter a number').when('hasCodingSection', {
    is: true,
    then: (s) => s.integer('Whole numbers only').min(1, 'Must be at least 1').required('Required'),
    otherwise: (s) => s.notRequired().nullable(),
  }),

  maxTabSwitches: yup.number().transform(emptyToNull).nullable().typeError('Enter a number').integer('Whole numbers only').min(1, 'Must be at least 1'),
});

/* ------------------------------------------------------------------ */
/* Static content                                                       */
/* ------------------------------------------------------------------ */
const STEPS = [
  { label: 'Basics', fields: ['title', 'subject', 'passingPercentage', 'scheduledDate', 'scheduledTime', 'gracePeriodMinutes', 'timerType', 'durationMinutes', 'deviceAccess'] },
  { label: 'Marking', fields: ['totalQuestions', 'easyPercent', 'mediumPercent', 'hardPercent', 'negativeMark', 'easyMark', 'mediumMark', 'hardMark', 'easyNegative', 'mediumNegative', 'hardNegative', 'easySeconds', 'mediumSeconds', 'hardSeconds'] },
  { label: 'Coding', fields: ['hasCodingSection', 'codingDurationMinutes', 'codingQuestionsCount'] },
  { label: 'Proctoring', fields: ['maxTabSwitches'] },
];
const LAST_STEP = STEPS.length - 1;

const DIFFICULTIES = [
  { key: 'easy', label: 'Easy', dot: 'bg-emerald-500', bar: 'bg-emerald-500', pct: 'easyPercent', mark: 'easyMark', neg: 'easyNegative', sec: 'easySeconds' },
  { key: 'medium', label: 'Medium', dot: 'bg-amber-500', bar: 'bg-amber-500', pct: 'mediumPercent', mark: 'mediumMark', neg: 'mediumNegative', sec: 'mediumSeconds' },
  { key: 'hard', label: 'Hard', dot: 'bg-rose-500', bar: 'bg-rose-500', pct: 'hardPercent', mark: 'hardMark', neg: 'hardNegative', sec: 'hardSeconds' },
];

const PROCTOR_TOGGLES = {
  requirements: [
    { name: 'requireCamera', icon: Camera, label: 'Require camera', hint: 'Candidates must allow their webcam.' },
    { name: 'requireMic', icon: Mic, label: 'Require microphone', hint: 'Candidates must allow their microphone.' },
  ],
  checks: [
    { name: 'enableFaceDetection', icon: UserCheck, label: 'Face detection (AI)', hint: 'Flags a missing face, looking away or several faces.' },
    { name: 'enableObjectDetection', icon: Smartphone, label: 'Object detection (AI)', hint: 'Flags phones, books and similar objects.' },
    { name: 'enableAudioDetection', icon: Volume2, label: 'Audio detection', hint: 'Flags loud sounds or talking.' },
    { name: 'enableTabSwitchDetection', icon: Eye, label: 'Tab switch detection', hint: 'Records when the candidate leaves the exam tab.' },
  ],
};

// Proctoring explanations & detection boundaries (kept from the original page)
const PROCTORING_INFO = {
  requireCamera: {
    permission: 'Webcam Permission',
    experience: 'Pre-exam camera check and active webcam preview indicator during test.',
    consequence: 'Candidate cannot begin or proceed without active camera permissions.',
    evidence: 'Camera stream active throughout test; periodic snapshot frames uploaded to candidate audit timeline.',
    boundaries: 'Verifies webcam feed availability; does not perform identity proofing or facial biometrics.',
  },
  requireMic: {
    permission: 'Microphone Permission',
    experience: 'Pre-exam microphone test; background sound monitoring during test.',
    consequence: 'Candidate cannot start test without granting microphone access.',
    evidence: 'Audio intensity events and short acoustic violation snippets saved upon anomaly.',
    boundaries: 'Measures volume spikes and acoustic thresholds; cannot transcribe whispers or isolate individual voices.',
  },
  enableFaceDetection: {
    permission: 'Webcam Stream (On-Device)',
    experience: 'Client-side AI model monitors face presence in camera frame.',
    consequence: 'Visual alert appears if face is missing, candidate looks away, or multiple faces appear.',
    evidence: 'Timestamped violation events and snapshot photos logged to host proctoring report.',
    boundaries: 'Checks presence and head orientation; DOES NOT perform legal identity verification or photo matching.',
  },
  enableObjectDetection: {
    permission: 'Webcam Stream (On-Device)',
    experience: 'On-device vision model continuously inspects camera frame for prohibited objects.',
    consequence: 'Candidate receives immediate on-screen warning when unauthorized devices are spotted.',
    evidence: 'Timestamped object detection events and captured frames recorded in candidate audit trail.',
    boundaries: 'Detects standard object categories (e.g., phones, books); accuracy depends on ambient lighting and camera angle.',
  },
  enableAudioDetection: {
    permission: 'Microphone Stream',
    experience: 'Continuous ambient decibel monitoring with automatic noise thresholds.',
    consequence: 'Suspicious noise anomalies raise violation flags and increment candidate risk score.',
    evidence: 'Telemetry logs with acoustic spike timestamps available in host dashboard.',
    boundaries: 'Measures sound volume thresholds; cannot distinguish background appliance noise from conversation.',
  },
  enableTabSwitchDetection: {
    permission: 'Page Visibility & Window Blur APIs',
    experience: 'Full-screen window monitoring; instant warning dialog when candidate navigates away.',
    consequence: 'Increments tab switch counter and triggers auto-submit if threshold is reached.',
    evidence: 'Duration away, timestamp, and return time logged in candidate proctoring timeline.',
    boundaries: 'Monitors browser window focus and visibility; cannot detect physical external secondary devices.',
  },
};

const DEFAULT_VALUES = {
  title: '',
  subject: '',
  passingPercentage: 50,
  scheduledDate: tomorrowISODate(),
  scheduledTime: '10:00',
  gracePeriodMinutes: 10,
  timerType: 'WHOLE_EXAM',
  durationMinutes: 90,
  deviceAccess: 'BOTH',
  totalQuestions: 30,
  easyPercent: 40,
  mediumPercent: 40,
  hardPercent: 20,
  negativeMark: false,
  easyMark: 1,
  mediumMark: 2,
  hardMark: 3,
  easyNegative: 0.25,
  mediumNegative: 0.5,
  hardNegative: 1,
  easySeconds: 30,
  mediumSeconds: 60,
  hardSeconds: 90,
  hasCodingSection: false,
  codingDurationMinutes: 45,
  codingQuestionsCount: 2,
  requireCamera: false,
  requireMic: false,
  enableFaceDetection: false,
  enableObjectDetection: false,
  enableAudioDetection: false,
  enableTabSwitchDetection: false,
  maxTabSwitches: null,
  enableScreenCaptureProtection: false,
  enableBrowserActivityDetection: false,
  enableExamWatermark: false,
  disableCopy: false,
  disablePaste: false,
  disableCut: false,
  disableRightClick: false,
  restrictBrowserShortcuts: false,
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                          */
/* ------------------------------------------------------------------ */
const inputCls = (hasError) =>
  `w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-2 transition ${
    hasError ? 'border-red-400 focus:ring-red-300' : 'border-secondary-300 focus:ring-brand-500 focus:border-brand-500'
  }`;

const Field = ({ id, label, hint, error, children, className = '' }) => (
  <div className={className}>
    {label && (
      <label htmlFor={id} className="block text-sm font-semibold text-secondary-800 mb-1.5">{label}</label>
    )}
    {children}
    {error ? (
      <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
    ) : hint ? (
      <p className="mt-1.5 text-xs text-secondary-500">{hint}</p>
    ) : null}
  </div>
);

const Section = ({ title, description, children }) => (
  <section className="bg-white rounded-2xl border border-secondary-200 shadow-sm p-5 sm:p-6">
    <div className="mb-5">
      <h2 className="text-lg font-bold text-secondary-900">{title}</h2>
      {description && <p className="text-sm text-secondary-500 mt-0.5">{description}</p>}
    </div>
    {children}
  </section>
);

const Segmented = ({ label, value, onChange, options }) => (
  <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
    {options.map((o) => {
      const active = value === o.value;
      return (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(o.value)}
          className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition text-left ${
            active
              ? 'border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-500'
              : 'border-secondary-300 bg-white text-secondary-700 hover:border-brand-300'
          }`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

const Toggle = ({ register, name, label, description, icon: Icon, onChange }) => {
  const reg = register(name);
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <span className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          {...reg}
          onChange={(e) => {
            reg.onChange(e);
            if (onChange) onChange(e);
          }}
        />
        <span className="block w-11 h-6 rounded-full bg-secondary-300 transition-colors peer-checked:bg-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-secondary-900">
          {Icon && <Icon className="w-4 h-4 text-secondary-500 shrink-0" aria-hidden="true" />}
          {label}
        </span>
        {description && <span className="block text-xs text-secondary-500 mt-0.5">{description}</span>}
      </span>
    </label>
  );
};

const SummaryRow = ({ label, children }) => (
  <div className="py-2.5">
    <dt className="text-xs font-semibold text-secondary-500">{label}</dt>
    <dd className="text-sm font-medium text-secondary-900 mt-0.5">{children}</dd>
  </div>
);

const SummaryPanel = ({ s }) => (
  <div>
    <dl className="divide-y divide-secondary-100">
      <SummaryRow label="Starts">{s.start ? formatDateTime(s.start) : 'Pick a date and time'}</SummaryRow>
      <SummaryRow label="Candidates can join">
        {s.start ? `${formatTimeOnly(s.start)} to ${formatTimeOnly(s.joinEnd)}` : '—'}
      </SummaryRow>
      <SummaryRow label="Time per candidate">
        {s.time.totalMinutes > 0 ? formatMinutes(s.time.totalMinutes) : '—'}
        {s.time.perQuestion && s.time.totalMinutes > 0 && (
          <span className="block text-xs font-normal text-secondary-500">
            {formatMinutes(s.time.mcqMinutes)} questions
            {s.time.codingMinutes ? ` + ${formatMinutes(s.time.codingMinutes)} coding` : ''} + 1 min buffer
          </span>
        )}
        {!s.time.perQuestion && s.hasCoding && (
          <span className="block text-xs font-normal text-secondary-500">Includes the coding round</span>
        )}
      </SummaryRow>
      <SummaryRow label="Questions">
        {s.sumOk ? (
          <>
            {s.counts.total} total
            <span className="block text-xs font-normal text-secondary-500">
              {s.counts.easy} easy, {s.counts.medium} medium, {s.counts.hard} hard
              {s.hasCoding ? `, plus ${s.codingCount} coding` : ''}
            </span>
          </>
        ) : (
          '—'
        )}
      </SummaryRow>
      <SummaryRow label="Maximum marks">
        {s.sumOk ? s.totalMarks.toFixed(1) : '—'}
        {s.sumOk && (
          <span className="block text-xs font-normal text-secondary-500">
            Pass at {s.passingPct}% = {s.passMarks.toFixed(1)} marks
          </span>
        )}
      </SummaryRow>
      <SummaryRow label="Proctoring">
        {s.proctorCount === 0 ? 'Off' : `${s.proctorCount} check${s.proctorCount > 1 ? 's' : ''} on`}
        <span className="block text-xs font-normal text-secondary-500">
          {s.preset === 'CUSTOM' ? 'Custom setup' : `${PROCTORING_PRESETS[s.preset]?.label || s.preset} preset`}
        </span>
      </SummaryRow>
    </dl>

    {s.problems.length > 0 && (
      <ul className="mt-3 space-y-2" aria-label="Things to fix">
        {s.problems.map((p) => (
          <li key={p} className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-red-600" aria-hidden="true" /> <span>{p}</span>
          </li>
        ))}
      </ul>
    )}
    {s.warnings.length > 0 && (
      <ul className="mt-3 space-y-2" aria-label="Suggestions">
        {s.warnings.map((w) => (
          <li key={w} className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900">
            <Info className="w-4 h-4 shrink-0 mt-px text-amber-600" aria-hidden="true" /> <span>{w}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
const CreateExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditMode);
  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [successModal, setSuccessModal] = useState(null); // { joinCode, examId }
  const [copied, setCopied] = useState(false);

  const {
    register, handleSubmit, watch, setValue, reset, trigger, getValues,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: DEFAULT_VALUES,
  });

  const values = watch();
  const {
    timerType,
    negativeMark: negativeMarkEnabled,
    hasCodingSection,
    enableTabSwitchDetection,
    enableScreenCaptureProtection,
  } = values;

  /* ---------- success dialog ---------- */
  const goToQuestions = () => {
    if (!successModal) return;
    localStorage.setItem('currentExamId', successModal.examId);
    navigate(`/host/exams/${successModal.examId}/questions`);
  };
  // NOTE: confirm this route matches your router (the old page never linked to the exam list).
  const EXAMS_LIST_PATH = '/host/my-exams';
  const goToExams = () => navigate(EXAMS_LIST_PATH);

  useModalScrollLock(Boolean(successModal));
  const successModalRef = useModalAccessibility({ isOpen: Boolean(successModal), onClose: goToQuestions });

  const copyJoinCode = async () => {
    try {
      await navigator.clipboard.writeText(successModal.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      showToast('Could not copy automatically. Select the code and copy it.', 'error');
    }
  };

  /* ---------- load exam in edit mode ---------- */
  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      try {
        const { data } = await getExamById(id);
        if (data.status && data.status !== 'DRAFT') {
          showToast('Only draft exams can be edited.', 'error');
          navigate(`/host/exams/${id}/manage`);
          return;
        }
        const { date, time } = parseScheduledStart(data.scheduledStart);
        const d = DEFAULT_VALUES;
        reset({
          title: data.title ?? '',
          subject: data.subject ?? '',
          passingPercentage: data.passingPercentage ?? d.passingPercentage,
          scheduledDate: date,
          scheduledTime: time,
          gracePeriodMinutes: data.gracePeriodMinutes ?? d.gracePeriodMinutes,
          timerType: data.timerType || d.timerType,
          durationMinutes: data.durationMinutes ?? d.durationMinutes,
          deviceAccess: data.deviceAccess || d.deviceAccess,
          totalQuestions: data.totalQuestions ?? d.totalQuestions,
          easyPercent: data.easyPercent ?? d.easyPercent,
          mediumPercent: data.mediumPercent ?? d.mediumPercent,
          hardPercent: data.hardPercent ?? d.hardPercent,
          negativeMark: Boolean(data.negativeMark),
          easyMark: data.easyMark ?? d.easyMark,
          mediumMark: data.mediumMark ?? d.mediumMark,
          hardMark: data.hardMark ?? d.hardMark,
          easyNegative: data.easyNegative ?? d.easyNegative,
          mediumNegative: data.mediumNegative ?? d.mediumNegative,
          hardNegative: data.hardNegative ?? d.hardNegative,
          easySeconds: data.easySeconds ?? d.easySeconds,
          mediumSeconds: data.mediumSeconds ?? d.mediumSeconds,
          hardSeconds: data.hardSeconds ?? d.hardSeconds,
          hasCodingSection: Boolean(data.hasCodingSection),
          codingDurationMinutes: data.codingDurationMinutes ?? d.codingDurationMinutes,
          codingQuestionsCount: data.codingQuestionsCount ?? d.codingQuestionsCount,
          requireCamera: Boolean(data.requireCamera),
          requireMic: Boolean(data.requireMic),
          enableFaceDetection: Boolean(data.enableFaceDetection),
          enableObjectDetection: Boolean(data.enableObjectDetection),
          enableAudioDetection: Boolean(data.enableAudioDetection),
          enableTabSwitchDetection: Boolean(data.enableTabSwitchDetection),
          maxTabSwitches: data.maxTabSwitches ?? null,
          enableScreenCaptureProtection: Boolean(data.enableScreenCaptureProtection),
          enableBrowserActivityDetection: data.enableBrowserActivityDetection ?? d.enableBrowserActivityDetection,
          enableExamWatermark: Boolean(data.enableExamWatermark),
          disableCopy: Boolean(data.disableCopy),
          disablePaste: Boolean(data.disablePaste),
          disableCut: Boolean(data.disableCut),
          disableRightClick: Boolean(data.disableRightClick),
          restrictBrowserShortcuts: Boolean(data.restrictBrowserShortcuts),
        });
        setMaxStepReached(LAST_STEP); // every step is open when editing
      } catch (error) {
        showToast(error.response?.data?.message || error.message || 'Failed to fetch exam details', 'error');
      } finally {
        setIsFetching(false);
      }
    })();
  }, [id, isEditMode, reset, showToast, navigate]);

  /* ---------- derived values for the summary ---------- */
  const counts = questionCounts(values.totalQuestions, values.easyPercent, values.mediumPercent);
  const pctSum = num(values.easyPercent) + num(values.mediumPercent) + num(values.hardPercent);
  const sumOk = pctSum === 100;
  const totalMarks = maxMarks(counts, { easy: values.easyMark, medium: values.mediumMark, hard: values.hardMark });
  const start = scheduleToDate(values.scheduledDate, values.scheduledTime);
  const joinEnd = start ? addMinutes(start, num(values.gracePeriodMinutes)) : null;
  const scheduleInPast = Boolean(start) && !isFutureSchedule(values.scheduledDate, values.scheduledTime);
  const time = timeEstimate({
    timerType,
    durationMinutes: values.durationMinutes,
    counts,
    seconds: { easy: values.easySeconds, medium: values.mediumSeconds, hard: values.hardSeconds },
    hasCodingSection,
    codingDurationMinutes: values.codingDurationMinutes,
  });
  const issues = crossFieldIssues(values);
  const summary = {
    start, joinEnd, time, counts, sumOk, totalMarks,
    passingPct: num(values.passingPercentage),
    passMarks: (totalMarks * num(values.passingPercentage)) / 100,
    hasCoding: Boolean(hasCodingSection),
    codingCount: num(values.codingQuestionsCount),
    proctorCount: countProctoringChecks(values),
    preset: matchPreset(values),
    problems: issues.map((i) => i.message),
    warnings: advisoryWarnings(values),
  };

  /* ---------- navigation ---------- */
  const scrollToTop = () => {
    const el = document.getElementById('app-scroll-container');
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = async () => {
    const valid = await trigger(STEPS[step].fields);
    if (!valid) {
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }
    const stepIssues = crossFieldIssues(getValues()).filter((i) => i.step === step);
    if (stepIssues.length) {
      showToast(stepIssues[0].message, 'error');
      return;
    }
    const next = Math.min(step + 1, LAST_STEP);
    setStep(next);
    setMaxStepReached((m) => Math.max(m, next));
    scrollToTop();
  };
  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    scrollToTop();
  };
  const goToStep = (i) => {
    if (i <= maxStepReached) {
      setStep(i);
      scrollToTop();
    }
  };

  /* ---------- submit ---------- */
  const onInvalid = (errs) => {
    const idx = STEPS.findIndex((s) => s.fields.some((f) => errs[f]));
    if (idx >= 0) setStep(idx);
    showToast('Some fields need attention. We took you to the first one.', 'error');
  };

  const onSubmit = async (data) => {
    const blocking = crossFieldIssues(data);
    if (blocking.length) {
      setStep(blocking[0].step);
      showToast(blocking[0].message, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const tabLimitOn = Boolean(data.enableTabSwitchDetection) && data.maxTabSwitches;
      const payload = {
        title: data.title.trim(),
        subject: data.subject.trim(),
        scheduledStart: buildScheduledStart(data.scheduledDate, data.scheduledTime),
        gracePeriodMinutes: Number(data.gracePeriodMinutes),
        timerType: data.timerType,
        durationMinutes: data.timerType === 'WHOLE_EXAM' ? Number(data.durationMinutes) : null,
        totalQuestions: Number(data.totalQuestions),
        passingPercentage: Number(data.passingPercentage),
        easyPercent: Number(data.easyPercent),
        mediumPercent: Number(data.mediumPercent),
        hardPercent: Number(data.hardPercent),
        easyMark: Number(data.easyMark),
        mediumMark: Number(data.mediumMark),
        hardMark: Number(data.hardMark),
        easyNegative: data.negativeMark ? Number(data.easyNegative) : 0,
        mediumNegative: data.negativeMark ? Number(data.mediumNegative) : 0,
        hardNegative: data.negativeMark ? Number(data.hardNegative) : 0,
        easySeconds: Number(data.easySeconds),
        mediumSeconds: Number(data.mediumSeconds),
        hardSeconds: Number(data.hardSeconds),
        negativeMark: Boolean(data.negativeMark),
        deviceAccess: data.deviceAccess,
        hasCodingSection: Boolean(data.hasCodingSection),
        codingDurationMinutes: data.hasCodingSection ? Number(data.codingDurationMinutes) : null,
        codingQuestionsCount: data.hasCodingSection ? Number(data.codingQuestionsCount) : null,
        requireCamera: Boolean(data.requireCamera || data.enableFaceDetection || data.enableObjectDetection),
        requireMic: Boolean(data.requireMic || data.enableAudioDetection),
        enableFaceDetection: Boolean(data.enableFaceDetection),
        enableObjectDetection: Boolean(data.enableObjectDetection),
        enableAudioDetection: Boolean(data.enableAudioDetection),
        enableTabSwitchDetection: Boolean(data.enableTabSwitchDetection),
        maxTabSwitches: tabLimitOn ? Number(data.maxTabSwitches) : null,
        enableScreenCaptureProtection: Boolean(data.enableScreenCaptureProtection),
        enableBrowserActivityDetection: Boolean(data.enableBrowserActivityDetection),
        enableExamWatermark: Boolean(data.enableExamWatermark),
        disableCopy: Boolean(data.disableCopy),
        disablePaste: Boolean(data.disablePaste),
        disableCut: Boolean(data.disableCut),
        disableRightClick: Boolean(data.disableRightClick),
        restrictBrowserShortcuts: Boolean(data.restrictBrowserShortcuts),
      };

      if (isEditMode) {
        await updateExam(id, payload);
        showToast('Exam updated successfully!', 'success');
        navigate(`/host/exams/${id}/manage`);
      } else {
        const response = await createExam(payload);
        // Same shape the old page used (response.data.{id,joinCode}); also tolerates one extra wrapper.
        const created = response?.data?.joinCode !== undefined ? response.data : response?.data?.data ?? response?.data;
        if (!created?.id) throw new Error('The server did not return the new exam.');
        setSuccessModal({ joinCode: created.joinCode, examId: created.id });
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || `Failed to ${isEditMode ? 'update' : 'create'} exam`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = (key) => {
    const p = PROCTORING_PRESETS[key];
    if (!p) return;
    PROCTORING_FLAGS.forEach((f) => setValue(f, Boolean(p.flags[f]), { shouldDirty: true, shouldTouch: true }));
    setValue('maxTabSwitches', p.maxTabSwitches, { shouldDirty: true, shouldValidate: true });
  };

  const remainderForHard = 100 - num(values.easyPercent) - num(values.mediumPercent);
  const setHardToRemainder = () => {
    if (remainderForHard >= 0 && remainderForHard <= 100) {
      setValue('hardPercent', remainderForHard, { shouldDirty: true, shouldValidate: true });
    }
  };

  /* ---------- render ---------- */
  if (isFetching) {
    return (
      <div className="flex justify-center items-center h-64 w-full" role="status" aria-label="Loading exam">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
      </div>
    );
  }

  // Marking table: columns adapt to the optional fields.
  const gridCols = ['110px', 'minmax(0,1fr)', '90px', 'minmax(0,1fr)'];
  if (negativeMarkEnabled) gridCols.push('minmax(0,1fr)');
  if (timerType === 'PER_QUESTION') gridCols.push('minmax(0,1fr)');
  const rowStyle = { '--cols': gridCols.join(' ') };
  const gapCls = 'gap-3 sm:gap-4 sm:[grid-template-columns:var(--cols)] sm:items-start';
  const rowCls = `grid grid-cols-2 ${gapCls}`;
  const headerCls = `hidden sm:grid ${gapCls} px-4 text-xs font-semibold text-secondary-500`;

  const cellInput = (name, extra = {}) => (
    <div>
      <input
        id={name}
        type="number"
        inputMode="decimal"
        aria-invalid={Boolean(errors[name])}
        className={inputCls(Boolean(errors[name]))}
        {...register(name)}
        {...extra}
      />
      {errors[name] && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{errors[name].message}</p>}
    </div>
  );
  const cellLabel = (text, htmlFor) => (
    <label htmlFor={htmlFor} className="sm:sr-only block text-xs font-semibold text-secondary-500 mb-1">{text}</label>
  );

  return (
    <div className="w-full pb-16">
      <header className="mb-4 sm:mb-6 flex items-start justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-secondary-900 tracking-tight break-words">
            {isEditMode ? 'Edit exam' : 'Create new exam'}
          </h1>
          <p className="text-secondary-600 mt-1 text-xs sm:text-sm md:text-base">
            {isEditMode ? 'Update your assessment details and structure.' : 'Set up the schedule, marking and monitoring. You add questions next.'}
          </p>
        </div>
        <Link
          to={isEditMode ? `/host/exams/${id}/manage` : EXAMS_LIST_PATH}
          className="shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-secondary-600 hover:text-secondary-900 rounded-lg hover:bg-secondary-100 transition min-h-[36px] inline-flex items-center"
        >
          Cancel
        </Link>
      </header>

      {/* Step indicator */}
      <nav aria-label="Progress" className="mb-4 sm:mb-6 overflow-x-auto pb-1">
        <ol className="flex items-center">
          {STEPS.map((s, i) => (
            <li key={s.label} className={`flex items-center ${i < LAST_STEP ? 'flex-1' : ''}`}>
              <button
                type="button"
                onClick={() => goToStep(i)}
                disabled={i > maxStepReached}
                aria-current={i === step ? 'step' : undefined}
                className="flex items-center gap-2.5 shrink-0 disabled:cursor-not-allowed"
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
                    i !== step && i <= maxStepReached
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : i === step
                      ? 'border-brand-500 text-brand-700 bg-brand-50'
                      : 'border-secondary-200 text-secondary-400 bg-white'
                  }`}
                >
                  {i !== step && i <= maxStepReached ? '✓' : i + 1}
                </span>
                <span className={`text-sm font-bold hidden sm:inline ${i <= maxStepReached ? 'text-secondary-900' : 'text-secondary-400'}`}>
                  {s.label}
                </span>
              </button>
              {i < LAST_STEP && <span className={`flex-1 h-0.5 mx-3 rounded ${i < maxStepReached ? 'bg-brand-500' : 'bg-secondary-200'}`} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </nav>

      {/* Summary on phones/tablets */}
      <details className="lg:hidden mb-6 bg-white rounded-2xl border border-secondary-200 shadow-sm">
        <summary className="cursor-pointer select-none px-5 py-3.5 font-bold text-secondary-900 flex items-center justify-between">
          <span>Exam summary</span>
          {summary.problems.length + summary.warnings.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
              {summary.problems.length + summary.warnings.length} to check
            </span>
          )}
        </summary>
        <div className="px-5 pb-4"><SummaryPanel s={summary} /></div>
      </details>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step === LAST_STEP) handleSubmit(onSubmit, onInvalid)();
            else goNext();
          }}
          className="space-y-6 min-w-0"
        >
          {/* ---------------- Step 1: Basics ---------------- */}
          {step === 0 && (
            <>
              <Section title="Exam details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field id="title" label="Exam title" error={errors.title?.message}>
                    <input id="title" type="text" placeholder="e.g. Java Basics Quiz" className={inputCls(Boolean(errors.title))} {...register('title')} />
                  </Field>
                  <Field id="subject" label="Subject" error={errors.subject?.message}>
                    <input id="subject" type="text" placeholder="e.g. Java Programming" className={inputCls(Boolean(errors.subject))} {...register('subject')} />
                  </Field>
                  <Field id="passingPercentage" label="Passing percentage (%)" error={errors.passingPercentage?.message}>
                    <input id="passingPercentage" type="number" inputMode="decimal" step="0.1" min="0" max="100" className={inputCls(Boolean(errors.passingPercentage))} {...register('passingPercentage')} />
                  </Field>
                </div>
              </Section>

              <Section title="Schedule" description="Candidates can join from the start time until the grace period ends.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field id="scheduledDate" label="Start date" error={errors.scheduledDate?.message || (scheduleInPast ? 'Start time must be in the future.' : '')}>
                    <input id="scheduledDate" type="date" min={toLocalISODate()} className={inputCls(Boolean(errors.scheduledDate) || scheduleInPast)} {...register('scheduledDate')} />
                  </Field>
                  <Field id="scheduledTime" label="Start time" error={errors.scheduledTime?.message}>
                    <input id="scheduledTime" type="time" className={inputCls(Boolean(errors.scheduledTime))} {...register('scheduledTime')} />
                  </Field>
                  <Field
                    id="gracePeriodMinutes"
                    label="Grace period (minutes)"
                    error={errors.gracePeriodMinutes?.message}
                    hint={joinEnd ? `Joining closes at ${formatTimeOnly(joinEnd)}.` : 'How long after the start candidates may still join.'}
                  >
                    <input id="gracePeriodMinutes" type="number" inputMode="numeric" min="0" className={inputCls(Boolean(errors.gracePeriodMinutes))} {...register('gracePeriodMinutes')} />
                  </Field>
                </div>
              </Section>

              <Section title="Timer and devices">
                <div className="space-y-5">
                  <Field label="Timer">
                    <Segmented
                      label="Timer type"
                      value={timerType}
                      onChange={(v) => setValue('timerType', v, { shouldDirty: true, shouldValidate: true })}
                      options={[
                        { value: 'WHOLE_EXAM', label: 'One timer for the whole exam' },
                        { value: 'PER_QUESTION', label: 'A timer for each question' },
                      ]}
                    />
                  </Field>
                  {timerType === 'WHOLE_EXAM' ? (
                    <Field id="durationMinutes" label="Duration (minutes)" error={errors.durationMinutes?.message} className="max-w-xs">
                      <input id="durationMinutes" type="number" inputMode="numeric" min="1" className={inputCls(Boolean(errors.durationMinutes))} {...register('durationMinutes')} />
                    </Field>
                  ) : (
                    <p className="text-sm text-secondary-600 bg-secondary-50 border border-secondary-200 rounded-xl p-3">
                      Each candidate's total time is the sum of the seconds you set per question on the next step.
                    </p>
                  )}
                  <Field label="Devices allowed">
                    <Segmented
                      label="Device access"
                      value={values.deviceAccess}
                      onChange={(v) => setValue('deviceAccess', v, { shouldDirty: true, shouldValidate: true })}
                      options={[
                        { value: 'BOTH', label: 'Desktop and mobile' },
                        { value: 'DESKTOP', label: 'Desktop only' },
                        { value: 'MOBILE', label: 'Mobile only' },
                      ]}
                    />
                  </Field>
                </div>
              </Section>
            </>
          )}

          {/* ---------------- Step 2: Marking ---------------- */}
          {step === 1 && (
            <Section title="Questions and marking" description="Set how many questions, how they split by difficulty, and how each is marked.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                <Field id="totalQuestions" label="Total questions" error={errors.totalQuestions?.message}>
                  <input id="totalQuestions" type="number" inputMode="numeric" min="1" className={inputCls(Boolean(errors.totalQuestions))} {...register('totalQuestions')} />
                </Field>
                <div className="sm:pt-7">
                  <Toggle register={register} name="negativeMark" label="Negative marking" description="Deduct marks for wrong answers." />
                </div>
              </div>

              {/* difficulty share bar */}
              <div className="mb-2">
                <div
                  className={`h-3 w-full rounded-full overflow-hidden flex bg-secondary-100 border ${sumOk ? 'border-emerald-300' : 'border-red-300'}`}
                  role="img"
                  aria-label={`Difficulty shares add up to ${pctSum} percent`}
                >
                  {DIFFICULTIES.map((d) => {
                    const w = Math.min(100, Math.max(0, num(values[d.pct])));
                    return w > 0 ? <div key={d.key} style={{ width: `${w}%` }} className={`${d.bar} h-full transition-all`} /> : null;
                  })}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className={`font-bold ${sumOk ? 'text-emerald-700' : 'text-red-600'}`}>
                    {sumOk ? (
                      <span className="inline-flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> Total 100%</span>
                    ) : (
                      `Total ${pctSum}%. It must be 100%.`
                    )}
                  </span>
                  {!sumOk && remainderForHard >= 0 && remainderForHard <= 100 && (
                    <button type="button" onClick={setHardToRemainder} className="px-3 py-1.5 rounded-lg border border-brand-300 bg-brand-50 text-brand-800 font-semibold hover:bg-brand-100">
                      Set Hard to {remainderForHard}%
                    </button>
                  )}
                </div>
              </div>

              {/* difficulty table */}
              <div className="mt-5 space-y-3">
                <div className={headerCls} style={rowStyle} aria-hidden="true">
                  <span>Difficulty</span>
                  <span>Share %</span>
                  <span>Questions</span>
                  <span>Marks</span>
                  {negativeMarkEnabled && <span>Negative</span>}
                  {timerType === 'PER_QUESTION' && <span>Seconds</span>}
                </div>

                {DIFFICULTIES.map((d) => (
                  <div key={d.key} className={`${rowCls} rounded-xl border border-secondary-200 bg-secondary-50/50 p-4`} style={rowStyle}>
                    <div className="col-span-2 sm:col-span-1 flex items-center gap-2 font-bold text-secondary-900 sm:pt-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${d.dot}`} aria-hidden="true" /> {d.label}
                    </div>
                    <div>
                      {cellLabel('Share %', d.pct)}
                      {cellInput(d.pct, { min: 0, max: 100, step: 1 })}
                    </div>
                    <div className="sm:pt-2.5">
                      <span className="sm:hidden block text-xs font-semibold text-secondary-500 mb-1">Questions</span>
                      <span className="text-sm font-semibold text-secondary-900">{sumOk ? counts[d.key] : '—'}</span>
                    </div>
                    <div>
                      {cellLabel('Marks', d.mark)}
                      {cellInput(d.mark, { min: 0, step: 0.25 })}
                    </div>
                    {negativeMarkEnabled && (
                      <div>
                        {cellLabel('Negative marks', d.neg)}
                        {cellInput(d.neg, { min: 0, step: 0.25 })}
                      </div>
                    )}
                    {timerType === 'PER_QUESTION' && (
                      <div>
                        {cellLabel('Seconds', d.sec)}
                        {cellInput(d.sec, { min: 1, step: 1 })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ---------------- Step 3: Coding ---------------- */}
          {step === 2 && (
            <Section title="Coding round" description="Optional. Candidates solve programming problems with real test cases.">
              <Toggle register={register} name="hasCodingSection" icon={Code2} label="Include a coding round" description="Problems are picked from your exam's coding pool." />
              {hasCodingSection && (
                <div className="mt-5 pt-5 border-t border-secondary-200 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field
                    id="codingDurationMinutes"
                    label="Coding time (minutes)"
                    error={errors.codingDurationMinutes?.message}
                    hint={timerType === 'WHOLE_EXAM' ? 'Counted inside the exam duration.' : 'Added on top of the question timers.'}
                  >
                    <input id="codingDurationMinutes" type="number" inputMode="numeric" min="1" placeholder="e.g. 45" className={inputCls(Boolean(errors.codingDurationMinutes))} {...register('codingDurationMinutes')} />
                  </Field>
                  <Field id="codingQuestionsCount" label="Problems per candidate" error={errors.codingQuestionsCount?.message} hint="Chosen at random from your coding pool.">
                    <input id="codingQuestionsCount" type="number" inputMode="numeric" min="1" placeholder="e.g. 2" className={inputCls(Boolean(errors.codingQuestionsCount))} {...register('codingQuestionsCount')} />
                  </Field>
                </div>
              )}
            </Section>
          )}

          {/* ---------------- Step 4: Proctoring ---------------- */}
          {step === 3 && (
            <>
              <Section title="Proctoring" description="Pick a preset, then adjust anything you like.">
                <div role="radiogroup" aria-label="Proctoring preset" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.entries(PROCTORING_PRESETS).map(([key, p]) => {
                    const active = summary.preset === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => applyPreset(key)}
                        className={`text-left p-3.5 rounded-xl border transition ${
                          active ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-secondary-300 bg-white hover:border-brand-300'
                        }`}
                      >
                        <span className="block text-sm font-bold text-secondary-900">{p.label}</span>
                        <span className="block text-xs text-secondary-500 mt-0.5">{p.description}</span>
                      </button>
                    );
                  })}
                </div>
                {summary.preset === 'CUSTOM' && (
                  <p className="mt-3 text-xs font-semibold text-secondary-600">Custom setup: your toggles don't match a preset.</p>
                )}
              </Section>

              {[
                { title: 'What candidates must allow', items: PROCTOR_TOGGLES.requirements },
                { title: 'Automatic checks', items: PROCTOR_TOGGLES.checks },
              ].map((group) => (
                <Section key={group.title} title={group.title}>
                  <div className="divide-y divide-secondary-100">
                    {group.items.map((t) => {
                      const info = PROCTORING_INFO[t.name];
                      return (
                        <div key={t.name} className="py-3.5 first:pt-0 last:pb-0">
                          <Toggle register={register} name={t.name} icon={t.icon} label={t.label} description={t.hint} />
                          <details className="mt-2 ml-14 text-xs">
                            <summary className="cursor-pointer select-none font-semibold text-brand-700 hover:text-brand-800">What does this do?</summary>
                            <div className="mt-2 space-y-1.5 text-secondary-700 bg-secondary-50 border border-secondary-200 rounded-xl p-3">
                              <p><strong className="text-secondary-900">Permission:</strong> {info.permission}</p>
                              <p><strong className="text-secondary-900">Candidate sees:</strong> {info.experience}</p>
                              <p><strong className="text-secondary-900">If it fails:</strong> {info.consequence}</p>
                              <p><strong className="text-secondary-900">Recorded:</strong> {info.evidence}</p>
                              <p className="text-secondary-600"><strong>Limits:</strong> {info.boundaries}</p>
                            </div>
                          </details>
                        </div>
                      );
                    })}
                  </div>

                  {group.title === 'Automatic checks' && enableTabSwitchDetection && (
                    <div className="mt-5 pt-5 border-t border-secondary-200 max-w-sm">
                      <Field
                        id="maxTabSwitches"
                        label="Auto-submit after this many tab switches"
                        error={errors.maxTabSwitches?.message}
                        hint="Leave empty to only record tab switches."
                      >
                        <input id="maxTabSwitches" type="number" inputMode="numeric" min="1" placeholder="e.g. 3" className={inputCls(Boolean(errors.maxTabSwitches))} {...register('maxTabSwitches')} />
                      </Field>
                    </div>
                  )}
                </Section>
              ))}

              {/* Screen Capture Protection (Best Effort) */}
              <Section
                title="Screen Capture Protection (Best Effort)"
                description="Enables browser-level detection of certain suspicious activities and optional exam watermarking. This provides deterrence and does not guarantee prevention of screenshots, screen recording, or external screen sharing."
              >
                <div className="space-y-4">
                  <Toggle
                    register={register}
                    name="enableScreenCaptureProtection"
                    icon={Monitor}
                    label="Screen capture protection"
                    description="Enable browser activity detection and optional dynamic watermark."
                    onChange={(e) => {
                      if (e.target.checked && !getValues('enableBrowserActivityDetection')) {
                        setValue('enableBrowserActivityDetection', true, { shouldDirty: true });
                      }
                    }}
                  />

                  {enableScreenCaptureProtection && (
                    <div className="mt-3 ml-6 sm:ml-12 pl-4 border-l-2 border-brand-200 space-y-3.5 pt-2">
                      <Toggle
                        register={register}
                        name="enableBrowserActivityDetection"
                        icon={Eye}
                        label="Detect browser activity"
                        description="Log window blur, focus shifts, and screenshot shortcut attempts in audit log."
                      />
                      <Toggle
                        register={register}
                        name="enableExamWatermark"
                        icon={Layers}
                        label="Dynamic exam watermark"
                        description="Display candidate enrollment ID and timestamp as a subtle overlay."
                      />
                    </div>
                  )}
                </div>
              </Section>

              {/* Exam Browser Restrictions */}
              <Section
                title="Exam Browser Restrictions"
                description="Restrict common browser shortcuts and clipboard operations during the assessment."
              >
                <div className="divide-y divide-secondary-100">
                  <div className="py-3 first:pt-0">
                    <Toggle register={register} name="disableCopy" icon={Copy} label="Disable Copy" description="Block copy events within the exam workspace." />
                  </div>
                  <div className="py-3">
                    <Toggle register={register} name="disablePaste" icon={Clipboard} label="Disable Paste" description="Block paste events to prevent external text insertion." />
                  </div>
                  <div className="py-3">
                    <Toggle register={register} name="disableCut" icon={Scissors} label="Disable Cut" description="Block cut events within question and response fields." />
                  </div>
                  <div className="py-3">
                    <Toggle register={register} name="disableRightClick" icon={MousePointer} label="Disable Right Click" description="Block context menu from right clicks." />
                  </div>
                  <div className="py-3 last:pb-0">
                    <Toggle register={register} name="restrictBrowserShortcuts" icon={Keyboard} label="Restrict Common Browser Shortcuts" description="Block shortcuts like Ctrl+C, Ctrl+V, Ctrl+P, Ctrl+S, Ctrl+U, F12, and inspector keys." />
                  </div>
                </div>
              </Section>

              <div className="flex items-start gap-2 p-3.5 rounded-xl bg-secondary-50 border border-secondary-200 text-xs text-secondary-700">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-px text-secondary-500" aria-hidden="true" />
                <span>
                  Automated proctoring gives behavioural indicators to help you review an attempt. Accuracy depends on the candidate's hardware, lighting and browser.
                </span>
              </div>
            </>
          )}

          {/* ---------------- Navigation ---------------- */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {step > 0 ? (
              <button key="back" type="button" onClick={goBack} className="px-5 sm:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-xl border border-secondary-300 bg-white text-secondary-800 font-semibold hover:bg-secondary-50 transition text-sm cursor-pointer">
                Back
              </button>
            ) : <span />}

            {step === LAST_STEP ? (
              <button
                key="submit"
                type="submit"
                disabled={isLoading}
                className="px-6 sm:px-8 py-2.5 sm:py-3 min-h-[44px] rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition text-sm cursor-pointer"
              >
                {isLoading ? (isEditMode ? 'Saving…' : 'Creating…') : isEditMode ? 'Save changes' : 'Create exam'}
              </button>
            ) : (
              <button key="next" type="submit" className="px-6 sm:px-8 py-2.5 sm:py-3 min-h-[44px] rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition text-sm cursor-pointer">
                Next
              </button>
            )}
          </div>
        </form>

        {/* Summary on desktop */}
        <aside className="hidden lg:block lg:sticky lg:top-6" aria-label="Exam summary">
          <div className="bg-white rounded-2xl border border-secondary-200 shadow-sm p-5">
            <h2 className="text-lg font-bold text-secondary-900 mb-2">Exam summary</h2>
            <SummaryPanel s={summary} />
          </div>
        </aside>
      </div>

      {/* Success dialog */}
      {successModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#16241F]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div
            ref={successModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-exam-success-title"
            tabIndex={-1}
            className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center border border-brand-200 outline-none"
          >
            <div className="w-14 h-14 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" aria-hidden="true" />
            </div>
            <h3 id="create-exam-success-title" className="text-2xl font-extrabold text-secondary-900 mb-1">Exam created</h3>
            <p className="text-secondary-600 mb-5">Share this join code with your candidates.</p>

            <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-3">
              <span className="text-3xl sm:text-4xl font-mono font-extrabold tracking-[0.2em] text-brand-700 break-all">{successModal.joinCode}</span>
            </div>
            <button
              type="button"
              onClick={copyJoinCode}
              className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary-300 text-sm font-semibold text-secondary-800 hover:bg-secondary-50 transition"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy code'}
            </button>

            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={goToExams} className="flex-1 px-5 py-3 rounded-xl border border-secondary-300 bg-white text-secondary-800 font-semibold hover:bg-secondary-50 transition">
                Back to my exams
              </button>
              <button type="button" onClick={goToQuestions} className="flex-1 px-5 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition">
                Add questions
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CreateExam;

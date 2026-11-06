// Helpers for the Create / Edit Exam form. Pure functions, no React.
// Place at: src/utils/examForm.js

const pad2 = (n) => String(n).padStart(2, '0');

/** Local date as YYYY-MM-DD (not UTC). */
export const toLocalISODate = (d = new Date()) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const tomorrowISODate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalISODate(d);
};

/**
 * "2026-08-20T10:00:00" -> { date: "2026-08-20", time: "10:00" }.
 * Reads the text directly. Going through new Date().toISOString() converts to UTC
 * and shifts the date for hosts east of UTC (e.g. India).
 */
export const parseScheduledStart = (value) => {
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(String(value || ''));
  return m ? { date: m[1], time: `${m[2]}:${m[3]}` } : { date: '', time: '10:00' };
};

/** { date, time } -> "2026-08-20T10:00:00" as the backend expects. */
export const buildScheduledStart = (date, time) => `${date}T${time}:00`;

/** Local Date from the two form fields, or null if either is missing/invalid. */
export const scheduleToDate = (date, time) => {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  const tm = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time || '');
  if (!dm || !tm) return null;
  return new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]), 0, 0);
};

export const isFutureSchedule = (date, time, now = new Date()) => {
  const d = scheduleToDate(date, time);
  return d !== null && d.getTime() > now.getTime();
};

export const addMinutes = (d, minutes) => new Date(d.getTime() + minutes * 60000);

export const formatDateTime = (d) =>
  d
    ? d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';

export const formatTimeOnly = (d) => (d ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '');

export const formatMinutes = (minutes) => {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Questions per difficulty: easy and medium are rounded, hard takes the remainder. */
export const questionCounts = (total, easyPct, mediumPct) => {
  const t = Math.max(0, Math.round(num(total)));
  const easy = Math.round((num(easyPct) / 100) * t);
  const medium = Math.round((num(mediumPct) / 100) * t);
  const hard = Math.max(0, t - easy - medium);
  return { easy, medium, hard, total: t };
};

export const maxMarks = (counts, marks) =>
  counts.easy * num(marks.easy) + counts.medium * num(marks.medium) + counts.hard * num(marks.hard);

/**
 * Time a candidate gets, following the backend (CandidateService.joinExam):
 *  - WHOLE_EXAM: the duration is the candidate's total time.
 *  - PER_QUESTION: sum of per-question seconds + coding minutes + a 60 s buffer.
 */
export const timeEstimate = ({ timerType, durationMinutes, counts, seconds, hasCodingSection, codingDurationMinutes }) => {
  if (timerType === 'WHOLE_EXAM') {
    return { totalMinutes: num(durationMinutes), mcqMinutes: null, codingMinutes: null, perQuestion: false };
  }
  const mcqSeconds = counts.easy * num(seconds.easy) + counts.medium * num(seconds.medium) + counts.hard * num(seconds.hard);
  const codingMinutes = hasCodingSection ? num(codingDurationMinutes) : 0;
  const totalMinutes = Math.ceil((mcqSeconds + codingMinutes * 60 + 60) / 60);
  return { totalMinutes, mcqMinutes: Math.ceil(mcqSeconds / 60), codingMinutes, perQuestion: true };
};

// ---------- proctoring ----------
export const PROCTORING_FLAGS = [
  'requireCamera',
  'requireMic',
  'enableFaceDetection',
  'enableObjectDetection',
  'enableAudioDetection',
  'enableTabSwitchDetection',
  'enableScreenCaptureProtection',
  'enableBrowserActivityDetection',
  'enableExamWatermark',
  'disableCopy',
  'disablePaste',
  'disableCut',
  'disableRightClick',
  'restrictBrowserShortcuts',
];

const flags = (on) => Object.fromEntries(PROCTORING_FLAGS.map((f) => [f, on.includes(f)]));

export const PROCTORING_PRESETS = {
  NONE: {
    label: 'None',
    description: 'No monitoring or browser restrictions.',
    flags: flags([]),
    maxTabSwitches: null,
  },
  LIGHT: {
    label: 'Light',
    description: 'Records tab switches only.',
    flags: flags(['enableTabSwitchDetection']),
    maxTabSwitches: null,
  },
  STANDARD: {
    label: 'Standard',
    description: 'Camera, face check, browser restrictions and tab switches (auto-submit after 3).',
    flags: flags([
      'requireCamera',
      'enableFaceDetection',
      'enableTabSwitchDetection',
      'enableScreenCaptureProtection',
      'enableBrowserActivityDetection',
      'disableCopy',
      'disablePaste',
      'disableCut',
      'disableRightClick',
      'restrictBrowserShortcuts',
    ]),
    maxTabSwitches: 3,
  },
  STRICT: {
    label: 'Strict',
    description: 'Full monitoring, screen capture protection, browser restrictions and audio.',
    flags: flags(PROCTORING_FLAGS),
    maxTabSwitches: 3,
  },
};

const sameLimit = (a, b) => (a === null || a === '' || a === undefined ? null : Number(a)) === (b ?? null);

/** Which preset the current toggles match, or 'CUSTOM'. */
export const matchPreset = (values) => {
  for (const [key, preset] of Object.entries(PROCTORING_PRESETS)) {
    const flagsMatch = PROCTORING_FLAGS.every((f) => {
      if (!preset.flags.enableScreenCaptureProtection && (f === 'enableBrowserActivityDetection' || f === 'enableExamWatermark')) {
        return true;
      }
      return Boolean(values[f]) === preset.flags[f];
    });
    if (!flagsMatch) continue;
    if (!preset.flags.enableTabSwitchDetection || sameLimit(values.maxTabSwitches, preset.maxTabSwitches)) return key;
  }
  return 'CUSTOM';
};

export const countProctoringChecks = (values) => PROCTORING_FLAGS.filter((f) => Boolean(values[f])).length;

export const proctoringWarnings = (values) => {
  const out = [];
  if ((values.enableFaceDetection || values.enableObjectDetection) && !values.requireCamera) {
    out.push('Face and object detection need the camera. Turn on "Require camera" too.');
  }
  if (values.enableAudioDetection && !values.requireMic) {
    out.push('Audio detection needs the microphone. Turn on "Require microphone" too.');
  }
  return out;
};

// ---------- cross-field rules ----------
/**
 * Rules that involve more than one field. Returns [{ step, field, message }].
 * Mirrors what ExamService enforces, so the host sees problems before submitting.
 */
export const crossFieldIssues = (values, now = new Date()) => {
  const issues = [];
  const sum = num(values.easyPercent) + num(values.mediumPercent) + num(values.hardPercent);
  if (sum !== 100) {
    issues.push({ step: 1, field: 'hardPercent', message: `Difficulty shares must total 100% (now ${sum}%).` });
  }
  // A missing/invalid date or time is reported by the field's own validation.
  if (scheduleToDate(values.scheduledDate, values.scheduledTime) && !isFutureSchedule(values.scheduledDate, values.scheduledTime, now)) {
    issues.push({ step: 0, field: 'scheduledDate', message: 'Start time must be in the future.' });
  }
  return issues;
};

/** Non-blocking advice shown in the summary panel. */
export const advisoryWarnings = (values) => {
  const out = [];
  if (
    values.hasCodingSection &&
    values.timerType === 'WHOLE_EXAM' &&
    num(values.codingDurationMinutes) >= num(values.durationMinutes) &&
    num(values.durationMinutes) > 0
  ) {
    out.push('Coding duration is not shorter than the whole-exam duration.');
  }
  return [...out, ...proctoringWarnings(values)];
};


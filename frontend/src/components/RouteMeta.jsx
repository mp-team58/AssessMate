import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

const SUFFIX = ' – AssessMate';

// [route pattern, page title, meta description]
const META = [
  ['/', 'AssessMate – AI-powered online exams & proctoring', 'AssessMate lets hosts generate exam questions with AI, add coding rounds, proctor candidates and grade automatically. Candidates join with a single code.'],
  ['/login', 'Log in' + SUFFIX, 'Log in to AssessMate as a host or candidate to create, join and review online exams.'],
  ['/signup', 'Sign up' + SUFFIX, 'Create a free AssessMate account as a host to build exams or as a candidate to take them.'],
  ['/forgot-password', 'Reset password' + SUFFIX, 'Reset your AssessMate password with a one-time code sent to your email.'],

  ['/host/dashboard', 'Host dashboard' + SUFFIX, 'Overview of your exams, candidate performance, difficulty spread and weak topics.'],
  ['/host/my-exams', 'My exams' + SUFFIX, 'Browse, publish, manage and share all the exams you have created.'],
  ['/host/create-exam', 'Create exam' + SUFFIX, 'Set up a new exam: schedule, timing, grading, coding round and proctoring options.'],
  ['/host/exams/:id/edit', 'Edit exam' + SUFFIX, 'Update the settings of your draft exam.'],
  ['/host/exams/:id/manage', 'Manage exam' + SUFFIX, 'Publish, end, share and review a single exam.'],
  ['/host/exams/:examId/questions', 'Exam questions' + SUFFIX, 'Add, generate and organise the questions of your exam.'],
  ['/host/exams/:id/results', 'Exam results' + SUFFIX, 'See scores and submissions of every candidate who took this exam.'],
  ['/host/exams/:id/results/:enrollmentId', 'Candidate report' + SUFFIX, 'Detailed answer-by-answer report for one candidate.'],
  ['/host/exams/:id/proctoring', 'Proctoring review' + SUFFIX, 'Review flagged events and evidence for each candidate.'],
  ['/host/exams/:id/live', 'Live monitor' + SUFFIX, 'Watch candidates and flagged events in real time during a live exam.'],
  ['/host/generate-questions', 'Generate questions' + SUFFIX, 'Generate exam questions from a topic, pasted notes or an uploaded document.'],
  ['/host/question-bank', 'Question bank' + SUFFIX, 'Your reusable library of MCQ and coding questions.'],
  ['/host/profile', 'My profile' + SUFFIX, 'Your AssessMate host account details.'],

  ['/candidate/dashboard', 'Dashboard' + SUFFIX, 'Your upcoming exams, recent results and progress.'],
  ['/candidate/my-assessments', 'My assessments' + SUFFIX, 'All exams you have joined, in progress or completed.'],
  ['/candidate/results', 'My results' + SUFFIX, 'Scores and feedback from your completed exams.'],
  ['/candidate/performance', 'My performance' + SUFFIX, 'Track how your scores change across exams.'],
  ['/profile', 'My profile' + SUFFIX, 'Your AssessMate account details.'],
  ['/candidate/profile', 'My profile' + SUFFIX, 'Your AssessMate account details.'],
  ['/candidate/join', 'Join an exam' + SUFFIX, 'Enter the join code from your host to start an exam.'],
  ['/candidate/result/:enrollmentId', 'Exam result' + SUFFIX, 'Your score, answer review and personalised feedback.'],
  ['/candidate/exam/:enrollmentId', 'Exam in progress' + SUFFIX, 'Your exam is in progress.'],

  ['/admin', 'Admin Login' + SUFFIX, 'AssessMate System Administrator Sign In'],
  ['/admin/setup-password', 'Admin Setup Password' + SUFFIX, 'Complete your administrator account invitation and setup your master password.'],
  ['/admin/forgot-password', 'Admin Password Reset' + SUFFIX, 'Reset your administrator portal master password.'],
  ['/admin/dashboard', 'Admin Dashboard' + SUFFIX, 'System health, global assessment status, and user statistics.'],
  ['/admin/users', 'User Management' + SUFFIX, 'Manage registered hosts, candidates, and administrators.'],
  ['/admin/hosts', 'Hosts Directory' + SUFFIX, 'Browse and inspect registered exam hosts.'],
  ['/admin/candidates', 'Candidates Directory' + SUFFIX, 'Browse and inspect registered exam candidates.'],
  ['/admin/exams', 'Assessments Oversight' + SUFFIX, 'Monitor and suspend platform assessments.'],
  ['/admin/activity', 'Audit Trail' + SUFFIX, 'Immutable record of administrative operations.'],
  ['/admin/settings', 'Admin Governance' + SUFFIX, 'Delegate administrative roles and manage system administrator accounts.'],
  ['/admin/profile', 'My profile' + SUFFIX, 'Your AssessMate administrator account details.'],
];

const NOT_FOUND = ['Page not found' + SUFFIX, 'The page you are looking for does not exist.'];

const setMeta = (name, content) => {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const RouteMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const hit = META.find(([pattern]) => matchPath({ path: pattern, end: true }, pathname));
    const [title, description] = hit ? [hit[1], hit[2]] : NOT_FOUND;
    document.title = title;
    setMeta('description', description);
  }, [pathname]);

  return null;
};

export default RouteMeta;

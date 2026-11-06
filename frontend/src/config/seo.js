/**
 * Centralized SEO & Metadata Configuration for AssessMate
 */

// Normalized base production site URL (no trailing slash)
export const getSiteUrl = () => {
  const envUrl = import.meta.env?.VITE_SITE_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'https://assessmate.me';
};

export const SEO_CONFIG = {
  siteName: 'AssessMate',
  defaultTitle: 'AssessMate – Smart Online Examination & Assessment Platform',
  titleTemplate: (title) => {
    if (!title) return 'AssessMate – Smart Online Examination & Assessment Platform';
    if (title.includes('AssessMate')) return title;
    return `${title} | AssessMate`;
  },
  defaultDescription:
    'Create, manage and conduct online assessments with AssessMate. Build exams, manage questions, evaluate candidates and monitor assessment performance through one platform.',
  defaultOgImage: '/og-image.png',
  defaultTwitterCard: 'summary_large_image',
  contactEmail: 'mail.assessmate@gmail.com',
};

/**
 * Builds the canonical absolute URL for public pages.
 * Normalizes trailing slashes (root has trailing slash, subpaths do not).
 */
export const buildCanonicalUrl = (pathname = '/') => {
  const baseUrl = getSiteUrl();
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return cleanPath ? `${baseUrl}${cleanPath}` : `${baseUrl}/`;
};

/**
 * Generates JSON-LD Structured Data for the public website.
 */
export const getWebsiteJsonLd = () => {
  const baseUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        'url': `${baseUrl}/`,
        'name': SEO_CONFIG.siteName,
        'description': SEO_CONFIG.defaultDescription,
        'publisher': {
          '@id': `${baseUrl}/#organization`,
        },
        'inLanguage': 'en-US',
      },
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        'name': SEO_CONFIG.siteName,
        'url': `${baseUrl}/`,
        'logo': {
          '@type': 'ImageObject',
          'url': `${baseUrl}/apple-touch-icon.png`,
          'width': 180,
          'height': 180,
        },
        'email': SEO_CONFIG.contactEmail,
        'sameAs': [],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/#software`,
        'name': SEO_CONFIG.siteName,
        'applicationCategory': 'EducationalApplication',
        'operatingSystem': 'Web Browser',
        'url': `${baseUrl}/`,
        'description':
          'Cloud-based online examination, question bank management, and assessment proctoring platform.',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD',
        },
      },
    ],
  };
};

/**
 * Route-specific metadata mapping:
 * [pattern, title, description, robots, canonicalPath (if indexable)]
 */
export const ROUTE_METADATA = [
  // Public Marketing & Auth
  [
    '/',
    'AssessMate – Smart Online Examination & Assessment Platform',
    'Create, manage and conduct online assessments with AssessMate. Build exams, manage questions, evaluate candidates and monitor assessment performance through one platform.',
    'index, follow',
    '/',
  ],
  [
    '/login',
    'Login | AssessMate',
    'Log in to AssessMate as a host or candidate to create, join and review online exams.',
    'index, follow',
    '/login',
  ],
  [
    '/signup',
    'Create Your Account | AssessMate',
    'Create a free AssessMate account as a host to build exams or as a candidate to take assessments.',
    'index, follow',
    '/signup',
  ],
  [
    '/forgot-password',
    'Reset Password | AssessMate',
    'Reset your AssessMate account password with a secure verification code.',
    'noindex, nofollow',
    null,
  ],

  // Admin Portal & Protected Entry
  ['/admin', 'Admin Login | AssessMate', 'AssessMate System Administrator Sign In', 'noindex, nofollow', null],
  [
    '/admin/setup-password',
    'Admin Setup Password | AssessMate',
    'Complete your administrator account invitation and setup your password.',
    'noindex, nofollow',
    null,
  ],
  [
    '/admin/forgot-password',
    'Admin Password Reset | AssessMate',
    'Reset your administrator master password.',
    'noindex, nofollow',
    null,
  ],
  ['/admin/dashboard', 'Admin Dashboard | AssessMate', 'System metrics, active exams, and platform analytics.', 'noindex, nofollow', null],
  ['/admin/users', 'User Management | AssessMate', 'Manage registered hosts, candidates, and administrators.', 'noindex, nofollow', null],
  ['/admin/hosts', 'Hosts Directory | AssessMate', 'Inspect and oversee platform host accounts.', 'noindex, nofollow', null],
  ['/admin/candidates', 'Candidates Directory | AssessMate', 'Inspect and oversee candidate accounts.', 'noindex, nofollow', null],
  ['/admin/exams', 'Assessments Oversight | AssessMate', 'Monitor platform assessments and audit logs.', 'noindex, nofollow', null],
  ['/admin/activity', 'Audit Trail | AssessMate', 'Administrative audit records and compliance logs.', 'noindex, nofollow', null],
  ['/admin/settings', 'Admin Governance | AssessMate', 'System administration, security, and access control settings.', 'noindex, nofollow', null],
  ['/admin/profile', 'Admin Profile | AssessMate', 'Your administrator profile details.', 'noindex, nofollow', null],

  // Host Portal
  ['/host/dashboard', 'Host Dashboard | AssessMate', 'Overview of exams, submissions, and performance metrics.', 'noindex, nofollow', null],
  ['/host/my-exams', 'My Exams | AssessMate', 'Manage, publish, and share your examinations.', 'noindex, nofollow', null],
  ['/host/create-exam', 'Create Exam | AssessMate', 'Create a new assessment with MCQs, coding challenges, and proctoring.', 'noindex, nofollow', null],
  ['/host/exams/:id/edit', 'Edit Exam | AssessMate', 'Update exam details, timing, and question configurations.', 'noindex, nofollow', null],
  ['/host/exams/:id/manage', 'Manage Exam | AssessMate', 'Publish, monitor, and configure assessment access.', 'noindex, nofollow', null],
  ['/host/exams/:examId/questions', 'Exam Questions | AssessMate', 'Build and organize exam questions.', 'noindex, nofollow', null],
  ['/host/exams/:id/results', 'Exam Results | AssessMate', 'Review candidate scores, rankings, and submissions.', 'noindex, nofollow', null],
  ['/host/exams/:id/results/:enrollmentId', 'Candidate Report | AssessMate', 'Detailed performance and question-by-question breakdown.', 'noindex, nofollow', null],
  ['/host/exams/:id/proctoring', 'Proctoring Review | AssessMate', 'Review flagged integrity events and session evidence.', 'noindex, nofollow', null],
  ['/host/exams/:id/live', 'Live Monitor | AssessMate', 'Real-time candidate monitoring during active examinations.', 'noindex, nofollow', null],
  ['/host/generate-questions', 'AI Question Generator | AssessMate', 'Generate questions from notes, topics, or documents.', 'noindex, nofollow', null],
  ['/host/question-bank', 'Question Bank | AssessMate', 'Reusable library of questions and coding challenges.', 'noindex, nofollow', null],
  ['/host/profile', 'Host Profile | AssessMate', 'Manage host account credentials and preferences.', 'noindex, nofollow', null],

  // Candidate Portal
  ['/candidate/dashboard', 'Candidate Dashboard | AssessMate', 'Upcoming assessments, recent scores, and study progress.', 'noindex, nofollow', null],
  ['/candidate/my-assessments', 'My Assessments | AssessMate', 'All enrolled, in-progress, and past assessments.', 'noindex, nofollow', null],
  ['/candidate/results', 'My Results | AssessMate', 'Scores and feedback from completed exams.', 'noindex, nofollow', null],
  ['/candidate/performance', 'Performance Analytics | AssessMate', 'Track your performance and skill progress.', 'noindex, nofollow', null],
  ['/candidate/join', 'Join Assessment | AssessMate', 'Enter an assessment access code to start an exam.', 'noindex, nofollow', null],
  ['/candidate/result/:enrollmentId', 'Assessment Result | AssessMate', 'Your exam score and answer review.', 'noindex, nofollow', null],
  ['/candidate/exam/:enrollmentId', 'Examination Room | AssessMate', 'Active exam session in progress.', 'noindex, nofollow', null],
  ['/candidate/profile', 'Candidate Profile | AssessMate', 'Manage your student profile details.', 'noindex, nofollow', null],
  ['/profile', 'User Profile | AssessMate', 'Manage user profile details.', 'noindex, nofollow', null],
];

export const NOT_FOUND_SEO = [
  'Page Not Found | AssessMate',
  'The page you are looking for could not be found.',
  'noindex, nofollow',
  null,
];


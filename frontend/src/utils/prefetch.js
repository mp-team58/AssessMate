/**
 * Route Prefetching Utility
 * Preloads code-split page chunks in the background before navigation occurs.
 */

const routeLoaders = {
  '/host/dashboard': () => import('../pages/HostDashboard'),
  '/host/my-exams': () => import('../pages/MyExams'),
  '/host/create-exam': () => import('../pages/CreateExam'),
  '/host/question-bank': () => import('../pages/QuestionBank'),
  '/candidate/dashboard': () => import('../pages/CandidateDashboard'),
  '/candidate/my-assessments': () => import('../pages/MyAssessments'),
  '/candidate/results': () => import('../pages/CandidateResults'),
  '/candidate/performance': () => import('../pages/CandidatePerformance'),
  '/candidate/join': () => import('../pages/JoinAssessment'),
  '/profile': () => import('../pages/UserProfile'),
};

const prefetched = new Set();

/**
 * Prefetch a specific route chunk on hover or focus
 */
export const prefetchRoute = (path) => {
  if (!path || prefetched.has(path)) return;
  const loader = routeLoaders[path];
  if (loader) {
    prefetched.add(path);
    loader().catch(() => {
      // Allow retry if network failed temporarily
      prefetched.delete(path);
    });
  }
};

/**
 * Automatically prefetch commonly visited routes during idle time
 */
export const prefetchCommonRoutes = (role) => {
  const routes = role === 'HOST'
    ? ['/host/my-exams', '/host/question-bank', '/host/create-exam', '/profile']
    : ['/candidate/my-assessments', '/candidate/results', '/candidate/performance', '/profile'];

  const schedule = typeof window !== 'undefined' && window.requestIdleCallback 
    ? window.requestIdleCallback 
    : (cb) => setTimeout(cb, 1200);

  schedule(() => {
    routes.forEach((route, index) => {
      setTimeout(() => prefetchRoute(route), index * 250);
    });
  });
};

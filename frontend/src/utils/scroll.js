export const scrollAppToTop = () => {
  document.getElementById('app-scroll-container')?.scrollTo({ top: 0, behavior: 'instant' });
};

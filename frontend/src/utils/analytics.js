/**
 * Google Analytics 4 (GA4) Integration Helper
 * 
 * Only initializes and tracks when VITE_GA_MEASUREMENT_ID is provided in environment variables.
 * Designed to preserve candidate privacy:
 * - Sanitizes query strings from URLs before tracking.
 * - Never collects assessment answers, passwords, or personal test data.
 */

let isInitialized = false;

export const initAnalytics = () => {
  if (typeof window === 'undefined' || isInitialized) return;

  const measurementId = import.meta.env?.VITE_GA_MEASUREMENT_ID;
  if (!measurementId || typeof measurementId !== 'string' || !measurementId.startsWith('G-')) {
    return;
  }

  // Inject gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: false, // We trigger page_view manually on client route changes
    anonymize_ip: true,
  });

  isInitialized = true;
};

/**
 * Tracks route changes safely without logging sensitive query parameters.
 */
export const trackPageView = (pathname) => {
  if (typeof window === 'undefined' || !isInitialized || typeof window.gtag !== 'function') return;

  const measurementId = import.meta.env?.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;

  // Clean pathname without query tokens/join codes
  const cleanPath = (pathname || window.location.pathname).split('?')[0];

  window.gtag('event', 'page_view', {
    page_path: cleanPath,
    page_title: document.title,
  });
};


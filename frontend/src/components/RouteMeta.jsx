import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import {
  SEO_CONFIG,
  ROUTE_METADATA,
  NOT_FOUND_SEO,
  getSiteUrl,
  buildCanonicalUrl,
  getWebsiteJsonLd,
} from '../config/seo';
import { initAnalytics, trackPageView } from '../utils/analytics';

/** Helper to set or create a <meta name="..." content="..." /> */
const setMetaTag = (attrName, attrVal, content) => {
  if (typeof document === 'undefined') return;
  let tag = document.querySelector(`meta[${attrName}="${attrVal}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attrName, attrVal);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content || '');
};

/** Helper to set or remove <link rel="canonical" href="..." /> */
const setCanonicalLink = (canonicalUrl) => {
  if (typeof document === 'undefined') return;
  let link = document.querySelector('link[rel="canonical"]');
  if (canonicalUrl) {
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonicalUrl);
  } else if (link) {
    link.remove();
  }
};

/** Helper to inject or remove JSON-LD script */
const setStructuredData = (jsonLdData) => {
  if (typeof document === 'undefined') return;
  const scriptId = 'assessmate-structured-data';
  let script = document.getElementById(scriptId);
  if (jsonLdData) {
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLdData);
  } else if (script) {
    script.remove();
  }
};

const RouteMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const siteUrl = getSiteUrl();
    const hit = ROUTE_METADATA.find(([pattern]) => matchPath({ path: pattern, end: true }, pathname));
    const [pattern, title, description, robots, canonicalPath] = hit
      ? [hit[0], hit[1], hit[2], hit[3], hit[4]]
      : ['*', NOT_FOUND_SEO[0], NOT_FOUND_SEO[1], NOT_FOUND_SEO[2], NOT_FOUND_SEO[3]];

    // 1. Browser Title
    document.title = title;

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'robots', robots);

    // 3. Canonical URL (only for public canonical pages)
    const canonicalUrl = canonicalPath !== null ? buildCanonicalUrl(canonicalPath) : null;
    setCanonicalLink(canonicalUrl);

    // 4. Open Graph Meta Tags
    const ogUrl = canonicalUrl || `${siteUrl}${pathname.split('?')[0]}`;
    const ogImage = `${siteUrl}${SEO_CONFIG.defaultOgImage}`;
    setMetaTag('property', 'og:site_name', SEO_CONFIG.siteName);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', pattern === '/' ? 'website' : 'article');
    setMetaTag('property', 'og:url', ogUrl);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:image:width', '1200');
    setMetaTag('property', 'og:image:height', '630');
    setMetaTag('property', 'og:image:alt', title);

    // 5. Twitter Card Meta Tags
    setMetaTag('name', 'twitter:card', SEO_CONFIG.defaultTwitterCard);
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // 6. JSON-LD Structured Data (Homepage only)
    if (pattern === '/') {
      setStructuredData(getWebsiteJsonLd());
    } else {
      setStructuredData(null);
    }

    // 7. Privacy-Safe Analytics (Only active if VITE_GA_MEASUREMENT_ID is configured)
    initAnalytics();
    trackPageView(pathname);
  }, [pathname]);

  return null;
};

export default RouteMeta;

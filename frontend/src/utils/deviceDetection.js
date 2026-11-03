/**
 * Utility functions for client-side device classification and exam device policy enforcement.
 * Complements server-side header validation (User-Agent and Sec-CH-UA-Mobile).
 */

export const isMobileClient = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // 1. Client Hints (Chromium modern browsers)
  if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
    if (navigator.userAgentData.mobile) {
      return true;
    }
  }

  const ua = navigator.userAgent || navigator.vendor || window.opera || '';

  // 2. Android Phones and Tablets
  if (/Android/i.test(ua)) {
    return true;
  }

  // 3. iPhones, iPods, and handheld mobile OS
  if (/iPhone|iPod|Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(ua)) {
    return true;
  }

  // 4. iPads:
  // - Classic iPad UA
  // - iPadOS 13+ Desktop Safari spoof (sends Macintosh UA, but has multi-touch)
  if (/iPad/i.test(ua)) {
    return true;
  }
  const isIpadOS = /Macintosh/i.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
  if (isIpadOS) {
    return true;
  }

  // 5. Coarse pointer + small viewport fallback (smartphones with generic UA)
  const isTouchScreen = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isSmallScreen = window.innerWidth < 768;
  if (isTouchScreen && isSmallScreen) {
    return true;
  }

  return false;
};

export const getDetectedClientType = () => {
  const isMobile = isMobileClient();
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';

  if (isMobile) {
    if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
      return 'iPad / Tablet';
    }
    if (/iPhone/i.test(ua)) {
      return 'iPhone';
    }
    if (/Android/i.test(ua)) {
      return ua.includes('Mobile') ? 'Android Phone' : 'Android Tablet';
    }
    return 'Mobile / Handheld Device';
  }

  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Macintosh/i.test(ua)) return 'macOS Computer';
  if (/Linux/i.test(ua)) return 'Linux Workstation';
  if (/CrOS/i.test(ua)) return 'ChromeOS Device';

  return 'Desktop Computer';
};

/**
 * Validates whether the current client device complies with the exam's DeviceAccess policy.
 * @param {'DESKTOP'|'MOBILE'|'BOTH'|string} deviceAccess 
 * @returns {{ allowed: boolean, required?: 'DESKTOP'|'MOBILE', detected?: string, message?: string }}
 */
export const checkDeviceAccess = (deviceAccess) => {
  if (!deviceAccess || deviceAccess === 'BOTH') {
    return { allowed: true };
  }

  const isMobile = isMobileClient();
  const detectedType = getDetectedClientType();

  if (deviceAccess === 'DESKTOP' && isMobile) {
    return {
      allowed: false,
      required: 'DESKTOP',
      detected: detectedType,
      message: 'This exam is restricted to Desktop devices only. Mobile phones and tablets are not permitted.'
    };
  }

  if (deviceAccess === 'MOBILE' && !isMobile) {
    return {
      allowed: false,
      required: 'MOBILE',
      detected: detectedType,
      message: 'This exam is restricted to Mobile devices only. Desktop and laptop computers are not permitted.'
    };
  }

  return { allowed: true };
};


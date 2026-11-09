import { useState, useEffect, useCallback } from 'react';
import { getSignedMediaUrl } from '../services/mediaService';

/**
 * Custom React hook for securely retrieving and caching signed URLs for private Supabase media.
 */
export function useSignedUrl(src) {
  const [signedUrl, setSignedUrl] = useState('');
  const [loading, setLoading] = useState(Boolean(src));
  const [error, setError] = useState(false);

  const fetchUrl = useCallback(async (forceRefresh = false) => {
    if (!src) {
      setSignedUrl('');
      setLoading(false);
      setError(false);
      return;
    }

    try {
      setLoading(true);
      setError(false);
      const url = await getSignedMediaUrl(src, forceRefresh);
      if (url) {
        setSignedUrl(url);
      } else {
        setError(true);
      }
    } catch (err) {
      console.warn('[SecureMedia] Could not load media:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [src]);

  useEffect(() => {
    let isMounted = true;
    fetchUrl().catch(() => {
      if (isMounted) setError(true);
    });
    return () => {
      isMounted = false;
    };
  }, [fetchUrl]);

  const refresh = useCallback(() => fetchUrl(true), [fetchUrl]);

  return { signedUrl, loading, error, refresh };
}

/**
 * Secure Image component for private Supabase Storage images.
 * Automatically fetches temporary signed URLs, caches in-memory, handles loading & error states.
 */
export function SecureImage({
  src,
  alt = 'Question Figure',
  className = '',
  loadingPlaceholder,
  errorPlaceholder,
  onClick
}) {
  const { signedUrl, loading, error, refresh } = useSignedUrl(src);

  if (!src) return null;

  if (loading) {
    return loadingPlaceholder || (
      <div className={`flex items-center justify-center bg-secondary-100 animate-pulse text-xs text-secondary-400 min-h-[120px] rounded-lg ${className}`}>
        <span>Loading image...</span>
      </div>
    );
  }

  if (error || !signedUrl) {
    return errorPlaceholder || (
      <div className={`flex items-center justify-center bg-secondary-100 text-xs text-secondary-400 min-h-[100px] rounded-lg border border-secondary-200 p-4 ${className}`}>
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={() => {
        // Retry once with forced signed URL refresh in case the token expired
        refresh();
      }}
    />
  );
}

/**
 * Secure Audio component for private Supabase Storage recordings.
 * Supports native HTML5 audio playback with metadata preloading and responsive controls.
 */
export function SecureAudio({
  src,
  className = '',
  controls = true,
  preload = 'metadata'
}) {
  const { signedUrl, loading, error, refresh } = useSignedUrl(src);

  if (!src) return null;

  if (loading) {
    return (
      <div className={`inline-flex items-center space-x-2 text-xs text-secondary-500 bg-secondary-50 px-3 py-1.5 rounded-full animate-pulse ${className}`}>
        <svg className="w-4 h-4 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>Loading audio...</span>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`inline-flex items-center text-xs text-secondary-400 bg-secondary-100 px-3 py-1.5 rounded-lg border border-secondary-200 ${className}`}>
        <span>Audio clip unavailable</span>
      </div>
    );
  }

  return (
    <audio
      controls={controls}
      preload={preload}
      src={signedUrl}
      className={className}
      onError={() => {
        refresh();
      }}
    >
      Your browser does not support audio playback.
    </audio>
  );
}

export default {
  SecureImage,
  SecureAudio,
  useSignedUrl
};

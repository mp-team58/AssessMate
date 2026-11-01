import React, { useState, useEffect } from 'react';
import { fetchMediaBlobUrl, getMediaUrl } from '../services/apiClient';

/**
 * Renders an image using Authorization header and a local Blob URL for private proctoring evidence.
 * Public questions continue loading directly without token overhead.
 */
export function SecureImage({ src, alt = "Evidence", className = "" }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    if (!src) {
      setLoading(false);
      return;
    }

    if (!src.includes('/proctoring/')) {
      setBlobUrl(getMediaUrl(src));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    fetchMediaBlobUrl(src)
      .then((url) => {
        if (active) {
          createdUrl = url;
          setBlobUrl(url);
          setLoading(false);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load secure image:", err);
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src]);

  if (loading) {
    return <div className={`flex items-center justify-center bg-secondary-100 animate-pulse text-xs text-secondary-400 ${className}`}>Loading...</div>;
  }

  if (error || !blobUrl) {
    return <div className={`flex items-center justify-center bg-secondary-100 text-xs text-secondary-400 ${className}`}>Image unavailable</div>;
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}

/**
 * Renders audio using Authorization header and a local Blob URL for private proctoring audio evidence.
 */
export function SecureAudio({ src, className = "" }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    if (!src) {
      setLoading(false);
      return;
    }

    if (!src.includes('/proctoring/')) {
      setBlobUrl(getMediaUrl(src));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    fetchMediaBlobUrl(src)
      .then((url) => {
        if (active) {
          createdUrl = url;
          setBlobUrl(url);
          setLoading(false);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load secure audio:", err);
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src]);

  if (loading) {
    return <span className="text-xs text-secondary-400 animate-pulse">Loading audio...</span>;
  }

  if (error || !blobUrl) {
    return <span className="text-xs text-secondary-400">Audio unavailable</span>;
  }

  return <audio controls src={blobUrl} className={className} />;
}

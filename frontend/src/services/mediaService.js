import apiClient, { API_BASE_URL } from './apiClient';

/**
 * In-memory cache for temporary signed URLs.
 * Stores { signedUrl, expiresAt } mapped by objectPath.
 * Never persisted to localStorage or sessionStorage.
 */
const mediaUrlCache = new Map();

/**
 * Fetches or returns a cached temporary signed URL for a private Supabase Storage object.
 *
 * @param {string} path - Object path (e.g., 'questions/q_104_a83f29c1.png' or '/uploads/...')
 * @param {boolean} [forceRefresh=false] - Force refreshing the signed URL
 * @returns {Promise<string>} Temporary signed URL
 */
export const getSignedMediaUrl = async (path, forceRefresh = false) => {
  if (!path) return '';

  // If already an absolute external URL or data/blob URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Check in-memory cache
  if (!forceRefresh) {
    const cached = mediaUrlCache.get(cleanPath);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.signedUrl;
    }
  }

  try {
    const response = await apiClient.get('/storage/signed-url', {
      params: { objectPath: cleanPath }
    });

    const { signedUrl, expiresIn = 900 } = response.data;
    if (signedUrl) {
      // Set expiration with 60-second safety margin
      const safeDuration = Math.max(30, expiresIn - 60) * 1000;
      mediaUrlCache.set(cleanPath, {
        signedUrl,
        expiresAt: Date.now() + safeDuration
      });
      return signedUrl;
    }
  } catch (err) {
    // If 403 Forbidden or 404 Not Found, the asset is unauthorized or does not exist
    if (err?.response?.status === 404 || err?.response?.status === 403 || err?.message?.includes('404') || err?.message?.includes('403')) {
      throw err;
    }
    // If backend storage is not configured, fall back to API host media route
    console.warn(`[MediaService] Signed URL request failed for ${cleanPath}, trying fallback:`, err.message || err);
    const baseUrlHost = (API_BASE_URL || '').replace(/\/api\/?$/, '');
    return `${baseUrlHost}/${cleanPath}`;
  }

  return '';
};

/**
 * Clears all cached signed URLs from memory upon user logout or session switch.
 */
export const clearMediaCache = () => {
  mediaUrlCache.clear();
};

export default {
  getSignedMediaUrl,
  clearMediaCache
};

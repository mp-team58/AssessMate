const resolveBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (import.meta.env.PROD && typeof window !== 'undefined' && !window.location.origin.includes('localhost')) {
    if (window.location.origin.includes('assessmate.me')) {
      console.warn(
        '[AssessMate] VITE_API_BASE_URL is not configured for production. Defaulting to /api on the current origin. If your backend is hosted separately, set VITE_API_BASE_URL in repository secrets or build environment.'
      );
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:8080/api';
};

const BASE_URL = resolveBaseUrl();

export const API_BASE_URL = BASE_URL;

const NETWORK_ERROR_MESSAGE = "Can't reach the server. Please check your internet connection and try again.";
const SERVER_BUSY_MESSAGE = 'The server is starting up or temporarily unavailable. Please wait a few seconds and try again.';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const makeNetworkError = (cause) => {
  const err = new Error(NETWORK_ERROR_MESSAGE);
  err.isNetworkError = true;
  err.cause = cause;
  return err;
};

let isRedirecting = false;

// Lightweight memory cache & in-flight request deduplication for safe GET requests
const responseCache = new Map();
const inFlightRequests = new Map();
const DEFAULT_CACHE_TTL = 30000; // 30 seconds

export const clearApiCache = () => {
  responseCache.clear();
  inFlightRequests.clear();
};

const clearAuthStorageInternal = () => {
  const keys = ['token', 'role', 'name', 'id', 'email', 'user', 'mustChangePassword', 'currentEnrollmentId', 'currentExamId'];
  keys.forEach((k) => {
    try { localStorage.removeItem(k); } catch (_) {}
  });
};

// Session ended -> go to login and show why once the login page has loaded.
// (Dispatching a toast right before a full page redirect would be lost.)
const redirectToLogin = (message) => {
  if (isRedirecting) return;
  isRedirecting = true;
  clearApiCache();
  clearAuthStorageInternal();
  try {
    sessionStorage.setItem('pendingToast', JSON.stringify({ message, type: 'warning' }));
  } catch (_) { /* storage unavailable */ }
  const isAdmin = window.location.pathname.startsWith('/admin');
  const target = isAdmin ? '/admin' : '/login';
  if (window.location.pathname !== target) {
    window.location.href = target;
  }
};

// Turn a failed HTTP response into a message a normal user can understand.
const buildErrorMessage = (status, data) => {
  if (status === 502 || status === 503 || status === 504) return SERVER_BUSY_MESSAGE;
  if (status === 429) return 'Too many requests. Please slow down and try again in a moment.';
  if (typeof data === 'string' && data.length > 0) {
    console.error('API Error Response:', data.substring(0, 500));
    return `Something went wrong on the server (error ${status}). Please try again.`;
  }
  if (data && data.message) return data.message;
  if (data && data.error) return `${data.error} (Status ${status})`;
  if (data && typeof data === 'object' && Object.keys(data).length > 0) {
    return `Request failed (Status ${status}): ${JSON.stringify(data).substring(0, 100)}`;
  }
  if (status === 403) return 'You do not have permission to access this resource.';
  if (status === 401) return 'Your session has expired or is invalid. Please log in again.';
  return `Request failed (Status ${status}). Please try again.`;
};

/**
 * Factory creating an API client instance with interceptors for a given base URL.
 */
const createApiClient = (baseUrl) => {
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  const client = async (endpoint, options = {}) => {
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    if (options.params && typeof options.params === 'object') {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        cleanEndpoint += (cleanEndpoint.includes('?') ? '&' : '?') + queryString;
      }
    }

    const url = `${cleanBase}${cleanEndpoint}`;

    // Initialize headers
    const headers = { ...(options.headers || {}) };

    // Normalize header keys for safe checking
    const getHeader = (key) => Object.keys(headers).find(k => k.toLowerCase() === key.toLowerCase());

    if (!getHeader('content-type') && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Request Interceptor Logic: Add Auth Token
    const token = localStorage.getItem('token');
    const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register') || endpoint.includes('/auth/forgot-password') || endpoint.includes('/auth/logout');
    const isTemplateEndpoint = endpoint.includes('/questions/excel/template');

    if (token && token !== 'null' && token !== 'undefined' && !getHeader('authorization') && !isAuthEndpoint && !isTemplateEndpoint) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    const method = (config.method || 'GET').toUpperCase();

    // Mutations invalidate cached GET responses to ensure fresh state
    if (method !== 'GET') {
      responseCache.clear();
    }

    // Determine if request is safe to cache (read-only GET, not realtime proctor/active exam/live monitoring)
    const isCacheable = method === 'GET' &&
      !config.skipCache &&
      !endpoint.includes('/proctor') &&
      !endpoint.includes('/exam/') &&
      !endpoint.includes('/live') &&
      !endpoint.includes('/active') &&
      !endpoint.includes('/coding/candidate');

    const cacheKey = `${token || 'anon'}:${method}:${url}`;

    if (isCacheable) {
      const cached = responseCache.get(cacheKey);
      if (cached) {
        if (Date.now() - cached.timestamp < (config.cacheTtl || DEFAULT_CACHE_TTL)) {
          return { data: cached.data, status: cached.status, headers: cached.headers };
        }
        responseCache.delete(cacheKey);
      }
      if (inFlightRequests.has(cacheKey)) {
        return inFlightRequests.get(cacheKey);
      }
    }

    const executeRequest = async () => {
      try {
        let response;
        try {
          response = await fetch(url, config);
        } catch (networkErr) {
          if (networkErr?.name === 'AbortError') throw networkErr;
          if (method !== 'GET') throw makeNetworkError(networkErr);
          // A dropped first GET (cold connection, brief network hiccup) is safe to retry once.
          await wait(600);
          try {
            response = await fetch(url, config);
          } catch (retryErr) {
            if (retryErr?.name === 'AbortError') throw retryErr;
            throw makeNetworkError(retryErr);
          }
        }

        // Parse JSON or Blob response
        let data;
        if (config.responseType === 'blob') {
          data = await response.blob();
        } else {
          const isJson = response.headers.get('content-type')?.includes('application/json');
          data = isJson ? await response.json().catch(() => null) : await response.text();
        }

        // Response Interceptor Logic: Handle 401 (Token expired / Session invalid)
        // 403 is NOT session invalidation — it's an ordinary "not your resource" check
        // (host viewing another host's exam, candidate hitting the wrong enrollment, IDOR
        // guards, etc). Treating every 403 as a logout wipes a perfectly valid session.
        if (!isAuthEndpoint && response.status === 401) {
          const msg = (data && typeof data === 'object' && data.message) ? data.message : (typeof data === 'string' ? data : '');
          let redirectMessage = 'Your session has expired or is invalid. Please log in again.';
          if (msg.includes('deactivated')) {
            redirectMessage = msg;
          } else if (msg.includes('another device')) {
            redirectMessage = 'Your session was ended because you logged in from another device.';
          } else if (msg) {
            redirectMessage = msg;
          }
          redirectToLogin(redirectMessage);
        }

        if (!response.ok) {
          const errorMessage = buildErrorMessage(response.status, data);

          // Simulate Axios error structure
          const error = new Error(errorMessage);
          error.response = { status: response.status, data };
          throw error;
        }

        if (isCacheable) {
          responseCache.set(cacheKey, {
            data,
            status: response.status,
            headers: response.headers,
            timestamp: Date.now()
          });
        }

        // Simulate Axios response structure
        return { data, status: response.status, headers: response.headers };
      } catch (error) {
        throw error;
      }
    };

    if (isCacheable) {
      const promise = executeRequest().finally(() => {
        inFlightRequests.delete(cacheKey);
      });
      inFlightRequests.set(cacheKey, promise);
      return promise;
    }

    return executeRequest();
  };

  // Convenience methods similar to Axios
  client.get = (url, config) => client(url, { ...config, method: 'GET' });
  client.post = (url, data, config) => client(url, { ...config, method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) });
  client.put = (url, data, config) => client(url, { ...config, method: 'PUT', body: data instanceof FormData ? data : JSON.stringify(data) });
  client.patch = (url, data, config) => client(url, { ...config, method: 'PATCH', body: data instanceof FormData ? data : JSON.stringify(data) });
  client.delete = (url, config = {}) => {
    const body = config.body || (config.data !== undefined ? (config.data instanceof FormData ? config.data : JSON.stringify(config.data)) : undefined);
    return client(url, { ...config, method: 'DELETE', ...(body !== undefined ? { body } : {}) });
  };

  return client;
};

// Host backend client (default)
export const apiClient = createApiClient(BASE_URL);

// Candidate backend client (alias)
export const candidateApiClient = apiClient;

// Utility to resolve media URLs (images/audio) to the correct backend host
export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const baseUrlHost = BASE_URL.replace(/\/api\/?$/, '');
  return `${baseUrlHost}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Authenticated media fetcher: loads image/audio data using Authorization header and creates local Blob URL
export const fetchMediaBlobUrl = async (path) => {
  if (!path) return '';
  const token = localStorage.getItem('token');
  const baseUrlHost = BASE_URL.replace(/\/api\/?$/, '');
  const url = path.startsWith('http://') || path.startsWith('https://')
    ? path
    : `${baseUrlHost}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = {};
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to load media: ${response.status}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export default apiClient;

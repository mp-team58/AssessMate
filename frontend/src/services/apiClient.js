const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://08k7867x-8080.inc1.devtunnels.ms/api';

/**
 * A wrapper around the native fetch API to provide interceptor-like functionality
 * (automatic auth headers, JSON parsing, and 401 token refresh).
 */
const apiClient = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;

  // Initialize headers
  const headers = { ...(options.headers || {}) };

  // Normalize header keys for safe checking
  const getHeader = (key) => Object.keys(headers).find(k => k.toLowerCase() === key.toLowerCase());

  if (!getHeader('content-type') && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Request Interceptor Logic: Add Auth Token
  const token = localStorage.getItem('token');
  const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register');
  const isTemplateEndpoint = endpoint.includes('/questions/excel/template');

  if (token && token !== 'null' && token !== 'undefined' && !getHeader('authorization') && !isAuthEndpoint && !isTemplateEndpoint) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (endpoint.includes('/questions/manual') || endpoint.includes('/questions/bank/add')) {
    console.log(`[apiClient DEBUG] Sending request to ${url}`);
    console.log('[apiClient DEBUG] Headers being passed to fetch:', config.headers);
    console.log('[apiClient DEBUG] Body type:', config.body instanceof FormData ? 'FormData' : typeof config.body);
  }

  try {
    let response = await fetch(url, config);

    // Parse JSON or Blob response
    let data;
    if (config.responseType === 'blob') {
      data = await response.blob();
    } else {
      const isJson = response.headers.get('content-type')?.includes('application/json');
      data = isJson ? await response.json() : await response.text();
    }

    // Response Interceptor Logic: Handle 401 Unauthorized
    if (response.status === 401) {
      const msg = (data && data.message) ? data.message : "";
      if (msg.includes("Session expired") || msg.includes("another device")) {
        localStorage.clear();
        window.location.href = "/login";
        alert("Your session was ended because you logged in from another device.");
      }

      if (!config._retry) {
        config._retry = true;
        // Keep existing refresh logic stub if needed, but the above covers the specific request
      }
    }

    if (!response.ok) {
      // Improve error message if backend returns HTML (like dev tunnels warning) or string
      let errorMessage = 'API Error';
      if (typeof data === 'string' && data.length > 0) {
        errorMessage = `API Error (Status ${response.status}). The server returned an invalid format. Check if the Dev Tunnel is active or requires confirmation.`;
        console.error('API Error Response:', data.substring(0, 500));
      } else if (data && data.message) {
        errorMessage = data.message;
      } else if (data && data.error) {
        errorMessage = `${data.error} (Status ${response.status})`;
      } else if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        errorMessage = `API Error (Status ${response.status}): ${JSON.stringify(data).substring(0, 100)}`;
      } else {
        if (response.status === 403) {
          errorMessage = '403 Forbidden: You do not have permission, or your login session is invalid. Try logging out and logging in again.';
        } else if (response.status === 401) {
          errorMessage = '401 Unauthorized: Your session has expired or is invalid. Please log in again.';
        } else {
          errorMessage = `API Error (Status ${response.status}): The backend returned an empty error response.`;
        }
      }

      // Simulate Axios error structure
      const error = new Error(errorMessage);
      error.response = { status: response.status, data };
      throw error;
    }

    // Simulate Axios response structure
    return { data, status: response.status, headers: response.headers };
  } catch (error) {
    throw error;
  }
};

// Convenience methods similar to Axios
apiClient.get = (url, config) => apiClient(url, { ...config, method: 'GET' });
apiClient.post = (url, data, config) => apiClient(url, { ...config, method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) });
apiClient.put = (url, data, config) => apiClient(url, { ...config, method: 'PUT', body: data instanceof FormData ? data : JSON.stringify(data) });
apiClient.patch = (url, data, config) => apiClient(url, { ...config, method: 'PATCH', body: data instanceof FormData ? data : JSON.stringify(data) });
apiClient.delete = (url, config) => apiClient(url, { ...config, method: 'DELETE' });

export default apiClient;

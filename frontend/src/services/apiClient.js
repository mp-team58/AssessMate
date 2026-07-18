const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/**
 * A wrapper around the native fetch API to provide interceptor-like functionality
 * (automatic auth headers, JSON parsing, and 401 token refresh).
 */
const apiClient = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  
  // Initialize headers
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Request Interceptor Logic: Add Auth Token
  const token = localStorage.getItem('accessToken');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, config);

    // Response Interceptor Logic: Handle 401 Unauthorized
    if (response.status === 401 && !config._retry) {
      config._retry = true;
      try {
        // Implement silent refresh logic here when backend is ready
        // const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, { method: 'POST' });
        // if (!refreshResponse.ok) throw new Error('Refresh failed');
        // const { accessToken } = await refreshResponse.json();
        // localStorage.setItem('accessToken', accessToken);
        // headers.set('Authorization', `Bearer ${accessToken}`);
        // return apiClient(endpoint, config); // Retry original request
        
        // For now, throw to trigger logout/error handling
        throw new Error('Unauthorized');
      } catch (refreshError) {
        // window.location.href = '/login';
        throw refreshError;
      }
    }

    // Parse JSON response if applicable
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      // Simulate Axios error structure
      const error = new Error(data.message || 'API Error');
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
apiClient.post = (url, data, config) => apiClient(url, { ...config, method: 'POST', body: JSON.stringify(data) });
apiClient.put = (url, data, config) => apiClient(url, { ...config, method: 'PUT', body: JSON.stringify(data) });
apiClient.delete = (url, config) => apiClient(url, { ...config, method: 'DELETE' });

export default apiClient;

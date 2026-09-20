import apiClient, { candidateApiClient } from './apiClient';

/**
 * @typedef {Object} LoginPayload
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} SignupPayload
 * @property {string} fullName
 * @property {string} email
 * @property {string} password
 */

/**
 * Unified login function
 * @param {LoginPayload & { role?: string }} payload 
 * @returns {Promise<any>}
 */
export const login = async (payload) => {
  return apiClient.post('/auth/login', {
    email: payload.email,
    password: payload.password,
    role: (payload.role || 'CANDIDATE').toUpperCase()
  });
};

/**
 * Log in a Host
 * @param {LoginPayload} payload 
 * @returns {Promise<any>}
 */
export const loginHost = async (payload) => {
  return apiClient.post('/auth/login', {
    email: payload.email,
    password: payload.password,
    role: 'HOST'
  });
};

/**
 * Log in a Candidate
 * @param {LoginPayload} payload 
 * @returns {Promise<any>}
 */
export const loginCandidate = async (payload) => {
  return apiClient.post('/auth/login', {
    email: payload.email,
    password: payload.password,
    role: 'CANDIDATE'
  });
};

/**
 * Sign up a Host
 * @param {SignupPayload} payload 
 * @returns {Promise<any>}
 */
export const signupHost = async (payload) => {
  return apiClient.post('/auth/register', {
    name: payload.fullName,
    email: payload.email,
    password: payload.password,
    role: 'HOST'
  });
};

/**
 * Sign up a Candidate
 * @param {SignupPayload} payload 
 * @returns {Promise<any>}
 */
export const signupCandidate = async (payload) => {
  try {
    return await candidateApiClient.post('/auth/register', {
      name: payload.fullName,
      email: payload.email,
      password: payload.password,
      role: 'CANDIDATE'
    });
  } catch (err) {
    // If Candidate backend does not serve /auth/register, fallback to main backend
    if (err.response?.status === 404) {
      return await apiClient.post('/auth/register', {
        name: payload.fullName,
        email: payload.email,
        password: payload.password,
        role: 'CANDIDATE'
      });
    }
    throw err;
  }
};

/**
 * Log out the current user
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('currentExamId');
};

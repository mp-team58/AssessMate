import apiClient from './apiClient';

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
 * Log in a Host
 * @param {LoginPayload} payload 
 * @returns {Promise<any>}
 */
export const loginHost = async (payload) => {
  return apiClient.post('/auth/login', {
    ...payload,
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
    ...payload,
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
  return apiClient.post('/auth/register', {
    name: payload.fullName,
    email: payload.email,
    password: payload.password,
    role: 'CANDIDATE'
  });
};

/**
 * Log out the current user
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('currentExamId');
};

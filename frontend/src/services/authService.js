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
  // return apiClient.post('/auth/host/login', payload);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data: { token: 'mock-jwt-host-token', user: { id: 1, role: 'host', name: 'Jane Doe' } } });
    }, 1000);
  });
};

/**
 * Log in a Candidate
 * @param {LoginPayload} payload 
 * @returns {Promise<any>}
 */
export const loginCandidate = async (payload) => {
  // return apiClient.post('/auth/candidate/login', payload);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data: { token: 'mock-jwt-candidate-token', user: { id: 2, role: 'candidate', name: 'John Smith' } } });
    }, 1000);
  });
};

/**
 * Sign up a Host
 * @param {SignupPayload} payload 
 * @returns {Promise<any>}
 */
export const signupHost = async (payload) => {
  // return apiClient.post('/auth/host/signup', payload);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data: { token: 'mock-jwt-host-token', user: { id: 1, role: 'host', name: payload.fullName } } });
    }, 1000);
  });
};

/**
 * Sign up a Candidate
 * @param {SignupPayload} payload 
 * @returns {Promise<any>}
 */
export const signupCandidate = async (payload) => {
  // return apiClient.post('/auth/candidate/signup', payload);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data: { token: 'mock-jwt-candidate-token', user: { id: 2, role: 'candidate', name: payload.fullName } } });
    }, 1000);
  });
};

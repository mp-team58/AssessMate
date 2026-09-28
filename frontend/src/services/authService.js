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
 * Unified OTP Request for Registration
 * @param {SignupPayload & { role: string }} payload 
 * @returns {Promise<any>}
 */
export const requestRegisterOtp = async (payload) => {
  if (payload.role === 'CANDIDATE') {
    try {
      return await candidateApiClient.post('/auth/register/request-otp', {
        name: payload.fullName || payload.name,
        email: payload.email,
        password: payload.password,
        role: payload.role
      });
    } catch (err) {
      if (err.response?.status === 404) {
        return await apiClient.post('/auth/register/request-otp', {
          name: payload.fullName || payload.name,
          email: payload.email,
          password: payload.password,
          role: payload.role
        });
      }
      throw err;
    }
  } else {
    return await apiClient.post('/auth/register/request-otp', {
      name: payload.fullName || payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role
    });
  }
};

/**
 * Unified OTP Verify for Registration
 * @param {{ email: string, otp: string }} payload 
 * @returns {Promise<any>}
 */
export const verifyRegisterOtp = async (payload) => {
  try {
    return await apiClient.post('/auth/register/verify-otp', {
      email: payload.email,
      otp: payload.otp
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return await candidateApiClient.post('/auth/register/verify-otp', {
        email: payload.email,
        otp: payload.otp
      });
    }
    throw err;
  }
};

/**
 * Request Password Reset OTP
 * @param {{ email: string }} payload 
 * @returns {Promise<any>}
 */
export const requestPasswordResetOtp = async (payload) => {
  return apiClient.post('/auth/forgot-password/request-otp', {
    email: payload.email
  });
};

/**
 * Reset Password
 * @param {{ email: string, otp: string, newPassword: string }} payload 
 * @returns {Promise<any>}
 */
export const resetPassword = async (payload) => {
  return apiClient.post('/auth/forgot-password/reset', {
    email: payload.email,
    otp: payload.otp,
    newPassword: payload.newPassword
  });
};

/**
 * Log out the current user
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('currentExamId');
};

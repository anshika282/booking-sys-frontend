// src/api/auth.js
import api from './index'

/**
 * Sends user credentials to the login endpoint.
 * @param {object} credentials - The user's email and password.
 * @returns {Promise} Axios promise
 */
export const loginUser = (credentials) => {
  return api.post('/auth/login', credentials)
}

/**
 * Sends the new user and tenant data to the register endpoint.
 * @param {object} registrationData - The registration form data.
 */
export const registerTenantAndUser = (registrationData) => {
  return api.post('/auth/register', registrationData)
}

// --- ADD THIS FUNCTION ---
/**
 * Fetches the currently authenticated user's data.
 * The JWT token must already be set in the api instance header for this to work.
 */
export const getMe = () => {
  return api.get('/me')
}

// We can add other auth-related API calls here later
// export const logoutUser = () => api.post('/auth/logout');
/**
 * Sends the password reset data to the backend.
 * @param {object} data - Contains token, email, password, and password_confirmation.
 */
export const resetPassword = (data) => {
  return api.post('/auth/reset-password', data)
}

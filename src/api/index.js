// src/api/index.js
import axios from 'axios'

const api = axios.create({
  // IMPORTANT: Use the URL of your running Laravel backend
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// This function will run for every single API response.
api.interceptors.response.use(
  // If the response is successful (status 2xx), just return it.
  (response) => response,

  // If the response has an error...
  (error) => {
    // Check if the error is a 401 Unauthorized
    if (error.response && error.response.status === 401) {
      const authStore = useAuthStore()

      // Log the user out (clears token from state and localStorage)
      authStore.logout()

      // Redirect the user to the login page
      // We use window.location to force a full page reload, clearing any old state.
      window.location.href = '/login'
    }

    // For any other error, just pass it along.
    return Promise.reject(error)
  },
)

// We will add interceptors here later to automatically add the JWT token
// to every request after the user logs in.

export default api

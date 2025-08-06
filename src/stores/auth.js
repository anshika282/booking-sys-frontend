// src/stores/auth.js
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { loginUser, registerTenantAndUser, getMe } from '@/api/auth'
import api from '@/api'

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  // Initialize the token from localStorage to keep the user logged in across page refreshes.
  const token = ref(localStorage.getItem('authToken'))
  const user = ref(null)
  const isInitiallyLoading = ref(true)

  // --- GETTERS ---
  // A user is only "authenticated" if we have their user object.
  const isAuthenticated = computed(() => !!user.value)

  // --- ACTIONS ---

  /**
   * The single source of truth for setting the auth token.
   * It updates the state, localStorage, and the default Axios header.
   * @param {string | null} newToken
   */
  function setToken(newToken) {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('authToken', newToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    } else {
      localStorage.removeItem('authToken')
      delete api.defaults.headers.common['Authorization']
    }
  }

  /**
   * Handles the login logic. It calls the API, and on success,
   * commits the token to the state.
   * @param {object} credentials
   */
  async function login(credentials) {
    // We let the component handle try/catch for UI feedback.
    // If this call fails, it will throw an error that the component can catch.
    const response = await loginUser(credentials)
    const newToken = response.data.access_token
    setToken(newToken)
    await fetchUser()
    // In a real app, you would also fetch user data here:
    // await fetchUser();
  }

  async function register(registrationData) {
    const response = await registerTenantAndUser(registrationData)
    // The backend returns a token on successful registration,
    // so we can log the user in immediately.
    setToken(response.data.access_token)
    await fetchUser()
  }

  /**
   * Logs the user out by clearing the token and user state.
   */
  function logout() {
    // Here you would also call an API endpoint to invalidate the token on the backend
    // await logoutUser();
    setToken(null)
    user.value = null
  }

  // --- NEW ACTION to fetch user data ---
  async function fetchUser() {
    if (token.value) {
      try {
        const response = await getMe()
        user.value = response.data.data
      } catch (error) {
        console.error('Failed to fetch user:', error)
        // If the token is invalid, log the user out
        logout()
      }
    }
  }

  // --- INITIALIZATION ---
  // This runs once when the store is first used.
  // If a token was found in localStorage, this ensures the Axios header is set
  // for the very first API call the app makes.
  async function attemptLoginFromToken() {
    if (token.value) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      await fetchUser() // Attempt to fetch user data
    }
    isInitiallyLoading.value = false // Mark initial loading as complete
  }
  return {
    token,
    user,
    isAuthenticated,
    isInitiallyLoading,
    login,
    register,
    logout,
    fetchUser,
    attemptLoginFromToken,
  }
})

// src/stores/customerAuthStore.js
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api'

export const useCustomerAuthStore = defineStore('customerAuth', () => {
  const customer = ref(null)
  const token = ref(sessionStorage.getItem('customerAuthToken'))
  const verificationToken = ref(null) // Holds the temporary signed token for new users
  const verifiedPhoneNumber = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!customer.value)

  function setToken(newToken) {
    token.value = newToken
    if (newToken) sessionStorage.setItem('customerAuthToken', newToken)
    else sessionStorage.removeItem('customerAuthToken')
  }

  async function sendOtp(phoneNumber) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post('/public/auth/send-otp', { phone_number: phoneNumber })
      console.log('TESTING ONLY - OTP:', response.data.testing_otp)
      return true
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to send OTP.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function verifyOtp(payload) {
    isLoading.value = true
    error.value = null
    verificationToken.value = null
    try {
      const response = await api.post('/public/auth/verify-otp', payload)
      if (response.data.status === 'found') {
        customer.value = response.data.customer
        setToken(response.data.token)
        verifiedPhoneNumber.value = response.data.customer.phone_number
        return { status: 'found' }
      } else if (response.data.status === 'new_user') {
        verifiedPhoneNumber.value = payload.phone_number
        verificationToken.value = response.data.verification_token
        return { status: response.data.status, customer_data: response.data.customer_data ?? null }
      } else if (response.data.status === 'verified_new_user') {
        this.verifiedPhoneNumber = payload.phone_number
        return { status: response.data.status, customer_data: response.data.customer_data ?? null }
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'OTP verification failed.'
      return { status: 'error' }
    } finally {
      isLoading.value = false
    }
  }

  async function registerCustomer(payload) {
    isLoading.value = true
    error.value = null
    try {
      // We post to the temporary signed URL held in the verificationToken
      const response = await api.post(verificationToken.value, payload)
      if (response.data.status === 'created') {
        customer.value = response.data.customer
        setToken(response.data.token)
        verificationToken.value = null // Clear the used token
        return true
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'Registration failed.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  function logout() {
    customer.value = null
    setToken(null)
  }

  return {
    customer,
    isAuthenticated,
    isLoading,
    error,
    sendOtp,
    verifyOtp,
    registerCustomer,
    verifiedPhoneNumber,
    logout,
  }
})

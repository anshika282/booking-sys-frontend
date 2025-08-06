<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Reactive state for our form fields
const tenantName = ref('')
const userName = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')

const tenantNameError = ref(null)
const userNameError = ref(null)
const emailError = ref(null)
const passwordError = ref(null)

// Reactive state for the UI
const isLoading = ref(false)
const serverError = ref(null)

const router = useRouter()
const authStore = useAuthStore()

const handleSignUp = async () => {
  serverError.value = null
  // --- Step 1: Run client-side validation first ---
  if (!validateForm()) {
    return // Stop the function if validation fails
  }
  isLoading.value = true

  // Basic client-side validation for password confirmation
  if (password.value !== passwordConfirmation.value) {
    serverError.value = 'Passwords do not match.'
    isLoading.value = false
    return
  }

  try {
    await authStore.register({
      tenant_name: tenantName.value,
      user_name: userName.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })

    // If registration is successful, redirect to the dashboard
    router.push({ name: 'admin-dashboard' })
  } catch (error) {
    if (error.response?.data?.error && typeof error.response.data.error === 'object') {
      // Handle Laravel's structured validation errors
      const errors = error.response.data.error
      const firstErrorKey = Object.keys(errors)[0]
      serverError.value = errors[firstErrorKey][0] // Display the first error message
    } else {
      // Handle generic errors
      serverError.value = error.response?.data?.error || 'An unexpected error occurred.'
    }
  } finally {
    isLoading.value = false
  }
}

const validateForm = () => {
  // Reset all errors before re-validating
  tenantNameError.value = null
  userNameError.value = null
  emailError.value = null
  passwordError.value = null

  let isValid = true

  // Name validation (letters and spaces only)
  const nameRegex = /^[a-zA-Z\s]*$/
  if (!nameRegex.test(tenantName.value)) {
    tenantNameError.value = 'Tenant name can only contain letters and spaces.'
    isValid = false
  }
  if (!nameRegex.test(userName.value)) {
    userNameError.value = 'Full name can only contain letters and spaces.'
    isValid = false
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    emailError.value = 'Please enter a valid email address.'
    isValid = false
  }

  // Password length validation
  if (password.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters long.'
    isValid = false
  }

  // Password confirmation validation
  if (password.value !== passwordConfirmation.value) {
    passwordError.value = 'Passwords do not match.'
    isValid = false
  }

  return isValid
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
    <form @submit.prevent="handleSignUp">
      <Card class="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle class="text-xl"> Create Your Account </CardTitle>
          <CardDescription> Enter your information to create a new tenant account </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4">
            <div class="grid gap-2">
              <Label for="tenant-name">Company / Tenant Name</Label>
              <Input
                id="tenant-name"
                v-model="tenantName"
                placeholder="Acme Inc."
                required
                :disabled="isLoading"
              />
              <p v-if="tenantNameError" class="text-sm text-red-600 mt-1">
                {{ tenantNameError }}
              </p>
            </div>
            <div class="grid gap-2">
              <Label for="user-name">User Full name</Label>
              <Input
                id="user-name"
                v-model="userName"
                placeholder="Max Robinson"
                required
                :disabled="isLoading"
              />
              <p v-if="userNameError" class="text-sm text-red-600 mt-1">{{ userNameError }}</p>
            </div>
            <div class="grid gap-2">
              <Label for="email">Email</Label>
              <Input
                id="email"
                v-model="email"
                type="email"
                placeholder="m@example.com"
                required
                :disabled="isLoading"
                :class="{ 'border-red-500': tenantNameError }"
              />
              <p v-if="emailError" class="text-sm text-red-600 mt-1">{{ emailError }}</p>
            </div>
            <div class="grid gap-2">
              <Label for="password">Password</Label>
              <Input
                id="password"
                v-model="password"
                type="password"
                required
                :disabled="isLoading"
                :class="{ 'border-red-500': passwordError }"
              />
            </div>
            <div class="grid gap-2">
              <Label for="password-confirmation">Confirm Password</Label>
              <Input
                id="password-confirmation"
                v-model="passwordConfirmation"
                type="password"
                required
                :disabled="isLoading"
                :class="{ 'border-red-500': emailError }"
              />
              <p v-if="passwordError" class="text-sm text-red-600 mt-1">{{ passwordError }}</p>
            </div>

            <!-- Error Display -->
            <div
              v-if="serverError"
              class="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 rounded-md"
            >
              {{ serverError }}
            </div>
            <Button type="submit" class="w-full" :disabled="isLoading">
              {{ isLoading ? 'Creating Account...' : 'Create an account' }}
            </Button>

            <!-- <Button variant="outline" class="w-full"> Sign up with GitHub </Button> -->
          </div>
          <div class="mt-4 text-center text-sm">
            Already have an account?
            <RouterLink to="/login" class="underline"> Sign in </RouterLink>
          </div>
        </CardContent>
      </Card>
    </form>
  </div>
</template>

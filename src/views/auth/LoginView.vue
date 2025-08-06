<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast/use-toast'
import { useAppToast } from '@/composables/useAppToast'

// Reactive variables for the form state
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref(null)

// Hooks for routing and state management
const router = useRouter()
const authStore = useAuthStore()
const { toast } = useToast()

// The function that handles the form submission
const handleLogin = async () => {
  isLoading.value = true
  errorMessage.value = null

  try {
    await authStore.login({ email: email.value, password: password.value })
    toast({
      title: 'Login Successful',
      description: `Welcome back, ${authStore.user.name}!`,
      class: 'border-green-500 bg-green-100',
    })

    // On success, redirect to the admin dashboard
    router.push({ name: 'admin-dashboard' })
  } catch (error) {
    // If the store action throws an error, display it
    errorMessage.value = error.response?.data?.error || 'An unexpected error occurred.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
    <!-- The form is now wrapped in a @submit.prevent handler -->
    <form @submit.prevent="handleLogin">
      <Card class="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle class="text-2xl">Login </CardTitle>
          <CardDescription>
            Enter your credentials to access your tenant dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4">
            <div class="grid gap-2">
              <Label for="email">Email</Label>
              <Input
                id="email"
                v-model="email"
                type="email"
                placeholder="owner@example.com"
                required
                :disabled="isLoading"
              />
            </div>
            <div class="grid gap-2">
              <div class="flex items-center">
                <Label for="password">Password</Label>
                <a href="#" class="ml-auto inline-block text-sm underline">
                  Forgot your password?
                </a>
              </div>
              <Input
                id="password"
                v-model="password"
                type="password"
                required
                :disabled="isLoading"
              />
            </div>

            <!-- Dynamic Error Message Display -->
            <div v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">
              {{ errorMessage }}
            </div>

            <Button type="submit" class="w-full" :disabled="isLoading">
              {{ isLoading ? 'Logging In...' : 'Log In' }}
            </Button>
            <!-- <Button variant="outline" class="w-full"> Login with Google </Button> -->
          </div>
          <div class="mt-4 text-center text-sm">
            Don't have an account?
            <RouterLink to="/signup" class="underline"> Sign up </RouterLink>
          </div>
        </CardContent>
      </Card>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetPassword } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast/use-toast'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  token: {
    type: String,
    required: true,
  },
})

const route = useRoute()
const router = useRouter()
const { toast } = useToast()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const password_confirmation = ref('')
const isLoading = ref(false)
const serverError = ref(null)

// When the component mounts, grab the email from the URL query string
onMounted(() => {
  email.value = route.query.email || ''
})

const handleSetPassword = async () => {
  serverError.value = null
  if (password.value.length < 8) {
    serverError.value = 'Password must be at least 8 characters.'
    return
  }
  if (password.value !== password_confirmation.value) {
    serverError.value = 'Passwords do not match.'
    return
  }
  isLoading.value = true

  try {
    await resetPassword({
      token: props.token,
      email: email.value,
      password: password.value,
      password_confirmation: password_confirmation.value,
    })

    const token = response.data.access_token
    if (token) {
      await authStore.loginWithToken(token)

      toast({
        title: 'Welcome!',
        description: 'Your password has been set and you are now logged in.',
        class: 'border-green-500 bg-green-100',
      })

      // Redirect to the main dashboard instead of the login page
      router.push({ name: 'admin-dashboard' })
    } else {
      // Fallback in case the token isn't returned (shouldn't happen)
      router.push({ name: 'login' })
    }
  } catch (error) {
    serverError.value =
      error.response?.data?.message || 'Invalid or expired token. Please request a new invitation.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
    <form @submit.prevent="handleSetPassword">
      <Card class="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle class="text-2xl">Set Your Password</CardTitle>
          <CardDescription>
            Welcome! Choose a secure password to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4">
            <div class="grid gap-2">
              <Label for="email">Email</Label>
              <!-- The email is pre-filled and read-only for security -->
              <Input
                id="email"
                v-model="email"
                type="email"
                required
                readonly
                class="bg-muted/50"
              />
            </div>
            <div class="grid gap-2">
              <Label for="password">New Password</Label>
              <Input
                id="password"
                v-model="password"
                type="password"
                required
                :disabled="isLoading"
              />
            </div>
            <div class="grid gap-2">
              <Label for="password-confirmation">Confirm New Password</Label>
              <Input
                id="password-confirmation"
                v-model="password_confirmation"
                type="password"
                required
                :disabled="isLoading"
              />
            </div>

            <div v-if="serverError" class="text-sm text-red-600 dark:text-red-400">
              {{ serverError }}
            </div>

            <Button type="submit" class="w-full" :disabled="isLoading">
              {{ isLoading ? 'Setting Password...' : 'Set Password and Log In' }}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  </div>
</template>

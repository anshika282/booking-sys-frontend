<script setup>
import { ref } from 'vue'
import { useCustomerAuthStore } from '@/stores/customerAuthStore'
import { useBookingIntentStore } from '@/stores/bookingIntentStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// const emit = defineEmits(['login-success', 'verification-success']). The parent (BookingWidget) will handle the navigation logic
const emit = defineEmits(['success', 'skip'])

const props = defineProps({
  initialPhoneNumber: { type: String, default: '' },
})
const customerStore = useCustomerAuthStore()
const bookingIntentStore = useBookingIntentStore()

const step = ref('phone') // 'phone', 'otp', 'register'
const phoneNumber = ref(customerStore.verifiedPhoneNumber || '')
const otp = ref('')
const name = ref(customerStore.customer?.name || '')
const email = ref(customerStore.customer?.email || '')
const error = ref('')

async function handleSendOtp() {
  error.value = ''
  if (!/^\d{10,15}$/.test(phoneNumber.value)) {
    error.value = 'Please enter a valid phone number.'
    return
  }
  customerStore.verifiedPhoneNumber = phoneNumber.value
  const success = await customerStore.sendOtp(phoneNumber.value)
  if (success) {
    step.value = 'otp'
  } else {
    error.value = customerStore.error
  }
}

async function handleVerifyOtp() {
  error.value = ''
  if (!/^\d{6}$/.test(otp.value)) {
    error.value = 'Please enter a 6-digit OTP.'
    return
  }

  if (!bookingIntentStore.tenantUuid) {
    error.value = 'Cannot verify OTP: Tenant context is missing.'
    return
  }

  const result = await customerStore.verifyOtp({
    phone_number: phoneNumber.value,
    otp: otp.value,
    tenant_uuid: bookingIntentStore.tenantUuid,
  })

  // if (result.status === 'found') {
  //   emit('login-success', customerStore.customer)
  // } else if (result.status === 'new_user') {
  //   step.value = 'register' // New user needs to provide details
  // } else if (result.status === 'verified_new_user') {
  //   emit('login-success', customerStore.customer) // New user, but details are in the main form
  // } else {
  //   error.value = customerStore.error
  // }

  if (result.status === 'found' || result.status === 'verified_new_user') {
    emit('success', customerStore.customer)
  } else {
    error.value = customerStore.error
  }
}

async function handleRegister() {
  error.value = ''
  if (!name.value.trim() || !email.value.trim()) {
    error.value = 'Name and email are required.'
    return
  }

  const success = await customerStore.registerCustomer({
    name: name.value,
    email: email.value,
    phone_number: phoneNumber.value,
    tenant_uuid: bookingIntentStore.tenantUuid,
  })

  if (success) {
    emit('login-success', customerStore.customer)
  } else {
    error.value = customerStore.error
  }
}

function handleSkip() {
  // Clear any partial verification to ensure a full guest flow
  customerStore.verifiedPhoneNumber = null
  emit('skip')
}
</script>

<template>
  <div class="space-y-4 p-4 border rounded-lg">
    <!-- Phone Step -->
    <form v-if="step === 'phone'" @submit.prevent="handleSendOtp" class="space-y-4">
      <h3 class="font-semibold text-center">Login or Sign Up</h3>
      <div class="grid gap-2">
        <Label for="phone">Enter your phone number to continue</Label>
        <Input id="phone" type="tel" v-model="phoneNumber" placeholder="e.g., 9876543210" />
      </div>
      <Button type="submit" :disabled="customerStore.isLoading" class="w-full">
        {{ customerStore.isLoading ? 'Sending OTP...' : 'Continue' }}
      </Button>
    </form>

    <!-- OTP Step -->
    <form v-if="step === 'otp'" @submit.prevent="handleVerifyOtp" class="space-y-4">
      <h3 class="font-semibold text-center">Verify Your Phone</h3>
      <div class="grid gap-2">
        <Label for="otp">Enter OTP</Label>
        <p class="text-sm text-muted-foreground">An OTP was sent to {{ phoneNumber }}.</p>
        <Input id="otp" type="text" v-model="otp" placeholder="Enter 6-digit code" />
      </div>
      <Button type="submit" :disabled="customerStore.isLoading" class="w-full">
        {{ customerStore.isLoading ? 'Verifying...' : 'Verify' }}
      </Button>
      <Button variant="link" @click="((step = 'phone'), (error = ''))" class="w-full">Back</Button>
    </form>

    <!-- Register Step
    <form v-if="step === 'register'" @submit.prevent="handleRegister" class="space-y-4">
      <h3 class="font-semibold text-center">Complete Your Profile</h3>
      <p class="text-sm text-muted-foreground text-center">
        Your phone number {{ phoneNumber }} is verified.
      </p>
      <div class="grid gap-2">
        <Label for="name">Full Name</Label>
        <Input id="name" type="text" v-model="name" />
      </div>
      <div class="grid gap-2">
        <Label for="email">Email Address</Label>
        <Input id="email" type="email" v-model="email" />
      </div>
      <Button type="submit" :disabled="customerStore.isLoading" class="w-full">
        {{ customerStore.isLoading ? 'Creating Account...' : 'Complete & Continue' }}
      </Button>
    </form> -->

    <p v-if="error" class="text-sm text-red-500 text-center">{{ error }}</p>

    <div
      v-if="step === 'phone' && bookingIntentStore.service?.login_flow_preference !== 'login_first'"
      class="text-center"
    >
      <Button variant="link" @click="handleSkip">or continue as guest</Button>
    </div>
  </div>
</template>

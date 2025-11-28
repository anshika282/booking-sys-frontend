<script setup>
import { ref, computed } from 'vue'
import { useBookingIntentStore } from '@/stores/bookingIntentStore'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-vue-next'
import api from '@/api'
import { useRouter } from 'vue-router'

const store = useBookingIntentStore()
const isInitiatingPayment = ref(false)
const isVerifying = ref(false)
const router = useRouter()

const finalTotal = computed(() => store.priceBreakdown?.final_total || 0)

const initiatePayment = async () => {
  isInitiatingPayment.value = true

  // Step 1: Call the backend to initiate payment and get the redirect URL
  try {
    const response = await api.post('/public/bookings/initiate-payment', {
      session_id: store.sessionId,
    })

    const redirectUrl = response.data.redirect_url

    if (redirectUrl) {
      // 2. Open PhonePe in SDK Iframe Mode
      openPhonePeIframe(redirectUrl)
    } else {
      throw new Error('Payment gateway did not return a redirect URL.')
    }
  } catch (error) {
    isInitiatingPayment.value = false
    console.error('Payment Initiation Failed:', error)

    // Step 3: Handle error by transitioning to error state
    store.error = error.response?.data?.error || 'Could not initiate payment. Please try again.'
    store.currentStep = 'error'
    router.push({
      name: 'booking-failure',
      query: { msg: store.error },
    })
  }
}

const openPhonePeIframe = (tokenUrl) => {
  // Ensure the script is loaded
  if (!window.PhonePeCheckout) {
    console.error('PhonePe SDK not loaded')
    store.error = 'Payment system unavailable (SDK missing).'
    return
  }

  // 3. Call the SDK
  window.PhonePeCheckout.transact({
    tokenUrl: tokenUrl,
    callback: handlePhonePeCallback,
    type: 'IFRAME', // This forces it to open inside your existing iframe
  })
}

const handlePhonePeCallback = async (response) => {
  console.log('PhonePe SDK Callback Response:', response)

  // The SDK has closed the payment UI. Now we are back in your Vue App.

  if (response === 'USER_CANCEL') {
    isInitiatingPayment.value = false
    // Optional: Show a toast saying "Payment cancelled"
    return
  }

  if (response === 'CONCLUDED') {
    // 4. Payment flow finished. Verify status with backend.
    await verifyPaymentStatus()
  }
}

const verifyPaymentStatus = async () => {
  isVerifying.value = true

  try {
    const res = await api.post('/public/bookings/verify-payment-status', {
      session_id: store.sessionId,
    })

    if (res.data.status === 'success') {
      // 5. SUCCESS! Redirect to internal Success Route
      // This changes the view inside your iframe to the Success Component
      router.push({ name: 'booking-success' })
    } else {
      // Failure
      router.push({
        name: 'booking-failure',
        query: { msg: res.data.message || 'Payment failed.' },
      })
    }
  } catch (error) {
    console.error('Verification error', error)
    router.push({
      name: 'booking-failure',
      query: { msg: 'Payment verification failed. Please contact support.' },
    })
  } finally {
    isVerifying.value = false
    isInitiatingPayment.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-center p-6 pt-10 animate-in fade-in">
    <h3 class="text-xl font-semibold mb-2">Ready for Payment</h3>
    <p class="text-muted-foreground mt-2">
      Total Charged:
      <span class="font-bold text-lg text-primary">₹{{ finalTotal.toFixed(2) }}</span>
    </p>

    <!-- EXPLANATION: This button now holds the payment initiation logic -->
    <Button
      class="mt-6 w-full max-w-xs"
      :disabled="isInitiatingPayment || finalTotal <= 0"
      @click="initiatePayment"
    >
      <Loader2 v-if="isInitiatingPayment" class="h-4 w-4 mr-2 animate-spin" />
      {{ isInitiatingPayment ? 'Redirecting...' : 'Initiate Payment' }}
    </Button>
    <p v-if="finalTotal <= 0" class="text-xs text-muted-foreground mt-2">
      Zero amount booking. Payment will be skipped on backend.
    </p>
  </div>
</template>

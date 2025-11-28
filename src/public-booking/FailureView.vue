<!-- src/views/public-booking/BookingFailureView.vue -->
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { AlertCircle, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip' // Import Tooltip for good UX

const route = useRoute()

// The raw error message comes from the backend's URL query parameter '?msg='
const rawBackendMessage = computed(
  () => route.query.msg || 'The payment could not be completed at this time.',
)
const transactionId = computed(() => route.query.txId || route.query.transactionId || null)

// --- EXPLANATION 1: User-Friendly Message Translation ---
// This computed property translates the raw backend message into a clear UX message.
const userMessage = computed(() => {
  const msg = rawBackendMessage.value

  if (msg.includes('Payment Success, but booking finalization failed')) {
    // This is a dangerous state (charged but not booked)
    return {
      title: 'Payment Processed, Booking Failed',
      detail:
        'Your payment was successful, but we encountered an issue finalizing your reservation. **Please do not attempt to re-book.** We have logged your transaction and will contact you shortly.',
      contact: true,
      showRetry: false,
    }
  }
  if (msg.includes('slot unavailable')) {
    // Race condition
    return {
      title: 'Slot Unavailable',
      detail:
        'Unfortunately, the selected slot was filled just before your payment could be processed. No charge has been made to your card. Please select a new time.',
      contact: false,
      showRetry: true,
    }
  }
  if (msg.includes('Transaction data missing')) {
    return {
      title: 'Incomplete Transaction',
      detail:
        'The payment process failed to return the necessary transaction details. Please try again.',
      contact: false,
      showRetry: true,
    }
  }

  if (msg.includes('Price discrepancy detected')) {
    return {
      title: 'Price Mismatch',
      detail:
        'The final price has changed since you started. Please restart the booking process to see the updated price. No charge has been made.',
      contact: false,
      showRetry: true, // Show the retry button
    }
  }

  // Default message for generic failures (user cancelled, card declined, generic gateway error)
  return {
    title: 'Transaction Unsuccessful',
    detail:
      'The payment was unsuccessful due to a card issue, cancellation, or a generic gateway error. Please double-check your payment details and try again.',
    contact: false,
  }
})

const handleStartNewBooking = () => {
  // In an embedded widget scenario, we want to reload the parent page to start a new, fresh intent.
  // This is the most reliable way to reset the SDK.
  window.top.location.href = '/' // Assumes '/' is the main domain or a generic entry page
}
function handleClose() {
  window.parent.postMessage('booking-widget-close', '*')
}

// In a real widget, you would get the support email from the initial BookableService data or a public config store.
const supportEmail = 'support@safariworld.com'
</script>

<template>
  <div class="flex items-center justify-center h-full bg-background p-4">
    <Card class="w-full max-w-lg shadow-xl border-destructive">
      <CardHeader class="bg-destructive/10 text-destructive">
        <CardTitle class="flex items-center gap-3 text-xl font-bold">
          <AlertCircle class="h-6 w-6" />
          {{ userMessage.title }}
        </CardTitle>
      </CardHeader>

      <CardContent class="p-6 space-y-6">
        <div
          class="p-4 bg-destructive/5 border border-destructive/20 rounded-md text-sm text-destructive"
        >
          <p>{{ userMessage.detail }}</p>
          <div v-if="transactionId" class="mt-3 text-xs font-mono">
            <span>Transaction ID: {{ transactionId }}</span>
          </div>
        </div>

        <div class="space-y-4">
          <Button
            v-if="userMessage.showRetry"
            @click="handleClose"
            class="w-full"
            variant="destructive"
            size="lg"
          >
            <RotateCcw class="h-5 w-5 mr-2" />
            Try Again
          </Button>
          <Button v-else @click="handleClose" class="w-full" variant="secondary" size="lg">
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

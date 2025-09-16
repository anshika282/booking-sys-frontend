<script setup>
import { computed, onMounted } from 'vue'
import { useBookingIntentStore } from '@/stores/bookingIntentStore'
import CalendarStep from './components/CalendarStep.vue'
import TicketsStep from './components/TicketStep.vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-vue-next'

// We no longer need props, as this component will get its data from the URL itself.
const store = useBookingIntentStore()

onMounted(() => {
  // This logic is moved here from IframeApp.vue
  const urlParams = new URLSearchParams(window.location.search)
  const sessionId = urlParams.get('session')

  if (sessionId) {
    store.initialize(sessionId)
  } else {
    store.error = 'Configuration error: No session ID provided.'
    store.currentStep = 'error'
  }
})

function handleClose() {
  // Communicate with the parent page (where sdk.js lives) to close the iframe
  window.parent.postMessage('booking-widget-close', '*')
}

const stepComponent = computed(() => {
  switch (store.currentStep) {
    case 'calendar':
      return CalendarStep
    case 'tickets':
      return TicketsStep
    default:
      return null
  }
})

const stepTitle = computed(() => {
  if (!store.service || store.currentStep === 'loading') return 'Loading...'
  if (store.currentStep === 'error') return 'An Error Occurred'
  return store.service.name
})

const isContinueDisabled = computed(() => {
  if (store.currentStep === 'calendar') {
    return !store.selectedSlot
  }
  if (store.currentStep === 'tickets') {
    const totalTickets = store.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0)
    return totalTickets === 0
  }
  return true
})

const handleContinue = () => {
  if (store.currentStep === 'calendar' && store.selectedSlot) {
    store.selectSlot(store.selectedSlot) // Pass the whole slot object
  } else if (store.currentStep === 'tickets') {
    store.currentStep = 'info'
  }
}
//  CREATE A COMPUTED PROPERTY FOR THE PRE-DISCOUNT TOTAL ---
// This provides a clean, reactive, and reusable value for our template.
const preDiscountTotal = computed(() => {
  if (!store.priceBreakdown) return 0
  // The correct total before coupon/discounts is the ticket subtotal + the add-ons total.
  return store.priceBreakdown.adjusted_subtotal + store.priceBreakdown.add_ons_total
})
</script>

<template>
  <!-- THIS IS THE NEW TEMPLATE. It's no longer a modal. -->
  <div class="h-screen w-screen flex flex-col bg-background">
    <!-- Header -->
    <div class="p-4 border-b relative flex items-center justify-center shrink-0">
      <h2 class="text-lg font-semibold truncate pr-8">{{ stepTitle }}</h2>
      <button
        @click="handleClose"
        class="absolute top-1/2 -translate-y-1/2 right-3 p-2 rounded-full hover:bg-muted"
        aria-label="Close"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Main Content (Scrollable) -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="store.currentStep === 'loading'" class="text-center pt-10">
        Loading Experience...
      </div>
      <div v-if="store.currentStep === 'error'" class="text-center text-destructive pt-10">
        {{ store.error }}
      </div>

      <component v-if="stepComponent" :is="stepComponent" />

      <div v-if="store.currentStep === 'info'">Visitor Info Step - Coming Soon!</div>
    </div>

    <!-- Footer (Always Visible) -->
    <div
      v-if="store.currentStep !== 'loading' && store.currentStep !== 'error'"
      class="p-4 border-t flex items-center justify-between shrink-0"
    >
      <div>
        <Button
          v-if="store.currentStep === 'tickets'"
          variant="ghost"
          @click="store.goBackToCalendar()"
        >
          Back
        </Button>
      </div>

      <div class="flex items-center gap-4">
        <!-- --- NEW: Dynamic Price Display --- -->
        <div class="text-right">
          <p class="text-sm text-muted-foreground">Total</p>
          <div v-if="store.isCalculatingPrice" class="text-xl font-bold">...</div>
          <div v-else-if="store.priceBreakdown">
            <!-- Show strikethrough price ONLY if there's a discount -->
            <p
              v-if="store.priceBreakdown.discounts.length > 0"
              class="text-sm text-gray-400 line-through"
            >
              ₹{{ preDiscountTotal.toFixed(2) }}
            </p>
            <p class="text-xl font-bold">₹{{ store.priceBreakdown.final_total.toFixed(2) }}</p>
          </div>
          <div v-else class="text-xl font-bold">₹0.00</div>
        </div>

        <Button @click="handleContinue" :disabled="isContinueDisabled" size="lg"> Continue </Button>
      </div>
    </div>
  </div>
</template>

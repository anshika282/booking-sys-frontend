<script setup>
import { computed, onMounted } from 'vue'
import { useBookingIntentStore } from '@/stores/bookingIntentStore'
import BookingWidget from '@/public-booking/BookingWidget.vue'
import CalendarStep from '@/public-booking/components/CalendarStep.vue'
import TicketsStep from '@/public-booking/components/TicketStep.vue'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-vue-next'

const store = useBookingIntentStore()

// --- THIS IS THE FIX ---
// The component only needs to do one thing: get the session ID and initialize the store.

function sendReadySignal() {
  window.parent.postMessage('booking-widget-ready', '*')
}
onMounted(() => {
  // This logic is moved here from IframeApp.vue
  const urlParams = new URLSearchParams(window.location.search)
  const sessionId = urlParams.get('session')

  if (sessionId) {
    //store.initialize(sessionId)
    store.initialize(sessionId).then(() => {
      // Once the store is initialized (data is loaded), send the signal
      sendReadySignal()
    })
  } else {
    store.error = 'Configuration error: No session ID provided.'
    store.currentStep = 'error'
    sendReadySignal()
  }
})

function handleClose() {
  // Use postMessage to communicate with the parent page (where the widget script lives)
  window.parent.postMessage('booking-widget-close', '*')
}

const stepTitle = computed(() => {
  if (!store.service || store.currentStep === 'loading') return 'Loading...'
  if (store.currentStep === 'error') return 'An Error Occurred'
  return store.service.name
})
</script>

<template>
  <!-- This component now simply renders the BookingWidget and passes the onClose handler -->
  <BookingWidget :onClose="handleClose" />
</template>

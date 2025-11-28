<!-- src/views/public-booking/BookingSuccessView.vue -->
<script setup>
import { CheckCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

// This component is rendered inside the iframe.
// The primary action should be to close the widget.

function handleClose() {
  // Communicate with the parent page (where sdk.js lives) to close the iframe
  window.parent.postMessage('booking-widget-close', '*')
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col items-center justify-center bg-background p-6">
    <div class="text-center space-y-6">
      <CheckCircle class="h-16 w-16 text-primary mx-auto animate-in zoom-in-50 duration-500" />
      <h1 class="text-3xl font-bold tracking-tight text-foreground">Booking Confirmed!</h1>
      <p class="text-lg text-muted-foreground">
        Thank you! Your booking has been successfully confirmed.
      </p>

      <!-- Optional: You can fetch and display the Booking Reference here -->
      <!-- <p class="text-sm text-gray-500">Booking Reference: #{{ $route.query.ref }}</p> -->

      <p class="text-sm text-muted-foreground">A confirmation email has been sent to your inbox.</p>

      <Button size="lg" @click="handleClose" class="w-full max-w-xs"> Close Window </Button>
    </div>
  </div>
</template>

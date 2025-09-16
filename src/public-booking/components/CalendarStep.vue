<script setup>
import { ref, watch, computed } from 'vue'
import { useBookingIntentStore } from '@/stores/bookingIntentStore'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { today, getLocalTimeZone } from '@internationalized/date'
import { useBreakpoints } from '@vueuse/core'

const store = useBookingIntentStore()
const selectedDate = ref(null)

// --- NEW: Responsive Calendar ---
// Use VueUse to detect screen size for a responsive calendar
const breakpoints = useBreakpoints({
  sm: 640,
})
const isSmallScreen = breakpoints.smaller('sm')
const numberOfMonths = computed(() => (isSmallScreen.value ? 1 : 2))
// --- END NEW ---

watch(selectedDate, (newDate) => {
  if (newDate) {
    const dateString = newDate.toString()
    store.fetchDailyManifest(dateString)
  }
})

const formatTime = (timeString) => {
  const [hours, minutes] = timeString.split(':')
  const date = new Date()
  date.setHours(hours, minutes)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h3 class="font-semibold mb-2 text-center text-lg">Select a Date</h3>
      <div class="flex justify-center">
        <Calendar
          v-model="selectedDate"
          :min-value="today(getLocalTimeZone())"
          :number-of-months="numberOfMonths"
          class="rounded-md border p-0"
        />
      </div>
    </div>

    <div v-if="store.selectedDate" class="animate-in fade-in">
      <h3 class="font-semibold mb-3 text-center text-lg">Select a Time</h3>
      <div v-if="store.isLoadingManifest" class="text-center text-muted-foreground py-4">
        Loading times...
      </div>
      <div
        v-else-if="!store.dailyManifest || store.dailyManifest.slots.length === 0"
        class="text-center text-muted-foreground py-4 bg-muted rounded-md"
      >
        No available times for this date.
      </div>
      <div v-else class="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <Button
          v-for="slot in store.dailyManifest.slots"
          :key="slot.id"
          :variant="store.selectedSlot === slot.id ? 'default' : 'outline'"
          @click="store.selectSlot(slot)"
        >
          {{ formatTime(slot.start_time.split(' ')[1]) }}
        </Button>
      </div>
    </div>
  </div>
</template>

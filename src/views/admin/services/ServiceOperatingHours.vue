<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// --- IMPORT Checkbox INSTEAD OF Switch ---
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast/use-toast'

const props = defineProps({
  id: { type: String, required: true },
})

const router = useRouter()
const { toast } = useToast()
const serviceName = ref('')
const isLoading = ref(true) //true
const errors = ref({})

const schedule = ref([
  { day: 'Sunday', day_of_week: 0, is_enabled: false, open_time: '09:00', close_time: '17:00' },
  { day: 'Monday', day_of_week: 1, is_enabled: false, open_time: '09:00', close_time: '17:00' },
  { day: 'Tuesday', day_of_week: 2, is_enabled: false, open_time: '09:00', close_time: '17:00' },
  { day: 'Wednesday', day_of_week: 3, is_enabled: false, open_time: '09:00', close_time: '17:00' },
  { day: 'Thursday', day_of_week: 4, is_enabled: false, open_time: '09:00', close_time: '17:00' },
  { day: 'Friday', day_of_week: 5, is_enabled: false, open_time: '09:00', close_time: '17:00' },
  { day: 'Saturday', day_of_week: 6, is_enabled: false, open_time: '09:00', close_time: '17:00' },
])

// --- NO toggleDay FUNCTION IS NEEDED. v-model handles everything. ---
const validateSchedule = () => {
  errors.value = {} // Reset errors
  let isValid = true

  schedule.value.forEach((day) => {
    if (day.is_enabled) {
      if (!day.open_time || !day.close_time) {
        errors.value[day.day_of_week] = 'Both open and close times are required.'
        isValid = false
      } else if (day.close_time <= day.open_time) {
        errors.value[day.day_of_week] = 'Close time must be after open time.'
        isValid = false
      }
    }
  })

  if (!isValid) {
    toast({
      title: 'Invalid Times',
      description: 'Please correct the highlighted time entries.',
      variant: 'destructive',
    })
  }

  return isValid
}

const applyPreset = (preset) => {
  schedule.value.forEach((day) => {
    let shouldEnable = false
    if (preset === 'weekdays') shouldEnable = day.day_of_week >= 1 && day.day_of_week <= 5
    else if (preset === 'weekends') shouldEnable = day.day_of_week === 0 || day.day_of_week === 6
    else if (preset === 'everyday') shouldEnable = true
    day.is_enabled = shouldEnable
  })
}

const clearAll = () => {
  schedule.value.forEach((day) => {
    day.is_enabled = false
  })
}

const saveSchedule = async () => {
  // 1. Run validation first
  if (!validateSchedule()) {
    return
  }

  isLoading.value = true

  // 2. Prepare the payload with all 7 days
  const payload = {
    hours: schedule.value.map((day) => ({
      day_of_week: day.day_of_week,
      is_enabled: day.is_enabled,
      open_time: day.open_time,
      close_time: day.close_time,
    })),
    generate_slots_for_days: 30,
  }

  try {
    // 3. Make the API call
    await api.put(`/services/${props.id}/operating-hours`, payload)

    // 4. Show success toast
    toast({
      title: 'Schedule Saved!',
      description: 'The operating hours have been successfully updated.',
    })

    // 5. Redirect to the next step
    router.push({ name: 'admin-service-ticket-tiers', params: { id: props.id } })
  } catch (error) {
    console.error('Failed to save schedule:', error)

    if (error.response?.status === 422 && error.response.data.errors) {
      const serverErrors = error.response.data.errors
      // Loop through server errors and extract the FIRST message for each field.
      for (const key in serverErrors) {
        if (serverErrors[key] && serverErrors[key].length > 0) {
          errors.value[key] = serverErrors[key][0]
        }
      }
    } else {
      toast({
        title: 'An error occurred',
        description: error.response?.data?.message || 'Could not save the schedule.',
        variant: 'destructive',
      })
    }
  } finally {
    isLoading.value = false
  }
}
onMounted(async () => {
  /* ... onMounted logic remains the same ... */
  isLoading.value = true
  try {
    // Fetch service name and existing schedule in parallel for efficiency
    const [serviceRes, scheduleRes] = await Promise.all([
      api.get(`/services/${props.id}`),
      api.get(`/services/${props.id}/operating-hours`),
    ])

    serviceName.value = serviceRes.data.data.name
    const existingHours = scheduleRes.data.data

    // Check if there's any saved schedule to pre-populate the form
    if (existingHours && existingHours.length > 0) {
      const hoursMap = new Map(existingHours.map((h) => [h.day_of_week, h]))

      // Update our local schedule ref based on the fetched data
      schedule.value.forEach((day) => {
        if (hoursMap.has(day.day_of_week)) {
          const existingDay = hoursMap.get(day.day_of_week)
          day.is_enabled = true // API only returns enabled days
          // Format time to HH:mm for the input field
          day.open_time = existingDay.open_time.substring(0, 5)
          day.close_time = existingDay.close_time.substring(0, 5)
        } else {
          day.is_enabled = false
        }
      })
    }
  } catch (error) {
    console.error('Failed to fetch operating hours:', error)
    toast({
      title: 'Error',
      description: 'Could not load the existing schedule.',
      variant: 'destructive',
    })
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Operating Hours (Step 2 of 4)</CardTitle>
      <CardDescription>Define the weekly schedule for "{{ serviceName }}".</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-6">
      <!-- Preset Buttons (unchanged) -->
      <div class="flex flex-wrap gap-2 p-4 bg-muted rounded-lg">
        <Button
          size="sm"
          variant="outline"
          type="button"
          @click="applyPreset('weekdays')"
          :disabled="isLoading"
          >Weekdays (Mon-Fri)</Button
        >
        <Button
          size="sm"
          variant="outline"
          type="button"
          @click="applyPreset('weekends')"
          :disabled="isLoading"
          >Weekends Only</Button
        >
        <Button
          size="sm"
          variant="outline"
          type="button"
          @click="applyPreset('everyday')"
          :disabled="isLoading"
          >Every Day</Button
        >
        <Button
          size="sm"
          variant="destructive"
          class="ml-auto"
          type="button"
          @click="clearAll"
          :disabled="isLoading"
          >Clear All</Button
        >
      </div>

      <!-- Schedule Table -->
      <div class="border rounded-lg">
        <div
          v-for="day in schedule"
          :key="day.day_of_week"
          class="flex items-center justify-between p-4 border-b last:border-b-0"
        >
          <!-- --- THE FIX IS HERE --- -->
          <!-- We now use a Checkbox with a Label for a much better and more reliable experience -->
          <div class="flex items-center gap-4">
            <Checkbox
              :id="`day-${day.day_of_week}`"
              v-model="day.is_enabled"
              :disabled="isLoading"
            />
            <Label
              :for="`day-${day.day_of_week}`"
              class="text-base font-medium w-24 cursor-pointer select-none"
              :class="{ 'text-muted-foreground': isLoading }"
            >
              {{ day.day }}
            </Label>
          </div>

          <div
            v-if="day.is_enabled"
            class="flex items-center gap-4 animate-in fade-in duration-300"
          >
            <Input
              type="time"
              v-model="day.open_time"
              :class="{ 'border-red-500': errors[day.day_of_week] }"
              :disabled="isLoading"
            />
            <span>-</span>
            <Input
              type="time"
              v-model="day.close_time"
              :class="{ 'border-red-500': errors[day.day_of_week] }"
              :disabled="isLoading"
            />
          </div>

          <div v-else class="text-muted-foreground">Closed</div>
        </div>
      </div>

      <!-- Action Buttons (unchanged) -->
      <div class="flex justify-end gap-2 border-t pt-6">
        <Button variant="outline" type="button" @click="router.back()" :disabled="isLoading"
          >Back</Button
        >
        <Button type="button" :disabled="isLoading" @click="saveSchedule">
          {{ isLoading ? 'Saving...' : 'Save and Continue' }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

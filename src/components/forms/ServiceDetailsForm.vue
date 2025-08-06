<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import LocationForm from '@/components/forms/LocationForm.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const props = defineProps({
  mode: { type: String, required: true },
  serviceId: { type: [String, Number], default: null },
})

const emit = defineEmits(['submitSuccess'])
const router = useRouter()
const { toast } = useToast()
const isEditMode = computed(() => props.mode === 'edit')
const isLoading = ref(true)
const errors = ref({})
const allLocations = ref([])
const isLocationDialogOpen = ref(false)

// Form state refs
const name = ref('')
const service_type = ref(null)
const duration_minutes = ref(60)
const booking_window_min_days = ref(1)
const booking_window_max_days = ref(30)
const slot_consumption_mode = ref('per_ticket')
const slot_selection_mode = ref('list_all')
const venue_name = ref('')
const default_capacity = ref(50)
const requires_waiver = ref(false)
const buffer_time_minutes = ref(0)
const requires_provider = ref(true)

// We need a new state ref for the location ID
const location_id = ref(null)

// --- UPDATED: Data Fetching for Edit Mode ---
onMounted(async () => {
  try {
    const response = await api.get('/locations')
    allLocations.value = response.data.data
  } catch (error) {
    console.error('Failed to fetch locations:', error)
  }

  if (isEditMode.value) {
    try {
      const response = await api.get(`/services/${props.serviceId}`)
      const service = response.data.data

      // Populate all form fields with data from the API
      name.value = service.name
      // Determine service type based on which details object is present
      service_type.value =
        service.details.venue_name !== undefined ? 'ticketed_event' : 'appointment'
      duration_minutes.value = service.duration_minutes
      booking_window_min_days.value = service.booking_window.min_days_advance
      booking_window_max_days.value = service.booking_window.max_days_advance
      slot_consumption_mode.value = service.capacity_consumption_mode
      slot_selection_mode.value = service.slot_selection_mode

      if (service_type.value === 'ticketed_event') {
        venue_name.value = service.details.venue_name
        default_capacity.value = service.default_capacity
        console.log('Service details:', service.details)
        console.log(' Default capacity:', default_capacity.value)
        console.log('Def cap ::', service.default_capacity)
        location_id.value = service.details.location_id // Pre-fill location
        requires_waiver.value = Boolean(service.details.requires_waiver)
        console.log('Requires waiver:', requires_waiver.value)
      } else {
        buffer_time_minutes.value = service.details.buffer_time_minutes
        requires_provider.value = Boolean(service.details.requires_provider)
      }

      try {
        const response = await api.get('/locations')
        allLocations.value = response.data.data
      } catch (error) {
        console.error('Failed to fetch locations:', error)
      }
    } catch (error) {
      console.error('Failed to fetch service data:', error)
      toast({ title: 'Error', description: 'Could not load service data.', variant: 'destructive' })
      router.push({ name: 'admin-services' }) // Redirect back if service not found
    }
  }
  isLoading.value = false
})

// --- CLIENT-SIDE VALIDATION ---
const validateForm = () => {
  errors.value = {}
  if (!service_type.value) errors.value.service_type = 'Service type is required.'
  if (!name.value) errors.value.name = 'Service name is required.'
  if (!duration_minutes.value || parseInt(duration_minutes.value) < 1)
    errors.value.duration_minutes = 'Duration must be at least 1 minute.'
  const minDays = parseInt(booking_window_min_days.value)
  const maxDays = parseInt(booking_window_max_days.value)
  if (!minDays || minDays < 1) errors.value.booking_window_min_days = 'Min days must be at least 1.'
  if (!maxDays || maxDays > 30)
    errors.value.booking_window_max_days = 'Max days cannot be more than 30.'
  if (maxDays < minDays)
    errors.value.booking_window_max_days = 'Max days must be greater than or equal to min days.'
  if (service_type.value === 'ticketed_event') {
    if (!venue_name.value) errors.value.venue_name = 'Venue name is required for ticketed events.'
    if (!default_capacity.value || parseInt(default_capacity.value) < 1)
      errors.value.default_capacity = 'Capacity must be at least 1 for events.'
  }
  return Object.keys(errors.value).length === 0
}

const handleLocationAdded = async (newLocationData) => {
  try {
    // 1. Make the POST API call to create the new location
    const response = await api.post('/locations', newLocationData)
    const newLocation = response.data.data // Get the created location from the response

    // 2. Close the dialog
    isLocationDialogOpen.value = false

    // 3. Show the success toast
    toast({ title: 'Location Added', description: `"${newLocation.name}" has been created.` })

    // 4. Update the locations list in the dropdown
    // We can just add the new location to our existing list without a full refetch
    allLocations.value.push(newLocation)

    // 5. Automatically select the newly created location
    // Use nextTick to ensure the dropdown has time to update before we set the value
    await nextTick()
    location_id.value = newLocation.id
  } catch (error) {
    console.error('Failed to add new location:', error)
    toast({
      title: 'Error Creating Location',
      description:
        error.response?.data?.message || 'Please check the location details and try again.',
      variant: 'destructive',
    })
  }
}

const handleSubmit = async () => {
  if (!validateForm()) return // Stop if client-side validation fails
  isLoading.value = true
  // Payload assembly and API call logic remains here...
  errors.value = {} // Clear previous server errors

  try {
    // Assemble the payload object from all individual refs
    const payload = {
      name: name.value,
      service_type: service_type.value,
      duration_minutes: duration_minutes.value,
      booking_window_min_days: booking_window_min_days.value,
      booking_window_max_days: booking_window_max_days.value,
      slot_consumption_mode: slot_consumption_mode.value,
      slot_selection_mode: slot_selection_mode.value,
    }

    if (service_type.value === 'ticketed_event') {
      payload.venue_name = venue_name.value
      payload.default_capacity = default_capacity.value
      payload.requires_waiver = requires_waiver.value
      payload.location_id = location_id.value
    } else if (service_type.value === 'appointment') {
      payload.buffer_time_minutes = buffer_time_minutes.value
      payload.requires_provider = requires_provider.value
    }

    let response
    if (isEditMode.value) {
      // For PATCH, you might send a different subset of fields
      const payloadEdit = {
        booking_window_min_days: booking_window_min_days.value,
        booking_window_max_days: booking_window_max_days.value,
        requires_waiver: requires_waiver.value,
        location_id: location_id.value,
        // Add other editable fields from your backend request here
        // e.g., slot_selection_mode: slot_selection_mode.value,
      }
      response = await api.patch(`/services/${props.serviceId}`, payloadEdit)
    } else {
      response = await api.post('/services', payload)
    }

    const service = response.data.data || response.data
    toast({
      title: `Service ${isEditMode.value ? 'Updated' : 'Created'}!`,
      description: `"${service.name}" details have been saved.`,
    })

    if (isEditMode.value) {
      // If we are in edit mode, we are already inside the wizard.
      // We can directly navigate to the next step.
      router.push({
        name: 'admin-service-operating-hours',
        params: { id: props.serviceId },
      })
    } else {
      // If in create mode, emit the success event to the parent wrapper view.
      // The wrapper is responsible for the initial redirect into the wizard.
      emit('submitSuccess', service)
    }
  } catch (error) {
    console.error('Submission failed:', error) // Good for debugging
    if (error.response?.status === 422) {
      errors.value = error.response.data.errors
    } else {
      toast({
        title: 'An error occurred',
        description: 'Could not save the service. Please try again.',
        variant: 'destructive',
      })
    }
  } finally {
    isLoading.value = false // This will now correctly execute
  }
}
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <!-- The form tag now correctly wraps the entire card -->
  <form v-else @submit.prevent="handleSubmit">
    <Card>
      <CardHeader :class="isEditMode ? 'bg-background' : 'bg-primary text-primary-foreground'">
        <CardTitle>{{
          isEditMode ? `Edit Service (Step 1)` : 'Create New Service (Step 1)'
        }}</CardTitle>
        <CardDescription v-if="!isEditMode" class="text-primary-foreground/90">
          Start by defining the basic details for your new experience.
        </CardDescription>
        <CardDescription v-else class="text-primary-foreground/90">
          Update the core details of your service. Some fields are locked after creation.
        </CardDescription>
      </CardHeader>

      <!-- All form content is now correctly inside CardContent -->
      <CardContent class="pt-6">
        <div class="grid gap-6">
          <!-- Service Type -->
          <div class="grid gap-2">
            <Label for="service_type">Service Type <span class="text-red-500">*</span></Label>
            <Select v-model="service_type" :disabled="isEditMode">
              <SelectTrigger
                :class="{
                  'border-red-500': errors.service_type,
                  'bg-muted/50 cursor-not-allowed': isEditMode,
                }"
                ><SelectValue placeholder="Select a service type"
              /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ticketed_event">Ticketed Event</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.service_type" class="text-sm text-red-500 mt-1">
              {{ errors.service_type }}
            </p>
          </div>

          <!-- Service Name -->
          <div class="grid gap-2">
            <Label for="name">Service Name <span class="text-red-500">*</span></Label>
            <Input
              id="name"
              v-model="name"
              placeholder="e.g., Downtown History Tour"
              :disabled="isEditMode"
              :class="{
                'border-red-500': errors.name,
                'bg-muted/50 cursor-not-allowed': isEditMode,
              }"
            />
            <p v-if="errors.name" class="text-sm text-red-500 mt-1">{{ errors.name }}</p>
          </div>

          <!-- Duration -->
          <div class="grid gap-2">
            <Label for="duration_minutes"
              >Duration (in minutes) <span class="text-red-500">*</span></Label
            >
            <Input
              id="duration_minutes"
              type="number"
              v-model="duration_minutes"
              :disabled="isEditMode"
              :class="{
                'border-red-500': errors.duration_minutes,
                'bg-muted/50 cursor-not-allowed': isEditMode,
              }"
            />
            <p v-if="errors.duration_minutes" class="text-sm text-red-500 mt-1">
              {{ errors.duration_minutes }}
            </p>
          </div>

          <!-- Booking Window -->
          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="booking_window_min_days"
                >Min. Booking Days <span class="text-red-500">*</span></Label
              >
              <Input
                id="booking_window_min_days"
                type="number"
                v-model="booking_window_min_days"
                :class="{ 'border-red-500': errors.booking_window_min_days }"
              />
              <p v-if="errors.booking_window_min_days" class="text-sm text-red-500 mt-1">
                {{ errors.booking_window_min_days }}
              </p>
            </div>
            <div class="grid gap-2">
              <Label for="booking_window_max_days"
                >Max. Booking Days <span class="text-red-500">*</span></Label
              >
              <Input
                id="booking_window_max_days"
                type="number"
                v-model="booking_window_max_days"
                :class="{ 'border-red-500': errors.booking_window_max_days }"
              />
              <p v-if="errors.booking_window_max_days" class="text-sm text-red-500 mt-1">
                {{ errors.booking_window_max_days }}
              </p>
            </div>
          </div>

          <!-- Slot Configuration -->
          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="slot_consumption_mode"
                >Slot Capacity Consumption <span class="text-red-500">*</span></Label
              >
              <Select v-model="slot_consumption_mode" :disabled="isEditMode">
                <SelectTrigger class="{ 'bg-muted/50 cursor-not-allowed': isEditMode }"
                  ><SelectValue
                /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_ticket">Per Ticket</SelectItem>
                  <SelectItem value="per_booking">Per Booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid gap-2">
              <Label for="slot_selection_mode"
                >Slot Schedule Preference <span class="text-red-500">*</span></Label
              >
              <Select v-model="slot_selection_mode" :disabled="isEditMode">
                <SelectTrigger class="{ 'bg-muted/50 cursor-not-allowed': isEditMode }"
                  ><SelectValue
                /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="list_all">List All Available Slots</SelectItem>
                  <SelectItem value="find_next">Show Next Available Slot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <!-- Conditional Fields -->
          <div v-if="service_type">
            <div v-if="service_type">
              <div v-if="service_type === 'ticketed_event'" class="grid gap-6 border-t pt-6 mt-6">
                <h3 class="font-semibold text-lg">Event Details</h3>
                <div class="grid gap-2">
                  <Label for="venue_name">Venue Name <span class="text-red-500">*</span></Label>
                  <Input
                    id="venue_name"
                    v-model="venue_name"
                    placeholder="e.g., City Museum"
                    :disabled="isEditMode"
                    :class="{
                      'border-red-500': errors.venue_name,
                      'bg-muted/50 cursor-not-allowed': isEditMode,
                    }"
                  />
                  <p v-if="errors.venue_name" class="text-sm text-red-500 mt-1">
                    {{ errors.venue_name }}
                  </p>
                </div>
                <div class="grid gap-2">
                  <Label for="default_capacity"
                    >Default Event Capacity <span class="text-red-500">*</span></Label
                  >
                  <Input
                    id="default_capacity"
                    type="number"
                    v-model="default_capacity"
                    :disabled="isEditMode"
                    :class="{
                      'border-red-500': errors.default_capacity,
                      'bg-muted/50 cursor-not-allowed': isEditMode,
                    }"
                  />
                  <p v-if="errors.default_capacity" class="text-sm text-red-500 mt-1">
                    {{ errors.default_capacity }}
                  </p>
                </div>
                <div class="flex items-center justify-between rounded-lg border p-4">
                  <div class="space-y-0.5">
                    <Label for="requires-waiver" class="text-base">Require Waiver</Label>
                    <p class="text-sm text-muted-foreground">
                      If enabled, customers must sign a waiver.
                    </p>
                  </div>
                  <Switch
                    id="requires-waiver"
                    :checked="requires_waiver"
                    @update:checked="(newValue) => (requires_waiver = newValue)"
                  />
                </div>
                <div class="grid gap-2">
                  <Label for="location">Location <span class="text-red-500">*</span></Label>
                  <div class="flex items-center gap-2">
                    <Select v-model="location_id">
                      <SelectTrigger
                        ><SelectValue placeholder="Select a location..."
                      /></SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="loc in allLocations" :key="loc.id" :value="loc.id">
                          {{ loc.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" type="button" @click="isLocationDialogOpen = true">
                      Add New
                    </Button>
                  </div>
                  <!-- Error display here -->
                </div>
                <LocationForm
                  v-if="isLocationDialogOpen"
                  @save="handleLocationAdded"
                  :initialData="{}"
                />
              </div>

              <div v-if="service_type === 'appointment'" class="grid gap-6 border-t pt-6 mt-6">
                <h3 class="font-semibold text-lg">Appointment Details</h3>
                <div class="grid gap-2">
                  <Label for="buffer_time_minutes">Buffer Time (in minutes)</Label>
                  <Input
                    id="buffer_time_minutes"
                    type="number"
                    v-model="buffer_time_minutes"
                    :disabled="isEditMode"
                    :class="{
                      'border-red-500': errors.buffer_time_minutes,
                      'bg-muted/50 cursor-not-allowed': isEditMode,
                    }"
                  />
                  <p v-if="errors.buffer_time_minutes" class="text-sm text-red-500 mt-1">
                    {{ errors.buffer_time_minutes }}
                  </p>
                </div>
                <div class="flex items-center justify-between rounded-lg border p-4">
                  <div class="space-y-0.5">
                    <Label for="requires-provider" class="text-base"
                      >Require Specific Provider</Label
                    >
                    <p class="text-sm text-muted-foreground">
                      If enabled, users must select a staff member.
                    </p>
                  </div>
                  <Switch id="requires-provider" v-model:checked="requires_provider" />
                </div>
              </div>
            </div>
          </div>

          <!-- "Quick Add" Dialog for Locations -->
          <Dialog v-model:open="isLocationDialogOpen">
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Location</DialogTitle></DialogHeader>
              <LocationForm @save="handleLocationAdded" />
            </DialogContent>
          </Dialog>
          <!-- Action Buttons -->
          <div class="flex justify-end gap-2 border-t pt-6">
            <Button variant="outline" type="button" @click="router.push({ name: 'admin-services' })"
              >Cancel</Button
            >
            <Button type="submit" :disabled="isLoading">
              {{
                isLoading ? 'Saving...' : isEditMode ? 'Save and Continue' : 'Create and Continue'
              }}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </form>
</template>

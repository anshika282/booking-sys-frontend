<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useRouter } from 'vue-router'
import api from '@/api'
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
import DatePicker from '@/components/ui/date-picker/DatePicker.vue'
import { Calendar } from '@/components/ui/calendar'
import { useToast } from '@/components/ui/toast/use-toast'
import { getLocalTimeZone, CalendarDate, today, parseDate } from '@internationalized/date'
import { Badge } from '@/components/ui/badge'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { X } from 'lucide-vue-next'

const props = defineProps({
  mode: { type: String, required: true },
  id: { type: String, required: true }, // This is the serviceId
  couponId: { type: String, default: null },
})

const emit = defineEmits(['submitSuccess'])
const couponStore = useCouponStore()
const { toast } = useToast()
const isEditMode = computed(() => props.mode === 'edit')
const isLoading = ref(true)
const errors = ref({})

const router = useRouter()

// Form State - separated into logical groups
const code = ref('')
const active = ref(null)
const max_uses = ref(null)
const discount_type = ref(null)
const discount_value = ref(null)
const max_discount_amount = ref(null)
const bogo_buy_quantity = ref(1)
const bogo_get_quantity = ref(1)
const bogo_ticket_tier_id = ref(null)
const min_amount = ref(null)

// --- Date Conditions State ---
const date_condition_type = ref('no_limit')
const valid_date = ref(null)
const valid_date_range = ref({ start: null, end: null })
const valid_multiple_dates = ref([])

// Track if we're in initial loading state
const isInitialLoad = ref(false)

// Computed properties for dynamic UI rendering
const isPercentage = computed(() => discount_type.value === 'percentage')
const isFixed = computed(() => discount_type.value === 'fixed')
const isBOGO = computed(() => discount_type.value === 'buy_x_get_y_free')

const todayDate = today(getLocalTimeZone())

// Reset fields when the coupon type changes to avoid sending incorrect data
watch(discount_type, () => {
  if (!isInitialLoad.value) {
    discount_value.value = null
    max_discount_amount.value = null
    bogo_buy_quantity.value = 1
    bogo_get_quantity.value = 1
    bogo_ticket_tier_id.value = null
  }
})

// Only reset date fields if not during initial load
watch(date_condition_type, (newType, oldType) => {
  if (!isInitialLoad.value && oldType && newType !== oldType) {
    valid_date.value = null
    valid_date_range.value = { start: null, end: null }
    valid_multiple_dates.value = []
    if (errors.value.dates) delete errors.value.dates
  }
})

// Helper function to safely parse date strings to CalendarDate
const safeParseDate = (dateString) => {
  if (!dateString) return null
  try {
    if (typeof dateString === 'string') {
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number)
        return new CalendarDate(year, month, day)
      }
      return parseDate(dateString)
    }
    return dateString
  } catch (error) {
    console.error('Error parsing date:', dateString, error)
    return null
  }
}

const handleCancel = () => {
  // Navigate back to the list of coupons for the current service
  router.push({
    name: 'admin-service-coupons',
    params: { id: props.id }, // Use the serviceId from the props
  })
}

onMounted(async () => {
  isInitialLoad.value = true

  try {
    await couponStore.fetchTicketTiers(props.id)

    if (isEditMode.value) {
      const response = await api.get(`/services/${props.id}/coupons/${props.couponId}`)
      const coupon = response.data.data

      console.log('Raw coupon data:', coupon)

      // Set basic fields first
      code.value = coupon.code || ''
      active.value = asBool(coupon.active)
      max_uses.value = coupon.max_uses || null
      discount_type.value = coupon.discount_type || null

      // Handle discount value properly
      const discountVal = coupon.discount_value
      if (discountVal !== null && discountVal !== undefined) {
        discount_value.value = Number(discountVal)
      } else {
        discount_value.value = null
      }

      console.log('Set discount_value to:', discount_value.value)
      console.log('Set active to:', active.value)

      // Handle conditions
      if (coupon.conditions) {
        min_amount.value = coupon.conditions.min_amount || null

        // Process dates
        if (coupon.conditions.valid_from && coupon.conditions.valid_to) {
          console.log(
            'Processing date range:',
            coupon.conditions.valid_from,
            'to',
            coupon.conditions.valid_to,
          )

          const startDate = safeParseDate(coupon.conditions.valid_from)
          const endDate = safeParseDate(coupon.conditions.valid_to)

          if (startDate && endDate) {
            date_condition_type.value = 'date_range'
            valid_date_range.value = { start: startDate, end: endDate }
            console.log('Set date range:', valid_date_range.value)
          }
        } else if (
          coupon.conditions.specific_dates &&
          Array.isArray(coupon.conditions.specific_dates) &&
          coupon.conditions.specific_dates.length > 0
        ) {
          console.log('Processing specific dates:', coupon.conditions.specific_dates)

          const parsedDates = coupon.conditions.specific_dates
            .map((d) => safeParseDate(d))
            .filter(Boolean)

          console.log('Parsed specific dates:', parsedDates)

          if (parsedDates.length === 1) {
            date_condition_type.value = 'single_day'
            valid_date.value = parsedDates[0]
          } else if (parsedDates.length > 1) {
            date_condition_type.value = 'multiple_dates'
            valid_multiple_dates.value = parsedDates
          }
        }
      }

      // Handle effects
      if (coupon.effects) {
        max_discount_amount.value = coupon.effects.max_discount_amount || null
        bogo_buy_quantity.value = coupon.effects.buy_quantity || 1
        bogo_get_quantity.value = coupon.effects.get_quantity || 1
        bogo_ticket_tier_id.value = coupon.effects.ticket_tier_id || null
      }

      console.log('Final form state:', {
        code: code.value,
        active: active.value,
        discount_type: discount_type.value,
        discount_value: discount_value.value,
        date_condition_type: date_condition_type.value,
        valid_multiple_dates: valid_multiple_dates.value?.length || 0,
        valid_date_range: valid_date_range.value,
      })
    }
  } catch (error) {
    console.error('Failed to fetch coupon data:', error)
    toast({
      title: 'Error',
      description: 'Could not load coupon data.',
      variant: 'destructive',
    })
  } finally {
    // Add a small delay to ensure all reactive updates complete
    await nextTick()
    setTimeout(() => {
      isInitialLoad.value = false
      isLoading.value = false
    }, 100)
  }
})

const validateForm = () => {
  errors.value = {}

  if (!code.value) errors.value.code = 'Coupon code is required.'
  if (!discount_type.value) errors.value.discount_type = 'Please select a coupon type.'

  if (isPercentage.value || isFixed.value) {
    if (!discount_value.value || discount_value.value <= 0) {
      errors.value.discount_value = 'Discount value must be greater than 0.'
    }
  }

  if (isBOGO.value) {
    if (!bogo_buy_quantity.value || bogo_buy_quantity.value < 1) {
      errors.value.bogo_buy_quantity = 'Buy quantity must be at least 1.'
    }
    if (!bogo_get_quantity.value || bogo_get_quantity.value < 1) {
      errors.value.bogo_get_quantity = 'Get quantity must be at least 1.'
    }
    if (!bogo_ticket_tier_id.value) {
      errors.value.bogo_ticket_tier_id = 'You must select an applicable ticket tier.'
    }
  }

  if (
    date_condition_type.value === 'date_range' &&
    (!valid_date_range.value?.start || !valid_date_range.value?.end)
  ) {
    errors.value.dates = 'Both a start and end date are required for a date range.'
  }

  if (date_condition_type.value === 'single_day') {
    // Check if valid_date exists and has the expected structure
    if (!valid_date.value || !toJsDate(valid_date.value)) {
      console.log('Single date validation failed - no valid date found in ref:', valid_date.value)
      errors.value.dates = 'Please select a valid date.'
    }
  }

  if (
    date_condition_type.value === 'multiple_dates' &&
    (!valid_multiple_dates.value || valid_multiple_dates.value.length === 0)
  ) {
    errors.value.dates = 'Please select at least one date.'
  }

  return Object.keys(errors.value).length === 0
}

// Helper to safely convert any date-like value to a JS Date
const toJsDate = (dateValue) => {
  if (!dateValue) return null
  try {
    if (dateValue instanceof Date) return dateValue
    if (typeof dateValue.toDate === 'function') {
      return dateValue.toDate(getLocalTimeZone())
    }
    if (dateValue.year && dateValue.month && dateValue.day) {
      return new Date(dateValue.year, dateValue.month - 1, dateValue.day)
    }
    const parsed = new Date(dateValue)
    return isNaN(parsed.getTime()) ? null : parsed
  } catch (error) {
    console.error('Error converting date to JS Date:', dateValue, error)
    return null
  }
}

const toYYYYMMDD = (dateValue) => {
  const jsDate = toJsDate(dateValue)
  return jsDate ? jsDate.toISOString().split('T')[0] : null
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }
  isLoading.value = true
  errors.value = {}

  try {
    const payload = {
      code: code.value,
      active: active.value,
      max_uses: max_uses.value || null,
      discount_type: discount_type.value,
      discount_value: isPercentage.value || isFixed.value ? discount_value.value : null,
      conditions: {
        min_amount: min_amount.value || null,
        specific_dates:
          date_condition_type.value === 'single_day'
            ? [toYYYYMMDD(valid_date.value)]
            : date_condition_type.value === 'multiple_dates' && valid_multiple_dates.value
              ? valid_multiple_dates.value.map((d) => toYYYYMMDD(d)).filter(Boolean)
              : null,
        valid_from:
          date_condition_type.value === 'date_range'
            ? toYYYYMMDD(valid_date_range.value?.start)
            : null,
        valid_to:
          date_condition_type.value === 'date_range'
            ? toYYYYMMDD(valid_date_range.value?.end)
            : null,
      },
      effects: {
        max_discount_amount: isPercentage.value ? max_discount_amount.value : null,
        buy_quantity: isBOGO.value ? bogo_buy_quantity.value : null,
        get_quantity: isBOGO.value ? bogo_get_quantity.value : null,
        ticket_tier_id: isBOGO.value ? bogo_ticket_tier_id.value : null,
      },
    }

    console.log('Submitting payload:', JSON.stringify(payload, null, 2))

    let response
    if (isEditMode.value) {
      response = await api.put(`/services/${props.id}/coupons/${props.couponId}`, payload)
    } else {
      response = await api.post(`/services/${props.id}/coupons`, payload)
    }

    const coupon = response.data.data
    console.log('Coupon saved successfully:', coupon)

    toast({
      title: `Coupon ${isEditMode.value ? 'Updated' : 'Created'}!`,
      description: `Code "${coupon.code}" has been saved.`,
    })

    emit('submitSuccess', coupon)
  } catch (error) {
    console.error('Failed to save coupon:', error)
    if (error.response?.status === 422) {
      errors.value = error.response.data.errors
    } else {
      toast({
        title: 'An error occurred',
        description: 'Could not save the coupon.',
        variant: 'destructive',
      })
    }
  } finally {
    isLoading.value = false
  }
}

const formatDateForDisplay = (date) => {
  const jsDate = toJsDate(date)
  if (!jsDate) return 'Invalid Date'

  return jsDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const removeDate = (indexToRemove) => {
  if (valid_multiple_dates.value && Array.isArray(valid_multiple_dates.value)) {
    valid_multiple_dates.value = valid_multiple_dates.value.filter((_, index) => {
      return index !== indexToRemove
    })
  }
}

// This ensures the active state is properly managed as a boolean
// const handleActiveToggle = (newValue) => {
//   active.value = Boolean(newValue)
//   console.log('Toggle changed to:', active.value)
// }

function asBool(val) {
  return val === true || val === 1 || val === '1' || val === 'true'
}

function handleActiveToggle(next) {
  active.value = next // Switch already emits a boolean
}
</script>

<template>
  <div v-if="isLoading" class="text-center p-8">Loading Form...</div>
  <form v-else @submit.prevent="handleSubmit">
    <div class="grid gap-8">
      <!-- Section 1: Core Details -->
      <Card>
        <CardHeader>
          <CardTitle>Core Details</CardTitle>
          <CardDescription>Set the main code and its status.</CardDescription>
        </CardHeader>
        <CardContent class="grid md:grid-cols-2 gap-6">
          <div class="grid md:grid-cols-2 gap-6">
            <div class="grid gap-2">
              <Label for="code">Coupon Code <span class="text-red-500">*</span></Label>
              <Input
                id="code"
                v-model="code"
                placeholder="e.g., SUMMER25"
                :class="{ 'border-red-500': errors.code }"
              />
              <p v-if="errors.code" class="text-sm text-red-500 mt-1">
                {{ errors.code }}
              </p>
            </div>
            <div class="grid gap-2">
              <Label for="max_uses">Max Total Uses (Optional)</Label>
              <Input id="max_uses" v-model="max_uses" type="number" placeholder="e.g., 100" />
            </div>
          </div>
          <div class="flex items-center space-x-2 pt-4">
            <Switch
              id="active-mode"
              :model-value="active ?? false"
              @update:model-value="handleActiveToggle"
            />
            <span class="text-xs text-gray-500">
              (Currently: {{ active === true ? 'Active' : 'Inactive' }})
            </span>
            <Label for="active-mode">Coupon is Active</Label>
          </div>

          <!-- Date Restriction -->
          <div class="grid gap-2 md:col-span-2 border-t pt-6">
            <Label>Date Restriction <span class="text-red-500">*</span></Label>
            <Select
              :model-value="date_condition_type"
              @update:model-value="date_condition_type = $event"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a date condition..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_limit">No Date Limit (Always Active)</SelectItem>
                <SelectItem value="single_day">Single Specific Day</SelectItem>
                <SelectItem value="date_range">Date Range</SelectItem>
                <SelectItem value="multiple_dates">Multiple Specific Dates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Conditional Date Pickers -->
          <div
            v-if="date_condition_type === 'single_day'"
            class="grid gap-2 md:col-span-2 animate-in fade-in"
          >
            <Label>Valid On</Label>
            <DatePicker
              :model-value="valid_date"
              @update:model-value="valid_date = $event"
              :min-value="todayDate"
            />
            <div v-if="valid_date" class="text-sm text-gray-600">
              Selected: {{ formatDateForDisplay(valid_date) }}
            </div>
            <p v-if="errors.dates" class="text-sm text-red-500 mt-1">{{ errors.dates }}</p>
          </div>

          <div v-if="date_condition_type === 'date_range'" class="md:col-span-2 animate-in fade-in">
            <Label class="block mb-2">Valid Date Range</Label>
            <RangeCalendar
              :model-value="valid_date_range"
              @update:model-value="valid_date_range = $event"
              :min-value="todayDate"
              class="p-0"
            />
            <div
              v-if="valid_date_range?.start && valid_date_range?.end"
              class="mt-2 text-sm text-gray-600"
            >
              Selected: {{ formatDateForDisplay(valid_date_range.start) }} to
              {{ formatDateForDisplay(valid_date_range.end) }}
            </div>
            <p v-if="errors.dates" class="text-sm text-red-500 mt-1">{{ errors.dates }}</p>
          </div>

          <div
            v-if="date_condition_type === 'multiple_dates'"
            class="md:col-span-2 animate-in fade-in"
          >
            <Label class="block mb-2">Select Multiple Dates</Label>
            <Calendar
              :model-value="valid_multiple_dates"
              @update:model-value="valid_multiple_dates = $event"
              :multiple="true"
              :columns="2"
              :min-value="todayDate"
            />
            <div
              v-if="valid_multiple_dates && valid_multiple_dates.length > 0"
              class="mt-4 space-y-2"
            >
              <p class="text-sm font-medium">Selected Dates ({{ valid_multiple_dates.length }}):</p>
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="(date, index) in valid_multiple_dates"
                  :key="`badge-${index}-${date ? formatDateForDisplay(date) : 'invalid'}`"
                  variant="secondary"
                  class="flex items-center gap-1"
                >
                  {{ date ? formatDateForDisplay(date) : 'Invalid Date' }}
                  <button
                    type="button"
                    @click="removeDate(index)"
                    class="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    <X class="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            </div>
            <p v-if="errors.dates" class="text-sm text-red-500 mt-1">{{ errors.dates }}</p>
          </div>
        </CardContent>
      </Card>

      <!-- Section 2: Type & Effects -->
      <Card>
        <CardHeader>
          <CardTitle>Coupon Type & Effect</CardTitle>
          <CardDescription>Define what the coupon actually does.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-6">
          <div class="grid gap-2">
            <Label for="discount_type">Coupon Type <span class="text-red-500">*</span></Label>
            <Select :model-value="discount_type" @update:model-value="discount_type = $event">
              <SelectTrigger :class="{ 'border-red-500': errors.discount_type }">
                <SelectValue placeholder="Select a coupon type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage Discount</SelectItem>
                <SelectItem value="fixed">Fixed Amount Discount</SelectItem>
                <SelectItem value="buy_x_get_y_free">Buy X, Get Y Free (BOGO)</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.discount_type" class="text-sm text-red-500 mt-1">
              {{ errors.discount_type }}
            </p>
          </div>

          <!-- Dynamic Fields based on Type -->
          <div v-if="isPercentage" class="grid md:grid-cols-2 gap-4 animate-in fade-in">
            <div class="grid gap-2">
              <Label>Discount Value (%) <span class="text-red-500">*</span></Label>
              <Input
                :model-value="discount_value"
                @update:model-value="discount_value = Number($event)"
                type="number"
                :class="{ 'border-red-500': errors.discount_value }"
              />
              <p v-if="errors.discount_value" class="text-sm text-red-500 mt-1">
                {{ errors.discount_value }}
              </p>
            </div>
            <div class="grid gap-2">
              <Label>Max Discount Amount (₹, Optional)</Label>
              <Input
                :model-value="max_discount_amount"
                @update:model-value="max_discount_amount = Number($event) || null"
                type="number"
                placeholder="e.g., 500"
              />
            </div>
          </div>

          <div v-if="isFixed" class="grid gap-2 animate-in fade-in">
            <Label>Discount Value (₹) <span class="text-red-500">*</span></Label>
            <Input
              :model-value="discount_value"
              @update:model-value="discount_value = Number($event)"
              type="number"
              :class="{ 'border-red-500': errors.discount_value }"
            />
            <p v-if="errors.discount_value" class="text-sm text-red-500 mt-1">
              {{ errors.discount_value }}
            </p>
          </div>

          <div v-if="isBOGO" class="grid md:grid-cols-3 gap-4 animate-in fade-in">
            <div class="grid gap-2">
              <Label>Buy Quantity <span class="text-red-500">*</span></Label>
              <Input
                :model-value="bogo_buy_quantity"
                @update:model-value="bogo_buy_quantity = Number($event)"
                type="number"
                :class="{ 'border-red-500': errors.bogo_buy_quantity }"
              />
              <p v-if="errors.bogo_buy_quantity" class="text-sm text-red-500 mt-1">
                {{ errors.bogo_buy_quantity }}
              </p>
            </div>
            <div class="grid gap-2">
              <Label>Get Quantity Free <span class="text-red-500">*</span></Label>
              <Input
                :model-value="bogo_get_quantity"
                @update:model-value="bogo_get_quantity = Number($event)"
                type="number"
                :class="{ 'border-red-500': errors.bogo_get_quantity }"
              />
              <p v-if="errors.bogo_get_quantity" class="text-sm text-red-500 mt-1">
                {{ errors.bogo_get_quantity }}
              </p>
            </div>
            <div class="grid gap-2">
              <Label>Applicable Ticket Tier <span class="text-red-500">*</span></Label>
              <Select
                :model-value="bogo_ticket_tier_id"
                @update:model-value="bogo_ticket_tier_id = $event"
              >
                <SelectTrigger :class="{ 'border-red-500': errors.bogo_ticket_tier_id }">
                  <SelectValue placeholder="Select a tier..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="tier in couponStore.ticketTiers"
                    :key="tier.id"
                    :value="tier.id"
                  >
                    {{ tier.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="errors.bogo_ticket_tier_id" class="text-sm text-red-500 mt-1">
                {{ errors.bogo_ticket_tier_id }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Section 3: Conditions -->
      <Card>
        <CardHeader>
          <CardTitle>Conditions (Optional)</CardTitle>
          <CardDescription>Set rules for when this coupon can be used.</CardDescription>
        </CardHeader>
        <CardContent class="grid md:grid-cols-2 gap-6">
          <div class="grid gap-2">
            <Label for="min_amount">Minimum Purchase Amount (₹)</Label>
            <Input
              id="min_amount"
              :model-value="min_amount"
              @update:model-value="min_amount = Number($event) || null"
              type="number"
              placeholder="e.g., 1000"
            />
          </div>
        </CardContent>
      </Card>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-2">
        <Button variant="outline" type="button" @click="handleCancel">Cancel</Button>
        <Button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Saving...' : isEditMode ? 'Update Coupon' : 'Create Coupon' }}
        </Button>
      </div>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { useTicketTierStore } from '@/stores/ticketTierStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DatePicker from '@/components/ui/date-picker/DatePicker.vue'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { Calendar } from '@/components/ui/calendar'
import { today, getLocalTimeZone, CalendarDate, parseDate } from '@internationalized/date'
import { useToast } from '@/components/ui/toast/use-toast'
import { PlusCircle, Edit, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  mode: { type: String, required: true },
  serviceId: { type: String, required: true },
  ruleId: { type: String, default: null },
})

// --- Form State ---
const name = ref('')
const active = ref(true)
const category = ref(null)
const is_stackable = ref(false) // For discounts
const condition_ticket_tier_id = ref(null)
const condition_min_quantity = ref(10)
const condition_type = ref(null) // 'date' or 'ticket_quantity'
const errors = ref({})
const router = useRouter()
const isEditMode = computed(() => props.mode === 'edit')
const modelValue = defineModel()

// Add a reactive flag to force UI updates
const forceUpdate = ref(0)

const { toast } = useToast()
const isLoading = ref(true)

const ticketTierStore = useTicketTierStore()

// ... more state refs for conditions and actions will be added here
const discount_calculation_mode = ref('percentage')
const discount_amount = ref(10)
const base_price_tiers = ref([{ ticket_tier_id: null, value: '0.00' }])
const date_condition_sub_type = ref(null)
const valid_date = ref(null)
const valid_date_range = ref(null)
const valid_multiple_dates = ref([])
const todayDate = today(getLocalTimeZone())

// --- Computed properties to drive the UI ---
const isBasePriceAdjustment = computed(() => category.value === 'base_price_adjustment')
const isDiscount = computed(() => category.value === 'discount')

const isDateCondition = computed(() => {
  // Access forceUpdate to make this reactive
  forceUpdate.value
  const result = condition_type.value === 'date'
  console.log(
    'isDateCondition computed (with force):',
    result,
    'condition_type:',
    condition_type.value,
  )
  return result
})
const isQuantityCondition = computed(() => condition_type.value === 'ticket_quantity')

// Watchers to reset state when user changes major selections
watch(category, () => {
  condition_type.value = null
  discount_calculation_mode.value = 'percentage'
  discount_amount.value = 10
  base_price_tiers.value = [{ ticket_tier_id: null, value: '0.00' }]
})

const addBasePriceTier = () => {
  base_price_tiers.value.push({ ticket_tier_id: null, value: '0.00' })
}

const removeBasePriceTier = (index) => {
  base_price_tiers.value.splice(index, 1)
}

watch(date_condition_sub_type, (newValue) => {
  console.log(`✅ Watcher: date_condition_sub_type changed to: ${newValue}`)
})
// --- DEFINITIVE VALIDATION FUNCTION ---
const validateForm = () => {
  errors.value = {}
  const nameRegex = /^[a-zA-Z0-9\s\-]+$/ // Allows letters, numbers, spaces, hyphens

  if (!name.value.trim()) errors.value.name = 'Rule name is required.'
  else if (!nameRegex.test(name.value))
    errors.value.name = 'Name can only contain letters, numbers, and spaces.'

  if (!category.value) errors.value.category = 'Please select a rule category.'

  if (isDiscount.value) {
    if (!discount_amount.value || Number(discount_amount.value) <= 0) {
      errors.value.discount_amount = 'Discount amount must be greater than 0.'
    }
    if (discount_calculation_mode.value === 'percentage' && Number(discount_amount.value) > 100) {
      errors.value.discount_amount = 'Percentage discount cannot exceed 100.'
    }
  }

  if (isBasePriceAdjustment.value) {
    base_price_tiers.value.forEach((tier, index) => {
      if (!tier.ticket_tier_id || !tier.value) {
        errors.value[`base_tier_${index}`] = 'Both a tier and a new price are required.'
      }
    })
  }

  if (isQuantityCondition.value) {
    if (!condition_ticket_tier_id.value)
      errors.value.condition_tier = 'Please select a ticket tier for the condition.'
    if (!condition_min_quantity.value || condition_min_quantity.value < 1)
      errors.value.condition_quantity = 'Minimum quantity must be at least 1.'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  // Logic to assemble the complex payload will go here
  if (!validateForm()) {
    toast({
      title: 'Validation Error',
      description: 'Please fix the errors shown on the form.',
      variant: 'destructive',
    })
    return
  }
  isLoading.value = true
  errors.value = {}

  const conditions = { type: condition_type.value }

  if (isDateCondition.value) {
    conditions.date_condition_sub_type = date_condition_sub_type.value
    if (date_condition_sub_type.value === 'range') {
      conditions.from_date = toYYYYMMDD(valid_date_range.value?.start)
      conditions.to_date = toYYYYMMDD(valid_date_range.value?.end)
    } else if (date_condition_sub_type.value === 'single' && valid_date.value) {
      conditions.specific_dates = [toYYYYMMDD(valid_date.value)]
    } else if (
      date_condition_sub_type.value === 'multiple' &&
      valid_multiple_dates.value.length > 0
    ) {
      conditions.specific_dates = valid_multiple_dates.value
        .map((d) => toYYYYMMDD(d))
        .filter(Boolean)
    }
  } else if (isQuantityCondition.value) {
    conditions.ticket_tier_id = condition_ticket_tier_id.value
    conditions.min_quantity = condition_min_quantity.value
  }

  // 3. Start with a clean price_modification object
  const price_modification = {}

  if (isDiscount.value) {
    price_modification.type = 'total_amount_discount'
    price_modification.calculation_mode = discount_calculation_mode.value
    price_modification.amount = discount_amount.value
  } else if (isBasePriceAdjustment.value) {
    price_modification.type = 'set_fixed_price'
    price_modification.tiers = base_price_tiers.value.map((tier) => ({
      ticket_tier_id: tier.ticket_tier_id,
      value: Number(tier.value),
    }))
  }

  // Assemble the complex payload
  const payload = {
    name: name.value,
    active: active.value,
    category: category.value,
    is_stackable: is_stackable.value,
    priority: 0, // Backend will handle priority on list page
    type: 'dynamic', // Or another default type
    conditions, // Use the cleanly built object
    price_modification, // Use the cleanly built object
  }

  console.log('Submitting Final Payload:', JSON.stringify(payload, null, 2))

  try {
    let response
    if (props.mode === 'edit') {
      response = await api.patch(`/services/${props.serviceId}/pricing/${props.ruleId}`, payload)
    } else {
      response = await api.post(`/services/${props.serviceId}/pricing`, payload)
    }

    toast({ title: 'Success!', description: `Pricing rule "${payload.name}" has been saved.` })

    // Navigate back to the list view on success
    router.push({ name: 'admin-service-pricing-rules', params: { id: props.serviceId } })
  } catch (error) {
    console.error('Failed to save pricing rule:', error)
    if (error.response?.status === 422) {
      errors.value = error.response.data.errors
      toast({
        title: 'Validation Error',
        description: error.response.data.message || 'Please check the form for errors.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'An error occurred',
        description: 'Could not save the pricing rule.',
        variant: 'destructive',
      })
    }
  } finally {
    isLoading.value = false
  }
}

const toYYYYMMDD = (dateValue) => {
  const jsDate = toJsDate(dateValue)
  return jsDate ? jsDate.toISOString().split('T')[0] : null
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

onMounted(async () => {
  await ticketTierStore.fetchTicketTiers(props.serviceId)

  if (isEditMode.value) {
    isLoading.value = true
    try {
      const response = await api.get(`/services/${props.serviceId}/pricing/${props.ruleId}`)
      const rule = response.data.data

      console.log('Loading rule data:', rule)

      // Pre-populate basic fields
      name.value = rule.name
      active.value = Boolean(rule.active)
      category.value = rule.category
      is_stackable.value = rule.is_stackable

      // Pre-populate conditions - THE KEY FIX IS HERE
      if (rule.conditions) {
        console.log('Processing conditions:', rule.conditions)

        condition_type.value = rule.conditions.type
        console.log(`Set condition_type to: ${condition_type.value}`)

        // Wait for Vue to update the DOM after setting condition_type
        await nextTick()
        console.log('DOM updated after setting condition_type')

        if (rule.conditions.type === 'date') {
          console.log('Processing date conditions...')

          let determinedSubType = 'no_limit' // Default

          // Check for a date range
          if (rule.conditions.from_date && rule.conditions.to_date) {
            determinedSubType = 'range'
            console.log('Detected range condition')

            // Set the sub-type first
            date_condition_sub_type.value = determinedSubType

            // Wait another tick for the range picker to render
            await nextTick()

            // Then set the range value
            valid_date_range.value = {
              start: parseDate(rule.conditions.from_date),
              end: parseDate(rule.conditions.to_date),
            }
            console.log('Set date range:', valid_date_range.value)
          }
          // Check for specific dates
          else if (rule.conditions.specific_dates && rule.conditions.specific_dates.length > 0) {
            if (rule.conditions.specific_dates.length === 1) {
              determinedSubType = 'single'
              console.log('Detected single date condition')

              date_condition_sub_type.value = determinedSubType
              await nextTick()

              valid_date.value = parseDate(rule.conditions.specific_dates[0])
              console.log('Set single date:', valid_date.value)
            } else {
              determinedSubType = 'multiple'
              console.log('Detected multiple dates condition')

              date_condition_sub_type.value = determinedSubType
              await nextTick()

              valid_multiple_dates.value = rule.conditions.specific_dates.map((d) => parseDate(d))
              console.log('Set multiple dates:', valid_multiple_dates.value)
            }
          }
          // If no date conditions are set, it means "no limit"
          else {
            date_condition_sub_type.value = 'no_limit'
            console.log('Set to no_limit')
          }
          console.log('>>> Determined sub-type:', determinedSubType)
          date_condition_sub_type.value = determinedSubType
          console.log(
            '>>> SETTING date_condition_sub_type.value to:',
            date_condition_sub_type.value,
          )
        } else if (rule.conditions.type === 'ticket_quantity') {
          console.log('Processing quantity conditions...')
          condition_ticket_tier_id.value = rule.conditions.ticket_tier_id
          condition_min_quantity.value = rule.conditions.min_quantity
          console.log('Set quantity conditions:', {
            tier: condition_ticket_tier_id.value,
            quantity: condition_min_quantity.value,
          })
        }
      }

      // Pre-populate price modifications
      if (rule.price_modification) {
        console.log('Processing price modifications...')

        if (rule.category === 'discount') {
          discount_calculation_mode.value = rule.price_modification.calculation_mode
          discount_amount.value = rule.price_modification.amount
          console.log('Set discount values:', {
            mode: discount_calculation_mode.value,
            amount: discount_amount.value,
          })
        } else if (
          rule.category === 'base_price_adjustment' &&
          Array.isArray(rule.price_modification.tiers)
        ) {
          base_price_tiers.value = rule.price_modification.tiers.map((tier) => ({
            ticket_tier_id: tier.ticket_tier_id,
            value: tier.value.toString(), // Convert to string for input binding
          }))
          console.log('Set base price tiers:', base_price_tiers.value)
        }
      }

      console.log('Final form state:', {
        condition_type: condition_type.value,
        date_condition_sub_type: date_condition_sub_type.value,
        category: category.value,
        base_price_tiers: base_price_tiers.value,
      })

      await nextTick()
    } catch (error) {
      console.error('Failed to load pricing rule:', error)
      toast({
        title: 'Error',
        description: 'Could not load the pricing rule data.',
        variant: 'destructive',
      })
    } finally {
      isLoading.value = false
    }
  } else {
    // For create mode, just finish loading
    isLoading.value = false
  }
})
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="grid gap-8">
      <!-- Section 1: Basic Info -->
      <Card>
        <CardHeader><CardTitle>Basic Details</CardTitle></CardHeader>
        <CardContent class="grid gap-6">
          <div class="grid gap-2">
            <Label>Rule Name <span class="text-red-500">*</span></Label
            ><Input
              v-model="name"
              :class="{
                'border-red-500': errors.name,
                'bg-muted/50 cursor-not-allowed': isEditMode,
              }"
              :disabled="isEditMode"
            />
            <p v-if="errors.name" class="text-sm text-red-500 mt-1">{{ errors.name }}</p>
          </div>
          <div class="flex items-center space-x-2">
            <Switch
              id="active-rule"
              :checked="active"
              @update:checked="(newValue) => (active = newValue)"
            /><Label>Rule is Active : {{ ('Active value is : ', active) }}</Label>
          </div>
        </CardContent>
      </Card>

      <!-- Section 2: Category -->
      <Card>
        <CardHeader
          ><CardTitle>Rule Category <span class="text-red-500">*</span></CardTitle></CardHeader
        >
        <CardContent>
          <Select v-model="category" :disabled="isEditMode">
            <SelectTrigger
              :class="{
                'border-red-500': errors.category,
                'bg-muted/50 cursor-not-allowed': isEditMode,
              }"
              ><SelectValue placeholder="Select a category..."
            /></SelectTrigger>
            <SelectContent>
              <SelectItem value="base_price_adjustment">Base Price Adjustment</SelectItem>
              <SelectItem value="discount">Discount</SelectItem>
            </SelectContent>
          </Select>
          <p v-if="errors.category" class="text-sm text-red-500 mt-1">{{ errors.category }}</p>
        </CardContent>
      </Card>

      <!-- Placeholder sections for the rest of the builder -->
      <div v-if="category" class="grid gap-8 animate-in fade-in">
        <Card>
          <CardHeader>
            <CardTitle>Condition (WHEN this rule applies)</CardTitle>
            <CardDescription
              >Set the trigger for this rule. If left blank, it will always apply.</CardDescription
            >
          </CardHeader>

          <CardContent class="grid gap-6">
            <Select v-model="condition_type">
              <SelectTrigger
                ><SelectValue placeholder="Select a condition type..."
              /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Based on Date</SelectItem>
                <SelectItem value="ticket_quantity">Based on Ticket Quantity in Cart</SelectItem>
              </SelectContent>
            </Select>

            <div v-if="condition_type" class="p-4 border rounded-lg">
              <!-- Date Condition UI -->
              <div v-if="isDateCondition" class="grid gap-4">
                <Label>Date Type</Label>
                <Select v-model="date_condition_sub_type">
                  <SelectTrigger><SelectValue placeholder="Select a date type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_limit">No Date Restriction</SelectItem>
                    <SelectItem value="single">Single Day</SelectItem>
                    <SelectItem value="range">Date Range</SelectItem>
                    <SelectItem value="multiple">Multiple Dates</SelectItem>
                  </SelectContent>
                </Select>

                <!-- Conditional Date Pickers -->
                <div v-if="date_condition_sub_type === 'single'" class="mt-4">
                  <DatePicker v-model="valid_date" :min-value="todayDate" />
                </div>
                <div v-if="date_condition_sub_type === 'range'" class="mt-4">
                  <RangeCalendar v-model="valid_date_range" :min-value="todayDate" class="p-0" />
                </div>

                <!-- --- FIX #1: Correct the Calendar props --- -->
                <div v-if="date_condition_sub_type === 'multiple'" class="mt-4">
                  <Calendar
                    v-model="valid_multiple_dates"
                    :multiple="true"
                    :min-value="todayDate"
                    :columns="2"
                  />
                  <!-- ... badge display ... -->
                </div>
              </div>

              <!-- Quantity Condition UI -->
              <div v-if="isQuantityCondition" class="grid md:grid-cols-2 gap-4">
                <div class="grid gap-2">
                  <Label>When cart contains at least</Label>
                  <Input
                    v-model="condition_min_quantity"
                    type="number"
                    :class="{ 'border-red-500': errors.condition_quantity }"
                  />
                  <p v-if="errors.condition_quantity" class="text-sm text-red-500 mt-1">
                    {{ errors.condition_quantity }}
                  </p>
                </div>
                <div class="grid gap-2">
                  <Label>of this ticket tier:</Label>
                  <Select v-model="condition_ticket_tier_id">
                    <SelectTrigger :class="{ 'border-red-500': errors.condition_tier }"
                      ><SelectValue placeholder="Select a tier..."
                    /></SelectTrigger>
                    <SelectContent>
                      <!-- --- THE FIX IS HERE --- -->
                      <SelectItem
                        v-for="tier in ticketTierStore.tiers"
                        :key="tier.id"
                        :value="tier.id"
                      >
                        {{ tier.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Action (WHAT this rule does)</CardTitle></CardHeader>
          <CardContent>
            <!-- Action for Base Price Adjustment -->
            <div v-if="isBasePriceAdjustment" class="grid gap-4 animate-in fade-in">
              <p class="text-sm text-muted-foreground">
                Set new fixed prices for specific ticket tiers when the condition is met.
              </p>
              <div
                v-for="(tier, index) in base_price_tiers"
                :key="index"
                class="grid grid-cols-2 gap-4"
              >
                <div class="grid gap-2">
                  <Label>Ticket Tier</Label>
                  <Select v-model="tier.ticket_tier_id">
                    <SelectTrigger><SelectValue placeholder="Select a tier..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="ticketTierOption in ticketTierStore.tiers"
                        :key="ticketTierOption.id"
                        :value="ticketTierOption.id"
                      >
                        {{ ticketTierOption.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="grid gap-2">
                  <Label>New Price (₹)</Label>
                  <Input v-model="tier.value" type="number" step="0.01" />
                </div>
              </div>
              <Button
                v-if="base_price_tiers.length > 1"
                variant="ghost"
                size="icon"
                type="button"
                @click="removeBasePriceTier(index)"
                class="text-destructive"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
              <Button variant="outline" type="button" @click="addBasePriceTier"
                >Add another Tier Price</Button
              >
            </div>

            <!-- Action for Discount -->
            <div v-if="isDiscount" class="grid gap-4 animate-in fade-in">
              <div class="flex items-center space-x-2">
                <Switch v-model:checked="is_stackable" /><Label
                  >This discount can be combined with other discounts</Label
                >
              </div>
              <div class="grid md:grid-cols-2 gap-4">
                <div class="grid gap-2">
                  <Label>Calculation Mode</Label>
                  <Select v-model="discount_calculation_mode">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="grid gap-2">
                  <Label>Discount Amount</Label>
                  <Input v-model="discount_amount" type="number" />
                  <p v-if="errors.discount_amount" class="text-sm text-red-500 mt-1">
                    {{ errors.discount_amount }}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="flex justify-end gap-2">
        <Button variant="outline" type="button">Cancel</Button>
        <Button type="submit">Save Rule</Button>
      </div>
    </div>
  </form>
</template>

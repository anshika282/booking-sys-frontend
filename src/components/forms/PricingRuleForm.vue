<script setup>
import { ref, computed, watch, onMounted } from 'vue'
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
import { today, getLocalTimeZone } from '@internationalized/date'
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

const isDateCondition = computed(() => condition_type.value === 'date')
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

const handleSubmit = () => {
  // Logic to assemble the complex payload will go here
}

onMounted(() => {
  // We need the list of ticket tiers to populate the dropdowns in this form.
  // The store is smart enough not to refetch if it already has them.
  ticketTierStore.fetchTicketTiers(props.serviceId)
})
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="grid gap-8">
      <!-- Section 1: Basic Info -->
      <Card>
        <CardHeader><CardTitle>Basic Details</CardTitle></CardHeader>
        <CardContent class="grid gap-6">
          <div class="grid gap-2"><Label>Rule Name</Label><Input v-model="name" /></div>
          <div class="flex items-center space-x-2">
            <Switch v-model:checked="active" /><Label>Rule is Active</Label>
          </div>
        </CardContent>
      </Card>

      <!-- Section 2: Category -->
      <Card>
        <CardHeader><CardTitle>Rule Category</CardTitle></CardHeader>
        <CardContent>
          <Select v-model="category">
            <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="base_price_adjustment">Base Price Adjustment</SelectItem>
              <SelectItem value="discount">Discount</SelectItem>
            </SelectContent>
          </Select>
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
                        v-for="tier in ticketTierStore.ticketTiers"
                        :key="tier.id"
                        :value="tier.id"
                        >{{ tier.label }}</SelectItem
                      >
                    </SelectContent>
                  </Select>
                </div>
                <div class="grid gap-2">
                  <Label>New Price (₹)</Label>
                  <Input v-model="tier.value" type="number" step="0.01" />
                </div>
              </div>
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

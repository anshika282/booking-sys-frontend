<script setup>
import { ref, computed, watch } from 'vue'
import { useBookingIntentStore } from '@/stores/bookingIntentStore'
import { useCustomerAuthStore } from '@/stores/customerAuthStore'
import LoginPrompt from './LoginPrompt.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useForm } from 'vee-validate'

const store = useBookingIntentStore()
const customerStore = useCustomerAuthStore()

// Define the event this component will emit ---
const emit = defineEmits(['submit-visitor-info'])

// Local state for the guest form
const name = ref('')
const email = ref('')
const phone = ref('')

const isPhoneVerified = ref(false)
// const isLoginModalOpen = ref(false)
const isLoggedIn = ref(customerStore.isAuthenticated)

const formSchema = toTypedSchema(
  z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    phone: z.string().regex(/^\d{10,15}$/, { message: 'Please enter a valid phone number.' }),
    address1: z.string().min(1, { message: 'Address is required.' }),
    city: z.string().min(1, { message: 'City is required.' }),
    postalCode: z.string().regex(/^\d{5,10}$/, { message: 'Invalid postal code.' }),
    country: z.string().min(2, { message: 'Country is required.' }),
  }),
)

const { handleSubmit, setValues, values, setFieldValue } = useForm({
  validationSchema: formSchema,
})

// Watch for changes in the authenticated customer and pre-fill the form
watch(
  () => customerStore.customer,
  (newCustomer) => {
    if (newCustomer) {
      setValues({
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone_number,
        address1: newCustomer.billing_address_line_1 || '',
        city: newCustomer.billing_city || '',
        postalCode: newCustomer.billing_postal_code || '',
        country: newCustomer.billing_country || '',
      })
      isPhoneVerified.value = true
      // isLoginModalOpen.value = false
      // isLoggedIn.value = true
    }
  },
  { immediate: true, deep: true },
)

// // Watch for a new user to verify their phone number and update the form
// watch(
//   () => customerStore.verifiedPhoneNumber,
//   (newPhone) => {
//     if (newPhone) {
//       setValues({ ...values, phone: newPhone })
//       isPhoneVerified.value = true
//       isLoginModalOpen.value = false
//     }
//   },
// )
watch(
  () => customerStore.verifiedPhoneNumber,
  (newPhone) => {
    if (newPhone) {
      // Programmatically update the phone field in the form
      setFieldValue('phone', newPhone)
      isPhoneVerified.value = true
      // isLoginModalOpen.value = false
    }
  },
  { immediate: true },
)

// function onLoginSuccess() {
//   isLoginModalOpen.value = false
//   isLoggedIn.value = true
//   // The watcher above will handle the form filling.
// }

// function onVerificationSuccess() {
//   isLoginModalOpen.value = false
//   isPhoneVerified.value = true // Mark phone as verified, but don't disable form
// }

// function handleVerifyClick() {
//   isLoginModalOpen.value = true
// }
const isGuest = computed(() => {
  // If NOT logged in AND phone is NOT verified, then it's a true guest.
  return !(isLoggedIn.value || isPhoneVerified.value)
})
// This function will be called from BookingWidget.vue to save the data
const saveVisitorInfo = handleSubmit(async (formData) => {
  const isGuestValue = isGuest.value
  console.log(`[VisitorInfoStep] Saving data. Is Guest? ${isGuestValue}`)
  console.log('Form is valid, saving data:', formData)
  // Here you would call the store action to save the data
  const success = await store.saveVisitorInfo({ ...formData, is_guest: isGuestValue })

  if (success) {
    // --- FIX: Emit a generic event that the parent can handle ---
    emit('submit-visitor-info', { ...formData, is_guest: isGuest })
  }

  // emit('submit-visitor-info', { ...formData, is_guest: isGuest })
  // store.saveVisitorInfo(formData, isGuest)
})

// Expose the function so the parent component can call it
defineExpose({ saveVisitorInfo })
</script>

<template>
  <div class="animate-in fade-in space-y-6">
    <!-- 
      Refined logic for Login Button visibility:
      - Only show if user is NOT authenticated.
      - AND: The flow is 'login_at_checkout' (or explicit 'login_first' if somehow they navigated here unauthenticated).
    -->

    <!-- Visitor Details Form -->
    <!-- Visitor Details Form -->
    <form class="space-y-4">
      <h3 class="font-semibold text-lg">
        {{ customerStore.isAuthenticated ? 'Confirm Your Details' : 'Enter Your Details' }}
      </h3>

      <FormField v-slot="{ componentField }" name="name">
        <FormItem>
          <FormLabel>Full Name <span class="text-red-500">*</span></FormLabel>
          <FormControl>
            <Input
              type="text"
              placeholder="John Doe"
              v-bind="componentField"
              :readonly="isLoggedIn && !isGuest"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="email">
        <FormItem>
          <FormLabel>Email Address <span class="text-red-500">*</span></FormLabel>
          <FormControl>
            <Input
              type="email"
              placeholder="you@example.com"
              v-bind="componentField"
              :readonly="isLoggedIn && !isGuest"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="phone">
        <FormItem>
          <FormLabel>Phone Number <span class="text-red-500">*</span></FormLabel>
          <div class="flex gap-2">
            <FormControl>
              <Input type="tel" v-bind="componentField" :readonly="isPhoneVerified || isLoggedIn" />
            </FormControl>
            <Button
              v-if="
                !isPhoneVerified &&
                !isLoggedIn &&
                store.service?.login_flow_preference !== 'guest_only'
              "
              variant="outline"
              type="button"
              @click="isLoginModalOpen = true"
            >
              Verify
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="address1">
        <FormItem>
          <FormLabel>Address <span class="text-red-500">*</span></FormLabel>
          <FormControl>
            <Input type="text" placeholder="123 Main St" v-bind="componentField" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <div class="grid grid-cols-2 gap-4">
        <FormField v-slot="{ componentField }" name="city">
          <FormItem>
            <FormLabel>City <span class="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input type="text" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="postalCode">
          <FormItem>
            <FormLabel>Postal Code <span class="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input type="text" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>

      <FormField v-slot="{ componentField }" name="country">
        <FormItem>
          <FormLabel>Country <span class="text-red-500">*</span></FormLabel>
          <FormControl>
            <Input type="text" v-bind="componentField" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </form>
  </div>
</template>

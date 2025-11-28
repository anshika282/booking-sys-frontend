<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBookingIntentStore } from '@/stores/bookingIntentStore'
import CalendarStep from './components/CalendarStep.vue'
import TicketsStep from './components/TicketStep.vue'
import VisitorInfoStep from './components/VisitorInfoStep.vue'
import { useCustomerAuthStore } from '@/stores/customerAuthStore'
import LoginPrompt from './components/LoginPrompt.vue'
import PaymentStep from './components/PaymentStep.vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-vue-next'

// We no longer need props, as this component will get its data from the URL itself.
const store = useBookingIntentStore()
const visitorInfoFormRef = ref(null)
const customerStore = useCustomerAuthStore()

// --- NEW STATE TRACKER FOR LOGIN FIRST FLOW ---
// This is required because 'login_first' bypasses the calendar, jumping directly to info.
const isLoginFirstFlow = computed(() => store.service?.login_flow_preference === 'login_first')
const isLoadingExperience = computed(() => store.flowSteps.length === 0 && !store.error)
const hasVerifiedButNotAuthenticated = ref(false)

const stepComponentMap = {
  calendar: CalendarStep,
  tickets: TicketsStep,
  info: VisitorInfoStep,
  login_prompt: LoginPrompt,
  payment: PaymentStep, // Payment will be a manual element in the template, or its own file later.
}

function handleClose() {
  // Communicate with the parent page (where sdk.js lives) to close the iframe
  window.parent.postMessage('booking-widget-close', '*')
}

// FIX 1: Use a simple computed to govern the Login Prompt visibility.
const isShowingLoginPrompt = computed(() => {
  return (
    !customerStore.isAuthenticated &&
    !hasVerifiedButNotAuthenticated.value &&
    (isLoginFirstFlow.value || store.currentStep === 'login_prompt')
  )
})

const stepComponent = computed(() => {
  const stepName = store.currentStepName
  if (!stepName) return null
  return stepComponentMap[stepName]
})

// FIX: Combine all "non-flow" loading states into one check for cleaner template logic
const isNonFlowState = computed(() => {
  const stepName = store.currentStepName
  return !stepName || stepName === 'payment'
})

const isErrorState = computed(() => !!store.error)

const stepTitle = computed(() => {
  if (!store.service || store.flowSteps.length === 0) return 'Loading...'
  if (isErrorState.value) return 'An Error occurred'

  switch (store.currentStepName) {
    case 'calendar':
      return `Select Date for ${store.service.name}`
    case 'tickets':
      return 'Select Tickets & Add-ons'
    case 'login_prompt':
      return 'Login / Sign Up'
    case 'info':
      return 'Visitor & Contact Details'
    case 'payment':
      return 'Finalize Payment'
    default:
      return store.service.name
  }
})

const showContinueButton = computed(() => {
  const stepName = store.currentStepName
  return ['tickets'].includes(stepName)
})

const showBackButton = computed(() => {
  // Disable back on error or first step of flow
  if (isErrorState.value || store.flowSteps.length === 0) return false
  return store.stepIndex > 0
})

const isContinueDisabled = computed(() => {
  switch (store.currentStepName) {
    case 'calendar':
      return !store.selectedSlot
    case 'tickets':
      return store.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0) === 0
    case 'info':
      return store.isLoading // Disable while saving info
    case 'login_prompt':
    case 'payment':
      return true // Continue button is either not used or has different text in these steps
    default:
      return true
  }
})

const handleContinue = async () => {
  const currentStep = store.currentStepName

  if (currentStep === 'tickets' && !isContinueDisabled.value) {
    store.nextStep()
  } else if (currentStep === 'info') {
    // Info step requires validation before proceeding
    // We now call the exposed function from the child component
    if (
      visitorInfoFormRef.value &&
      typeof visitorInfoFormRef.value.saveVisitorInfo === 'function'
    ) {
      // The child component handles saving to the store AND calling store.nextStep() on success
      await visitorInfoFormRef.value.saveVisitorInfo()
      // If saveVisitorInfo() succeeds, the child component calls store.nextStep() internally.
    }
  } else if (currentStep === 'login_prompt') {
    // This button should be hidden in LoginPrompt, but if present, it's an error.
    // The action here should be driven by the component's internal events.
    // We use the simpler logic below for this button.
    console.error('Continue button clicked unexpectedly on login_prompt step.')
  }
}
//  CREATE A COMPUTED PROPERTY FOR THE PRE-DISCOUNT TOTAL ---
// This provides a clean, reactive, and reusable value for our template.
const preDiscountTotal = computed(() => {
  if (!store.priceBreakdown) return 0
  // The correct total before coupon/discounts is the ticket subtotal + the add-ons total.
  return store.priceBreakdown.adjusted_subtotal + store.priceBreakdown.add_ons_total
})

function handleVisitorInfoSubmit(formData) {
  console.log('[BookingWidget] Received visitor info from child:', formData)
  // The formData object already contains the correct `is_guest` flag.
  store.saveVisitorInfo(formData)
}

function onLoginSuccess() {
  // When login is successful in the "login_first" flow, move to the calendar
  //store.currentStep = 'calendar'
  if (store.service?.login_flow_preference === 'login_first') {
    store.currentStep = 'info'
  }
  // store.currentStep = 'info'
}

function handleInfoSaved() {
  // --- FIX #2: INTELLIGENT STEP TRANSITION ---
  // Now we check what the original flow was to determine the next step.
  store.saveVisitorInfo(formData)
  if (isLoginFirstFlow.value && !store.selectedSlot) {
    // In LoginFirst flow, after INFO, the next uncompleted step is CALENDAR.
    store.currentStep = 'calendar'
  } else {
    // Otherwise, we must be coming from the INFO step right before the end.
    store.currentStep = 'payment'
  }
}

function handleSkipLogin() {
  // Only used in 'login_at_checkout' or 'guest_only' flow, from TicketStep
  // Transition: TICKETS -> INFO (as guest)
  store.nextStep()
}

function onLoginPromptSuccess() {
  // This is called when the user successfully logs in or verifies phone.
  // The CustomerStore has been updated, and isAuthenticated is true.

  // If the user is a NEW user, they are not yet fully authenticated.
  // We set this flag to immediately hide the LoginPrompt.
  store.nextStep()
  console.log('Login/OTP verified successfully. Transitioning to INFO step.')
}

// Determine if back button should go to tickets or calendar
const canGoBack = computed(() => {
  if (
    store.currentStep === 'loading' ||
    store.currentStep === 'error' ||
    store.currentStep === 'payment'
  )
    return false
  // Disallow closing the first screen in the Login-First flow via 'Back' button
  if (isShowingLoginPrompt.value && isLoginFirstFlow.value) return false

  if (['calendar', 'tickets', 'info', 'login_prompt'].includes(store.currentStep)) {
    return true
  }
  return false
})

const handleBack = () => {
  store.prevStep()
}
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
      <!-- <div v-if="store.currentStep === 'loading'" class="text-center pt-10">
        Loading Experience...
      </div>
      <div v-if="store.currentStep === 'error'" class="text-center text-destructive pt-10">
        {{ store.error }}
      </div> -->

      <component
        :is="stepComponent"
        :ref="store.currentStepName === 'info' ? 'visitorInfoFormRef' : undefined"
        @success="onLoginPromptSuccess"
        @skip="handleSkipLogin"
        @submit-visitor-info="store.nextStep()"
      />
    </div>

    <!-- Footer (Always Visible) -->
    <div
      v-if="!isLoadingExperience && !isErrorState"
      class="p-4 border-t flex items-center justify-between shrink-0"
    >
      <div>
        <Button v-if="showBackButton" variant="ghost" @click="handleBack"> Back </Button>
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

        <Button
          v-if="showContinueButton"
          @click="handleContinue"
          :disabled="isContinueDisabled"
          size="lg"
        >
          Continue
        </Button>
        <Button
          v-else-if="store.currentStepName === 'info'"
          @click="handleContinue"
          :disabled="isContinueDisabled"
          size="lg"
        >
          Confirm & Proceed
        </Button>
      </div>
    </div>
  </div>
</template>

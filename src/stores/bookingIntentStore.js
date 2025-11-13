// src/stores/bookingIntentStore.js
import { defineStore } from 'pinia'
import api from '@/api'
import { useToast } from '@/components/ui/toast/use-toast'
import { useCustomerAuthStore } from './customerAuthStore'

const { toast } = useToast()

const INITIAL_STEPS_GUEST = ['calendar', 'tickets', 'info', 'payment']
const INITIAL_STEPS_AT_CHECKOUT = ['calendar', 'tickets', 'login_prompt', 'info', 'payment']
const INITIAL_STEPS_LOGIN_FIRST = ['login_prompt', 'info', 'calendar', 'tickets', 'payment']

export const useBookingIntentStore = defineStore('bookingIntent', {
  state: () => ({
    service: null,
    tenantUuid: null,
    selectedDate: null,
    dailyManifest: null,
    selectedSlot: null,
    tickets: [],
    addOns: [],
    sessionId: null,
    currentStep: 'loading', // loading -> calendar -> tickets -> info -> confirmed
    error: null,
    priceBreakdown: null,
    isLoadingManifest: false, // For showing a loading state for time slots
    isCalculatingPrice: false,
    couponCodeInput: '', // Bound to the input field
    isApplyingCoupon: false,
    couponError: null,
    loginPromptStep: 'login_prompt',
    // --- NEW FLOW STATE ---
    flowSteps: [], // The array of steps for the current flow (e.g., ['calendar', 'tickets', 'info', 'payment'])
    stepIndex: 0, // The current position in the flowSteps array
    // --- END NEW FLOW STATE ---
  }),

  getters: {
    appliedCoupon(state) {
      if (!state.priceBreakdown || !state.priceBreakdown.discounts) return null
      // Find the first discount that starts with "Coupon:"
      return state.priceBreakdown.discounts.find((d) => d.name.startsWith('Coupon:'))
    },
    // --- NEW GETTER for the current step name ---
    currentStepName() {
      return this.flowSteps[this.stepIndex]
    },

    // --- NEW GETTER to get the flow configured based on preference ---
    getFlowSteps() {
      if (!this.service) return []
      switch (this.service.login_flow_preference) {
        case 'login_first':
          return INITIAL_STEPS_LOGIN_FIRST
        case 'login_at_checkout':
          return INITIAL_STEPS_AT_CHECKOUT
        case 'guest_only':
        default:
          return INITIAL_STEPS_GUEST
      }
    },
  },

  actions: {
    nextStep() {
      if (this.stepIndex < this.flowSteps.length - 1) {
        this.stepIndex++
      } else {
        // Handle final step (e.g., transition to external payment page)
        console.log('Final step reached! Ready for payment.')
      }
    },

    prevStep() {
      if (this.stepIndex > 0) {
        this.stepIndex--
      }
    },

    resetFlow() {
      this.stepIndex = 0
      this.flowSteps = []
      this.selectedDate = null
      this.selectedSlot = null
      this.tickets = []
      this.addOns = []
    },

    async fetchDailyManifest(date) {
      this.selectedDate = date
      this.dailyManifest = null
      this.error = null
      this.isLoadingManifest = true
      const tenantUuid = this.service.tenant.uuid
      const serviceUuid = this.service.uuid
      console.log(
        'Fetching daily manifest for Tenant:',
        tenantUuid,
        'Service:',
        serviceUuid,
        'Date:',
        date,
      )
      try {
        const response = await api.get(
          `/public/tenants/${tenantUuid}/services/${serviceUuid}/daily-manifest?date=${date}`,
        )
        this.dailyManifest = response.data
      } catch (err) {
        this.error = 'Could not load availability for this date.'
        console.error(err)
      } finally {
        this.isLoadingManifest = false
      }
    },

    selectSlot(slot) {
      this.selectedSlot = slot.id
      if (this.dailyManifest && this.dailyManifest.ticket_tiers) {
        this.tickets = this.dailyManifest.ticket_tiers.map((tier) => ({
          tier_id: tier.id,
          quantity: tier.min_quantity || 0,
        }))
      }

      if (this.service && this.service.add_ons) {
        this.addOns = this.service.add_ons.map((addOn) => ({
          add_on_id: addOn.id,
          quantity: 0,
        }))
      }
      this.nextStep()
      this.calculatePrice()
    },

    // --- NEW ACTION ---
    goBackToCalendar() {
      this.stepIndex = this.flowSteps.indexOf('calendar')
      this.selectedSlot = null
      this.priceBreakdown = null
    },

    reset() {
      this.$reset()
    },
    async initialize(sessionId) {
      this.resetFlow()
      this.currentStep = 'loading'
      this.sessionId = sessionId

      console.log(`[Store] Initializing with SessionId: ${sessionId}`)

      try {
        const response = await api.get(`/public/booking-intents/${sessionId}`)
        const intent = response.data
        this.service = intent.bookable_service
        // this.service = intent.bookable_service
        this.tenantUuid = intent.bookable_service?.tenant?.uuid
        console.log('[Store] Received intent data:', intent)
        this.flowSteps = this.getFlowSteps // **CRITICAL: Set the flow here*

        const savedDate = intent.intent_data?.date || null
        const savedSlotId = intent.intent_data?.slot_id || null
        const savedTickets = intent.intent_data?.tickets || []
        const savedAddOns = intent.intent_data?.add_ons || []
        const isInfoSaved = intent.intent_data?.visitorInfo ? true : false

        this.selectedDate = savedDate
        this.selectedSlot = savedSlotId

        if (
          intent.status !== 'active' ||
          (intent.expires_at && new Date(intent.expires_at) < new Date())
        ) {
          this.error = 'This booking session is invalid or has expired.'
          // To ensure error message is shown, set stepIndex to a non-step value
          this.stepIndex = this.flowSteps.length // Out of bounds index
          return
        }

        // Restore state from the backend if it exists
        this.selectedDate = savedDate
        this.selectedSlot = savedSlotId
        this.tickets = savedTickets
        if (this.service && this.service.addons) {
          // Corrected property name (no underscore)
          this.addOns = this.service.addons.map((addOn) => ({
            add_on_id: addOn.id,
            quantity: 0,
          }))
        } else {
          this.addOns = []
        }

        // if (intent.intent_data?.visitorInfo) {
        //   this.currentStep = 'info'
        // } else if (savedSlotId && savedDate) {
        //   // If the session was already on the tickets step, we MUST get fresh data
        //   await this.fetchDailyManifest(savedDate)

        //   // Now, intelligently merge the saved quantities with the fresh tier data
        //   if (this.dailyManifest && this.dailyManifest.ticket_tiers) {
        //     this.tickets = this.dailyManifest.ticket_tiers.map((freshTier) => {
        //       const savedTicket = savedTickets.find((t) => t.tier_id === freshTier.id)
        //       return {
        //         tier_id: freshTier.id,
        //         // Use the saved quantity, or default to the tier's min_quantity
        //         quantity: savedTicket ? savedTicket.quantity : freshTier.min_quantity || 0,
        //       }
        //     })
        //   }
        //   this.currentStep = 'tickets'
        //   this.calculatePrice() // Recalculate price with restored data
        // } else {
        //   this.currentStep = 'calendar'
        // }

        if (isInfoSaved) {
          // If info is saved, we assume the user was navigating to the next step: 'payment'
          this.stepIndex = this.flowSteps.indexOf('payment')
        } else if (savedSlotId && savedTickets.length > 0) {
          // If slot/tickets are selected, find the step after 'tickets'
          let resumeIndex = this.flowSteps.indexOf('tickets') + 1
          this.stepIndex = Math.min(resumeIndex, this.flowSteps.length - 1)

          // Restore ticket and slot data for recalculation on the current step
          this.selectedDate = savedDate
          this.selectedSlot = savedSlotId
          // Re-fetch manifest for current pricing before restoring tickets
          await this.fetchDailyManifest(savedDate)
          // Restore ticket quantities by matching against fresh manifest
          if (this.dailyManifest && this.dailyManifest.ticket_tiers) {
            this.tickets = this.dailyManifest.ticket_tiers.map((freshTier) => {
              const savedTicket = savedTickets.find((t) => t.tier_id === freshTier.id)
              return {
                tier_id: freshTier.id,
                quantity: savedTicket ? savedTicket.quantity : freshTier.min_quantity || 0,
              }
            })
          }
          this.calculatePrice() // Recalculate price with restored data
        }

        // Edge case: If flow starts with login_prompt and user is already authed, skip it
        const customerAuth = useCustomerAuthStore()
        if (this.currentStepName === 'login_prompt' && customerAuth.isAuthenticated) {
          this.nextStep()
        }
        // --- END NEW INITIAL STEP LOGIC ---
      } catch (err) {
        console.error('Error initializing booking intent:', err)
        this.error = 'This booking session is invalid or has expired.'
        this.currentStep = 'error'
      }
    },

    async calculatePrice() {
      if (!this.sessionId) return

      this.error = null
      // Optionally show a small loading indicator next to the price
      this.isCalculatingPrice = true
      this.couponError = null

      try {
        const payload = {
          session_id: this.sessionId,
          date: this.selectedDate,
          slot_id: this.selectedSlot,
          tickets: this.tickets.filter((t) => t.quantity > 0), // Only send tickets with quantity > 0
          add_ons: this.addOns.filter((a) => a.quantity > 0),
          coupon_code: this.couponCodeInput,
        }

        const response = await api.post(
          `/public/services/${this.service.uuid}/calculate-price`,
          payload,
        )

        this.priceBreakdown = response.data.price_breakdown
      } catch (err) {
        console.error('Price calculation failed:', err)
        this.error = 'Could not update price. Please try again.'
        // Optionally reset price breakdown if calculation fails
        this.priceBreakdown = null
      } finally {
        this.isCalculatingPrice = false
      }
    },

    async applyCoupon() {
      if (!this.couponCodeInput.trim()) {
        this.couponError = 'Please enter a coupon code.'
        return
      }
      this.isApplyingCoupon = true
      await this.calculatePrice() // Re-use the main price calculation logic
      this.isApplyingCoupon = false

      // After calculation, check if the coupon was actually applied
      if (!this.appliedCoupon) {
        this.couponError = 'This coupon is not valid or cannot be applied to your current order.'
      } else {
        toast({
          title: 'Coupon Applied!',
          description: `The coupon "${this.couponCodeInput}" has been successfully applied.`,
          class: 'border-green-500 bg-green-100',
        })
      }
    },

    // --- NEW ACTION to remove an applied coupon ---
    async removeCoupon() {
      this.couponCodeInput = ''
      this.couponError = null
      await this.calculatePrice() // Recalculate the price without the coupon
    },

    async saveVisitorInfo(visitorData) {
      this.isLoading = true // Use a generic loading state
      this.error = null
      try {
        // Determine if the user is a guest based on the customer store's state
        const customerStore = useCustomerAuthStore()
        // Create a payload object that maps the frontend names to the backend names.
        const payload = {
          name: visitorData.name,
          email: visitorData.email,
          phone: visitorData.phone,
          address1: visitorData.address1,
          city: visitorData.city,
          postalCode: visitorData.postalCode,
          country: visitorData.country,
          is_guest: visitorData.is_guest, //
        }

        await api.put(`/public/booking-intents/${this.sessionId}/visitor-info`, payload)

        // Move to the final step
        // this.currentStep = 'payment'
        return true
      } catch (err) {
        console.error('Failed to save visitor info:', err)
        this.error = err.response?.data?.message || 'Could not save your details.'
        toast({
          title: 'Error Saving Details',
          description: this.error,
          variant: 'destructive',
        })
        return false
      } finally {
        this.isLoading = false
      }
    },
  },
})

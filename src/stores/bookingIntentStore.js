// src/stores/bookingIntentStore.js
import { defineStore } from 'pinia'
import api from '@/api'
import { useToast } from '@/components/ui/toast/use-toast'

const { toast } = useToast()

export const useBookingIntentStore = defineStore('bookingIntent', {
  state: () => ({
    service: null,
    // tenant: null,
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
  }),

  getters: {
    appliedCoupon(state) {
      if (!state.priceBreakdown || !state.priceBreakdown.discounts) return null
      // Find the first discount that starts with "Coupon:"
      return state.priceBreakdown.discounts.find((d) => d.name.startsWith('Coupon:'))
    },
  },

  actions: {
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
      this.currentStep = 'tickets'
      this.calculatePrice()
    },

    // --- NEW ACTION ---
    goBackToCalendar() {
      this.currentStep = 'calendar'
      this.selectedSlot = null
      this.priceBreakdown = null
    },

    reset() {
      this.$reset()
    },
    async initialize(sessionId) {
      this.reset()
      this.currentStep = 'loading'
      this.sessionId = sessionId

      console.log(`[Store] Initializing with SessionId: ${sessionId}`)

      try {
        const response = await api.get(`/public/booking-intents/${sessionId}`)
        const intent = response.data
        this.service = intent.bookable_service
        // this.service = intent.bookable_service
        console.log('[Store] Received intent data:', intent)

        const savedDate = intent.intent_data?.date || null
        const savedSlotId = intent.intent_data?.slot_id || null
        const savedTickets = intent.intent_data?.tickets || []
        const savedAddOns = intent.intent_data?.add_ons || []

        this.selectedDate = savedDate
        this.selectedSlot = savedSlotId

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

        if (intent.intent_data?.visitorInfo) {
          this.currentStep = 'info'
        } else if (savedSlotId && savedDate) {
          // If the session was already on the tickets step, we MUST get fresh data
          await this.fetchDailyManifest(savedDate)

          // Now, intelligently merge the saved quantities with the fresh tier data
          if (this.dailyManifest && this.dailyManifest.ticket_tiers) {
            this.tickets = this.dailyManifest.ticket_tiers.map((freshTier) => {
              const savedTicket = savedTickets.find((t) => t.tier_id === freshTier.id)
              return {
                tier_id: freshTier.id,
                // Use the saved quantity, or default to the tier's min_quantity
                quantity: savedTicket ? savedTicket.quantity : freshTier.min_quantity || 0,
              }
            })
          }
          this.currentStep = 'tickets'
          this.calculatePrice() // Recalculate price with restored data
        } else {
          this.currentStep = 'calendar'
        }
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
  },
})

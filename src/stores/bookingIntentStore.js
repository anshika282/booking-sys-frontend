// src/stores/bookingIntentStore.js
import { defineStore } from 'pinia'
import api from '@/api'

export const useBookingIntentStore = defineStore('bookingIntent', {
  state: () => ({
    sessionId: null,
    service: null,
    selectedDate: null,
    selectedSlot: null,
    tickets: [], // e.g., [{ tier_id: 1, quantity: 2 }]
    addOns: [], // e.g., [{ add_on_id: 3, quantity: 1 }]
    priceBreakdown: null,
    status: 'idle', // idle, pricing, priced, confirming, confirmed
    error: null,
  }),
  actions: {
    async startIntent(serviceId, date, slot) {
      /* ... */
    },
    async updateSelection(selectionData) {
      /* ... */
    },
    async calculatePrice() {
      /* ... */
    },
    async saveVisitorInfo(customerDetails) {
      /* ... */
    },
    async finalizeBooking(paymentToken) {
      /* ... */
    },
    reset() {
      /* Resets state for a new booking */
    },
  },
})

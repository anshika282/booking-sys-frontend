import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api'

export const useCouponStore = defineStore('coupon', () => {
  // --- STATE ---
  const ticketTiers = ref([]) // To hold the list of available ticket tiers for a service
  const isLoadingTiers = ref(false)

  // --- ACTIONS ---

  // Fetches all ticket tiers for a given service.
  // This is needed for the BOGO and condition rules.
  async function fetchTicketTiers(serviceId) {
    if (ticketTiers.value.length > 0) return // Don't refetch if already loaded

    isLoadingTiers.value = true
    try {
      const response = await api.get(`/services/${serviceId}/ticket-tiers`)
      // We only need the name and id for the dropdowns
      ticketTiers.value = response.data.data.map((tier) => ({
        id: tier.id,
        label: tier.name,
      }))
    } catch (error) {
      console.error('Failed to fetch ticket tiers:', error)
      ticketTiers.value = []
    } finally {
      isLoadingTiers.value = false
    }
  }

  // Resets the store when the user leaves the page
  function reset() {
    ticketTiers.value = []
  }

  return {
    ticketTiers,
    isLoadingTiers,
    fetchTicketTiers,
    reset,
  }
})

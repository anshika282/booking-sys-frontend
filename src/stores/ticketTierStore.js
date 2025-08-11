import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api'
import { useToast } from '@/components/ui/toast/use-toast'

export const useTicketTierStore = defineStore('ticketTiers', () => {
  const { toast } = useToast()

  // --- STATE ---
  const tiers = ref([])
  const serviceName = ref('')
  const isLoading = ref(false)
  const currentServiceId = ref(null) // To track the current service ID

  // --- ACTIONS ---

  // Fetches the initial data for a given service
  async function initialize(serviceId) {
    isLoading.value = true
    currentServiceId.value = serviceId
    try {
      const [serviceRes, tiersRes] = await Promise.all([
        api.get(`/services/${serviceId}`),
        api.get(`/services/${serviceId}/ticket-tiers`),
      ])

      serviceName.value = serviceRes.data.data.name
      const existingTiers = tiersRes.data.data

      if (existingTiers && existingTiers.length > 0) {
        tiers.value = existingTiers.map((tier) => ({
          id: tier.id,
          name: tier.name,
          base_price: tier.base_price,
          min_quantity: tier.min_quantity,
          max_quantity: tier.max_quantity,
        }))
      } else {
        tiers.value = [] // Ensure it's a clean slate if no tiers exist
      }
    } catch (error) {
      console.error('Failed to initialize ticket tiers:', error)
      toast({ title: 'Error', description: 'Could not load service data.', variant: 'destructive' })
    } finally {
      isLoading.value = false
    }
  }

  // Adds a new, blank tier to the local state
  function addTier() {
    console.log('Before adding tier, current tiers:', tiers.value)

    const newTier = {
      temp_id: `new_${Date.now()}`,
      name: '',
      base_price: '0.00',
      min_quantity: 1,
      max_quantity: 10,
    }

    tiers.value.push(newTier)

    console.log('After adding tier, current tiers:', tiers.value)
    console.log('New tier added:', newTier)
  }

  // Removes a tier from the local state by its index
  function removeTier(index) {
    tiers.value.splice(index, 1)
  }

  // --- NEW: Action to handle the reordering logic ---
  // This is a standard array reordering algorithm.
  function reorderTier({ oldIndex, newIndex }) {
    if (oldIndex === newIndex) return

    // Remove the item from its old position
    const [movedItem] = tiers.value.splice(oldIndex, 1)

    // Insert the item into its new position
    tiers.value.splice(newIndex, 0, movedItem)
  }
  // Saves the entire list to the backend
  async function saveTiers(serviceId) {
    isLoading.value = true
    const payload = {
      tiers: tiers.value.map(({ temp_id, ...rest }) => rest),
    }
    try {
      await api.put(`/services/${serviceId}/ticket-tiers`, payload)
      toast({
        title: 'Ticket Tiers Saved!',
        description: 'The order and details have been updated.',
      })
      return true // Indicate success
    } catch (error) {
      console.error('Failed to save tiers:', error)
      toast({
        title: 'An error occurred',
        description: 'Could not save the ticket tiers.',
        variant: 'destructive',
      })
      return false // Indicate failure
    } finally {
      isLoading.value = false
    }
  }

  async function fetchTicketTiers(serviceId) {
    if (tiers.value.length > 0 && currentServiceId.value === serviceId) {
      return
    }
    isLoading.value = true
    currentServiceId.value = serviceId
    try {
      const response = await api.get(`/services/${serviceId}/ticket-tiers`)
      const tierData = response.data.data

      if (Array.isArray(tierData)) {
        // We only need id and name for the dropdowns
        tiers.value = tierData.map((tier) => ({
          id: tier.id,
          label: tier.name,
        }))
        console.log('[Store] Successfully fetched and mapped tiers for dropdowns:', tiers.value)
      } else {
        console.error('[Store] API response for tiers was not an array:', tierData)
        tiers.value = []
      }
    } catch (error) {
      console.error('Failed to fetch ticket tiers:', error)
      toast({
        title: 'Error',
        description: 'Could not load ticket tiers for the form.',
        variant: 'destructive',
      })
    } finally {
      isLoading.value = false
    }
  }

  // --- NEW: Reset action ---
  function reset() {
    tiers.value = []
    currentServiceId.value = null
    serviceName.value = ''
  }

  return {
    tiers,
    serviceName,
    isLoading,
    initialize,
    addTier,
    removeTier,
    reorderTier,
    saveTiers,
    fetchTicketTiers,
    reset,
  }
})

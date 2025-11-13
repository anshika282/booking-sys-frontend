// src/stores/bookingStore.js
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api'
import { useToast } from '@/components/ui/toast/use-toast'

export const useBookingStore = defineStore('booking', () => {
  const { toast } = useToast()
  
  // --- STATE ---
  const bookings = ref([])
  const isLoading = ref(false)
  const pagination = ref({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 15,
  })

  // --- ACTIONS ---

  /**
   * Fetches a paginated list of bookings for the current tenant.
   * @param {number} page The page number to fetch.
   * @param {object} filters Optional filters (e.g., status, search).
   */
  async function fetchBookings(page = 1, filters = {}) {
    isLoading.value = true
    try {
      // Build query parameters
      const params = {
        page: page,
        per_page: pagination.value.perPage,
        ...filters,
      }
      
      const response = await api.get('/bookings', { params })
      
      bookings.value = response.data.data
      
      // Update pagination metadata
      pagination.value = {
        ...pagination.value,
        currentPage: response.data.meta.current_page,
        lastPage: response.data.meta.last_page,
        total: response.data.meta.total,
        perPage: response.data.meta.per_page,
      }

    } catch (error) {
      console.error('Failed to fetch bookings:', error)
      toast({
        title: 'Error',
        description: 'Could not load booking data.',
        variant: 'destructive',
      })
    } finally {
      isLoading.value = false
    }
  }

  // --- GETTERS ---
  // A simple mapping to expose currentPage as a reactive value for pagination
  const currentPage = computed(() => pagination.value.currentPage)

  return {
    bookings,
    isLoading,
    pagination,
    currentPage,
    fetchBookings,
  }
})
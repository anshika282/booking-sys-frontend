// src/stores/customerStore.js - MODIFICATION
import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api'
import { useToast } from '@/components/ui/toast/use-toast'

export const useCustomerStore = defineStore('customerAdmin', () => {
  const { toast } = useToast()

  // --- EXISTING STATE (for list view) ---
  const customers = ref([])
  const isLoading = ref(false)
  const pagination = ref({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 15,
  })
  const searchInput = ref('')

  // --- NEW STATE (for detail view) ---
  const selectedCustomer = ref(null)
  const isDetailsLoading = ref(false)
  const customerBookings = ref([])
  const customerSummary = ref(null)

  // --- EXISTING ACTIONS (for list view) ---
  // (fetchCustomers and runSearch remain the same)
  async function fetchCustomers(page = 1, search = '') {
    // ... (implementation is the same) ...
    isLoading.value = true
    try {
      // Build query parameters
      const params = {
        page: page,
        per_page: pagination.value.perPage,
        search: search.trim(),
      }

      const response = await api.get('/customers', { params })

      customers.value = response.data.data

      // Update pagination metadata
      pagination.value = {
        ...pagination.value,
        currentPage: response.data.meta.current_page,
        lastPage: response.data.meta.last_page,
        total: response.data.meta.total,
        perPage: response.data.meta.per_page,
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      toast({
        title: 'Error',
        description: 'Could not load customer data.',
        variant: 'destructive',
      })
    } finally {
      isLoading.value = false
    }
  }

  function runSearch() {
    fetchCustomers(1, searchInput.value)
  }

  // --- NEW ACTION (for detail view) ---

  /**
   * Fetches a single customer's profile and their booking summary.
   * @param {number} customerId The ID of the customer to fetch.
   */
  async function fetchCustomerDetails(customerId) {
    isDetailsLoading.value = true
    selectedCustomer.value = null
    customerBookings.value = []
    customerSummary.value = null

    try {
      // The backend API is expected to return the customer, summary, and paginated bookings
      const response = await api.get(`/customers/${customerId}`)
      const data = response.data.data

      selectedCustomer.value = data.customer
      customerSummary.value = data.tenant_summary
      customerBookings.value = data.bookings.data // Get the bookings array from the paginated response

      // Optionally, store the bookings pagination meta if needed for the table
      // customerBookingsPagination.value = data.bookings.meta
    } catch (error) {
      console.error('Failed to fetch customer details:', error)
      toast({
        title: 'Error',
        description: 'Could not load customer profile.',
        variant: 'destructive',
      })
    } finally {
      isDetailsLoading.value = false
    }
  }

  return {
    // Existing exports
    customers,
    isLoading,
    pagination,
    searchInput,
    fetchCustomers,
    runSearch,
    // New exports
    selectedCustomer,
    isDetailsLoading,
    customerBookings,
    customerSummary,
    fetchCustomerDetails,
  }
})

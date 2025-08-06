import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api'
import { useToast } from '@/components/ui/toast/use-toast'

export const useAddOnStore = defineStore('addOns', () => {
  const { toast } = useToast()

  const addOns = ref([])
  const initialAddOns = ref([]) // To track changes
  const serviceName = ref('')
  const isLoading = ref(false)
  const errors = ref({})

  const initialize = async (serviceId) => {
    isLoading.value = true
    try {
      const [serviceRes, addOnsRes] = await Promise.all([
        api.get(`/services/${serviceId}`),
        api.get(`/services/${serviceId}/add-ons`),
      ])
      serviceName.value = serviceRes.data.data.name
      const existingAddOns = addOnsRes.data.data.map((a) => ({ ...a, price: a.base_price })) // Align price field
      addOns.value = JSON.parse(JSON.stringify(existingAddOns)) // Deep copy for editing
      initialAddOns.value = JSON.parse(JSON.stringify(existingAddOns))
    } catch (error) {
      /* ... */
    } finally {
      isLoading.value = false
    }
  }

  const addAddOn = () => {
    addOns.value.push({
      temp_id: `new_${Date.now()}`,
      name: '',
      is_included_in_ticket: false,
      price: '0.00',
      type: 'per_person',
    })
  }

  const removeAddOn = (index) => {
    addOns.value.splice(index, 1)
  }

  const deleteAddOn = async (serviceId, addOn, index) => {
    // If it's a new item that hasn't been saved, just remove it from the UI
    if (!addOn.id) {
      removeAddOn(index)
      return
    }

    isLoading.value = true
    try {
      await api.delete(`/services/${serviceId}/add-ons/${addOn.id}`)
      removeAddOn(index) // Remove from UI only after successful API call
      toast({ title: 'Add-on Deleted', description: `"${addOn.name}" has been deleted.` })
    } catch (error) {
      console.error('Failed to delete add-on:', error)
      toast({ title: 'Error', description: 'Could not delete the add-on.', variant: 'destructive' })
    } finally {
      isLoading.value = false
    }
  }

  const validate = () => {
    errors.value = {}
    const names = new Set()
    addOns.value.forEach((addOn, index) => {
      if (!addOn.name.trim()) {
        errors.value[index] = { name: 'Name is required.' }
      } else if (names.has(addOn.name.trim().toLowerCase())) {
        errors.value[index] = { name: 'Add-on names must be unique.' }
      }
      names.add(addOn.name.trim().toLowerCase())
    })
    return Object.keys(errors.value).length === 0
  }

  const saveAddOns = async (serviceId) => {
    if (!validate()) {
      toast({
        title: 'Validation Failed',
        description: 'Please fix the errors before saving.',
        variant: 'destructive',
      })
      return false
    }
    isLoading.value = true
    try {
      const initialIds = new Set(initialAddOns.value.map((a) => a.id))
      const currentIds = new Set(addOns.value.filter((a) => a.id).map((a) => a.id))

      const toDelete = initialAddOns.value.filter((a) => !currentIds.has(a.id))
      const toCreate = addOns.value.filter((a) => !a.id)
      const toUpdate = addOns.value.filter(
        (a) =>
          a.id &&
          JSON.stringify(a) !== JSON.stringify(initialAddOns.value.find((ia) => ia.id === a.id)),
      )

      // Perform all API calls in parallel
      await Promise.all([
        ...toDelete.map((a) => api.delete(`/services/${serviceId}/add-ons/${a.id}`)),
        ...toCreate.map((a) => api.post(`/services/${serviceId}/add-ons`, a)),
        ...toUpdate.map((a) => api.patch(`/services/${serviceId}/add-ons/${a.id}`, a)),
      ])

      toast({
        title: 'Add-ons Saved!',
        description: 'Your add-ons have been successfully updated.',
      })
      return true
    } catch (error) {
      console.error('Failed to save add-ons:', error)
      toast({ title: 'Error', description: 'Could not save your add-ons.', variant: 'destructive' })
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    addOns,
    serviceName,
    isLoading,
    errors,
    initialize,
    addAddOn,
    removeAddOn,
    deleteAddOn,
    saveAddOns,
  }
})

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api'
import { useToast } from '@/components/ui/toast/use-toast'

export const usePricingRuleStore = defineStore('pricingRules', () => {
  const { toast } = useToast()

  const rules = ref([])
  const initialOrder = ref([]) // To track if the order has changed
  const serviceName = ref('')
  const isLoading = ref(false)

  const hasOrderChanged = computed(() => {
    if (rules.value.length !== initialOrder.value.length) return true
    const currentOrderIds = rules.value.map((r) => r.id)
    return JSON.stringify(currentOrderIds) !== JSON.stringify(initialOrder.value)
  })

  const initialize = async (serviceId) => {
    isLoading.value = true
    try {
      const [serviceRes, rulesRes] = await Promise.all([
        api.get(`/services/${serviceId}`),
        api.get(`/services/${serviceId}/pricing`),
      ])

      serviceName.value = serviceRes.data.data.name
      rules.value = rulesRes.data.data
      // Store the initial order to detect changes
      initialOrder.value = rules.value.map((r) => r.id)
    } catch (error) {
      console.error('Failed to load pricing rules:', error)
      toast({
        title: 'Error',
        description: 'Could not load pricing rules.',
        variant: 'destructive',
      })
    } finally {
      isLoading.value = false
    }
  }

  const reorderRule = ({ oldIndex, newIndex }) => {
    if (oldIndex === newIndex) return
    const [movedItem] = rules.value.splice(oldIndex, 1)
    rules.value.splice(newIndex, 0, movedItem)
  }

  const updateRuleOrder = (newOrder) => {
    rules.value = newOrder
  }

  const saveOrder = async (serviceId) => {
    isLoading.value = true
    const orderedRuleIds = rules.value.map((r) => r.id)
    try {
      await api.patch(`/services/${serviceId}/pricing/reorder`, {
        ordered_rules: orderedRuleIds,
      })
      toast({
        title: 'Order Saved!',
        description: 'The priority of your pricing rules has been updated.',
      })
      initialOrder.value = orderedRuleIds // Update the initial order to the new state
    } catch (error) {
      console.error('Failed to save order:', error)
      toast({
        title: 'Error',
        description: 'Could not save the new order.',
        variant: 'destructive',
      })
    } finally {
      isLoading.value = false
    }
  }

  return {
    rules,
    serviceName,
    isLoading,
    initialOrder,
    hasOrderChanged,
    initialize,
    reorderRule,
    updateRuleOrder,
    saveOrder,
  }
})

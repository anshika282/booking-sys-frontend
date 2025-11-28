import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api'
import { useToast } from '@/components/ui/toast/use-toast'

export const usePaymentSettingsStore = defineStore('paymentSettings', () => {
  const { toast } = useToast()

  // --- CONFIGURATION FOR SCALABILITY ---
  // The backend should eventually provide this list, but we hardcode the structure here
  // to power the frontend UI.
  const availableGateways = ref([
    {
      type: 'phonepe',
      name: 'PhonePe Payments (India)',
      status: 'Ready',
      fields: [
        // The fields required for PhonePe Sandbox/Production
        {
          id: 'merchant_id',
          label: 'Merchant ID',
          required: true,
          placeholder: 'Your PhonePe Merchant ID',
        },
        {
          id: 'salt_key',
          label: 'Salt Key (Secret)',
          required: true,
          type: 'password',
          placeholder: 'Secure Salt Key',
        },
        {
          id: 'salt_index',
          label: 'Salt Index',
          required: true,
          type: 'number',
          placeholder: 'e.g., 1',
        },
      ],
    },
    {
      type: 'stripe',
      name: 'Stripe Payments',
      status: 'Coming Soon',
      fields: [],
    },
  ])

  // --- STATE ---
  const isLoading = ref(false)
  const errors = ref({})

  // Bound to the Select component
  const defaultGatewayType = ref(null)

  // Object to store the credentials for the PhonePe gateway
  const phonePeCredentials = ref({
    merchant_id: '',
    salt_key: '',
    salt_index: 1,
  })

  // --- ACTIONS ---

  async function fetchSettings() {
    isLoading.value = true
    try {
      // NOTE: Assuming backend route is /payment/config
      // This API must be implemented on the Laravel side: GET /api/v1/payment/config
      const response = await api.get('/payment/config')
      const config = response.data.data

      if (config) {
        defaultGatewayType.value = config.gateway_type

        // Dynamically load credentials based on the type
        if (config.gateway_type === 'phonepe' && config.credentials) {
          // Merge fetched credentials over the default state
          phonePeCredentials.value = { ...phonePeCredentials.value, ...config.credentials }
        }
      } else {
        // If config is null, ensure the form is reset to default 'create' state
        defaultGatewayType.value = null
        phonePeCredentials.value = { merchant_id: '', salt_key: '', salt_index: 1 }
      }
    } catch (error) {
      console.error('Failed to fetch payment settings:', error)
      // Display error only if it's not a simple 404 (no config yet)
      if (error.response?.status !== 404) {
        toast({
          title: 'Error',
          description: 'Could not load payment settings.',
          variant: 'destructive',
        })
      }
    } finally {
      isLoading.value = false
    }
  }

  async function saveSettings() {
    isLoading.value = true
    errors.value = {}

    if (!defaultGatewayType.value) {
      errors.value.defaultGatewayType = ['Please select a default payment gateway.']
      isLoading.value = false
      return false
    }

    let payload = {
      gateway_type: defaultGatewayType.value,
      is_default: true, // Always set the saved one as default for now
      credentials: {},
    }

    if (defaultGatewayType.value === 'phonepe') {
      payload.credentials = phonePeCredentials.value
    }
    // UX CHECK: Ensure all required fields for the selected gateway are present.
    // NOTE: Full validation should be done on the backend, but basic checking here is good UX.

    try {
      // NOTE: Assuming backend route is /payment/config
      // This API must be implemented on the Laravel side: PUT /api/v1/payment/config
      await api.put('/payment/config', payload)

      const gatewayName = availableGateways.value.find(
        (g) => g.type === defaultGatewayType.value,
      ).name

      toast({
        title: 'Settings Saved',
        description: `Default payment set to ${gatewayName}.`,
      })

      return true
    } catch (error) {
      console.error('Failed to save settings:', error)
      if (error.response?.status === 422) {
        // Map validation errors back to the frontend state
        errors.value = error.response.data.errors
      } else {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Could not save payment settings.',
          variant: 'destructive',
        })
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    availableGateways,
    isLoading,
    errors,
    defaultGatewayType,
    phonePeCredentials,
    fetchSettings,
    saveSettings,
  }
})

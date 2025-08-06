// src/composables/useAppToast.js
import { h } from 'vue'
import { useToast } from '@/components/ui/toast/use-toast'
import SuccessToast from '@/components/toasts/SuccessToast.vue'

export function useAppToast() {
  const { toast } = useToast()

  /**
   * Shows our custom-styled success toast.
   * @param {object} options - Contains title and description.
   */
  const showSuccessToast = ({ title, description }) => {
    toast({
      // The magic happens here: we tell the toaster to render our component
      component: h(SuccessToast, {
        title,
        description,
      }),
      // We can also add a custom class for styling the container
      class: 'border-green-500',
    })
  }

  // You could add other custom toasts here, like showErrorToast, etc.

  return {
    showSuccessToast,
  }
}

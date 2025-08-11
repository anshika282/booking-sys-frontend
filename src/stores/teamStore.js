// src/stores/teamStore.js
import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api'
import { useToast } from '@/components/ui/toast/use-toast'

export const useTeamStore = defineStore('team', () => {
  const { toast } = useToast()
  const users = ref([])
  const isLoading = ref(false)
  const pagination = ref({})

  async function fetchUsers(page = 1) {
    isLoading.value = true
    try {
      const response = await api.get(`/users?page=${page}`)
      users.value = response.data.data
      pagination.value = response.data.meta
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast({
        title: 'Error',
        description: 'Could not load your team members.',
        variant: 'destructive',
      })
    } finally {
      isLoading.value = false
    }
  }

  async function inviteUser(userData) {
    // This action will be called by the form. It returns the new user on success.
    const response = await api.post('/users', userData)
    // Add the new user to the top of the list for immediate UI feedback
    users.value.unshift(response.data.data)
    return response.data.data
  }

  return { users, isLoading, pagination, fetchUsers, inviteUser }
})

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import OnboardingDashboard from '@/components/dashboard/OnboardingDashboard.vue'
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard.vue'

const isLoading = ref(true)
const isNewUser = ref(false)

onMounted(async () => {
  try {
    const response = await api.get('/services?per_page=1')
    if (response.data.data.length === 0) {
      isNewUser.value = true
    }
  } catch (error) {
    console.error('Failed to check for existing services:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div>
    <div v-if="isLoading" class="flex items-center justify-center p-10">
      <p class="text-muted-foreground">Loading Your Dashboard...</p>
    </div>
    <div v-else>
      <OnboardingDashboard v-if="isNewUser" />
      <AnalyticsDashboard v-else />
    </div>
  </div>
</template>

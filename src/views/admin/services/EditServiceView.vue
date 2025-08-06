<script setup>
import { computed } from 'vue'
import { useRouter, useRoute, RouterView, RouterLink } from 'vue-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

import ServiceDetailsForm from '@/components/forms/ServiceDetailsForm.vue'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

// const router = useRouter()
const route = useRoute()
const router = useRouter()

// This computed property will help us determine which tab is currently active
const activeTab = computed(() => {
  // This logic checks the end of the route name to determine the active tab
  if (route.name?.includes('-details')) return 'details'
  if (route.name?.includes('-operating-hours')) return 'schedule'
  if (route.name?.includes('-ticket-tiers')) return 'tiers'
  if (route.name?.includes('-pricing-rules')) return 'pricing-rules'
  if (route.name?.includes('-coupon')) return 'coupons'
  if (route.name?.includes('-add-ons')) return 'add-ons'
  return 'details' // Default to the details tab
})

// This function programmatically changes the route when a tab is clicked
const navigateToTab = (tabName) => {
  let routeName
  switch (tabName) {
    case 'schedule':
      routeName = 'admin-service-operating-hours'
      break
    case 'tiers':
      routeName = 'admin-service-ticket-tiers'
      break
    case 'pricing-rules':
      routeName = 'admin-service-pricing-rules'
      break
    case 'coupons':
      routeName = 'admin-service-coupons'
      break
    case 'add-ons':
      routeName = 'admin-service-add-ons'
      break
    default:
      routeName = 'admin-service-edit-details'
  }
  router.push({ name: routeName, params: { id: props.id } })
}

// const handleDetailsUpdateSuccess = (updatedService) => {
//   console.log('Step 1 (Details) saved successfully. Navigating to Step 2.', updatedService)

//   // Navigate to the next step of the wizard: Operating Hours
//   router.push({ name: 'admin-service-operating-hours', params: { id: props.id } })
// }
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold tracking-tight">Manage Service</h1>
      <RouterLink :to="{ name: 'admin-services' }">
        <Button variant="outline">Back to Services</Button>
      </RouterLink>
    </div>

    <Tabs :model-value="activeTab" @update:model-value="navigateToTab" class="w-full">
      <TabsList class="grid w-full grid-cols-6">
        <TabsTrigger value="details"> Step 1: Details </TabsTrigger>
        <TabsTrigger value="schedule"> Step 2: Schedule </TabsTrigger>
        <TabsTrigger value="tiers"> Step 3: Ticket Tiers </TabsTrigger>
        <TabsTrigger value="pricing-rules"> Step 4: Pricing Rules </TabsTrigger>
        <TabsTrigger value="coupons"> Step 5: Coupons </TabsTrigger>
        <TabsTrigger value="add-ons"> Step 6: Add-ons </TabsTrigger>
      </TabsList>

      <!-- The content for each tab will be rendered here by the router -->
      <div class="mt-6">
        <RouterView />
      </div>
    </Tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// --- 1. IMPORT the new sortable hook ---
import { useSortable } from '@vueuse/integrations/useSortable'

import { useTicketTierStore } from '@/stores/ticketTierStore'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GripVertical, Trash2, PlusCircle } from 'lucide-vue-next'

const props = defineProps({
  id: { type: String, required: true },
})

const router = useRouter()
const tierStore = useTicketTierStore()

// --- 2. SETUP the sortable functionality ---
// Create a ref for the HTML element that will contain our list
const listEl = ref(null)
// The useSortable hook links our data (tierStore.tiers) to the HTML element
useSortable(listEl, tierStore.tiers, {
  handle: '.handle', // Specify the drag handle
  animation: 150,
  onEnd: (event) => {
    tierStore.reorderTier({ oldIndex: event.oldIndex, newIndex: event.newIndex })
  },
})

onMounted(() => {
  tierStore.initialize(props.id)
})

const handleSave = async () => {
  const success = await tierStore.saveTiers(props.id)
  if (success) {
    router.push({ name: 'admin-service-pricing-rules', params: { id: props.id } })
  }
}
</script>

<template>
  <div v-if="tierStore.isLoading && tierStore.tiers.length === 0" class="text-center p-8">
    Loading Ticket Tiers...
  </div>
  <Card v-else>
    <CardHeader class="flex flex-row items-center justify-between">
      <div class="space-y-1.5">
        <CardTitle>Ticket Tiers (Step 3 of 4)</CardTitle>
        <CardDescription>
          Create and prioritize the ticket types for "{{ tierStore.serviceName }}". Drag to reorder.
        </CardDescription>
      </div>
      <Button variant="outline" type="button" @click="tierStore.addTier">
        <PlusCircle class="h-4 w-4 mr-2" />
        Add Tier
      </Button>
    </CardHeader>

    <CardContent class="flex flex-col gap-6">
      <!-- --- 3. THE NEW, SIMPLER TEMPLATE --- -->
      <!-- The list container now has the 'ref="listEl"' -->
      <div ref="listEl" class="flex flex-col gap-4 min-h-[100px]">
        <!-- The v-for loop is now direct, with no wrapper component -->
        <div
          v-for="(tier, index) in tierStore.tiers"
          :key="tier.id || tier.temp_id"
          class="flex items-start gap-4 p-4 border rounded-lg bg-background"
        >
          <div class="handle cursor-grab text-muted-foreground pt-3">
            <GripVertical class="h-5 w-5" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
            <div class="grid gap-1.5 md:col-span-2">
              <Label :for="`tier-name-${index}`">Tier Name</Label>
              <Input :id="`tier-name-${index}`" v-model="tier.name" placeholder="e.g., Adult" />
            </div>
            <div class="grid gap-1.5">
              <Label :for="`tier-price-${index}`">Price</Label>
              <Input
                :id="`tier-price-${index}`"
                v-model="tier.base_price"
                type="number"
                step="0.01"
              />
            </div>
            <div class="grid gap-1.5">
              <Label :for="`tier-min-${index}`">Min Quantity</Label>
              <Input :id="`tier-min-${index}`" v-model="tier.min_quantity" type="number" />
            </div>
            <div class="grid gap-1.5">
              <Label :for="`tier-max-${index}`">Max Quantity</Label>
              <Input :id="`tier-max-${index}`" v-model="tier.max_quantity" type="number" />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            @click="tierStore.removeTier(index)"
            class="text-destructive"
            ><Trash2 class="h-5 w-5"
          /></Button>
        </div>
      </div>

      <div v-if="tierStore.tiers.length === 0" class="text-center text-muted-foreground py-10">
        No ticket tiers created yet. Click "Add Tier" to get started.
      </div>

      <div class="flex justify-end gap-2 border-t pt-6">
        <Button variant="outline" type="button" @click="router.back()">Back</Button>
        <Button type="button" :disabled="tierStore.isLoading" @click="handleSave">
          {{ tierStore.isLoading ? 'Saving...' : 'Save and Continue' }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

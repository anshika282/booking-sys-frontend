<script setup>
import { onMounted, computed, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { usePricingRuleStore } from '@/stores/pricingRuleStore'

import { useSortable } from '@vueuse/integrations/useSortable'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import DatePicker from '@/components/ui/date-picker/DatePicker.vue'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { Calendar } from '@/components/ui/calendar'
import { today, getLocalTimeZone } from '@internationalized/date'

import { GripVertical, PlusCircle, Edit, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  id: { type: String, required: true }, // serviceId
})

const store = usePricingRuleStore()
const router = useRouter()
const listEl = ref(null)
useSortable(listEl, store.rules, {
  handle: '.handle',
  animation: 150,
  onEnd: (event) => {
    // Call the store's action when dragging ends
    store.reorderRule({ oldIndex: event.oldIndex, newIndex: event.newIndex })
  },
})
onMounted(() => {
  store.initialize(props.id)
})

// A computed property to detect if the order has changed
const hasOrderChanged = computed(() => {
  if (store.rules.length !== store.initialOrder.length) return true
  const currentOrder = store.rules.map((r) => r.id)
  return JSON.stringify(currentOrder) !== JSON.stringify(store.initialOrder)
})

// A computed property for v-model on the draggable component
const draggableRules = computed({
  get() {
    return store.rules
  },
  set(newOrder) {
    store.updateRuleOrder(newOrder)
  },
})
</script>

<template>
  <div v-if="store.isLoading && store.rules.length === 0">Loading...</div>
  <Card v-else>
    <CardHeader class="flex flex-row items-center justify-between">
      <div>
        <CardTitle>Pricing Rules (Step 4)</CardTitle>
        <CardDescription>
          Create and prioritize rules for "{{ store.serviceName }}". Drag to reorder.
        </CardDescription>
      </div>
      <div class="flex items-center gap-2">
        <Button
          v-if="store.hasOrderChanged"
          @click="store.saveOrder(props.id)"
          :disabled="store.isLoading"
        >
          {{ store.isLoading ? 'Saving...' : 'Save Order' }}
        </Button>
        <RouterLink :to="{ name: 'admin-service-pricing-rule-create', params: { id: props.id } }">
          <Button variant="outline">
            <PlusCircle class="h-4 w-4 mr-2" />
            Add New Rule
          </Button>
        </RouterLink>
      </div>
    </CardHeader>
    <CardContent class="flex flex-col gap-6">
      <!-- The container div now has the ref="listEl" -->
      <div ref="listEl" class="flex flex-col gap-3">
        <div
          v-for="rule in store.rules"
          :key="rule.id"
          class="flex items-center gap-4 p-3 border rounded-lg bg-background"
        >
          <div class="handle cursor-grab text-muted-foreground"><GripVertical /></div>
          <div class="flex-1">
            <p class="font-medium">{{ rule.name }}</p>
            <p class="text-sm text-muted-foreground">{{ rule.type }}</p>
          </div>
          <Badge :variant="rule.category === 'discount' ? 'secondary' : 'outline'">{{
            rule.category.replace('_', ' ')
          }}</Badge>
          <Badge :variant="rule.active ? 'default' : 'destructive'">{{
            rule.active ? 'Active' : 'Inactive'
          }}</Badge>
          <div class="flex gap-1">
            <Button variant="ghost" size="icon"><Edit class="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" class="text-destructive"
              ><Trash2 class="h-4 w-4"
            /></Button>
          </div>
        </div>
      </div>

      <div v-if="store.rules.length === 0" class="text-center text-muted-foreground py-10">
        No pricing rules created yet. Click "Add New Rule" to get started.
      </div>
    </CardContent>
  </Card>
</template>

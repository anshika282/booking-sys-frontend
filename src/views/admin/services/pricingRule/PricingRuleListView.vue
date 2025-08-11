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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog'

import { GripVertical, PlusCircle, Edit, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  id: { type: String, required: true }, // serviceId
})

const store = usePricingRuleStore()
const router = useRouter()
const listEl = ref(null)

// --- State for the delete confirmation ---
const isDeleteDialogOpen = ref(false)
const ruleToDelete = ref(null)

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

const openDeleteDialog = (rule) => {
  ruleToDelete.value = rule
  isDeleteDialogOpen.value = true
}

const confirmDelete = async () => {
  if (!ruleToDelete.value) return
  await store.deleteRule(props.id, ruleToDelete.value.id)
  isDeleteDialogOpen.value = false
}

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

const formatCategory = (category) => {
  if (!category) return ''
  return category
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()) // Capitalize first letter of each word
}
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
          <Button>
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
            formatCategory(rule.category)
          }}</Badge>
          <Badge :variant="rule.active ? 'default' : 'destructive'">{{
            rule.active ? 'Active' : 'Inactive'
          }}</Badge>

          <div class="flex gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <RouterLink
                    :to="{
                      name: 'admin-service-pricing-rule-edit',
                      params: { id: props.id, ruleId: rule.id },
                    }"
                  >
                    <Button variant="ghost" size="icon"><Edit class="h-4 w-4" /></Button>
                  </RouterLink>
                </TooltipTrigger>
                <TooltipContent><p>Edit Rule</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    @click="openDeleteDialog(rule)"
                    class="text-destructive"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Delete Rule</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div v-if="store.rules.length === 0" class="text-center text-muted-foreground py-10">
        No pricing rules created yet. Click "Add New Rule" to get started.
      </div>
    </CardContent>
  </Card>

  <!-- Delete Confirmation Dialog -->
  <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently delete the rule "{{ ruleToDelete?.name }}". This action cannot be
          undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction @click="confirmDelete">Confirm Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

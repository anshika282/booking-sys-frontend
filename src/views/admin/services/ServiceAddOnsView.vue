<script setup>
import { onMounted, ref } from 'vue'
import { useAddOnStore } from '@/stores/addOnStore'

import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import { useToast } from '@/components/ui/toast/use-toast'
import { PlusCircle, Edit, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  id: { type: String, required: true }, // This is the serviceId
})

const addOnStore = useAddOnStore()
const isDeleteDialogOpen = ref(false)
const addOnToDelete = ref(null)
const deleteIndex = ref(null)

const router = useRouter()

onMounted(() => {
  addOnStore.initialize(props.id)
})

const openDeleteDialog = (addOn, index) => {
  addOnToDelete.value = addOn
  deleteIndex.value = index
  isDeleteDialogOpen.value = true
}

const confirmDelete = () => {
  if (addOnToDelete.value !== null && deleteIndex.value !== null) {
    addOnStore.deleteAddOn(props.id, addOnToDelete.value, deleteIndex.value)
  }
  isDeleteDialogOpen.value = false
}

const handleSave = async () => {
  const success = await addOnStore.saveAddOns(props.id)
  if (success) {
    // Optionally navigate to a final "Publish" page or back to services list
    router.push({ name: 'admin-services' })
  }
}
</script>

<template>
  <div v-if="addOnStore.isLoading">Loading...</div>
  <Card v-else>
    <CardHeader>
      <CardTitle>Add-ons (Step 6 of 6)</CardTitle>
      <CardDescription>Manage optional items for "{{ addOnStore.serviceName }}".</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-6">
      <!-- List of Add-ons -->
      <div class="flex flex-col gap-4">
        <div
          v-for="(addOn, index) in addOnStore.addOns"
          :key="addOn.id || addOn.temp_id"
          class="flex items-start gap-4 p-4 border rounded-lg"
        >
          <!-- Form Fields -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
            <div class="grid gap-1.5 md:col-span-1">
              <Label>Add-on Name</Label>
              <Input v-model="addOn.name" placeholder="e.g., T-Shirt" />
              <p v-if="addOnStore.errors[index]?.name" class="text-sm text-red-500">
                {{ addOnStore.errors[index].name }}
              </p>
            </div>
            <div class="grid gap-1.5">
              <Label>Price (₹)</Label>
              <Input
                v-model="addOn.price"
                type="number"
                step="0.01"
                :disabled="addOn.is_included_in_ticket"
              />
            </div>
            <div class="grid gap-1.5">
              <Label>Type</Label>
              <Select v-model="addOn.type">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_person">Per Person</SelectItem>
                  <SelectItem value="per_booking">Per Booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="flex items-center space-x-2 pt-4 md:col-span-3">
              <Switch v-model:checked="addOn.is_included_in_ticket" />
              <Label>Included in ticket price (Free)</Label>
            </div>
          </div>

          <!-- Delete Button -->
          <Button
            variant="ghost"
            size="icon"
            @click="openDeleteDialog(addOn, index)"
            class="text-destructive"
          >
            <Trash2 class="h-5 w-5" />
          </Button>
        </div>
      </div>

      <!-- Add Button -->
      <div class="mt-2">
        <Button variant="outline" type="button" @click="addOnStore.addAddOn" class="w-full">
          <PlusCircle class="h-4 w-4 mr-2" /> Add Add-on
        </Button>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-2 border-t pt-6">
        <Button variant="outline" type="button" @click="$router.back()">Back</Button>
        <Button type="button" :disabled="addOnStore.isLoading" @click="handleSave">
          {{ addOnStore.isLoading ? 'Saving...' : 'Finish' }}
        </Button>
      </div>
    </CardContent>
  </Card>

  <!-- Delete Confirmation Dialog -->
  <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete the "{{ addOnToDelete?.name }}"
          add-on.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction @click="confirmDelete">Confirm Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

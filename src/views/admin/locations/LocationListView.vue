<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import LocationForm from '@/components/forms/LocationForm.vue'
// ... import UI components: Button, Card, Table, Dialog, AlertDialog, etc.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useToast } from '@/components/ui/toast/use-toast'
import { PlusCircle, Edit, Trash2 } from 'lucide-vue-next'

const { toast } = useToast()
const locations = ref([])
const isLoading = ref(true)
const isDialogOpen = ref(false)
const isEditMode = ref(false)
const locationToEdit = ref(null)
const isDeleteDialogOpen = ref(false)
const locationToDelete = ref(null)
const isDeleting = ref(false)

const fetchLocations = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/locations')
    locations.value = response.data.data || []
    console.log('Fetched locations:', locations.value)
  } catch (error) {
    console.error('Failed to fetch locations:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchLocations)

const openCreateDialog = () => {
  isEditMode.value = false
  locationToEdit.value = { name: '', address: '', city: '', state: '' } // Blank form
  isDialogOpen.value = true
}

const openEditDialog = (location) => {
  isEditMode.value = true
  locationToEdit.value = { ...location } // Copy of data to edit
  isDialogOpen.value = true
}

const openDeleteDialog = (location) => {
  locationToDelete.value = location
  isDeleteDialogOpen.value = true
}

const handleSaveLocation = async (formData) => {
  try {
    if (isEditMode.value) {
      const response = await api.put(`/locations/${formData.id}`, formData)
      // Update the list in place
      const index = locations.value.findIndex((l) => l.id === formData.id)
      if (index !== -1) locations.value[index] = response.data.data
    } else {
      const response = await api.post('/locations', formData)
      locations.value.push(response.data.data)
    }
    toast({ title: 'Success', description: `Location "${formData.name}" has been saved.` })
    isDialogOpen.value = false
    await fetchLocations() // Refresh the list
  } catch (error) {
    console.error('Failed to save location:', error)
    toast({ title: 'Error', description: 'Could not save the location.', variant: 'destructive' })
  }
}

const deleteLocation = async () => {
  if (!locationToDelete.value) return
  isDeleting.value = true
  try {
    await api.delete(`/locations/${locationToDelete.value.id}`)

    locations.value = locations.value.filter((l) => l.id !== locationToDelete.value.id)

    // This will now work correctly
    toast({
      title: 'Location Deleted',
      description: `Location "${locationToDelete.value.name}" has been permanently deleted.`,
    })
  } catch (error) {
    console.error('Failed to delete location:', error)
    toast({ title: 'Error', description: 'Could not delete the location.', variant: 'destructive' })
  } finally {
    isDeleting.value = false
    isDeleteDialogOpen.value = false
    locationToDelete.value = null
  }
}
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between">
      <div>
        <CardTitle>Locations</CardTitle>
        <CardDescription>Manage all your business locations and venues.</CardDescription>
      </div>
      <Button @click="openCreateDialog">Add Location</Button>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="3" class="text-center h-24">Loading locations...</TableCell>
          </TableRow>
          <TableRow v-else-if="!locations || locations.length === 0">
            <TableCell colspan="3" class="text-center h-24"
              >No locations created yet. Click "Add Location" to start.</TableCell
            >
          </TableRow>
          <TableRow v-else v-for="location in locations" :key="location.id">
            <TableCell class="font-medium">{{ location.name }}</TableCell>
            <TableCell>{{ location.address || 'N/A' }}</TableCell>
            <TableCell class="text-right">
              <Button variant="ghost" size="icon" @click="openEditDialog(location)" class="mr-2">
                <Edit class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                @click="openDeleteDialog(location)"
                class="text-destructive hover:text-destructive"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>

  <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete the
          <span class="font-medium text-foreground">"{{ locationToDelete?.name }}"</span> location.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isDeleting">Cancel</AlertDialogCancel>
        <AlertDialogAction @click="deleteLocation" :disabled="isDeleting">
          {{ isDeleting ? 'Deleting...' : 'Confirm Delete' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- Reusable Dialog for Create/Edit -->
  <Dialog v-model:open="isDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ isEditMode ? 'Edit Location' : 'Create New Location' }}</DialogTitle>
        <DialogDescription> Fill in the details for your location below. </DialogDescription>
      </DialogHeader>
      <LocationForm :initial-data="locationToEdit" @save="handleSaveLocation" />
    </DialogContent>
  </Dialog>
</template>

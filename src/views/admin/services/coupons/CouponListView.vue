<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/api'
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
import { Badge } from '@/components/ui/badge'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast/use-toast'
import { PlusCircle, Edit, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const coupons = ref([])
const isLoading = ref(true)
// State for the delete confirmation dialog
const isDeleteDialogOpen = ref(false)
const couponToDelete = ref(null)
const isDeleting = ref(false)

const { toast } = useToast()

const openDeleteDialog = (coupon) => {
  couponToDelete.value = coupon
  isDeleteDialogOpen.value = true
}

const deleteCoupon = async () => {
  if (!couponToDelete.value) return
  isDeleting.value = true
  try {
    await api.delete(`/services/${props.id}/coupons/${couponToDelete.value.id}`)

    // Remove the coupon from the list in real-time for instant UI feedback
    coupons.value = coupons.value.filter((c) => c.id !== couponToDelete.value.id)

    toast({
      title: 'Coupon Deleted',
      description: `Coupon "${couponToDelete.value.code}" has been permanently deleted.`,
    })
  } catch (error) {
    console.error('Failed to delete coupon:', error)
    toast({ title: 'Error', description: 'Could not delete the coupon.', variant: 'destructive' })
  } finally {
    isDeleting.value = false
    isDeleteDialogOpen.value = false
    couponToDelete.value = null
  }
}

const formatDiscountType = (type) => {
  if (!type) return 'N/A'
  // Replace underscores with spaces and capitalize the first letter of each word
  return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

onMounted(async () => {
  isLoading.value = true
  try {
    const response = await api.get(`/services/${props.id}/coupons`)
    coupons.value = response.data.data
  } catch (error) {
    console.error('Failed to fetch coupons:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between">
      <div>
        <CardTitle>Manage Coupons</CardTitle>
        <CardDescription>Add, edit, or disable promotional codes for this service.</CardDescription>
      </div>
      <RouterLink :to="{ name: 'admin-service-coupon-create', params: { id: props.id } }">
        <Button>
          <PlusCircle class="h-4 w-4 mr-2" />
          Add Coupon
        </Button>
      </RouterLink>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uses</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="4" class="text-center">Loading coupons...</TableCell>
          </TableRow>
          <TableRow v-else-if="coupons.length === 0">
            <TableCell colspan="4" class="text-center">No coupons created yet.</TableCell>
          </TableRow>
          <TableRow v-else v-for="coupon in coupons" :key="coupon.id">
            <TableCell class="font-medium">{{ coupon.code }}</TableCell>
            <TableCell>{{ formatDiscountType(coupon.discount_type) }}</TableCell>
            <TableCell> {{ coupon.used_count }} / {{ coupon.max_uses || '∞' }} </TableCell>
            <TableCell>
              <Badge :variant="coupon.active ? 'default' : 'outline'">
                {{ coupon.active ? 'Active' : 'Inactive' }}
              </Badge>
            </TableCell>
            <TableCell>
              <TooltipProvider :delay-duration="100">
                <div class="flex items-center justify-end gap-2">
                  <!-- Edit Action with Icon and Tooltip -->
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <RouterLink
                        :to="{
                          name: 'admin-service-coupon-edit',
                          params: { id: props.id, couponId: coupon.id },
                        }"
                      >
                        <Button variant="ghost" size="icon">
                          <Edit class="h-4 w-4" />
                        </Button>
                      </RouterLink>
                    </TooltipTrigger>
                    <TooltipContent><p>Edit Coupon</p></TooltipContent>
                  </Tooltip>

                  <!-- Delete Action with Icon and Tooltip -->
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        @click="openDeleteDialog(coupon)"
                        class="text-destructive hover:text-destructive"
                      >
                        <Trash2 class="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Delete Coupon</p></TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>

  <!-- Reusable Delete Confirmation Dialog -->
  <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete the
          <span class="font-medium text-foreground">"{{ couponToDelete?.code }}"</span> coupon.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isDeleting">Cancel</AlertDialogCancel>
        <AlertDialogAction @click="deleteCoupon" :disabled="isDeleting">
          {{ isDeleting ? 'Deleting...' : 'Confirm Delete' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

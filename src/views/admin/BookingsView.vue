<script setup>
import { onMounted } from 'vue'
import { useBookingStore } from '@/stores/bookingStore'
import { RouterLink } from 'vue-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Eye } from 'lucide-vue-next'

// Import all required pagination components
import { Pagination, PaginationContent, PaginationItem, PaginationEllipsis, PaginationFirst, PaginationLast, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'


const store = useBookingStore()

onMounted(() => {
  store.fetchBookings()
})

const getStatusVariant = (status) => {
  switch (status) {
    case 'confirmed':
      return 'default'
    case 'completed':
      return 'secondary'
    case 'cancelled':
    case 'no_show':
      return 'destructive'
    default:
      return 'outline'
  }
}

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'N/A'
  // Use Intl API for consistent currency formatting
  return `₹${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Handler for pagination updates
const handlePageChange = (newPage) => {
    store.fetchBookings(newPage)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Bookings</CardTitle>
        <CardDescription>View and manage all customer bookings.</CardDescription>
      </CardHeader>

      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[100px]">Reference</TableHead>
              <TableHead>Service</TableHead>
              <TableHead class="hidden md:table-cell">Customer</TableHead>
              <TableHead class="hidden lg:table-cell">Booked At</TableHead>
              <TableHead class="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead><span class="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            <TableRow v-if="store.isLoading">
              <TableCell colspan="7" class="text-center">Loading bookings...</TableCell>
            </TableRow>
            
            <TableEmpty v-else-if="store.bookings.length === 0" :colspan="7">
              No bookings found yet.
            </TableEmpty>
            
            <TableRow v-else v-for="booking in store.bookings" :key="booking.id">
              <TableCell class="font-medium">{{ booking.booking_reference }}</TableCell>
              <TableCell>{{ booking.service.name }}</TableCell>
              <TableCell class="hidden md:table-cell">
                <div class="font-medium">{{ booking.customer.name }}</div>
                <div class="text-sm text-muted-foreground">{{ booking.customer.email }}</div>
              </TableCell>
              <TableCell class="hidden lg:table-cell">{{ formatDate(booking.booked_at) }}</TableCell>
              <TableCell class="text-right font-semibold">
                {{ formatCurrency(booking.total_amount) }}
              </TableCell>
              <TableCell>
                <Badge :variant="getStatusVariant(booking.status)" class="capitalize">
                  {{ booking.status.replace('_', ' ') }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" class="h-8 w-8 p-0">
                      <span class="sr-only">Open menu</span>
                      <MoreHorizontal class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <!-- RouterLink to a hypothetical BookingDetailsView -->
                    <RouterLink :to="`/admin/bookings/${booking.booking_reference}`">
                        <DropdownMenuItem>
                            <Eye class="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                    </RouterLink>
                    <!-- More actions like 'Cancel' or 'Complete' would go here -->
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Pagination -->
    <div v-if="!store.isLoading && store.pagination.lastPage > 1" class="pt-4">
      <Pagination
        :page="store.currentPage"
        :total="store.pagination.total"
        :items-per-page="store.pagination.perPage"
        :sibling-count="1"
        show-edges
        @update:page="handlePageChange"
      >
        <PaginationContent>
          <PaginationItem><PaginationFirst /></PaginationItem>
          <PaginationItem><PaginationPrevious /></PaginationItem>

          <!-- Custom logic would normally be needed here if not using a library helper for item iteration -->
          <!-- For a simplified UI/UX, relying on the default pagination slot is clean -->
          <!-- ... pagination items ... -->

          <PaginationItem><PaginationNext /></PaginationItem>
          <PaginationItem><PaginationLast /></PaginationItem>
        </PaginationContent>
      </Pagination>
      <p class="text-center text-sm text-muted-foreground mt-2">
        Showing {{ store.pagination.total }} total bookings.
      </p>
    </div>
  </div>
</template>
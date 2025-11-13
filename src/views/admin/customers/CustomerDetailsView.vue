<script setup>
import { onMounted, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useCustomerStore } from '@/stores/customerStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CreditCard, Calendar, ShoppingCart, User, Mail, Phone } from 'lucide-vue-next'

const props = defineProps({
  id: { type: String, required: true }, // Customer ID from router
})

const store = useCustomerStore()
const router = useRouter()

onMounted(() => {
  store.fetchCustomerDetails(props.id)
})

// Computed properties for easy access and cleaner template logic
const customer = computed(() => store.selectedCustomer)
const summary = computed(() => store.customerSummary)
const bookings = computed(() => store.customerBookings)
const isLoading = computed(() => store.isDetailsLoading)

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
  if (amount === null || amount === undefined) return '₹0.00'
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
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold tracking-tight">Customer Profile</h1>
      <Button variant="outline" @click="router.push({ name: 'admin-customers' })">
        <ArrowLeft class="h-4 w-4 mr-2" /> Back to Customers
      </Button>
    </div>

    <div v-if="isLoading" class="text-center p-10">Loading customer details...</div>
    <div v-else-if="!customer">Customer not found or access denied.</div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Customer Info Card (Left Column, Full Width on Mobile) -->
      <Card class="lg:col-span-1">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <User class="h-6 w-6 text-primary" /> {{ customer.name }}
          </CardTitle>
          <CardDescription>Customer contact and enrollment details.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4">
          <div class="flex items-center text-sm">
            <Mail class="h-4 w-4 mr-3 text-muted-foreground" />
            <span>{{ customer.email }}</span>
          </div>
          <div class="flex items-center text-sm">
            <Phone class="h-4 w-4 mr-3 text-muted-foreground" />
            <span>{{ customer.phone_number }}</span>
          </div>
          <div class="text-sm text-muted-foreground border-t pt-4">
            Joined: {{ formatDate(customer.created_at) }}
          </div>
        </CardContent>
      </Card>

      <!-- Summary Card (Right Column, 2/3 Width on Desktop) -->
      <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 h-fit">
        <Card class="flex flex-col justify-between">
          <CardHeader class="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ summary.total_bookings }}</div>
            <p class="text-xs text-muted-foreground">across all your services</p>
          </CardContent>
        </Card>

        <Card class="flex flex-col justify-between">
          <CardHeader class="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Total Spent</CardTitle>
            <CreditCard class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ formatCurrency(summary.total_spent) }}</div>
            <p class="text-xs text-muted-foreground">including all taxes and fees</p>
          </CardContent>
        </Card>

        <Card class="flex flex-col justify-between">
          <CardHeader class="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Last Booking</CardTitle>
            <ShoppingCart class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ bookings.length > 0 ? formatDate(bookings[0].booked_at) : 'N/A' }}
            </div>
            <p class="text-xs text-muted-foreground">most recent activity</p>
          </CardContent>
        </Card>
      </div>

      <!-- Booking History Table (Full Width) -->
      <Card class="lg:col-span-3">
        <CardHeader><CardTitle>Booking History (Last 5)</CardTitle></CardHeader>
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Service</TableHead>
                <TableHead class="hidden sm:table-cell">Booked Date</TableHead>
                <TableHead class="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmpty v-if="bookings.length === 0" :colspan="5">
                No booking history found for this customer with your business.
              </TableEmpty>
              <TableRow v-for="booking in bookings" :key="booking.id">
                <TableCell class="font-medium">
                  <RouterLink
                    :to="`/admin/bookings/${booking.booking_reference}`"
                    class="text-primary hover:underline"
                  >
                    {{ booking.booking_reference }}
                  </RouterLink>
                </TableCell>
                <TableCell>{{ booking.service.name }}</TableCell>
                <TableCell class="hidden sm:table-cell">{{
                  formatDate(booking.booked_at)
                }}</TableCell>
                <TableCell class="text-right">{{ formatCurrency(booking.total_amount) }}</TableCell>
                <TableCell>
                  <Badge :variant="getStatusVariant(booking.status)" class="capitalize">
                    {{ booking.status.replace('_', ' ') }}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

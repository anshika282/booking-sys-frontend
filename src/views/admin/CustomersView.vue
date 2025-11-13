<script setup>
import { onMounted, watch } from 'vue'
import { useCustomerStore } from '@/stores/customerStore'
import { RouterLink } from 'vue-router'
import { useDebounceFn } from '@vueuse/core'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// UI Components
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MoreHorizontal, Eye } from 'lucide-vue-next'
// Pagination Components
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
  PaginationFirst,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

const store = useCustomerStore()

// Debounce the search action to prevent excessive API calls while typing
const debouncedSearch = useDebounceFn(() => {
  store.runSearch()
}, 300)

onMounted(() => {
  // Clear any leftover state from detail view before fetching the list
  store.selectedCustomer = null
  store.fetchCustomers()
})

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
  // We pass the current search term to persist the filter across pages
  store.fetchCustomers(newPage, store.searchInput)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Customer Management</h1>
        <p class="text-muted-foreground">
          View and manage customers who have booked with your business.
        </p>
      </div>
    </div>

    <Card>
      <CardHeader>
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="flex flex-col">
            <CardTitle>Customer List</CardTitle>
            <CardDescription
              >Customers who have at least one booking are listed here.</CardDescription
            >
          </div>

          <!-- Search Bar -->
          <div class="relative w-full md:w-auto">
            <Search
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by name or email..."
              v-model="store.searchInput"
              @input="debouncedSearch"
              class="pl-9 w-full md:w-[300px]"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead class="hidden sm:table-cell">Email</TableHead>
                <TableHead class="hidden md:table-cell">Phone</TableHead>
                <TableHead class="hidden lg:table-cell">Joined On</TableHead>
                <TableHead class="w-[50px]"><span class="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow v-if="store.isLoading">
                <TableCell colspan="5" class="text-center">Loading customers...</TableCell>
              </TableRow>

              <TableEmpty v-else-if="store.customers.length === 0" :colspan="5">
                No customers found matching your criteria.
              </TableEmpty>

              <TableRow v-else v-for="customer in store.customers" :key="customer.id">
                <TableCell class="font-medium">{{ customer.name }}</TableCell>
                <TableCell class="hidden sm:table-cell">{{ customer.email }}</TableCell>
                <TableCell class="hidden md:table-cell">{{ customer.phone_number }}</TableCell>
                <TableCell class="hidden lg:table-cell">{{
                  formatDate(customer.created_at)
                }}</TableCell>

                <TableCell class="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" class="h-8 w-8 p-0">
                        <span class="sr-only">Open menu</span>
                        <MoreHorizontal class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <RouterLink
                        :to="{ name: 'admin-customer-details', params: { id: customer.id } }"
                      >
                        <DropdownMenuItem>
                          <Eye class="mr-2 h-4 w-4" /> View History
                        </DropdownMenuItem>
                      </RouterLink>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Pagination -->
    <div v-if="!store.isLoading && store.pagination.lastPage > 1" class="pt-4">
      <Pagination
        :page="store.pagination.currentPage"
        :total="store.pagination.total"
        :items-per-page="store.pagination.perPage"
        :sibling-count="1"
        show-edges
        @update:page="handlePageChange"
      >
        <PaginationContent>
          <PaginationItem><PaginationFirst /></PaginationItem>
          <PaginationItem><PaginationPrevious /></PaginationItem>
          <!-- The actual pagination items are handled by the reka-ui logic when nested like this -->
          <PaginationItem><PaginationNext /></PaginationItem>
          <PaginationItem><PaginationLast /></PaginationItem>
        </PaginationContent>
      </Pagination>
      <p class="text-center text-sm text-muted-foreground mt-2">
        Showing page {{ store.pagination.currentPage }} of {{ store.pagination.lastPage }} ({{
          store.pagination.total
        }}
        total customers).
      </p>
    </div>
  </div>
</template>

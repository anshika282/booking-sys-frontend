<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// --- FINAL, SCREENSHOT-VERIFIED IMPORTS ---
// These names now exactly match the files in your project directory.
import { Pagination } from '@/components/ui/pagination'
import PaginationEllipsis from '@/components/ui/pagination/PaginationEllipsis.vue'
import PaginationFirst from '@/components/ui/pagination/PaginationFirst.vue'
import PaginationLast from '@/components/ui/pagination/PaginationLast.vue'
import PaginationContent from '@/components/ui/pagination/PaginationContent.vue' // Corrected name
import PaginationItem from '@/components/ui/pagination/PaginationItem.vue' // Corrected name
import PaginationNext from '@/components/ui/pagination/PaginationNext.vue'
import PaginationPrevious from '@/components/ui/pagination/PaginationPrevious.vue' // Corrected name

const services = ref([])
const isLoading = ref(true)
const pagination = ref({
  currentPage: 1,
  lastPage: 1,
  total: 0,
  perPage: 10,
})

const fetchServices = async (page = 1) => {
  isLoading.value = true
  try {
    const response = await api.get(`/services?page=${page}&per_page=${pagination.value.perPage}`)
    services.value = response.data.data
    pagination.value = {
      ...pagination.value,
      currentPage: response.data.meta.current_page,
      lastPage: response.data.meta.last_page,
      total: response.data.meta.total,
    }
  } catch (error) {
    console.error('Failed to fetch services:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchServices()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Services</h1>
        <p class="text-muted-foreground">Manage your bookable experiences and appointments.</p>
      </div>
      <RouterLink :to="{ name: 'admin-service-create' }">
        <Button>Add New Service</Button>
      </RouterLink>
    </div>

    <Card>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead><span class="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="isLoading">
              <TableCell colspan="5" class="text-center">Loading services...</TableCell>
            </TableRow>
            <TableRow v-else-if="services.length === 0">
              <TableCell colspan="5" class="text-center"
                >No services found. Create your first one!</TableCell
              >
            </TableRow>
            <TableRow v-else v-for="service in services" :key="service.id">
              <TableCell class="font-medium">{{ service.name }}</TableCell>
              <TableCell>{{
                service.serviceable_type === 'App\\Models\\ServiceTicketedEvent'
                  ? 'Ticketed Event'
                  : 'Appointment'
              }}</TableCell>
              <TableCell>
                <Badge :variant="service.status === 'active' ? 'default' : 'outline'">{{
                  service.status
                }}</Badge>
              </TableCell>
              <TableCell>{{ service.duration_minutes }} min</TableCell>
              <TableCell class="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" class="h-8 w-8 p-0">
                      <span class="sr-only">Open menu</span>
                      <MoreHorizontal class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <RouterLink :to="{ name: 'admin-service-edit', params: { id: service.id } }">
                      <DropdownMenuItem> Manage </DropdownMenuItem>
                    </RouterLink>

                    <DropdownMenuItem class="text-red-500">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <div v-if="!isLoading && pagination.lastPage > 1">
      <Pagination
        v-model:page="pagination.currentPage"
        :total="pagination.total"
        :items-per-page="pagination.perPage"
        :sibling-count="1"
        show-edges
        @update:page="fetchServices"
      >
        <!-- The template uses the new component names -->
        <PaginationContent>
          <PaginationItem>
            <PaginationFirst />
          </PaginationItem>
          <PaginationItem>
            <PaginationPrevious />
          </PaginationItem>

          <template v-for="(page, index) in items">
            <PaginationItem v-if="page.type === 'page'" :key="index">
              <!-- <PaginationLink :page="page" as-child> -->
              <Button
                class="w-10 h-10 p-0"
                :variant="page.value === pagination.currentPage ? 'default' : 'outline'"
              >
                {{ page.value }}
              </Button>
              <!-- </PaginationLink> -->
            </PaginationItem>
            <PaginationItem v-else :key="page.type">
              <PaginationEllipsis :key="page.type" :index="index" />
            </PaginationItem>
          </template>

          <PaginationItem>
            <PaginationNext />
          </PaginationItem>
          <PaginationItem>
            <PaginationLast />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  </div>
</template>

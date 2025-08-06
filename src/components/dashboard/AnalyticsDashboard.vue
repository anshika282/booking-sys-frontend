<script setup>
import { ref } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// --- CORRECT IMPORTS ---
import LineChart from '@/components/ui/chart-line/LineChart.vue'
import DatePicker from '@/components/ui/date-picker/DatePicker.vue'

// Mock data for the charts
const totalSalesData = ref([
  { date: 'Jul 10', Previous: 2000, Current: 3000 },
  { date: 'Jul 12', Previous: 3000, Current: 4500 },
  { date: 'Jul 14', Previous: 2500, Current: 3500 },
  { date: 'Jul 16', Previous: 4000, Current: 5500 },
  { date: 'Jul 18', Previous: 3500, Current: 6000 },
  { date: 'Jul 20', Previous: 5000, Current: 7000 },
  { date: 'Jul 22', Previous: 6000, Current: 8500 },
  { date: 'Jul 25', Previous: 8000, Current: 11000 },
])

const totalBookingsData = ref([
  { date: 'Jul 10', Previous: 10, Current: 15 },
  { date: 'Jul 12', Previous: 15, Current: 22 },
  { date: 'Jul 14', Previous: 12, Current: 18 },
  { date: 'Jul 16', Previous: 20, Current: 28 },
  { date: 'Jul 18', Previous: 18, Current: 30 },
  { date: 'Jul 20', Previous: 25, Current: 35 },
  { date: 'Jul 22', Previous: 30, Current: 42 },
  { date: 'Jul 25', Previous: 40, Current: 55 },
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold tracking-tight">Reports Overview</h1>
      <div class="flex items-center gap-2">
        <DatePicker />
        <span class="text-sm text-muted-foreground hidden md:inline"
          >Compared to Previous period</span
        >
      </div>
    </div>

    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Total Sale</CardTitle>
          <CardDescription>July 18th, 2025 - July 25th, 2025</CardDescription>
        </CardHeader>
        <CardContent class="h-[250px] pt-4">
          <LineChart
            :data="totalSalesData"
            index="date"
            :categories="['Previous', 'Current']"
            :y-formatter="(value) => `₹${new Intl.NumberFormat('en-IN').format(value)}`"
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Bookings</CardTitle>
          <CardDescription>July 18th, 2025 - July 25th, 2025</CardDescription>
        </CardHeader>
        <CardContent class="h-[250px] pt-4">
          <LineChart :data="totalBookingsData" index="date" :categories="['Previous', 'Current']" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Average Booking Value</CardTitle>
          <CardDescription>July 18th, 2025 - July 25th, 2025</CardDescription>
        </CardHeader>
        <CardContent class="h-[250px] pt-4">
          <LineChart
            :data="totalSalesData"
            index="date"
            :categories="['Previous', 'Current']"
            :y-formatter="(value) => `₹${new Intl.NumberFormat('en-IN').format(value / 2)}`"
          />
        </CardContent>
      </Card>
    </div>
  </div>
</template>

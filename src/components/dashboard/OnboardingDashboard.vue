<script setup>
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-vue-next'

const setupSteps = [
  {
    title: 'Create Ticket-Based Service',
    description: 'Perfect for events, tours, or any activity that requires a ticket.',
    to: { name: 'admin-services' }, // This will link to the services page
  },
  {
    title: 'Create Appointment Service',
    description: 'Ideal for consultations, salon bookings, or one-on-one sessions.',
    to: { name: 'admin-services' },
  },
  {
    title: 'Create Scheduling Service',
    description: 'For classes, workshops, or group sessions with limited slots.',
    to: { name: 'admin-services' },
  },
]
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold tracking-tight">Get Started</h1>
    </div>

    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <RouterLink v-for="(step, index) in setupSteps" :key="index" :to="step.to">
        <Card class="hover:bg-muted/50 transition-colors h-full">
          <CardHeader>
            <div class="flex items-center justify-between">
              <CardTitle>{{ step.title }}</CardTitle>
              <ArrowRight class="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">{{ step.description }}</p>
          </CardContent>
        </Card>
      </RouterLink>
    </div>

    <div class="mt-8">
      <h2 class="text-2xl font-bold mb-4">Your Business Overview</h2>
      <p class="text-muted-foreground">
        Your sales charts and booking analytics will appear here once you create a service and start
        receiving bookings.
      </p>
    </div>
  </div>
</template>

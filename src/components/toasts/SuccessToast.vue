<script setup>
import { defineProps } from 'vue'
import { ToastClose, ToastDescription, ToastTitle } from '@/components/ui/toast'
import { CircleCheck } from 'lucide-vue-next' // A nice icon for success

// This component will receive title and description from the function that calls it
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
})
</script>

<template>
  <div class="flex items-start gap-4">
    <!-- Icon Section -->
    <div>
      <CircleCheck class="h-6 w-6 text-green-500" />
    </div>

    <!-- Content Section -->
    <div class="grid gap-1 flex-1">
      <ToastTitle class="text-green-600">{{ props.title }}</ToastTitle>
      <ToastDescription v-if="props.description">
        {{ props.description }}
      </ToastDescription>
    </div>

    <!-- Close Button -->
    <ToastClose />
  </div>
</template>

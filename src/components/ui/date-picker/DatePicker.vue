<script setup>
import { ref } from 'vue'
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DateFormatter, getLocalTimeZone } from '@internationalized/date'

const df = new DateFormatter('en-US', {
  dateStyle: 'long',
})

// defineModel creates a two-way binding with the parent component's v-model.
// This is the key fix.
const modelValue = defineModel()
const value = ref()
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        :variant="'outline'"
        :class="
          cn('w-[280px] justify-start text-left font-normal', !value && 'text-muted-foreground')
        "
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        <span>{{
          modelValue ? df.format(modelValue.toDate(getLocalTimeZone())) : 'Pick a date'
        }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <Calendar v-model="modelValue" initial-focus />
    </PopoverContent>
  </Popover>
</template>

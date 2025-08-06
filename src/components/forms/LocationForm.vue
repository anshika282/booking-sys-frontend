<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps({
  initialData: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['save'])

const formData = ref({})

// Watch for changes in initialData to populate the form for editing
watch(
  () => props.initialData,
  (newData) => {
    formData.value = { ...newData }
  },
  { immediate: true },
)

const handleSave = () => {
  // Emit the form data back to the parent component
  emit('save', formData.value)
}
</script>

<template>
  <div class="grid gap-4 py-4">
    <div class="grid gap-2">
      <Label for="name">Location Name</Label>
      <Input id="name" v-model="formData.name" placeholder="e.g., Downtown Branch" />
    </div>
    <div class="grid gap-2">
      <Label for="address">Address</Label>
      <Input id="address" v-model="formData.address" placeholder="e.g., 123 Main St" />
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="grid gap-2">
        <Label for="city">City</Label>
        <Input id="city" v-model="formData.city" />
      </div>
      <div class="grid gap-2">
        <Label for="state">State / Province</Label>
        <Input id="state" v-model="formData.state" />
      </div>
    </div>
    <Button @click="handleSave">Save Location</Button>
  </div>
</template>

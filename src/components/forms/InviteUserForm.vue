<script setup>
import { ref } from 'vue'
import { useTeamStore } from '@/stores/teamStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast/use-toast'

const emit = defineEmits(['success'])
const teamStore = useTeamStore()
const { toast } = useToast()

const name = ref('')
const email = ref('')
const role = ref('staff')
const isLoading = ref(false)
const errors = ref({})

const handleSubmit = async () => {
  isLoading.value = true
  errors.value = {}
  try {
    const newUser = await teamStore.inviteUser({
      name: name.value,
      email: email.value,
      role: role.value,
    })
    toast({
      title: 'Invitation Sent!',
      description: `${newUser.name} has been invited to your team.`,
    })
    emit('success')
  } catch (error) {
    if (error.response?.status === 422) {
      errors.value = error.response.data.errors
    } else {
      toast({
        title: 'Invitation Failed',
        description: error.response?.data?.message || 'An unexpected error occurred.',
        variant: 'destructive',
      })
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="grid gap-4 py-4">
    <div class="grid gap-2">
      <Label for="name">Full Name</Label>
      <Input id="name" v-model="name" placeholder="John Doe" :disabled="isLoading" />
      <p v-if="errors.name" class="text-sm text-red-500 mt-1">{{ errors.name[0] }}</p>
    </div>
    <div class="grid gap-2">
      <Label for="email">Email</Label>
      <Input
        id="email"
        type="email"
        v-model="email"
        placeholder="user@example.com"
        :disabled="isLoading"
      />
      <p v-if="errors.email" class="text-sm text-red-500 mt-1">{{ errors.email[0] }}</p>
    </div>
    <div class="grid gap-2">
      <Label for="role">Role</Label>
      <Select v-model="role" :disabled="isLoading">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="staff"> Staff </SelectItem>
          <SelectItem value="admin"> Admin </SelectItem>
        </SelectContent>
      </Select>
      <p v-if="errors.role" class="text-sm text-red-500 mt-1">{{ errors.role[0] }}</p>
    </div>
    <Button type="submit" class="w-full mt-2" :disabled="isLoading">
      {{ isLoading ? 'Sending Invitation...' : 'Send Invitation' }}
    </Button>
  </form>
</template>

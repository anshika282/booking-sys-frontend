<script setup>
import { ref, onMounted } from 'vue'
import { useTeamStore } from '@/stores/teamStore'
import InviteUserForm from '@/components/forms/InviteUserForm.vue'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const teamStore = useTeamStore()
const isInviteDialogOpen = ref(false)
const authStore = useAuthStore()

onMounted(() => {
  teamStore.fetchUsers()
})

const onInviteSuccess = () => {
  isInviteDialogOpen.value = false
  // The store already updated the list, so no need to re-fetch
}

const canInvite = computed(() => {
  return authStore.user && (authStore.user.role === 'owner' || authStore.user.role === 'admin')
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Team Management</h1>
        <p class="text-muted-foreground">Invite and manage your team members.</p>
      </div>
      <Button v-if="canInvite" @click="isInviteDialogOpen = true">
        <PlusCircle class="h-4 w-4 mr-2" />
        Invite User
      </Button>
    </div>

    <Card>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="teamStore.isLoading">
              <TableCell colspan="3" class="text-center h-24">Loading team members...</TableCell>
            </TableRow>
            <TableRow v-else-if="teamStore.users.length === 0">
              <TableCell colspan="3" class="text-center h-24"
                >No team members invited yet.</TableCell
              >
            </TableRow>
            <TableRow v-else v-for="user in teamStore.users" :key="user.id">
              <TableCell class="font-medium">{{ user.name }}</TableCell>
              <TableCell>{{ user.email }}</TableCell>
              <TableCell>
                <Badge variant="outline" class="capitalize">{{ user.role }}</Badge>
              </TableCell>
              <TableCell>
                <Badge v-if="user.email_verified_at" variant="default">Active</Badge>
                <Badge v-else variant="secondary">Pending Invitation</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog v-model:open="isInviteDialogOpen">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
        </DialogHeader>
        <InviteUserForm @success="onInviteSuccess" />
      </DialogContent>
    </Dialog>
  </div>
</template>

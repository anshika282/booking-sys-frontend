<script setup>
import { onMounted, computed } from 'vue'
import { usePaymentSettingsStore } from '@/stores/paymentSettingsStore'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge' // New: for status visual
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Zap, AlertTriangle } from 'lucide-vue-next'

// --- EXPLANATION 1: State Management and Authorization ---
const store = usePaymentSettingsStore()
const authStore = useAuthStore()

// RBAC Check for rendering
const isOwner = computed(() => authStore.user?.role === 'owner')

// Fetch data only if the user is authorized (owner)
onMounted(() => {
  if (isOwner.value) {
    store.fetchSettings()
  }
})

const handleSave = () => {
  store.saveSettings()
}

// Helper to get the correct input type (text, password, number)
const getFieldType = (field) => field.type || 'text'

// Helper to check if the currently selected gateway is 'coming soon'
const isGatewayComingSoon = computed(() => {
  if (!store.defaultGatewayType) return true
  const gateway = store.availableGateways.find((g) => g.type === store.defaultGatewayType)
  return gateway?.status === 'Coming Soon'
})

// Helper to get the credential object for the currently selected gateway
const currentGatewayCredentials = computed(() => {
  if (store.defaultGatewayType === 'phonepe') {
    return store.phonePeCredentials
  }
  // Add other gateway credential objects here as v-else-if blocks are added
  return {}
})

// Helper to get the field definition for the currently selected gateway
const currentGatewayFields = computed(() => {
  const gateway = store.availableGateways.find((g) => g.type === store.defaultGatewayType)
  return gateway?.fields || []
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Payment Settings</h1>
        <p class="text-muted-foreground">
          Configure your default payment gateway and API credentials.
        </p>
      </div>
    </div>

    <!-- EXPLANATION 2: Role-Based Access Denied Card -->
    <Card v-if="!isOwner" class="bg-red-50 border border-red-200 shadow-sm">
      <CardHeader>
        <CardTitle class="text-xl text-red-600 flex items-center gap-2">
          <AlertTriangle class="h-6 w-6" /> Access Denied
        </CardTitle>
        <CardDescription class="text-red-500">
          Only the **Account Owner** can view and modify Payment Settings for security and financial
          integrity reasons.
        </CardDescription>
      </CardHeader>
    </Card>

    <Card v-else :class="{ 'opacity-50': store.isLoading }">
      <form @submit.prevent="handleSave">
        <CardHeader>
          <CardTitle>Default Gateway Selection</CardTitle>
          <CardDescription
            >Select the primary payment processor for all your bookings.</CardDescription
          >
        </CardHeader>
        <CardContent class="grid gap-6">
          <!-- Gateway Selection -->
          <div class="grid gap-2">
            <Label for="default-gateway">Choose Default Gateway</Label>
            <!-- v-model is bound directly to the store state -->
            <Select v-model="store.defaultGatewayType" :disabled="store.isLoading">
              <SelectTrigger id="default-gateway">
                <SelectValue placeholder="Select a payment gateway..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="gateway in store.availableGateways"
                  :key="gateway.type"
                  :value="gateway.type"
                  :disabled="gateway.status === 'Coming Soon'"
                >
                  {{ gateway.name }}
                  <Badge
                    v-if="gateway.status === 'Coming Soon'"
                    variant="outline"
                    class="ml-2 text-xs text-muted-foreground"
                  >
                    {{ gateway.status }}
                  </Badge>
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="store.errors.defaultGatewayType" class="text-sm text-red-500 mt-1">
              {{ store.errors.defaultGatewayType }}
            </p>
          </div>

          <!-- EXPLANATION 3: Dynamic Credential Rendering (The Scalable Part) -->
          <div v-if="store.defaultGatewayType" class="border p-6 rounded-lg bg-card shadow-inner">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2 border-b pb-3">
              <Zap class="h-5 w-5 text-primary" />
              <span class="capitalize">{{ store.defaultGatewayType.replace('_', ' ') }}</span>
              Credentials
            </h3>

            <div v-if="isGatewayComingSoon" class="p-6 text-center text-muted-foreground">
              This gateway is not yet fully integrated. Please choose an available one.
            </div>

            <!-- PhonePe Credentials Form -->
            <!-- This block is the V-IF for PhonePe. Future gateways get their own V-ELSE-IF. -->
            <div
              v-else-if="store.defaultGatewayType === 'phonepe'"
              class="grid gap-4 md:grid-cols-2"
            >
              <!-- Renders fields dynamically based on the currentGatewayFields computed -->
              <div v-for="field in currentGatewayFields" :key="field.id" class="grid gap-2">
                <Label :for="`phonepe-${field.id}`"
                  >{{ field.label }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </Label>
                <Input
                  :id="`phonepe-${field.id}`"
                  :type="getFieldType(field)"
                  v-model="store.phonePeCredentials[field.id]"
                  :disabled="store.isLoading"
                />
                <!-- UX: Direct error binding for backend validation messages -->
                <p v-if="store.errors[`credentials.${field.id}`]" class="text-sm text-red-500 mt-1">
                  {{ store.errors[`credentials.${field.id}`][0] }}
                </p>
                <p v-else-if="field.id === 'salt_key'" class="text-xs text-muted-foreground mt-1">
                  Enter your **Sandbox** Salt Key for testing.
                </p>
              </div>
            </div>

            <!-- V-ELSE-IF FOR STRIPE WILL GO HERE -->
            <!-- <div v-else-if="store.defaultGatewayType === 'stripe'" class="grid gap-4">...</div> -->
          </div>

          <!-- Save Button -->
          <div class="flex justify-end pt-4">
            <Button type="submit" :disabled="store.isLoading || isGatewayComingSoon">
              <Loader2 v-if="store.isLoading" class="h-4 w-4 mr-2 animate-spin" />
              {{ store.isLoading ? 'Saving...' : 'Save Settings' }}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  </div>
</template>

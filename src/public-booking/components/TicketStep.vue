<script setup>
import { useBookingIntentStore } from '@/stores/bookingIntentStore'
import { Button } from '@/components/ui/button'
import { Plus, Minus } from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { onMounted } from 'vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-vue-next'
import { useToast } from '@/components/ui/toast/use-toast'

const { toast } = useToast()
const store = useBookingIntentStore()

const updateTicketQuantity = (tierId, amount) => {
  const ticket = store.tickets.find((t) => t.tier_id === tierId)
  if (ticket) {
    const tierInfo = store.dailyManifest.ticket_tiers.find((t) => t.id === tierId)
    const newQuantity = ticket.quantity + amount

    // Enforce min and max quantity constraints
    if (newQuantity >= tierInfo.min_quantity && newQuantity <= tierInfo.max_quantity) {
      ticket.quantity = newQuantity
      // store.updateClientPrice()
      store.updateCartAndRecalculate()
    }
  }
}

const updateAddOnQuantity = (addOnId, amount) => {
  const addOn = store.addOns.find((a) => a.add_on_id === addOnId)
  if (addOn) {
    const newQuantity = addOn.quantity + amount
    if (newQuantity >= 0) {
      // Add-ons can have a quantity of 0
      addOn.quantity = newQuantity
      //store.updateClientPrice()
      store.updateCartAndRecalculate()
    }
  }
}
onMounted(() => {
  // // CRITICAL FIX 3: On component mount, run the SYNCHRONOUS update first.
  // store.updateClientPrice()

  // // CRITICAL FIX 4: Then, run the AUTHORITATIVE network check once.
  // // This fetches the final validated price, applies BOGO, etc., one time.
  // store.validatePrice()/
  // On first load, trigger the calculation once.
  store.updateCartAndRecalculate()
})

const handleApplyCoupon = () => {
  // Assuming couponCodeInput is correctly bound to store.couponCodeInput
  if (store.couponCodeInput.trim()) {
    store.applyCoupon()
  }
}
</script>

<template>
  <div class="flex flex-col gap-8 animate-in fade-in">
    <!-- Tickets Section -->
    <div>
      <h3 class="font-semibold text-lg mb-4">Select Tickets</h3>
      <div class="space-y-4">
        <div
          v-for="tier in store.dailyManifest.ticket_tiers"
          :key="tier.id"
          class="p-4 border rounded-lg flex items-center justify-between"
        >
          <div>
            <p class="font-medium">{{ tier.name }}</p>
            <div v-if="tier.price < tier.base_price" class="flex items-center gap-2">
              <p class="text-sm text-red-500 line-through">₹{{ tier.base_price.toFixed(2) }}</p>
              <p class="text-sm text-primary font-semibold">₹{{ tier.price.toFixed(2) }}</p>
            </div>
            <p v-else class="text-sm text-muted-foreground">₹{{ tier.price.toFixed(2) }}</p>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8"
              @click="updateTicketQuantity(tier.id, -1)"
              :disabled="
                store.tickets.find((t) => t.tier_id === tier.id)?.quantity <= tier.min_quantity
              "
            >
              <Minus class="h-4 w-4" />
            </Button>
            <span class="font-bold text-lg w-10 text-center">
              {{ store.tickets.find((t) => t.tier_id === tier.id)?.quantity || 0 }}
            </span>
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8"
              @click="updateTicketQuantity(tier.id, 1)"
              :disabled="
                store.tickets.find((t) => t.tier_id === tier.id)?.quantity >= tier.max_quantity
              "
            >
              <Plus class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add-ons Section -->
    <div v-if="store.service && store.service.addons && store.service.addons.length > 0">
      <h3 class="font-semibold text-lg mb-4">Optional Add-ons</h3>
      <div class="space-y-4">
        <div
          v-for="addOn in store.service.addons"
          :key="addOn.id"
          class="p-4 border rounded-lg flex items-center justify-between"
        >
          <div>
            <p class="font-medium">{{ addOn.name }}</p>
            <p class="text-sm text-muted-foreground">
              {{ addOn.is_included_in_ticket ? 'Included' : `₹${addOn.price.toFixed(2)}` }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8"
              @click="updateAddOnQuantity(addOn.id, -1)"
              :disabled="store.addOns.find((a) => a.add_on_id === addOn.id)?.quantity === 0"
            >
              <Minus class="h-4 w-4" />
            </Button>
            <span class="font-bold text-lg w-10 text-center">
              {{ store.addOns.find((a) => a.add_on_id === addOn.id)?.quantity || 0 }}
            </span>
            <Button
              variant="outline"
              size="icon"
              class="h-8 w-8"
              @click="updateAddOnQuantity(addOn.id, 1)"
            >
              <Plus class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- --- NEW: Coupon Section --- -->
    <div class="border-t pt-6">
      <div v-if="store.appliedCoupon">
        <Label>Applied Coupon</Label>
        <div class="mt-2">
          <Badge variant="secondary" class="text-base font-semibold py-2 px-4">
            <span class="font-mono">{{ store.appliedCoupon.name.replace('Coupon: ', '') }}</span>
            <button
              type="button"
              @click="store.removeCoupon()"
              class="ml-1 rounded-full p-0.5 ring-offset-background transition-colors hover:bg-background/80 focus:outline-none"
              aria-label="Remove coupon"
            >
              <X class="h-4 w-4" />
            </button>
          </Badge>
        </div>
      </div>
      <div v-else class="space-y-2">
        <Label for="coupon-code">Have a coupon code?</Label>
        <div class="flex items-start gap-2">
          <Input
            id="coupon-code"
            v-model="store.couponCodeInput"
            placeholder="Enter code"
            :disabled="store.isApplyingCoupon"
            class="flex-1"
            @keyup.enter="store.applyCoupon"
          />
          <Button
            type="button"
            @click="store.applyCoupon"
            :disabled="store.isApplyingCoupon"
            variant="outline"
          >
            {{ store.isApplyingCoupon ? 'Applying...' : 'Apply' }}
          </Button>
        </div>
        <p v-if="store.couponError" class="text-sm text-red-500 mt-1">
          {{ store.couponError }}
        </p>
      </div>
    </div>
  </div>
</template>

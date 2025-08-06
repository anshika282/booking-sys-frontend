<script setup>
import CouponForm from '@/components/forms/CouponForm.vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const props = defineProps({
  id: {
    // Service ID
    type: String,
    required: true,
  },
  couponId: {
    type: String,
    required: true,
  },
})

const handleSuccess = (updatedCoupon) => {
  console.log('Coupon updated successfully, navigating to Add-ons:', updatedCoupon)

  // Redirect to the next step in the wizard
  router.push({
    name: 'admin-service-add-ons',
    params: { id: props.id },
  })
}
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-4">Edit Coupon</h1>
    <CouponForm mode="edit" :id="id" :coupon-id="couponId" @submit-success="handleSuccess" />
  </div>
</template>

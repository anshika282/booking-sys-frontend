<script setup>
import CouponForm from '@/components/forms/CouponForm.vue'
import { useRouter } from 'vue-router'

const route = useRouter()
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
}) // Get serviceId from the URL

// This function is called when the CouponForm emits 'submitSuccess'
const handleSuccess = (newCoupon) => {
  console.log('Coupon created successfully, navigating to Add-ons:', newCoupon)

  // Redirect to the next step in the wizard
  route.push({
    name: 'admin-service-coupons',
    params: { id: props.id },
  })
}
// ... handle redirect on success
</script>
<template>
  <CouponForm mode="create" :id="id" @submit-success="handleSuccess" />
</template>

<script setup>
import PricingRuleForm from '@/components/forms/PricingRuleForm.vue'
const props = defineProps({ id: { type: String, required: true } })
</script>
<template>
  <PricingRuleForm mode="create" :service-id="id" />
</template>

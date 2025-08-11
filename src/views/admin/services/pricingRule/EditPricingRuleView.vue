<script setup>
import PricingRuleForm from '@/components/forms/PricingRuleForm.vue'
const props = defineProps({ id: { type: String, required: true } })
</script>
<template>
  <PricingRuleForm mode="edit" :service-id="id" :rule-id="id" />
</template>

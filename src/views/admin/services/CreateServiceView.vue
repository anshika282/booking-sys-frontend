<script setup>
import ServiceDetailsForm from '@/components/forms/ServiceDetailsForm.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const onCreationSuccess = (newService) => {
  // On success, navigate to the next step of the wizard
  router.push({ name: 'admin-service-operating-hours', params: { id: newService.id } })
}
</script>
<template>
  <ServiceDetailsForm mode="create" @submit-success="onCreationSuccess" />
</template>

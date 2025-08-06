<script setup>
import { reactiveOmit } from "@vueuse/core";
import { ToastTitle } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
  <ToastTitle
    v-bind="delegatedProps"
    :class="cn('text-sm font-semibold', props.class)"
  >
    <slot />
  </ToastTitle>
</template>

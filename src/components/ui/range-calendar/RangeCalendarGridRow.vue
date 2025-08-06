<script setup>
import { reactiveOmit } from "@vueuse/core";
import { RangeCalendarGridRow, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, "class");

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <RangeCalendarGridRow
    :class="cn('flex mt-2 w-full', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </RangeCalendarGridRow>
</template>

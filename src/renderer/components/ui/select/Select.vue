<script setup lang="ts">
import type { SelectRootEmits, SelectRootProps } from 'reka-ui';
import { SelectRoot, useForwardPropsEmits } from 'reka-ui';

const props = defineProps<SelectRootProps>();
const emits = defineEmits<SelectRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <select-root v-slot="slotProps" data-slot="select" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </select-root>
</template>

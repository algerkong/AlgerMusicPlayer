<script setup lang="ts">
import type { SelectItemTextProps } from 'reka-ui';
import { SelectItemText } from 'reka-ui';

const props = defineProps<SelectItemTextProps>();
</script>

<template>
  <select-item-text data-slot="select-item-text" v-bind="props">
    <slot />
  </select-item-text>
</template>

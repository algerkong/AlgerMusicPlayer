<script setup lang="ts">
import type { SelectValueProps } from 'reka-ui';
import { SelectValue } from 'reka-ui';

const props = defineProps<SelectValueProps>();
</script>

<template>
  <select-value data-slot="select-value" v-bind="props">
    <slot />
  </select-value>
</template>

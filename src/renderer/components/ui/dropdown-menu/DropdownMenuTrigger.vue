<script setup lang="ts">
import type { DropdownMenuTriggerProps } from 'reka-ui';
import { DropdownMenuTrigger, useForwardProps } from 'reka-ui';

const props = defineProps<DropdownMenuTriggerProps>();

const forwardedProps = useForwardProps(props);
</script>

<template>
  <dropdown-menu-trigger data-slot="dropdown-menu-trigger" v-bind="forwardedProps">
    <slot />
  </dropdown-menu-trigger>
</template>

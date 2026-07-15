<script setup lang="ts">
import type { DropdownMenuGroupProps } from 'reka-ui';
import { DropdownMenuGroup } from 'reka-ui';

const props = defineProps<DropdownMenuGroupProps>();
</script>

<template>
  <dropdown-menu-group data-slot="dropdown-menu-group" v-bind="props">
    <slot />
  </dropdown-menu-group>
</template>

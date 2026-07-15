<script setup lang="ts">
import type { DropdownMenuSubEmits, DropdownMenuSubProps } from 'reka-ui';
import { DropdownMenuSub, useForwardPropsEmits } from 'reka-ui';

const props = defineProps<DropdownMenuSubProps>();
const emits = defineEmits<DropdownMenuSubEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <dropdown-menu-sub v-slot="slotProps" data-slot="dropdown-menu-sub" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </dropdown-menu-sub>
</template>

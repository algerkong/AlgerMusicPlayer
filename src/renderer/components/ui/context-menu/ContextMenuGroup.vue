<script setup lang="ts">
import type { ContextMenuGroupProps } from 'reka-ui';
import { ContextMenuGroup } from 'reka-ui';

const props = defineProps<ContextMenuGroupProps>();
</script>

<template>
  <context-menu-group data-slot="context-menu-group" v-bind="props">
    <slot />
  </context-menu-group>
</template>

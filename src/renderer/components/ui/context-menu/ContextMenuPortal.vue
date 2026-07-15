<script setup lang="ts">
import type { ContextMenuPortalProps } from 'reka-ui';
import { ContextMenuPortal } from 'reka-ui';

const props = defineProps<ContextMenuPortalProps>();
</script>

<template>
  <context-menu-portal data-slot="context-menu-portal" v-bind="props">
    <slot />
  </context-menu-portal>
</template>

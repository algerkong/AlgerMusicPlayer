<script setup lang="ts">
import type { ContextMenuRootEmits, ContextMenuRootProps } from 'reka-ui';
import { ContextMenuRoot, useForwardPropsEmits } from 'reka-ui';

const props = defineProps<ContextMenuRootProps>();
const emits = defineEmits<ContextMenuRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <context-menu-root data-slot="context-menu" v-bind="forwarded">
    <slot />
  </context-menu-root>
</template>

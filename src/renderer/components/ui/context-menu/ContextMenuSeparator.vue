<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { ContextMenuSeparatorProps } from 'reka-ui';
import { ContextMenuSeparator } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<ContextMenuSeparatorProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <context-menu-separator
    data-slot="context-menu-separator"
    v-bind="delegatedProps"
    :class="cn('bg-border -mx-1 my-1 h-px', props.class)"
  />
</template>

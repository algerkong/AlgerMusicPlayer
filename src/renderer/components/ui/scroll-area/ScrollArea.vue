<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { ScrollAreaRootProps } from 'reka-ui';
import { ScrollAreaCorner, ScrollAreaRoot, ScrollAreaViewport } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

import ScrollBar from './ScrollBar.vue';

const props = defineProps<ScrollAreaRootProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <scroll-area-root
    data-slot="scroll-area"
    v-bind="delegatedProps"
    :class="cn('relative', props.class)"
  >
    <scroll-area-viewport
      data-slot="scroll-area-viewport"
      class="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1"
    >
      <slot />
    </scroll-area-viewport>
    <scroll-bar />
    <scroll-area-corner />
  </scroll-area-root>
</template>

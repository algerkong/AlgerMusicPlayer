<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { TabsTriggerProps } from 'reka-ui';
import { TabsTrigger, useForwardProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = reactiveOmit(props, 'class');

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <tabs-trigger
    data-slot="tabs-trigger"
    :class="
      cn(
        'gap-1.5 rounded-md border border-transparent px-2 py-1.5 text-sm font-medium relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        // 未选中
        'text-muted-foreground hover:text-foreground',
        // 选中：主色实心，一眼能看出来
        'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:text-primary-foreground',
        props.class
      )
    "
    v-bind="forwardedProps"
  >
    <slot />
  </tabs-trigger>
</template>

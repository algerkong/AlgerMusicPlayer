<script setup lang="ts">
import { ChevronRightIcon } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import type { ContextMenuSubTriggerProps } from 'reka-ui';
import { ContextMenuSubTrigger, useForwardProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<
  ContextMenuSubTriggerProps & { class?: HTMLAttributes['class']; inset?: boolean }
>();

const delegatedProps = reactiveOmit(props, 'class');

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <context-menu-sub-trigger
    data-slot="context-menu-sub-trigger"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm data-inset:pl-7 [&_svg:not([class*=size-])]:size-4 flex cursor-default items-center outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
        props.class
      )
    "
  >
    <slot />
    <chevron-right-icon class="cn-rtl-flip ml-auto" />
  </context-menu-sub-trigger>
</template>

<script setup lang="ts">
import { ChevronUpIcon } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import type { SelectScrollUpButtonProps } from 'reka-ui';
import { SelectScrollUpButton, useForwardProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<SelectScrollUpButtonProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = reactiveOmit(props, 'class');

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <select-scroll-up-button
    data-slot="select-scroll-up-button"
    v-bind="forwardedProps"
    :class="
      cn(
        'bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*=size-])]:size-4',
        props.class
      )
    "
  >
    <slot>
      <chevron-up-icon />
    </slot>
  </select-scroll-up-button>
</template>

<script setup lang="ts">
import { ChevronDownIcon } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import type { SelectScrollDownButtonProps } from 'reka-ui';
import { SelectScrollDownButton, useForwardProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<SelectScrollDownButtonProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = reactiveOmit(props, 'class');

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <select-scroll-down-button
    data-slot="select-scroll-down-button"
    v-bind="forwardedProps"
    :class="
      cn(
        'bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*=size-])]:size-4',
        props.class
      )
    "
  >
    <slot>
      <chevron-down-icon />
    </slot>
  </select-scroll-down-button>
</template>

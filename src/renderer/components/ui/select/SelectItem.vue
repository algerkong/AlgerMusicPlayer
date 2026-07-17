<script setup lang="ts">
import { CheckIcon } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import type { SelectItemProps } from 'reka-ui';
import { SelectItem, SelectItemIndicator, SelectItemText, useForwardProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<SelectItemProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = reactiveOmit(props, 'class');

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <select-item
    data-slot="select-item"
    v-bind="forwardedProps"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*=size-])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 relative flex w-full cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        props.class
      )
    "
  >
    <span class="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
      <select-item-indicator>
        <slot name="indicator-icon">
          <check-icon class="pointer-events-none" />
        </slot>
      </select-item-indicator>
    </span>

    <select-item-text>
      <slot />
    </select-item-text>
  </select-item>
</template>

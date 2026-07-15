<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { DropdownMenuLabelProps } from 'reka-ui';
import { DropdownMenuLabel, useForwardProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<
  DropdownMenuLabelProps & { class?: HTMLAttributes['class']; inset?: boolean }
>();

const delegatedProps = reactiveOmit(props, 'class', 'inset');
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <dropdown-menu-label
    data-slot="dropdown-menu-label"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="
      cn('text-muted-foreground px-1.5 py-1 text-xs font-medium data-inset:pl-7', props.class)
    "
  >
    <slot />
  </dropdown-menu-label>
</template>

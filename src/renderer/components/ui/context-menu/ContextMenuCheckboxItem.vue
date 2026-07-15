<script setup lang="ts">
import { CheckIcon } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import type { ContextMenuCheckboxItemEmits, ContextMenuCheckboxItemProps } from 'reka-ui';
import { ContextMenuCheckboxItem, ContextMenuItemIndicator, useForwardPropsEmits } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<ContextMenuCheckboxItemProps & { class?: HTMLAttributes['class'] }>();
const emits = defineEmits<ContextMenuCheckboxItemEmits>();

const delegatedProps = reactiveOmit(props, 'class');

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <context-menu-checkbox-item
    data-slot="context-menu-checkbox-item"
    v-bind="forwarded"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm data-inset:pl-7 [&_svg:not([class*=size-])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        props.class
      )
    "
  >
    <span class="absolute right-2 pointer-events-none">
      <context-menu-item-indicator>
        <slot name="indicator-icon">
          <check-icon />
        </slot>
      </context-menu-item-indicator>
    </span>
    <slot />
  </context-menu-checkbox-item>
</template>

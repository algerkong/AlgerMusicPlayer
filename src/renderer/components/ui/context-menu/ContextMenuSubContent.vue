<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { DropdownMenuSubContentEmits, DropdownMenuSubContentProps } from 'reka-ui';
import { ContextMenuSubContent, useForwardPropsEmits } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<DropdownMenuSubContentProps & { class?: HTMLAttributes['class'] }>();
const emits = defineEmits<DropdownMenuSubContentEmits>();

const delegatedProps = reactiveOmit(props, 'class');

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <context-menu-sub-content
    data-slot="context-menu-sub-content"
    v-bind="forwarded"
    :class="
      cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 bg-popover text-popover-foreground min-w-32 rounded-lg border p-1 shadow-lg duration-100 cn-menu-translucent z-50 origin-(--reka-context-menu-content-transform-origin) overflow-hidden',
        props.class
      )
    "
  >
    <slot />
  </context-menu-sub-content>
</template>

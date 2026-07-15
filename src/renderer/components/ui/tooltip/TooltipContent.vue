<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { TooltipContentEmits, TooltipContentProps } from 'reka-ui';
import { TooltipArrow, TooltipContent, TooltipPortal, useForwardPropsEmits } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

defineOptions({
  inheritAttrs: false
});

const props = withDefaults(
  defineProps<TooltipContentProps & { class?: HTMLAttributes['class'] }>(),
  {
    sideOffset: 0
  }
);

const emits = defineEmits<TooltipContentEmits>();

const delegatedProps = reactiveOmit(props, 'class');
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <tooltip-portal>
    <tooltip-content
      data-slot="tooltip-content"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          'z-[100000] inline-flex w-fit max-w-[14rem] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs shadow-lg',
          'border border-white/15 bg-zinc-900/95 text-zinc-50 backdrop-blur-md',
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          props.class
        )
      "
    >
      <slot />
      <tooltip-arrow
        class="z-[100000] size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] fill-zinc-900 bg-zinc-900"
      />
    </tooltip-content>
  </tooltip-portal>
</template>

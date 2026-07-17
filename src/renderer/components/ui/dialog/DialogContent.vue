<script setup lang="ts">
import { X } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import type { DialogContentEmits, DialogContentProps } from 'reka-ui';
import { DialogClose, DialogContent, DialogPortal, useForwardPropsEmits } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

import DialogOverlay from './DialogOverlay.vue';

defineOptions({
  inheritAttrs: false
});

const props = withDefaults(
  defineProps<
    DialogContentProps & {
      class?: HTMLAttributes['class'];
      showCloseButton?: boolean;
    }
  >(),
  {
    showCloseButton: true
  }
);
const emits = defineEmits<DialogContentEmits>();

const delegatedProps = reactiveOmit(props, 'class', 'showCloseButton');
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <dialog-portal>
    <dialog-overlay />
    <dialog-content
      data-slot="dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          /* 封面取色：chrome-surface-strong / border / text */
          'chrome-surface-strong text-[color:var(--chrome-text)] fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl p-6 shadow-xl duration-200 sm:max-w-lg',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          props.class
        )
      "
    >
      <slot />

      <dialog-close
        v-if="showCloseButton"
        data-slot="dialog-close"
        class="absolute top-4 right-4 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-[rgb(var(--chrome-accent))] focus:outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        :style="{ color: 'var(--chrome-text-muted)' }"
      >
        <x />
        <span class="sr-only">关闭</span>
      </dialog-close>
    </dialog-content>
  </dialog-portal>
</template>

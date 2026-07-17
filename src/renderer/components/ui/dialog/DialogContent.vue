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
          /* 实色底，避免 chrome-surface-strong 的 blur 与侧栏叠层打光 */
          'dialog-content-anim bg-[rgba(22,22,26,0.97)] text-[color:var(--chrome-text)] border border-[color:var(--chrome-border)] fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-2xl p-6 shadow-xl sm:max-w-lg backdrop-blur-none',
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

<!--
  TW3 未接入 tw-animate（那是 v4 插件），data-[state]:animate-in 不会生效。
  用 data-state + keyframes，reka Presence 会等 animationend 再卸 DOM。
-->
<style>
@keyframes dialog-content-in {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 10px)) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
@keyframes dialog-content-out {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 6px)) scale(0.97);
  }
}

.dialog-content-anim {
  transform: translate(-50%, -50%);
}
.dialog-content-anim[data-state='open'] {
  animation: dialog-content-in 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.dialog-content-anim[data-state='closed'] {
  animation: dialog-content-out 0.18s ease both;
}
</style>

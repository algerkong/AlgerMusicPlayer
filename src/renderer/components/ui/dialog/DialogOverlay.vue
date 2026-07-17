<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { DialogOverlayProps } from 'reka-ui';
import { DialogOverlay } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <dialog-overlay
    data-slot="dialog-overlay"
    v-bind="delegatedProps"
    :class="
      cn(
        /* 不用 backdrop-blur：会和侧栏 chrome 毛玻璃叠出边缘光 */
        'dialog-overlay-anim fixed inset-0 z-50 bg-black/55',
        props.class
      )
    "
  >
    <slot />
  </dialog-overlay>
</template>

<style>
@keyframes dialog-overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes dialog-overlay-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
.dialog-overlay-anim[data-state='open'] {
  animation: dialog-overlay-in 0.22s ease both;
}
.dialog-overlay-anim[data-state='closed'] {
  animation: dialog-overlay-out 0.16s ease both;
}
</style>

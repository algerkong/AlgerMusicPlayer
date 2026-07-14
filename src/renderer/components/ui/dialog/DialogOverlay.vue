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
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]',
        props.class
      )
    "
  >
    <slot />
  </dialog-overlay>
</template>

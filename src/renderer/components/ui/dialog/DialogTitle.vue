<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { DialogTitleProps } from 'reka-ui';
import { DialogTitle, useForwardProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<DialogTitleProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = reactiveOmit(props, 'class');
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <dialog-title
    data-slot="dialog-title"
    v-bind="forwardedProps"
    :class="cn('text-lg leading-none font-semibold tracking-tight', props.class)"
    :style="{ color: 'var(--chrome-text)' }"
  >
    <slot />
  </dialog-title>
</template>

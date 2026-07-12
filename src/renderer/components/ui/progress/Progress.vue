<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    /** 0–100 */
    value?: number;
    class?: HTMLAttributes['class'];
  }>(),
  {
    value: 0
  }
);
</script>

<template>
  <div
    data-slot="progress"
    role="progressbar"
    :aria-valuenow="Math.min(100, Math.max(0, value))"
    aria-valuemin="0"
    aria-valuemax="100"
    :class="cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', props.class)"
  >
    <div
      class="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
      :style="{ width: `${Math.min(100, Math.max(0, value))}%` }"
    />
  </div>
</template>

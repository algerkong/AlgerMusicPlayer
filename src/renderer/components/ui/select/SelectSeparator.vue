<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { SelectSeparatorProps } from 'reka-ui';
import { SelectSeparator } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<SelectSeparatorProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <select-separator
    data-slot="select-separator"
    v-bind="delegatedProps"
    :class="cn('bg-border -mx-1 my-1 h-px pointer-events-none', props.class)"
  />
</template>

<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { SelectGroupProps } from 'reka-ui';
import { SelectGroup } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<SelectGroupProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <select-group
    data-slot="select-group"
    v-bind="delegatedProps"
    :class="cn('scroll-my-1 p-1', props.class)"
  >
    <slot />
  </select-group>
</template>

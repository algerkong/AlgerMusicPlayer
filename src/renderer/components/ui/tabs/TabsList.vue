<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { TabsListProps } from 'reka-ui';
import { TabsList } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

import type { TabsListVariants } from '.';
import { tabsListVariants } from '.';

const props = withDefaults(
  defineProps<
    TabsListProps & {
      class?: HTMLAttributes['class'];
      variant?: TabsListVariants['variant'];
    }
  >(),
  {
    variant: 'default'
  }
);

const delegatedProps = reactiveOmit(props, 'class', 'variant');
</script>

<template>
  <tabs-list
    data-slot="tabs-list"
    :data-variant="variant"
    v-bind="delegatedProps"
    :class="cn(tabsListVariants({ variant }), props.class)"
  >
    <slot />
  </tabs-list>
</template>

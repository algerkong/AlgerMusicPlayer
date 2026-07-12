<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { SwitchRootEmits, SwitchRootProps } from 'reka-ui';
import { SwitchRoot, SwitchThumb, useForwardPropsEmits } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<
    SwitchRootProps & {
      class?: HTMLAttributes['class'];
      size?: 'sm' | 'default';
    }
  >(),
  {
    size: 'default'
  }
);

const emits = defineEmits<SwitchRootEmits>();

const delegatedProps = reactiveOmit(props, 'class', 'size');

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <switch-root
    v-slot="slotProps"
    data-slot="switch"
    :data-size="size"
    v-bind="forwarded"
    :class="
      cn(
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:data-[state=unchecked]:bg-input/80 shrink-0 rounded-full border border-transparent focus-visible:ring-2 aria-invalid:ring-2 data-[size=default]:h-[18.4px] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 peer group/switch relative inline-flex items-center transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        props.class
      )
    "
  >
    <switch-thumb
      data-slot="switch-thumb"
      class="bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground rounded-full group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-[state=checked]:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-[state=checked]:translate-x-[calc(100%-2px)] group-data-[size=default]/switch:data-[state=unchecked]:translate-x-0 group-data-[size=sm]/switch:data-[state=unchecked]:translate-x-0 pointer-events-none block ring-0 transition-transform size-4"
    >
      <slot name="thumb" v-bind="slotProps" />
    </switch-thumb>
  </switch-root>
</template>

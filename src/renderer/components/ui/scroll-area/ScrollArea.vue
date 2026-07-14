<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import type { ScrollAreaRootProps } from 'reka-ui';
import { ScrollAreaCorner, ScrollAreaRoot, ScrollAreaViewport } from 'reka-ui';
import { computed, type HTMLAttributes, ref } from 'vue';

import { cn } from '@/lib/utils';

import ScrollBar from './ScrollBar.vue';

type Orientation = 'vertical' | 'horizontal' | 'both';

const props = withDefaults(
  defineProps<
    ScrollAreaRootProps & {
      class?: HTMLAttributes['class'];
      /** Which scrollbars to show. Default vertical. */
      orientation?: Orientation;
      viewportClass?: HTMLAttributes['class'];
    }
  >(),
  {
    orientation: 'vertical'
  }
);

const emit = defineEmits<{
  scroll: [event: Event];
}>();

const delegatedProps = reactiveOmit(props, 'class', 'orientation', 'viewportClass');

const rootEl = ref<HTMLElement | null>(null);

const setRootRef = (el: unknown) => {
  if (!el) {
    rootEl.value = null;
    return;
  }
  // reka primitive may be component instance or DOM node
  const anyEl = el as { $el?: HTMLElement };
  rootEl.value = (anyEl.$el ?? el) as HTMLElement;
};

const showVertical = computed(
  () => props.orientation === 'vertical' || props.orientation === 'both'
);
const showHorizontal = computed(
  () => props.orientation === 'horizontal' || props.orientation === 'both'
);

const getViewport = (): HTMLElement | null => {
  const root = rootEl.value;
  if (!root) return null;
  if (root.matches?.('[data-slot="scroll-area-viewport"]')) return root;
  return root.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null;
};

const onScroll = (event: Event) => {
  emit('scroll', event);
};

const scrollTo = (options?: ScrollToOptions) => {
  getViewport()?.scrollTo(options);
};

const scrollBy = (options?: ScrollToOptions) => {
  getViewport()?.scrollBy(options);
};

defineExpose({
  /** Scrollable viewport element */
  get viewport() {
    return getViewport();
  },
  getViewport,
  scrollTo,
  scrollBy
});
</script>

<template>
  <scroll-area-root
    :ref="setRootRef"
    data-slot="scroll-area"
    v-bind="delegatedProps"
    :class="cn('relative overflow-hidden', props.class)"
  >
    <scroll-area-viewport
      data-slot="scroll-area-viewport"
      :class="
        cn(
          'size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1',
          props.viewportClass
        )
      "
      @scroll="onScroll"
    >
      <slot />
    </scroll-area-viewport>
    <scroll-bar v-if="showVertical" orientation="vertical" />
    <scroll-bar v-if="showHorizontal" orientation="horizontal" />
    <scroll-area-corner v-if="orientation === 'both'" />
  </scroll-area-root>
</template>

<template>
  <div class="h-full w-full bg-white transition-colors duration-500 dark:bg-black">
    <scroll-area ref="scrollbarRef" class="h-full" @scroll="handleScroll">
      <div class="w-full pb-32">
        <!-- 页头（随滚动移出） -->
        <div ref="headerRef" class="page-padding pt-6 pb-2">
          <h1
            class="mb-2 text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl dark:text-white"
          >
            {{ title }}
          </h1>
          <p v-if="description" class="text-neutral-500 dark:text-neutral-400">
            {{ description }}
          </p>
        </div>

        <!-- 标签（滚动吸顶） -->
        <div
          class="sticky-tabs z-10 transition-shadow duration-200"
          :class="isSticky ? 'sticky top-0 shadow-sm' : ''"
        >
          <category-selector
            :model-value="modelValue"
            :categories="categories"
            :label-key="labelKey"
            :value-key="valueKey"
            @change="(val: any) => emit('change', val)"
          />
        </div>

        <!-- 内容插槽 -->
        <div class="page-padding pt-4">
          <slot />
        </div>
      </div>
    </scroll-area>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import CategorySelector from '@/components/common/CategorySelector.vue';
import { ScrollArea } from '@/components/ui/scroll-area';

type Category = string | number | { [key: string]: any };

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    modelValue: any;
    categories: Category[];
    labelKey?: string;
    valueKey?: string;
  }>(),
  {
    labelKey: 'label',
    valueKey: 'value'
  }
);

const emit = defineEmits<{
  change: [value: any];
  scroll: [e: any];
}>();

const scrollbarRef = ref();
const headerRef = ref<HTMLElement>();
const isSticky = ref(false);

const handleScroll = (e: any) => {
  if (headerRef.value) {
    const headerBottom = headerRef.value.offsetTop + headerRef.value.offsetHeight;
    isSticky.value = e.target.scrollTop >= headerBottom;
  }
  emit('scroll', e);
};

const scrollTo = (options: ScrollToOptions) => {
  scrollbarRef.value?.scrollTo(options);
};

defineExpose({ scrollbarRef, scrollTo });
</script>

<style scoped>
.sticky-tabs {
  background: inherit;
}
</style>

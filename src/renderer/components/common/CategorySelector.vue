<template>
  <div
    class="category-selector border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black z-10"
  >
    <n-scrollbar ref="scrollbarRef" x-scrollable>
      <div
        class="categories-wrapper py-4 px-4 sm:px-6 lg:px-8 lg:pl-0"
        @wheel.prevent="handleWheel"
      >
        <span
          v-for="(category, index) in categories"
          :key="getItemKey(category, index)"
          class="category-item"
          :class="[animationClass, { active: isActive(category) }]"
          :style="getAnimationDelay(index)"
          @click="handleClickCategory(category)"
        >
          {{ getItemLabel(category) }}
        </span>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { NScrollbar } from 'naive-ui';
import { computed, ref } from 'vue';

import { setAnimationDelay } from '@/utils';

type Category = string | number | { [key: string]: any };

type CategorySelectorProps = {
  categories: Category[];
  modelValue: any;
  labelKey?: string;
  valueKey?: string;
  animationClass?: string;
};

const props = withDefaults(defineProps<CategorySelectorProps>(), {
  labelKey: 'label',
  valueKey: 'value',
  animationClass: 'animate__bounceIn'
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
  change: [value: any];
}>();

const scrollbarRef = ref();

const getItemKey = (item: Category, index: number): string | number => {
  if (typeof item === 'object' && item !== null) {
    return item[props.valueKey] ?? item[props.labelKey] ?? index;
  }
  return item;
};

const getItemLabel = (item: Category): string => {
  if (typeof item === 'object' && item !== null) {
    return item[props.labelKey] ?? String(item);
  }
  return String(item);
};

const getItemValue = (item: Category): any => {
  if (typeof item === 'object' && item !== null) {
    return item[props.valueKey] ?? item;
  }
  return item;
};

const isActive = (item: Category): boolean => {
  const itemValue = getItemValue(item);
  return itemValue === props.modelValue;
};

const getAnimationDelay = computed(() => {
  return (index: number) => setAnimationDelay(index, 30);
});

const handleClickCategory = (item: Category) => {
  const value = getItemValue(item);
  if (value === props.modelValue) return;
  emit('change', value);
};

const handleWheel = (e: WheelEvent) => {
  const scrollbar = scrollbarRef.value;
  if (scrollbar) {
    const delta = e.deltaY || e.detail;
    scrollbar.scrollBy({ left: delta });
  }
};

defineExpose({
  scrollbarRef
});
</script>

<style lang="scss" scoped>
.category-selector {
  .categories-wrapper {
    @apply flex items-center;
    white-space: nowrap;
  }

  .category-item {
    @apply py-1.5 px-4 mr-3 inline-block rounded-full cursor-pointer transition-all duration-300;
    @apply text-sm font-medium;
    @apply bg-gray-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400;
    @apply hover:bg-gray-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white;

    &.active {
      @apply bg-primary text-white shadow-lg shadow-primary/25 scale-105;
    }
  }
}
</style>

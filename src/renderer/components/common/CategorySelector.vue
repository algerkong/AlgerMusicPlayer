<template>
  <div
    class="category-selector z-10"
    :class="variant === 'line' ? 'category-selector--line' : 'category-selector--pill'"
  >
    <n-scrollbar ref="scrollbarRef" x-scrollable>
      <div
        class="category-selector__row flex items-center page-padding"
        style="white-space: nowrap"
        @wheel.prevent="handleWheel"
      >
        <span
          v-for="(category, index) in categories"
          :key="getItemKey(category, index)"
          class="category-selector__item"
          :class="[
            animationClass,
            variant === 'line' ? 'category-selector__item--line' : 'category-selector__item--pill',
            index === 0 ? 'ml-0.5' : '',
            isActive(category) ? 'is-active' : ''
          ]"
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
  /** pill=圆角胶囊（默认）；line=文字高亮 + 底线 */
  variant?: 'pill' | 'line';
};

const props = withDefaults(defineProps<CategorySelectorProps>(), {
  labelKey: 'label',
  valueKey: 'value',
  animationClass: 'animate__bounceIn',
  variant: 'pill'
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
  emit('update:modelValue', value);
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

<style scoped>
.category-selector__row {
  white-space: nowrap;
}

/* ── pill（历史默认，保留实心底） ───────────────────── */
.category-selector--pill {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
}

:global(.dark) .category-selector--pill {
  border-bottom-color: rgba(255, 255, 255, 0.08);
  background: #000;
}

.category-selector--pill .category-selector__row {
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.category-selector__item--pill {
  display: inline-block;
  margin-right: 0.75rem;
  padding: 0.375rem 1rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.875rem;
  font-weight: 500;
  background: rgb(243 244 246);
  color: rgb(82 82 82);
}

:global(.dark) .category-selector__item--pill {
  background: rgb(38 38 38);
  color: rgb(163 163 163);
}

.category-selector__item--pill:hover {
  background: rgb(229 231 235);
  color: rgb(23 23 23);
}

:global(.dark) .category-selector__item--pill:hover {
  background: rgb(64 64 64);
  color: #fff;
}

.category-selector__item--pill.is-active {
  background: var(--primary-color, #22c55e);
  color: #fff;
  box-shadow: 0 10px 15px -3px color-mix(in srgb, var(--primary-color, #22c55e) 25%, transparent);
  transform: scale(1.05);
}

/* ── line：透底，别整一条死黑；悬停只轻微提亮 ───────── */
.category-selector--line {
  background: transparent;
  border-bottom: 1px solid var(--chrome-border, rgba(0, 0, 0, 0.06));
}

.category-selector--line .category-selector__row {
  padding-top: 0.25rem;
  padding-bottom: 0;
  gap: 0;
}

.category-selector__item--line {
  position: relative;
  display: inline-block;
  margin-right: 1.25rem;
  padding: 0.5rem 0 0.55rem;
  cursor: pointer;
  /* 字号/字重固定，选中只靠颜色+缩放，避免整条筛选栏被顶着跳 */
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--chrome-text-muted, #6b7280);
  transform: scale(1);
  transform-origin: center bottom;
  transition:
    color 0.15s ease,
    transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1);
}

/* 未选中悬停：往主色靠一点点，别黑白对撞 */
.category-selector__item--line:hover:not(.is-active) {
  color: color-mix(in srgb, var(--primary-color, #22c55e) 40%, var(--chrome-text-muted, #6b7280));
}

.category-selector__item--line.is-active {
  color: var(--primary-color, #22c55e);
  /* 视觉上大一点，但不改 layout box */
  transform: scale(1.12);
  z-index: 1;
}

.category-selector__item--line.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 0.125rem;
  background: var(--primary-color, #22c55e);
  border-radius: 9999px;
  /* 抵消 scale，底线仍贴容器，不跟着字一起肥 */
  transform: scaleX(calc(1 / 1.12));
  transform-origin: center bottom;
}
</style>

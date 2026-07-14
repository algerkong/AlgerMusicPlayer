<template>
  <div
    class="category-selector z-10"
    :class="variant === 'line' ? 'category-selector--line' : 'category-selector--pill'"
  >
    <scroll-area ref="scrollbarRef" orientation="horizontal" class="w-full">
      <div
        ref="rowRef"
        class="category-selector__row flex items-center page-padding"
        style="white-space: nowrap"
        @wheel.prevent="handleWheel"
      >
        <!-- line：一条可滑动的底线 -->
        <div v-if="variant === 'line'" class="category-selector__slider" :style="sliderStyle" />
        <span
          v-for="(category, index) in categories"
          :key="getItemKey(category, index)"
          :ref="(el) => setItemRef(el as HTMLElement | null, index)"
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
    </scroll-area>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { ScrollArea } from '@/components/ui/scroll-area';
import { setAnimationDelay } from '@/utils';

type Category = string | number | { [key: string]: any };

type CategorySelectorProps = {
  categories: Category[];
  modelValue: any;
  labelKey?: string;
  valueKey?: string;
  animationClass?: string;
  /** pill=圆角胶囊（默认）；line=文字高亮 + 滑动底线 */
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
const rowRef = ref<HTMLElement | null>(null);
const itemEls = ref<(HTMLElement | null)[]>([]);
const sliderTick = ref(0);

const setItemRef = (el: HTMLElement | null, index: number) => {
  if (el) itemEls.value[index] = el;
};

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

const activeIndex = computed(() =>
  props.categories.findIndex((c) => getItemValue(c) === props.modelValue)
);

const bumpSlider = async () => {
  await nextTick();
  sliderTick.value += 1;
};

/** line 变体：底线略短于文字，transform 丝滑滑过去 */
const sliderStyle = computed(() => {
  void sliderTick.value;
  if (props.variant !== 'line') return { opacity: '0' };
  const idx = activeIndex.value;
  const el = itemEls.value[idx];
  if (!el || !rowRef.value) return { opacity: '0' };
  // 比文字略短一点，别顶满整段 label
  const inset = Math.min(6, Math.max(3, Math.round(el.offsetWidth * 0.12)));
  const w = Math.max(12, el.offsetWidth - inset * 2);
  return {
    transform: `translateX(${el.offsetLeft + inset}px)`,
    width: `${w}px`,
    opacity: '1'
  };
});

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

watch(
  () => [props.modelValue, props.categories, props.variant] as const,
  () => {
    void bumpSlider();
  }
);

onMounted(() => {
  void bumpSlider();
  // 字体/布局晚到时再量一次
  window.setTimeout(() => bumpSlider(), 50);
  window.setTimeout(() => bumpSlider(), 200);
});

defineExpose({
  scrollbarRef
});
</script>

<style scoped>
.category-selector__row {
  position: relative;
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

/* ── line：文字高亮 + 滑动底线 ───────────────────────── */
.category-selector--line {
  background: transparent;
  border-bottom: 1px solid var(--chrome-border, rgba(0, 0, 0, 0.06));
}

.category-selector--line .category-selector__row {
  padding-top: 0.25rem;
  padding-bottom: 0;
  gap: 0;
}

.category-selector__slider {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 0.125rem;
  border-radius: 9999px;
  background: var(--primary-color, #22c55e);
  pointer-events: none;
  z-index: 2;
  transition:
    transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1),
    width 0.28s cubic-bezier(0.34, 1.4, 0.64, 1),
    opacity 0.18s ease;
}

.category-selector__item--line {
  position: relative;
  display: inline-block;
  margin-right: 1.25rem;
  padding: 0.5rem 0 0.55rem;
  cursor: pointer;
  /* 字号固定，选中用 scale 略放大，避免整行被字号顶跳 */
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

.category-selector__item--line:hover:not(.is-active) {
  color: color-mix(in srgb, var(--primary-color, #22c55e) 40%, var(--chrome-text-muted, #6b7280));
}

.category-selector__item--line.is-active {
  color: var(--primary-color, #22c55e);
  transform: scale(1.12);
  z-index: 1;
}

/* 底线改由 slider 统一画，不再用 ::after，避免两根线 */
</style>

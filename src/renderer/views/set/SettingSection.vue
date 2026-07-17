<template>
  <div :id="id" :ref="setRef" class="mb-6 last:mb-0 scroll-mt-16">
    <!-- 顶栏 tab 已标分类时可不传 title，避免「基础设置 / 基础设置」重复 -->
    <div
      v-if="title || $slots.title"
      class="text-xl font-bold mb-4 text-gray-900 dark:text-white px-1"
    >
      <slot name="title">{{ title }}</slot>
    </div>

    <!-- 列表容器：用 chrome 半透明，别用 bg-card（暗色下接近纯黑） -->
    <div class="setting-section-card chrome-surface-strong rounded-2xl overflow-hidden">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type ComponentPublicInstance } from 'vue';

defineOptions({
  name: 'SettingSection'
});

interface Props {
  /** 分组 ID，用于导航定位 */
  id?: string;
  /** 分组标题 */
  title?: string;
}

withDefaults(defineProps<Props>(), {
  id: '',
  title: ''
});

const emit = defineEmits<{
  ref: [el: Element | null];
}>();

// 暴露 ref 给父组件
const setRef = (el: Element | ComponentPublicInstance | null) => {
  emit('ref', el as Element | null);
};
</script>

<style scoped>
.setting-section-card {
  /* chrome-surface-strong 已带半透明 + 边框；这里补一点圆角阴影 */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}
</style>

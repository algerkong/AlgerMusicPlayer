<template>
  <transition name="shortcut-toast">
    <div v-if="visible" class="shortcut-toast">
      <div class="shortcut-toast-content">
        <div class="shortcut-toast-icon">
          <i :class="icon"></i>
        </div>
        <div class="shortcut-toast-text">{{ text }}</div>
      </div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, ref } from 'vue';

const visible = ref(false);
const text = ref('');
const icon = ref('');
let timer: NodeJS.Timeout | null = null;

const show = (message: string, iconName: string) => {
  if (timer) {
    clearTimeout(timer);
  }

  text.value = message;
  icon.value = iconName;
  visible.value = true;

  timer = setTimeout(() => {
    visible.value = false;
    // 在动画结束后触发销毁事件
    setTimeout(() => {
      emit('destroy');
    }, 300);
  }, 1500);
};

// 清理定时器
onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer);
  }
});

const emit = defineEmits(['destroy']);

// 暴露方法给父组件
defineExpose({
  show
});
</script>

<style lang="scss" scoped>
.shortcut-toast {
  @apply fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999];
  @apply flex items-center justify-center;

  &-content {
    @apply flex flex-col items-center gap-2 p-4 rounded-lg;
    @apply bg-light-200 bg-opacity-70 dark:bg-dark-200 dark:bg-opacity-90;
    @apply text-dark-100 dark:text-light-100;
    @apply shadow-lg backdrop-blur-sm;
    min-width: 120px;
  }

  &-icon {
    @apply text-3xl;
  }

  &-text {
    @apply text-sm font-medium text-center;
  }
}

.shortcut-toast-enter-active,
.shortcut-toast-leave-active {
  @apply transition-all duration-300;
}

.shortcut-toast-enter-from,
.shortcut-toast-leave-to {
  @apply opacity-0 scale-90;
}

.shortcut-toast-enter-to,
.shortcut-toast-leave-from {
  @apply opacity-100 scale-100;
}
</style>

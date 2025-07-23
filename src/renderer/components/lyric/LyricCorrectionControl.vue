<script setup lang="ts">
import { defineEmits, defineProps } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  correctionTime: number;
}>();
const emit = defineEmits<{
  (e: 'adjust', delta: number): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="lyric-correction">
    <n-tooltip placement="right">
      <template #trigger>
        <div
          class="lyric-correction-btn"
          @click="emit('adjust', -0.2)"
          :title="t('player.subtractCorrection', { num: 0.2 })"
        >
          <i class="ri-subtract-line text-base"></i>
        </div>
      </template>
      <span>{{ t('player.subtractCorrection', { num: 0.2 }) }}</span>
    </n-tooltip>
    <span
      class="text-xs py-0.5 px-1 rounded bg-white/70 dark:bg-neutral-800/70 shadow font-mono tracking-wider text-gray-700 dark:text-gray-200 bg-opacity-40 backdrop-blur-2xl"
    >
      {{ props.correctionTime > 0 ? '+' : '' }}{{ props.correctionTime.toFixed(1) }}s
    </span>
    <n-tooltip placement="right">
      <template #trigger>
        <div
          class="lyric-correction-btn"
          @click="emit('adjust', 0.2)"
          :title="t('player.addCorrection', { num: 0.2 })"
        >
          <i class="ri-add-line text-base"></i>
        </div>
      </template>
      <span>{{ t('player.addCorrection', { num: 0.2 }) }}</span>
    </n-tooltip>
  </div>
</template>

<style scoped lang="scss">
.lyric-correction {
  @apply absolute right-0 bottom-4 flex flex-col items-center space-y-1 z-50 select-none transition-opacity duration-200 opacity-0 pointer-events-none;
}

.lyric-correction-btn {
  @apply w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-neutral-800 border border-white/20 dark:border-neutral-700/40 shadow-md backdrop-blur-2xl cursor-pointer transition-all duration-150 text-gray-700 dark:text-gray-200 hover:bg-green-500/80 hover:text-white hover:border-green-400/60 active:scale-95 bg-opacity-40 dark:hover:bg-green-500/80 dark:hover:text-white dark:hover:border-green-400/60 dark:hover:bg-opacity-40;
}

.mobile {
  .lyric-correction {
    @apply opacity-100;
  }
}
</style>

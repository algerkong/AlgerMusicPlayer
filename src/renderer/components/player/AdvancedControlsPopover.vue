<template>
  <!-- 仅保留均衡器；定时关闭 / 播放速度已移除 -->
  <n-tooltip trigger="hover" :z-index="9999999">
    <template #trigger>
      <div class="advanced-controls-btn" @click="showEQModal = true">
        <i class="iconfont ri-equalizer-line"></i>
      </div>
    </template>
    {{ t('player.playBar.eq') }}
  </n-tooltip>

  <n-modal
    v-model:show="showEQModal"
    :mask-closable="true"
    :unstable-show-mask="false"
    :z-index="9999999"
  >
    <div class="eq-modal-content chrome-surface-strong">
      <div class="modal-close" @click="showEQModal = false">
        <i class="ri-close-line"></i>
      </div>
      <eq-control />
    </div>
  </n-modal>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import EqControl from '@/components/EQControl.vue';

const { t } = useI18n();
const showEQModal = ref(false);
</script>

<style lang="scss" scoped>
.advanced-controls-btn {
  @apply relative flex items-center justify-center cursor-pointer;
  font-size: 1.35rem;
  transition: color 0.15s;

  &:hover {
    color: var(--primary-color, #22c55e);
  }
}

.eq-modal-content {
  @apply relative p-4 rounded-2xl min-w-[320px] max-w-[92vw];
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}

.modal-close {
  @apply absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer;
  @apply text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10;
  z-index: 1;
}
</style>

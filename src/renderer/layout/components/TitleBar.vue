<template>
  <div
    id="title-bar"
    class="flex justify-between px-6 py-2 select-none relative text-dark dark:text-white"
    @mousedown="drag"
  >
    <div id="title">Alger Music</div>
    <div id="buttons" class="flex gap-4">
      <n-button
        v-if="!isElectron"
        type="primary"
        size="small"
        text
        title="下载应用"
        @click="openDownloadPage"
      >
        <i class="ri-download-line"></i>
        下载桌面版
      </n-button>
      <template v-if="isElectron">
        <div class="text-gray-600 dark:text-gray-400 hover:text-green-500" @click="miniWindow">
          <i class="iconfont ri-picture-in-picture-line"></i>
        </div>
        <div class="text-gray-600 dark:text-gray-400 hover:text-green-500" @click="minimizeWindow">
          <i class="iconfont icon-minisize"></i>
        </div>
        <div class="text-gray-600 dark:text-gray-400 hover:text-green-500" @click="requestClose">
          <i class="iconfont icon-close"></i>
        </div>
      </template>
    </div>
  </div>

  <!-- 关闭确认弹窗：与展开歌词视图共用（#492） -->
  <close-app-confirm-modal
    v-model:show="showCloseModal"
    v-model:remember-choice="rememberChoice"
    @action="confirmCloseAction"
  />
</template>

<script setup lang="ts">
import CloseAppConfirmModal from '@/components/common/CloseAppConfirmModal.vue';
import { useWindowControls } from '@/hooks/useWindowControls';
import { isElectron } from '@/utils';

const {
  showCloseModal,
  rememberChoice,
  minimizeWindow,
  miniWindow,
  requestClose,
  confirmCloseAction
} = useWindowControls();

const openDownloadPage = () => {
  if (!isElectron) {
    window.open('http://donate.alger.fun/download', '_blank');
  }
};

const drag = (event: MouseEvent) => {
  if (!isElectron) {
    return;
  }
  window.api.dragStart(event as unknown as string);
};
</script>

<style scoped lang="scss">
#title-bar {
  -webkit-app-region: drag;
  z-index: 3000;
}

#buttons {
  -webkit-app-region: no-drag;
}
</style>

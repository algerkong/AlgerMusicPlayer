<template>
  <header id="title-bar" :class="{ 'title-bar--mac': isMac }" @dblclick="handleTitleBarDblClick">
    <div class="title-bar__leading">
      <!-- macOS 交通灯控制按钮：关闭、最小化、最大化 -->
      <div v-if="isElectron && isMac" class="window-controls window-controls--mac">
        <button
          class="window-control window-control--mac window-control--mac-close"
          type="button"
          :aria-label="t('comp.titleBar.close')"
          :title="t('comp.titleBar.close')"
          @click.stop="requestClose"
        >
          <svg viewBox="0 0 12 12" class="traffic-icon traffic-icon--close" aria-hidden="true">
            <path
              d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5"
              stroke="#4D0000"
              stroke-width="1.2"
              stroke-linecap="round"
              fill="none"
            />
          </svg>
        </button>
        <button
          class="window-control window-control--mac window-control--mac-minimize"
          type="button"
          :aria-label="t('comp.titleBar.minimize')"
          :title="t('comp.titleBar.minimize')"
          @click.stop="minimizeWindow"
        >
          <svg viewBox="0 0 12 12" class="traffic-icon traffic-icon--minimize" aria-hidden="true">
            <path
              d="M2.5 6H9.5"
              stroke="#975200"
              stroke-width="1.2"
              stroke-linecap="round"
              fill="none"
            />
          </svg>
        </button>
        <button
          class="window-control window-control--mac window-control--mac-maximize"
          type="button"
          :aria-label="isMaximized ? t('comp.titleBar.restore') : t('comp.titleBar.maximize')"
          :title="isMaximized ? t('comp.titleBar.restore') : t('comp.titleBar.maximize')"
          @click.stop="handleMacGreenClick"
        >
          <!-- 未最大化：对角展开箭头；已最大化：对角收拢箭头 -->
          <svg
            v-if="!isMaximized"
            viewBox="0 0 12 12"
            class="traffic-icon traffic-icon--maximize"
            aria-hidden="true"
          >
            <path d="M3 3h3.5L3 6.5zM9 9H5.5L9 5.5z" fill="#006400" />
          </svg>
          <svg
            v-else
            viewBox="0 0 12 12"
            class="traffic-icon traffic-icon--maximize"
            aria-hidden="true"
          >
            <path d="M5.5 5.5H2.5L5.5 2.5zM6.5 6.5h3L6.5 9.5z" fill="#006400" />
          </svg>
        </button>
      </div>

      <!-- 应用标题：Mac 靠左侧紧随控制按钮，其他系统靠左 -->
      <span class="title-bar__brand" :class="{ 'title-bar__brand--mac': isElectron && isMac }">
        Alger Music
      </span>
    </div>

    <!-- 中间空白可拖拽区域 -->
    <div class="title-bar__spacer" />

    <div class="title-bar__trailing">
      <n-button
        v-if="!isElectron"
        class="title-bar__download"
        type="primary"
        size="small"
        text
        :title="t('comp.titleBar.download')"
        @click="openDownloadPage"
      >
        <i class="ri-download-line" aria-hidden="true" />
        {{ t('comp.titleBar.download') }}
      </n-button>

      <template v-if="isElectron">
        <button
          class="window-control window-control--utility"
          type="button"
          :aria-label="t('comp.titleBar.miniPlayer')"
          :title="t('comp.titleBar.miniPlayer')"
          @click.stop="miniWindow"
        >
          <i class="ri-picture-in-picture-line" aria-hidden="true" />
        </button>

        <!-- Windows 和 Linux 控制按钮保持在右上角常规顺序 -->
        <div v-if="!isMac" class="window-controls window-controls--desktop">
          <button
            class="window-control window-control--desktop"
            type="button"
            :aria-label="t('comp.titleBar.minimize')"
            :title="t('comp.titleBar.minimize')"
            @click.stop="minimizeWindow"
          >
            <i class="ri-subtract-line" aria-hidden="true" />
          </button>
          <button
            class="window-control window-control--desktop"
            type="button"
            :aria-label="isMaximized ? t('comp.titleBar.restore') : t('comp.titleBar.maximize')"
            :title="isMaximized ? t('comp.titleBar.restore') : t('comp.titleBar.maximize')"
            @click.stop="toggleMaximizeWindow"
          >
            <i
              :class="isMaximized ? 'ri-checkbox-multiple-blank-line' : 'ri-checkbox-blank-line'"
              aria-hidden="true"
            />
          </button>
          <button
            class="window-control window-control--desktop window-control--close"
            type="button"
            :aria-label="t('comp.titleBar.close')"
            :title="t('comp.titleBar.close')"
            @click.stop="requestClose"
          >
            <i class="ri-close-line" aria-hidden="true" />
          </button>
        </div>
      </template>
    </div>
  </header>

  <!-- 关闭确认弹窗：与展开歌词视图共用（#492） -->
  <close-app-confirm-modal
    v-model:show="showCloseModal"
    v-model:remember-choice="rememberChoice"
    @action="confirmCloseAction"
  />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import CloseAppConfirmModal from '@/components/common/CloseAppConfirmModal.vue';
import { useWindowControls } from '@/hooks/useWindowControls';
import { isElectron } from '@/utils';

type DesktopPlatform = 'darwin' | 'win32' | 'linux' | 'web';

const { t } = useI18n();

const getPlatform = (): DesktopPlatform => {
  if (!isElectron) {
    return 'web';
  }

  const platform = window.electron.ipcRenderer.sendSync('get-platform');
  return platform === 'darwin' || platform === 'win32' || platform === 'linux' ? platform : 'linux';
};

const platform = getPlatform();
const isMac = platform === 'darwin';
const isMaximized = ref(false);
let removeMaximizedStateListener: (() => void) | undefined;

const {
  showCloseModal,
  rememberChoice,
  minimizeWindow,
  miniWindow,
  toggleMaximizeWindow,
  requestClose,
  confirmCloseAction
} = useWindowControls();

const openDownloadPage = () => {
  if (!isElectron) {
    window.open('http://donate.alger.fun/download', '_blank');
  }
};

const handleMacGreenClick = (event: MouseEvent) => {
  // Option + 点击触发系统全屏，普通点击触发窗口铺满屏幕（最大化/还原）
  if (event.altKey) {
    window.api.toggleFullScreen();
  } else {
    toggleMaximizeWindow();
  }
};

const handleTitleBarDblClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  // 避免在按钮或可交互控件上触发双击
  if (target?.closest('.window-control, .n-button, [data-no-drag]')) {
    return;
  }
  toggleMaximizeWindow();
};

const syncMaximizedState = async (): Promise<void> => {
  try {
    isMaximized.value = await window.api.isMaximized();
  } catch (error) {
    console.error('获取窗口最大化状态失败:', error);
  }
};

onMounted(() => {
  if (!isElectron) {
    return;
  }

  removeMaximizedStateListener = window.api.onWindowMaximizedState((maximized) => {
    isMaximized.value = maximized;
  });
  void syncMaximizedState();
});

onUnmounted(() => {
  removeMaximizedStateListener?.();
});
</script>

<style scoped lang="scss">
#title-bar {
  @apply relative z-[3000] flex select-none items-center justify-between;
  min-height: 40px;
  padding: 0 10px;
  color: var(--text-color);
  -webkit-app-region: drag;
}

.title-bar__leading,
.title-bar__trailing {
  @apply flex min-w-0 items-center;
}

.title-bar__trailing {
  justify-content: flex-end;
}

.title-bar__spacer {
  @apply flex-1 h-full min-w-4;
  -webkit-app-region: drag;
}

.title-bar__brand {
  @apply truncate text-xs font-medium tracking-wide text-neutral-600 dark:text-neutral-300;
  pointer-events: none;
}

.title-bar__brand--mac {
  margin-left: 14px;
}

.title-bar__download {
  -webkit-app-region: no-drag;
}

.window-controls {
  @apply flex items-center;
  -webkit-app-region: no-drag;
}

.window-controls--mac {
  gap: 8px;
  padding-left: 4px;
}

.window-controls--desktop {
  @apply ml-1;
}

.window-control {
  @apply flex items-center justify-center border-0 p-0 transition-colors;
  color: rgb(75 85 99 / 0.85);
  background: transparent;
  -webkit-app-region: no-drag;
}

.window-control:hover {
  color: rgb(34 197 94);
}

.window-control:focus-visible {
  outline: 2px solid rgb(34 197 94 / 0.8);
  outline-offset: -2px;
}

.window-control--utility {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 17px;
}

.window-control--utility:hover,
.window-control--desktop:hover {
  background: rgb(0 0 0 / 0.06);
}

.window-control--desktop {
  width: 42px;
  height: 40px;
  font-size: 16px;
}

.window-control--close:hover {
  color: white;
  background: #e81123;
}

/* macOS 交通灯外观 */
.window-control--mac {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: filter 0.1s ease;
}

.window-control--mac:active {
  filter: brightness(0.85);
}

.window-control--mac-close {
  background: #ff5f56;
}

.window-control--mac-minimize {
  background: #ffbd2e;
}

.window-control--mac-maximize {
  background: #27c93f;
}

.traffic-icon {
  width: 8px;
  height: 8px;
  opacity: 0;
  transition: opacity 120ms ease;
  pointer-events: none;
}

/* 鼠标悬停在整个交通灯按钮组时，全部图标清晰淡入 */
.window-controls--mac:hover .traffic-icon {
  opacity: 1;
}

.dark .window-control {
  color: rgb(229 231 235 / 0.8);
}

.dark .window-control--utility:hover,
.dark .window-control--desktop:hover {
  background: rgb(255 255 255 / 0.1);
}

.dark .window-control--close:hover {
  color: white;
}

.title-bar--mac .title-bar__trailing {
  min-width: 0;
}
</style>

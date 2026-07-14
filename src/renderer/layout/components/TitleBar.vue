<template>
  <div
    id="title-bar"
    class="flex justify-between items-center px-4 py-2 select-none relative text-dark dark:text-white"
    @mousedown="drag"
  >
    <div class="brand chrome-surface-strong no-drag-children">
      <img :src="appIcon" class="brand-icon" alt="LYMusic" />
      <span class="brand-name">LYMusic</span>
      <span class="brand-ver">v{{ appVersion }}</span>
    </div>

    <!-- 与左上角品牌同一行：顶中两行支持正版 -->
    <div class="support-banner no-drag-children">
      <p class="support-line1">好音乐值得被认真对待，请大家支持正版</p>
      <a
        class="support-line2"
        href="https://music.douyin.com/"
        target="_blank"
        rel="noopener noreferrer"
        @click.prevent="openQishui"
      >
        <img :src="qishuiIcon" alt="汽水音乐" class="support-icon" />
        <span>汽水音乐 · 购买会员</span>
        <i class="ri-external-link-line support-ext" />
      </a>
    </div>

    <!-- 搜索 / 登录 与 缩小·关闭 同一行（右上角工具簇） -->
    <div class="title-bar-end no-drag-children">
      <search-bar class="title-search" />
      <div id="buttons" class="flex gap-3 items-center">
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
          <div class="win-btn" title="最小化" @click="minimize">
            <i class="iconfont icon-minisize"></i>
          </div>
          <div class="win-btn win-btn-close" title="关闭" @click="handleClose">
            <i class="iconfont icon-close"></i>
          </div>
        </template>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showCloseModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        @click.self="showCloseModal = false"
      >
        <div
          class="relative w-[360px] transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        >
          <button
            class="absolute top-4 right-4 p-1 rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors focus:outline-none"
            @click="showCloseModal = false"
          >
            <i class="ri-close-line text-xl leading-none"></i>
          </button>

          <h3 class="text-lg font-bold leading-6 text-neutral-900 dark:text-white mb-2">
            已最小化到系统托盘
          </h3>
          <div class="mt-2">
            <p class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              关闭窗口后 LYMusic 会继续在托盘运行，方便随时唤起。需要彻底退出时点左侧按钮即可。
            </p>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              class="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
              @click="handleAction('close')"
            >
              彻底退出
            </button>
            <button
              class="rounded-full bg-green-500 px-6 py-2 text-sm font-medium text-white hover:bg-green-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 transition-colors shadow-lg shadow-green-500/20"
              @click="handleAction('minimize')"
            >
              好的
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import appIcon from '@/assets/icon.png';
import qishuiIcon from '@/assets/qishui-icon.png';
import { useSettingsStore } from '@/store/modules/settings';
import { isElectron } from '@/utils';

import config from '../../../../package.json';
import SearchBar from './SearchBar.vue';

const settingsStore = useSettingsStore();
const showCloseModal = ref(false);
const appVersion = config.version;
const TRAY_TIP_KEY = 'lymusic-tray-close-tip-seen';
const QISHUI_VIP_URL = 'https://music.douyin.com/';

const openQishui = () => {
  window.open(QISHUI_VIP_URL, '_blank');
};

const openDownloadPage = () => {
  if (!isElectron) {
    window.open('https://github.com/LuoYe17/AlgerMusicPlayer/releases', '_blank');
  }
};

const minimize = () => {
  if (!isElectron) {
    return;
  }
  window.api.minimize();
};

const markTrayTipSeen = () => {
  try {
    localStorage.setItem(TRAY_TIP_KEY, '1');
  } catch {
    /* ignore */
  }
  settingsStore.setSetData({
    ...settingsStore.setData,
    closeAction: 'minimize'
  });
};

const handleAction = (action: 'minimize' | 'close') => {
  markTrayTipSeen();
  if (action === 'minimize') {
    showCloseModal.value = false;
    setTimeout(() => {
      window.api.miniTray();
    }, 200);
  } else {
    showCloseModal.value = false;
    window.api.quitApp();
  }
};

const handleClose = () => {
  // 首次关闭：提示进托盘；之后默认最小化到托盘
  let seen = false;
  try {
    seen = localStorage.getItem(TRAY_TIP_KEY) === '1';
  } catch {
    seen = false;
  }
  if (!seen && settingsStore.setData.closeAction === 'ask') {
    showCloseModal.value = true;
    return;
  }
  window.api.miniTray();
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
  min-height: 48px;
  gap: 8px;
}

.title-bar-end {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 0;
  margin-left: auto;
  -webkit-app-region: no-drag;
  z-index: 1;
}

.title-search {
  min-width: 0;
}

#buttons {
  -webkit-app-region: no-drag;
  flex-shrink: 0;
  min-width: 56px;
  justify-content: flex-end;
}

.win-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: var(--chrome-text-muted, #9ca3af);
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}
.win-btn:hover {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}
.win-btn-close:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 4px 10px 4px 4px;
  border-radius: 9999px;
  /* 防止封面色导致品牌字消失 */
  -webkit-app-region: no-drag;
  flex-shrink: 0;
  z-index: 1;
}

.brand-icon {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  object-fit: cover;
  flex-shrink: 0;
}

.brand-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--chrome-text, #111827);
  line-height: 1;
}

.brand-ver {
  font-size: 11px;
  font-weight: 500;
  color: var(--chrome-text-muted, #6b7280);
  line-height: 1;
  padding: 2px 6px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.06);
}

.support-banner {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  /* 右侧有搜索/登录/窗控，中间文案略收窄避免挤在一起 */
  max-width: min(360px, 34vw);
  pointer-events: auto;
  -webkit-app-region: no-drag;
  text-align: center;
  z-index: 0;
}

.support-line1 {
  margin: 0;
  font-size: 11px;
  line-height: 1.3;
  color: var(--chrome-text-muted, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.support-line2 {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--primary-color, #22c55e);
  text-decoration: none;
  white-space: nowrap;
  transition: opacity 0.15s ease;
}
.support-line2:hover {
  opacity: 0.85;
}

.support-icon {
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  object-fit: cover;
  flex-shrink: 0;
}

.support-ext {
  font-size: 11px;
  opacity: 0.65;
}
</style>

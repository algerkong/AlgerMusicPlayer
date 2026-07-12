<template>
  <div class="app-container h-full w-full" :class="{ mobile: isMobile, noElectron: !isElectron }">
    <n-config-provider :theme="darkTheme">
      <n-dialog-provider>
        <n-message-provider>
          <router-view></router-view>
          <traffic-warning-drawer v-if="!isElectron"></traffic-warning-drawer>
          <disclaimer-modal></disclaimer-modal>
        </n-message-provider>
      </n-dialog-provider>
    </n-config-provider>
  </div>
</template>

<script setup lang="ts">
import { cloneDeep } from 'lodash';
import { darkTheme } from 'naive-ui';
import { nextTick, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import DisclaimerModal from '@/components/common/DisclaimerModal.vue';
import TrafficWarningDrawer from '@/components/TrafficWarningDrawer.vue';
import { usePlayerStore } from '@/store/modules/player';
import { usePlayerCoreStore } from '@/store/modules/playerCore';
import { useSettingsStore } from '@/store/modules/settings';
import { useUserStore } from '@/store/modules/user';
import { isElectron, isLyricWindow } from '@/utils';
import { checkLoginStatus } from '@/utils/auth';

import { initAudioListeners, initMusicHook } from './hooks/MusicHook';
import { audioService } from './services/audioService';
import { isMobile } from './utils';
import { useAppShortcuts } from './utils/appShortcuts';

const { locale } = useI18n();
const settingsStore = useSettingsStore();
const playerStore = usePlayerStore();
const playerCoreStore = usePlayerCoreStore();
const userStore = useUserStore();

// 监听语言变化
watch(
  () => settingsStore.setData.language,
  (newLanguage) => {
    if (newLanguage && newLanguage !== locale.value) {
      locale.value = newLanguage;
    }
  },
  { immediate: true }
);

// 监听字体变化并应用
watch(
  () => [settingsStore.setData.fontFamily, settingsStore.setData.fontScope],
  ([newFont, fontScope]) => {
    const appElement = document.body;
    if (newFont && fontScope === 'global') {
      appElement.style.fontFamily = newFont;
    } else {
      appElement.style.fontFamily = '';
    }
  }
);

const handleSetLanguage = (value: string) => {
  console.log('应用语言变更:', value);
  if (value) {
    locale.value = value;
  }
};

if (!isLyricWindow.value) {
  settingsStore.initializeSettings();
  settingsStore.initializeTheme();
  settingsStore.initializeSystemFonts();

  // 初始化登录状态 - 从 localStorage 恢复用户信息和登录类型
  const loginInfo = checkLoginStatus();
  if (loginInfo.isLoggedIn) {
    if (loginInfo.user && !userStore.user) {
      userStore.setUser(loginInfo.user);
    }
    if (loginInfo.loginType && !userStore.loginType) {
      userStore.setLoginType(loginInfo.loginType);
    }
  }
}

handleSetLanguage(settingsStore.setData.language);

if (isElectron) {
  window.api.onLanguageChanged(handleSetLanguage);
}

// 使用应用内快捷键
useAppShortcuts();

onMounted(async () => {
  playerStore.setIsPlay(false);
  if (isLyricWindow.value) {
    return;
  }

  // 初始化 MusicHook，注入 playerStore
  initMusicHook(playerStore);
  // 设置 URL 过期自动续播处理器
  const { setupUrlExpiredHandler } = await import('@/services/playbackController');
  setupUrlExpiredHandler();
  // 初始化播放状态
  await playerStore.initializePlayState();

  // 初始化音频设备变化监听器
  playerCoreStore.initAudioDeviceListener();

  // 如果有正在播放的音乐，则初始化音频监听器
  if (playerStore.playMusic && playerStore.playMusic.id) {
    // 使用 nextTick 确保 DOM 更新后再初始化
    await nextTick();
    initAudioListeners();
    if (isElectron) {
      window.api.sendSong(cloneDeep(playerStore.playMusic));
    }
  }

  audioService.releaseOperationLock();
});
</script>

<style lang="scss" scoped>
.app-container {
  user-select: none;
}

.mobile {
  .text-base {
    font-size: 14px !important;
  }
}

.html:has(.mobile) {
  font-size: 14px;
}
</style>

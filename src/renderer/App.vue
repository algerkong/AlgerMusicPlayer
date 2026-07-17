<template>
  <div class="app-container h-full w-full" :class="{ mobile: isMobile, noElectron: !isElectron }">
    <n-config-provider :theme="darkTheme" :theme-overrides="naiveThemeOverrides">
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
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui';
import { computed, nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import DisclaimerModal from '@/components/common/DisclaimerModal.vue';
import TrafficWarningDrawer from '@/components/TrafficWarningDrawer.vue';
import { usePlayerStore } from '@/store/modules/player';
import { usePlayerCoreStore } from '@/store/modules/playerCore';
import { useSettingsStore } from '@/store/modules/settings';
import { useUserStore } from '@/store/modules/user';
import { isElectron } from '@/utils';
import { checkLoginStatus, purgeCredentialStorage } from '@/utils/auth';
import {
  applyCoverChromeToRoot,
  buildCoverChromeVars,
  buildNaivePrimaryOverrides
} from '@/utils/coverChrome';
import { installWakeRecovery } from '@/utils/wakeRecovery';

import {
  ensureLyricsLoaded,
  initAudioListeners,
  initMusicHook,
  lrcArray,
  lyricLinesHaveWords
} from './hooks/MusicHook';
import { audioService } from './services/audioService';
import { isMobile } from './utils';
import { useAppShortcuts } from './utils/appShortcuts';

const { locale } = useI18n();
const settingsStore = useSettingsStore();
const playerStore = usePlayerStore();
const playerCoreStore = usePlayerCoreStore();
const userStore = useUserStore();

/** 封面强调色 → naive-ui primary */
const naiveThemeOverrides = computed<GlobalThemeOverrides>(() => {
  const music = playerStore.playMusic as { primaryColor?: string } | undefined;
  return buildNaivePrimaryOverrides(music?.primaryColor) as GlobalThemeOverrides;
});

// 固定简体中文
locale.value = 'zh-CN';

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

// 清除历史 localStorage token，凭据只在主进程
purgeCredentialStorage();

settingsStore.initializeSettings();
settingsStore.initializeTheme();
settingsStore.initializeSystemFonts();

// 初始化登录状态 - 仅恢复非敏感的 user 展示缓存
const loginInfo = checkLoginStatus();
if (loginInfo.isLoggedIn) {
  if (loginInfo.user && !userStore.user) {
    userStore.setUser(loginInfo.user);
  }
  if (loginInfo.loginType && !userStore.loginType) {
    userStore.setLoginType(loginInfo.loginType);
  }
}

// 使用应用内快捷键
useAppShortcuts();

// 用户手势后预热 AudioContext / 双槽解码图（首播少卡一下）
if (typeof window !== 'undefined') {
  const warmOnce = () => {
    void import('@/services/audioService').then(({ audioService }) => {
      audioService.warmDecodePipeline();
    });
    window.removeEventListener('pointerdown', warmOnce);
    window.removeEventListener('keydown', warmOnce);
  };
  window.addEventListener('pointerdown', warmOnce, { once: true, passive: true });
  window.addEventListener('keydown', warmOnce, { once: true });
}

let uninstallWakeRecovery: (() => void) | undefined;

/** 唤醒后重刷封面 chrome + 音频上下文，避免白屏/哑音 */
const recoverAfterWake = async () => {
  const music = playerStore.playMusic as {
    backgroundColor?: string;
    primaryColor?: string;
  } | null;
  try {
    const vars = buildCoverChromeVars(music?.backgroundColor || '', music?.primaryColor || '');
    applyCoverChromeToRoot(vars);
  } catch (error) {
    console.warn('[wake] reapply cover chrome failed', error);
  }
  try {
    await audioService.resumeContextIfNeeded();
  } catch {
    /* ignore */
  }
};

onMounted(async () => {
  playerStore.setIsPlay(false);

  // 初始化 MusicHook，注入 playerStore
  initMusicHook(playerStore);
  const { playbackCoordinator } = await import('@/services/playbackCoordinator');
  playbackCoordinator.setupUrlExpiredHandler();
  await playerStore.initializePlayState();

  playerCoreStore.initAudioDeviceListener();

  // 如果有正在播放的音乐，则初始化音频监听器
  if (playerStore.playMusic && playerStore.playMusic.id) {
    // 等 DOM 更新后再初始化
    await nextTick();
    initAudioListeners();
    if (isElectron) {
      window.api.sendSong(cloneDeep(playerStore.playMusic));
    }
  }

  audioService.releaseOperationLock();

  // 屏幕休眠 / 系统挂起 → 白屏自愈
  uninstallWakeRecovery = installWakeRecovery(recoverAfterWake);
});

// 热更新 MusicHook：只重绑 store/watch。歌词展示挂 globalThis，有逐字则保留不重拉。
if (import.meta.hot) {
  import.meta.hot.accept('./hooks/MusicHook', (mod) => {
    try {
      const init = mod?.initMusicHook ?? initMusicHook;
      const ensure = mod?.ensureLyricsLoaded ?? ensureLyricsLoaded;
      const hasWords = mod?.lyricLinesHaveWords ?? lyricLinesHaveWords;
      const lines = mod?.lrcArray ?? lrcArray;
      init(playerStore);
      // 进度环：globalThis 上 audioListenersInitialized，跨 HMR 只绑一次
      void (mod?.initAudioListeners ?? initAudioListeners)();
      if (!hasWords(lines.value) && playerStore.playMusic?.id) {
        void ensure(true);
      } else {
        console.info('[HMR] MusicHook rebind, keep word lyrics');
      }
    } catch (e) {
      console.warn('[HMR] MusicHook re-init failed', e);
    }
  });
}

onUnmounted(() => {
  uninstallWakeRecovery?.();
  uninstallWakeRecovery = undefined;
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

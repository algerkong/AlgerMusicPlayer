<template>
  <div class="app-container" :class="{ mobile: isMobile, noElectron: !isElectron }">
    <n-config-provider :theme="theme === 'dark' ? darkTheme : lightTheme">
      <n-dialog-provider>
        <n-message-provider>
          <router-view></router-view>
        </n-message-provider>
      </n-dialog-provider>
    </n-config-provider>
  </div>
</template>

<script setup lang="ts">
import { darkTheme, lightTheme } from 'naive-ui';
import { computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import homeRouter from '@/router/home';
import { useMenuStore } from '@/store/modules/menu';
import { usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';
import { isElectron } from '@/utils';

import { isMobile } from './utils';

const { locale } = useI18n();
const settingsStore = useSettingsStore();
const menuStore = useMenuStore();
const playerStore = usePlayerStore();

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

const theme = computed(() => {
  return settingsStore.theme;
});

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

const handleSetLanguage = (_: any, value: string) => {
  locale.value = value;
  // settingsStore.setLanguage(value);
};

onMounted(() => {
  settingsStore.initializeSettings();
  handleSetLanguage(null, settingsStore.setData.language);
  settingsStore.initializeTheme();
  settingsStore.initializeSystemFonts();
  playerStore.initializePlayState();
  if (isMobile.value) {
    menuStore.setMenus(homeRouter.filter((item) => item.meta.isMobile));
  }

  if (isElectron) {
    window.electron.ipcRenderer.on('language-changed', handleSetLanguage);
  }
});
</script>

<style lang="scss" scoped>
.app-container {
  @apply h-full w-full;
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

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

import homeRouter from '@/router/home';
import globalStore from '@/store';
import { isElectron } from '@/utils';

import { isMobile } from './utils';

const theme = computed(() => {
  return globalStore.state.theme;
});

// 监听字体变化并应用
watch(
  () => [globalStore.state.setData.fontFamily, globalStore.state.setData.fontScope],
  ([newFont, fontScope]) => {
    const appElement = document.body;
    if (!appElement) return;

    const defaultFonts =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    // 只有在全局模式下才应用字体
    if (fontScope !== 'global') {
      appElement.style.fontFamily = defaultFonts;
      return;
    }

    if (newFont === 'system-ui') {
      appElement.style.fontFamily = defaultFonts;
    } else {
      // 处理多个字体，确保每个字体名都被正确引用
      const fontList = newFont.split(',').map((font) => {
        const trimmedFont = font.trim();
        // 如果字体名包含空格或特殊字符，添加引号（如果还没有引号的话）
        return /[\s'"()]/.test(trimmedFont) && !/^['"].*['"]$/.test(trimmedFont)
          ? `"${trimmedFont}"`
          : trimmedFont;
      });

      // 将选择的字体和默认字体组合
      appElement.style.fontFamily = `${fontList.join(', ')}, ${defaultFonts}`;
    }
  },
  { immediate: true }
);

onMounted(() => {
  globalStore.dispatch('initializeSettings');
  globalStore.dispatch('initializeLanguage');
  globalStore.dispatch('initializeTheme');
  globalStore.dispatch('initializeSystemFonts');
  globalStore.dispatch('initializePlayState');
  if (isMobile.value) {
    globalStore.commit(
      'setMenus',
      homeRouter.filter((item) => item.meta.isMobile)
    );
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

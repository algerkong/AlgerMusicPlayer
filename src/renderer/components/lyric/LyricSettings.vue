<template>
  <div class="settings-panel transparent-popover">
    <div class="settings-title">{{ t('settings.lyricSettings.title') }}</div>
    <div class="settings-content">
      <n-tabs type="line" animated size="small">
        <!-- 显示设置 -->
        <n-tab-pane :name="'display'" :tab="t('settings.lyricSettings.tabs.display')">
          <div class="tab-content">
            <div class="settings-grid">
              <div class="settings-item">
                <span>{{ t('settings.lyricSettings.pureMode') }}</span>
                <n-switch v-model:value="config.pureModeEnabled" />
              </div>
              <div class="settings-item">
                <span>{{ t('settings.lyricSettings.hideCover') }}</span>
                <n-switch v-model:value="config.hideCover" />
              </div>
              <div class="settings-item">
                <span>{{ t('settings.lyricSettings.centerDisplay') }}</span>
                <n-switch v-model:value="config.centerLyrics" />
              </div>
              <div class="settings-item">
                <span>{{ t('settings.lyricSettings.showTranslation') }}</span>
                <n-switch v-model:value="config.showTranslation" />
              </div>
              <div class="settings-item">
                <span>{{ t('settings.lyricSettings.hideLyrics') }}</span>
                <n-switch v-model:value="config.hideLyrics" />
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- 界面设置 -->
        <n-tab-pane :name="'interface'" :tab="t('settings.lyricSettings.tabs.interface')">
          <div class="tab-content">
            <div class="settings-grid">
              <div class="settings-item">
                <span>{{ t('settings.lyricSettings.showMiniPlayBar') }}</span>
                <n-switch v-model:value="showMiniPlayBar" />
              </div>
            </div>
            <div class="theme-section">
              <div class="section-title">{{ t('settings.lyricSettings.backgroundTheme') }}</div>
              <n-radio-group v-model:value="config.theme" name="theme" class="theme-radio-group">
                <n-space>
                  <n-radio value="default">{{
                    t('settings.lyricSettings.themeOptions.default')
                  }}</n-radio>
                  <n-radio value="light">{{
                    t('settings.lyricSettings.themeOptions.light')
                  }}</n-radio>
                  <n-radio value="dark">{{
                    t('settings.lyricSettings.themeOptions.dark')
                  }}</n-radio>
                </n-space>
              </n-radio-group>
            </div>
          </div>
        </n-tab-pane>

        <!-- 文字设置 -->
        <n-tab-pane :name="'typography'" :tab="t('settings.lyricSettings.tabs.typography')">
          <div class="tab-content">
            <div class="slider-section">
              <div class="slider-item">
                <span>{{ t('settings.lyricSettings.fontSize') }}</span>
                <n-slider
                  v-model:value="config.fontSize"
                  :step="1"
                  :min="12"
                  :max="32"
                  :marks="{
                    12: t('settings.lyricSettings.fontSizeMarks.small'),
                    22: t('settings.lyricSettings.fontSizeMarks.medium'),
                    32: t('settings.lyricSettings.fontSizeMarks.large')
                  }"
                />
              </div>

              <div class="slider-item">
                <span>{{ t('settings.lyricSettings.letterSpacing') }}</span>
                <n-slider
                  v-model:value="config.letterSpacing"
                  :step="0.2"
                  :min="-2"
                  :max="10"
                  :marks="{
                    '-2': t('settings.lyricSettings.letterSpacingMarks.compact'),
                    0: t('settings.lyricSettings.letterSpacingMarks.default'),
                    10: t('settings.lyricSettings.letterSpacingMarks.loose')
                  }"
                />
              </div>

              <div class="slider-item">
                <span>{{ t('settings.lyricSettings.lineHeight') }}</span>
                <n-slider
                  v-model:value="config.lineHeight"
                  :step="0.1"
                  :min="1"
                  :max="3"
                  :marks="{
                    1: t('settings.lyricSettings.lineHeightMarks.compact'),
                    1.5: t('settings.lyricSettings.lineHeightMarks.default'),
                    3: t('settings.lyricSettings.lineHeightMarks.loose')
                  }"
                />
              </div>
            </div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { DEFAULT_LYRIC_CONFIG, LyricConfig } from '@/types/lyric';

const { t } = useI18n();
const config = ref<LyricConfig>({ ...DEFAULT_LYRIC_CONFIG });
const emit = defineEmits(['themeChange']);

// 显示mini播放栏开关
const showMiniPlayBar = computed({
  get: () => !config.value.hideMiniPlayBar,
  set: (value: boolean) => {
    if (value) {
      // 显示mini播放栏，隐藏普通播放栏
      config.value.hideMiniPlayBar = false;
      config.value.hidePlayBar = true;
    } else {
      // 显示普通播放栏，隐藏mini播放栏
      config.value.hideMiniPlayBar = true;
      config.value.hidePlayBar = false;
    }
  }
});

watch(
  () => config.value,
  (newConfig) => {
    updateCSSVariables(newConfig);
  },
  { deep: true }
);

watch(
  () => config.value.theme,
  (newTheme) => {
    emit('themeChange', newTheme);
  }
);

const updateCSSVariables = (config: LyricConfig) => {
  document.documentElement.style.setProperty('--lyric-font-size', `${config.fontSize}px`);
  document.documentElement.style.setProperty('--lyric-letter-spacing', `${config.letterSpacing}px`);
  document.documentElement.style.setProperty('--lyric-line-height', config.lineHeight.toString());
};

onMounted(() => {
  const savedConfig = localStorage.getItem('music-full-config');
  if (savedConfig) {
    config.value = { ...config.value, ...JSON.parse(savedConfig) };
    updateCSSVariables(config.value);
  }
});

defineExpose({
  config
});
</script>

<style scoped lang="scss">
.settings-panel {
  @apply p-4 w-80 rounded-lg relative overflow-hidden backdrop-blur-lg bg-black/10;

  .settings-title {
    @apply text-base font-bold mb-4;
    color: var(--text-color-active);
  }

  .settings-content {
    :deep(.n-tabs-nav) {
      @apply mb-3;
    }

    :deep(.n-tab-pane) {
      @apply p-0;
    }

    :deep(.n-tabs-tab) {
      @apply text-xs;
      color: var(--text-color-primary);

      &.n-tabs-tab--active {
        color: var(--text-color-active);
      }
    }

    :deep(.n-tabs-tab-wrapper) {
      @apply pb-0;
    }

    :deep(.n-tabs-pane-wrapper) {
      @apply px-2;
    }

    :deep(.n-tabs-bar) {
      background-color: var(--text-color-active);
    }
  }

  .tab-content {
    @apply py-2;
  }

  .settings-grid {
    @apply grid grid-cols-1 gap-3;
  }

  .settings-item {
    @apply flex items-center justify-between;
    span {
      @apply text-sm;
      color: var(--text-color-primary);
    }
  }

  .section-title {
    @apply text-sm font-medium mb-2;
    color: var(--text-color-primary);
  }

  .theme-section {
    @apply mt-4;
  }

  .slider-section {
    @apply space-y-6;
  }

  .slider-item {
    @apply space-y-2 mb-10 !important;
    span {
      @apply text-sm;
      color: var(--text-color-primary);
    }
  }

  .theme-radio-group {
    @apply flex;
  }
}

:deep(.n-slider-mark) {
  color: var(--text-color-primary) !important;
}

:deep(.n-radio__label) {
  color: var(--text-color-active) !important;
  @apply text-xs;
}

.mobile-unavailable {
  @apply text-center py-4 text-gray-500 text-sm;
}
</style>

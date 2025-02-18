<template>
  <div class="settings-panel transparent-popover">
    <div class="settings-title">{{ t('lyricSettings.title') }}</div>
    <div class="settings-content">
      <div class="settings-item">
        <span>{{ t('lyricSettings.pureMode') }}</span>
        <n-switch v-model:value="config.pureModeEnabled" />
      </div>

      <div class="settings-item">
        <span>{{ t('lyricSettings.hideCover') }}</span>
        <n-switch v-model:value="config.hideCover" />
      </div>

      <div class="settings-item">
        <span>{{ t('lyricSettings.centerDisplay') }}</span>
        <n-switch v-model:value="config.centerLyrics" />
      </div>

      <div class="settings-item">
        <span>{{ t('lyricSettings.showTranslation') }}</span>
        <n-switch v-model:value="config.showTranslation" />
      </div>

      <div class="settings-item">
        <span>{{ t('lyricSettings.hidePlayBar') }}</span>
        <n-switch v-model:value="config.hidePlayBar" />
      </div>

      <div class="settings-slider">
        <span>{{ t('lyricSettings.fontSize') }}</span>
        <n-slider
          v-model:value="config.fontSize"
          :step="1"
          :min="12"
          :max="32"
          :marks="{
            12: t('lyricSettings.fontSizeMarks.small'),
            22: t('lyricSettings.fontSizeMarks.medium'),
            32: t('lyricSettings.fontSizeMarks.large')
          }"
        />
      </div>

      <div class="settings-slider">
        <span>{{ t('lyricSettings.letterSpacing') }}</span>
        <n-slider
          v-model:value="config.letterSpacing"
          :step="0.2"
          :min="-2"
          :max="10"
          :marks="{
            '-2': t('lyricSettings.letterSpacingMarks.compact'),
            0: t('lyricSettings.letterSpacingMarks.default'),
            10: t('lyricSettings.letterSpacingMarks.loose')
          }"
        />
      </div>

      <div class="settings-slider">
        <span>{{ t('lyricSettings.lineHeight') }}</span>
        <n-slider
          v-model:value="config.lineHeight"
          :step="0.1"
          :min="1"
          :max="3"
          :marks="{
            1: t('lyricSettings.lineHeightMarks.compact'),
            1.5: t('lyricSettings.lineHeightMarks.default'),
            3: t('lyricSettings.lineHeightMarks.loose')
          }"
        />
      </div>

      <div class="settings-item">
        <span>{{ t('lyricSettings.backgroundTheme') }}</span>
        <n-radio-group v-model:value="config.theme" name="theme">
          <n-radio value="default">{{ t('lyricSettings.themeOptions.default') }}</n-radio>
          <n-radio value="light">{{ t('lyricSettings.themeOptions.light') }}</n-radio>
          <n-radio value="dark">{{ t('lyricSettings.themeOptions.dark') }}</n-radio>
        </n-radio-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface LyricConfig {
  hideCover: boolean;
  centerLyrics: boolean;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  showTranslation: boolean;
  theme: 'default' | 'light' | 'dark';
  hidePlayBar: boolean;
  pureModeEnabled: boolean;
}

const config = ref<LyricConfig>({
  hideCover: false,
  centerLyrics: false,
  fontSize: 22,
  letterSpacing: 0,
  lineHeight: 2,
  showTranslation: true,
  theme: 'default',
  hidePlayBar: false,
  pureModeEnabled: false
});

const emit = defineEmits(['themeChange']);

// 监听配置变化并保存到本地存储
watch(
  () => config.value,
  (newConfig) => {
    updateCSSVariables(newConfig);
  },
  { deep: true }
);

// 监听主题变化
watch(
  () => config.value.theme,
  (newTheme) => {
    emit('themeChange', newTheme);
  }
);

// 更新 CSS 变量
const updateCSSVariables = (config: LyricConfig) => {
  document.documentElement.style.setProperty('--lyric-font-size', `${config.fontSize}px`);
  document.documentElement.style.setProperty('--lyric-letter-spacing', `${config.letterSpacing}px`);
  document.documentElement.style.setProperty('--lyric-line-height', config.lineHeight.toString());
};

// 加载保存的配置
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
  @apply p-4 w-72 rounded-lg relative overflow-hidden backdrop-blur-lg bg-black/10;
  .settings-title {
    @apply text-base font-bold mb-4;
    color: var(--text-color-active);
  }

  .settings-content {
    @apply space-y-4;
  }

  .settings-item {
    @apply flex items-center justify-between;
    span {
      @apply text-sm;
      color: var(--text-color-primary);
    }
  }

  .settings-slider {
    @apply space-y-2;
    @apply mb-10 !important;
    span {
      @apply text-sm;
      color: var(--text-color-primary);
    }
  }
}

// 修改 slider 字体颜色
:deep(.n-slider-mark) {
  color: var(--text-color-primary) !important;
}
// 修改 radio 字体颜色
:deep(.n-radio__label) {
  color: var(--text-color-active) !important;
}
</style>

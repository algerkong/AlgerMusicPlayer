<template>
  <div class="settings-panel transparent-popover">
    <div class="settings-title">页面设置</div>
    <div class="settings-content">
      <div class="settings-item">
        <span>纯净模式</span>
        <n-switch v-model:value="config.pureModeEnabled" />
      </div>

      <div class="settings-item">
        <span>隐藏封面</span>
        <n-switch v-model:value="config.hideCover" />
      </div>

      <div class="settings-item">
        <span>居中显示</span>
        <n-switch v-model:value="config.centerLyrics" />
      </div>

      <div class="settings-item">
        <span>显示翻译</span>
        <n-switch v-model:value="config.showTranslation" />
      </div>

      <div class="settings-item">
        <span>隐藏播放栏</span>
        <n-switch v-model:value="config.hidePlayBar" />
      </div>

      <div class="settings-slider">
        <span>字体大小</span>
        <n-slider
          v-model:value="config.fontSize"
          :step="1"
          :min="12"
          :max="32"
          :marks="{
            12: '小',
            22: '中',
            32: '大'
          }"
        />
      </div>

      <div class="settings-slider">
        <span>文字间距</span>
        <n-slider
          v-model:value="config.letterSpacing"
          :step="0.2"
          :min="-2"
          :max="10"
          :marks="{
            '-2': '紧凑',
            0: '默认',
            10: '宽松'
          }"
        />
      </div>

      <div class="settings-slider">
        <span>行高</span>
        <n-slider
          v-model:value="config.lineHeight"
          :step="0.1"
          :min="1"
          :max="3"
          :marks="{
            1: '紧凑',
            1.5: '默认',
            3: '宽松'
          }"
        />
      </div>

      <div class="settings-item">
        <span>背景主题</span>
        <n-radio-group v-model:value="config.theme" name="theme">
          <n-radio value="default">默认</n-radio>
          <n-radio value="light">亮色</n-radio>
          <n-radio value="dark">暗色</n-radio>
        </n-radio-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

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

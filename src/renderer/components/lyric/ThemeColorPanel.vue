<template>
  <div
    v-show="visible"
    class="theme-color-panel"
    :class="{ visible: visible, hidden: !visible }"
    @click.stop
  >
    <div class="panel-header">
      <span class="panel-title">{{ t('settings.themeColor.title') }}</span>
      <div class="close-button" @click="handleClose">
        <i class="ri-close-line"></i>
      </div>
    </div>

    <div class="panel-content">
      <!-- 横向紧凑布局 -->
      <div class="compact-layout">
        <!-- 预设颜色 -->
        <div class="preset-section">
          <div class="section-label">{{ t('settings.themeColor.presetColors') }}</div>
          <div class="preset-colors">
            <div
              v-for="color in presetColors"
              :key="color.id"
              class="color-dot"
              :class="{ active: isColorActive(color) }"
              :style="{ backgroundColor: getColorValue(color) }"
              :title="getColorName(color)"
              @click="handlePresetColorSelect(color)"
            >
              <i v-if="isColorActive(color)" class="ri-check-line"></i>
            </div>
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="divider"></div>

        <!-- 自定义颜色 -->
        <div class="custom-section">
          <div class="section-label">{{ t('settings.themeColor.customColor') }}</div>
          <div class="custom-controls">
            <div
              class="color-preview"
              :style="{ backgroundColor: currentColor }"
              @click="showColorPicker = !showColorPicker"
              :title="
                showColorPicker
                  ? t('settings.themeColor.tooltips.closeColorPicker')
                  : t('settings.themeColor.tooltips.openColorPicker')
              "
            >
              <i class="ri-palette-line"></i>
            </div>
            <input
              v-model="colorInput"
              type="text"
              class="color-input"
              :placeholder="t('settings.themeColor.placeholder')"
              @input="handleColorInput"
              @keyup.enter="handleColorInputConfirm"
            />
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="divider"></div>

        <!-- 效果预览 -->
        <div class="preview-section">
          <div class="section-label">{{ t('settings.themeColor.preview') }}</div>
          <div class="preview-text" :style="getPreviewStyle()">
            {{ t('settings.themeColor.previewText') }}
          </div>
        </div>
      </div>

      <!-- 颜色选择器（展开时显示） -->
      <div v-if="showColorPicker" class="color-picker-dropdown">
        <n-color-picker
          v-model:value="pickerColor"
          :show-alpha="false"
          :modes="['hex']"
          size="small"
          @update:value="handlePickerColorChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NColorPicker } from 'naive-ui';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  getLyricThemeColors,
  getPresetColorValue,
  type LyricThemeColor,
  optimizeColorForTheme,
  validateColor
} from '@/utils/linearColor';

interface Props {
  visible: boolean;
  currentColor: string;
  theme: 'light' | 'dark';
}

interface Emits {
  (e: 'colorChange', _color: string): void;
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  currentColor: '#1db954',
  theme: 'dark'
});

const emit = defineEmits<Emits>();

const { t } = useI18n();

// 响应式数据
const presetColors = ref<LyricThemeColor[]>(getLyricThemeColors());
const showColorPicker = ref(false);
const colorInput = ref('');
const pickerColor = ref(props.currentColor);

// 计算属性
const getColorValue = (color: LyricThemeColor): string => {
  return getPresetColorValue(color.id, props.theme);
};

const isColorActive = (color: LyricThemeColor): boolean => {
  const colorValue = getColorValue(color);
  return colorValue === props.currentColor;
};

const getColorName = (color: LyricThemeColor): string => {
  return t(`settings.themeColor.colorNames.${color.id}`) || color.name;
};

const getPreviewStyle = () => {
  const progress = 60; // 模拟60%的播放进度
  return {
    background: `linear-gradient(to right, ${props.currentColor} ${progress}%, var(--text-color) ${progress}%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontSize: '18px',
    fontWeight: '600'
  };
};

// 事件处理
const handleClose = () => {
  showColorPicker.value = false;
  emit('close');
};

const handlePresetColorSelect = (color: LyricThemeColor) => {
  const colorValue = getColorValue(color);
  const optimizedColor = optimizeColorForTheme(colorValue, props.theme);
  emit('colorChange', optimizedColor);

  // 更新输入框和选择器
  colorInput.value = optimizedColor;
  pickerColor.value = optimizedColor;
};

const handleColorInput = () => {
  if (validateColor(colorInput.value)) {
    try {
      const optimizedColor = optimizeColorForTheme(colorInput.value, props.theme);
      pickerColor.value = optimizedColor;
      emit('colorChange', optimizedColor);
    } catch (error) {
      console.error('Failed to optimize color:', error);
      // 恢复到当前有效颜色
      colorInput.value = props.currentColor;
      pickerColor.value = props.currentColor;
    }
  }
};

const handleColorInputConfirm = () => {
  if (validateColor(colorInput.value)) {
    try {
      const optimizedColor = optimizeColorForTheme(colorInput.value, props.theme);
      emit('colorChange', optimizedColor);
    } catch (error) {
      console.error('Failed to optimize color:', error);
      // 恢复到当前有效颜色
      colorInput.value = props.currentColor;
      pickerColor.value = props.currentColor;
    }
  } else {
    console.warn('Invalid color input:', colorInput.value);
    // 恢复到当前有效颜色
    colorInput.value = props.currentColor;
    pickerColor.value = props.currentColor;
  }
};

const handlePickerColorChange = (color: string) => {
  if (validateColor(color)) {
    try {
      const optimizedColor = optimizeColorForTheme(color, props.theme);
      colorInput.value = optimizedColor;
      emit('colorChange', optimizedColor);
    } catch (error) {
      console.error('Failed to optimize picker color:', error);
      // 恢复到当前有效颜色
      colorInput.value = props.currentColor;
      pickerColor.value = props.currentColor;
    }
  } else {
    console.warn('Invalid picker color:', color);
  }
};

// 监听属性变化
watch(
  () => props.currentColor,
  (newColor) => {
    colorInput.value = newColor;
    pickerColor.value = newColor;
  },
  { immediate: true }
);

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      showColorPicker.value = false;
    }
  }
);
</script>

<style scoped lang="scss">
.theme-color-panel {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  width: auto;
  min-width: 480px;
  max-width: calc(100vw - 40px);
  background: var(--control-bg);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.hidden {
    opacity: 0;
    visibility: hidden;
    transform: translateX(-50%) translateY(-10px) scale(0.95);
    pointer-events: none;
  }

  &.visible {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0) scale(1);
    pointer-events: auto;
  }

  // 小屏幕适配
  @media (max-width: 520px) {
    min-width: calc(100vw - 40px);
    left: 20px;
    transform: none;

    &.hidden {
      transform: translateY(-10px) scale(0.95);
    }

    &.visible {
      transform: translateY(0) scale(1);
    }
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  .panel-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-color);
    opacity: 0.9;
  }

  .close-button {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 6px;
    color: var(--text-color);
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #ff6b6b;
    }

    i {
      font-size: 14px;
    }
  }
}

.panel-content {
  .compact-layout {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-color);
    opacity: 0.7;
    margin-bottom: 6px;
    text-align: center;
  }

  .divider {
    width: 1px;
    height: 40px;
    background: rgba(255, 255, 255, 0.1);
  }
}

// 预设颜色区域
.preset-section {
  .preset-colors {
    display: flex;
    gap: 6px;

    .color-dot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        transform: scale(1.1);
        border-color: rgba(255, 255, 255, 0.3);
      }

      &.active {
        border-color: var(--text-color);
        box-shadow: 0 0 0 2px var(--control-bg);
      }

      i {
        color: white;
        font-size: 10px;
        text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
      }
    }
  }
}

// 自定义颜色区域
.custom-section {
  .custom-controls {
    display: flex;
    gap: 8px;
    align-items: center;

    .color-preview {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      &:hover {
        border-color: rgba(255, 255, 255, 0.4);
        transform: scale(1.05);
      }

      i {
        color: white;
        font-size: 12px;
        text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
      }
    }

    .color-input {
      width: 80px;
      height: 24px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      padding: 0 6px;
      color: var(--text-color);
      font-size: 11px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      outline: none;
      transition: all 0.2s ease;

      &:focus {
        border-color: var(--highlight-color, rgba(255, 255, 255, 0.4));
        background: rgba(255, 255, 255, 0.12);
      }

      &::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }
    }
  }
}

// 预览区域
.preview-section {
  .preview-text {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.2;
    white-space: nowrap;
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.02);
    }
  }
}

// 颜色选择器下拉
.color-picker-dropdown {
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  :deep(.n-color-picker) {
    width: 100%;
  }
}

// 小屏幕适配
@media (max-width: 520px) {
  .compact-layout {
    flex-direction: column;
    gap: 12px;

    .divider {
      width: 100%;
      height: 1px;
    }
  }

  .preset-section .preset-colors {
    justify-content: center;
  }
}
</style>

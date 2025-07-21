<template>
  <div class="eq-control">
    <div class="eq-header">
      <h3>
        {{ t('player.eq.title') }}
        <n-tag type="warning" size="small" round v-if="!isElectron">
          桌面版可用，网页端不支持
        </n-tag>
      </h3>
      <div class="eq-controls">
        <n-switch v-model:value="isEnabled" @update:value="toggleEQ">
          <template #checked>{{ t('player.eq.on') }}</template>
          <template #unchecked>{{ t('player.eq.off') }}</template>
        </n-switch>
      </div>
    </div>

    <div class="eq-presets">
      <n-scrollbar x-scrollable>
        <n-space :size="6" :wrap="false">
          <n-tag
            v-for="preset in presetOptions"
            :key="preset.value"
            :type="currentPreset === preset.value ? 'success' : 'default'"
            :bordered="false"
            size="medium"
            round
            clickable
            @click="applyPreset(preset.value)"
          >
            {{ preset.label }}
          </n-tag>
        </n-space>
      </n-scrollbar>
    </div>

    <div class="eq-sliders">
      <div v-for="freq in frequencies" :key="freq" class="eq-slider">
        <div class="freq-label">{{ formatFreq(freq) }}</div>
        <n-slider
          v-model:value="eqValues[freq.toString()]"
          :min="-12"
          :max="12"
          :step="0.1"
          vertical
          :disabled="!isEnabled"
          @update:value="updateEQ(freq.toString(), $event)"
        />
        <div class="gain-value">{{ eqValues[freq.toString()] }}dB</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { audioService } from '@/services/audioService';
import { isElectron } from '@/utils';

const { t } = useI18n();

const frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const eqValues = ref<{ [key: string]: number }>({});
const isEnabled = ref(audioService.isEQEnabled());
const currentPreset = ref(audioService.getCurrentPreset() || 'flat');

// 预设配置
const presets = {
  flat: {
    label: t('player.eq.presets.flat'),
    values: Object.fromEntries(frequencies.map((f) => [f, 0]))
  },
  pop: {
    label: t('player.eq.presets.pop'),
    values: {
      31: -1.5,
      62: 3.5,
      125: 5.5,
      250: 3.5,
      500: -0.5,
      1000: -1.5,
      2000: 1.5,
      4000: 2.5,
      8000: 2.5,
      16000: 2.5
    }
  },
  rock: {
    label: t('player.eq.presets.rock'),
    values: {
      31: 4.5,
      62: 3.5,
      125: 2,
      250: 0.5,
      500: -0.5,
      1000: -1,
      2000: 0.5,
      4000: 2,
      8000: 2.5,
      16000: 3.5
    }
  },
  classical: {
    label: t('player.eq.presets.classical'),
    values: {
      31: 3.5,
      62: 3,
      125: 2.5,
      250: 1.5,
      500: -0.5,
      1000: -1.5,
      2000: -1.5,
      4000: 0.5,
      8000: 2,
      16000: 3
    }
  },
  jazz: {
    label: t('player.eq.presets.jazz'),
    values: {
      31: 3,
      62: 2,
      125: 1.5,
      250: 2,
      500: -1,
      1000: -1.5,
      2000: -0.5,
      4000: 1,
      8000: 2.5,
      16000: 3
    }
  },
  hiphop: {
    label: t('player.eq.presets.hiphop'),
    values: {
      31: 5,
      62: 4.5,
      125: 3,
      250: 1.5,
      500: -0.5,
      1000: -1,
      2000: 0.5,
      4000: 1.5,
      8000: 2,
      16000: 2.5
    }
  },
  vocal: {
    label: t('player.eq.presets.vocal'),
    values: {
      31: -2,
      62: -1.5,
      125: -1,
      250: 0.5,
      500: 2,
      1000: 3.5,
      2000: 3,
      4000: 1.5,
      8000: 0.5,
      16000: 0
    }
  },
  dance: {
    label: t('player.eq.presets.dance'),
    values: {
      31: 4,
      62: 3.5,
      125: 2.5,
      250: 1,
      500: 0,
      1000: -0.5,
      2000: 1.5,
      4000: 2.5,
      8000: 3,
      16000: 2.5
    }
  },
  acoustic: {
    label: t('player.eq.presets.acoustic'),
    values: {
      31: 2,
      62: 1.5,
      125: 1,
      250: 1.5,
      500: 2,
      1000: 1.5,
      2000: 2,
      4000: 2.5,
      8000: 2,
      16000: 1.5
    }
  }
};

const presetOptions = Object.entries(presets).map(([value, preset]) => ({
  label: preset.label,
  value
}));

const toggleEQ = (enabled: boolean) => {
  audioService.setEQEnabled(enabled);
};

const applyPreset = (presetName: string) => {
  currentPreset.value = presetName;
  audioService.setCurrentPreset(presetName);
  const preset = presets[presetName as keyof typeof presets];
  if (preset) {
    Object.entries(preset.values).forEach(([freq, gain]) => {
      updateEQ(freq, gain);
    });
  }
};

onMounted(() => {
  // 恢复 EQ 设置
  const settings = audioService.getAllEQSettings();
  eqValues.value = settings;

  // 如果有保存的预设，应用该预设
  const savedPreset = audioService.getCurrentPreset();
  if (savedPreset && presets[savedPreset as keyof typeof presets]) {
    currentPreset.value = savedPreset;
  }
});

const updateEQ = (frequency: string, gain: number) => {
  audioService.setEQFrequencyGain(frequency, gain);
  eqValues.value = {
    ...eqValues.value,
    [frequency]: gain
  };

  // 检查当前值是否与任何预设匹配
  const currentValues = eqValues.value;
  let matchedPreset: string | null = null;

  // 检查是否与任何预设完全匹配
  Object.entries(presets).forEach(([presetName, preset]) => {
    const isMatch = Object.entries(preset.values).every(
      ([freq, value]) => Math.abs(currentValues[freq] - value) < 0.1
    );
    if (isMatch) {
      matchedPreset = presetName;
    }
  });

  // 更新当前预设状态
  if (matchedPreset !== null) {
    currentPreset.value = matchedPreset;
    audioService.setCurrentPreset(matchedPreset);
  } else if (currentPreset.value !== 'custom') {
    // 如果与任何预设都不匹配，将状态设置为自定义
    currentPreset.value = 'custom';
    audioService.setCurrentPreset('custom');
  }
};

const formatFreq = (freq: number) => {
  if (freq >= 1000) {
    return `${freq / 1000}kHz`;
  }
  return `${freq}Hz`;
};
</script>

<style lang="scss" scoped>
.eq-control {
  @apply p-6 rounded-lg;
  @apply bg-light dark:bg-dark;
  width: 100%;
  max-width: 700px;

  .eq-header {
    @apply flex justify-between items-center mb-4;

    h3 {
      @apply text-xl font-semibold;
      @apply text-gray-800 dark:text-gray-200;
    }
  }

  .eq-presets {
    @apply mb-2 relative;
    height: 40px;

    :deep(.n-scrollbar) {
      @apply -mx-2 px-2;
    }

    :deep(.n-tag) {
      @apply cursor-pointer transition-all duration-200;
      text-align: center;

      &:hover {
        transform: translateY(-2px);
      }
    }

    :deep(.n-space) {
      flex-wrap: nowrap;
      padding: 4px 0;
    }
  }

  .eq-sliders {
    @apply flex justify-between items-end;
    @apply bg-gray-50 dark:bg-gray-800 gap-1;
    @apply rounded-lg p-2;
    height: 300px;

    .eq-slider {
      @apply flex flex-col items-center;
      width: 45px;
      height: 100%;

      .n-slider {
        flex: 1;
        margin: 12px 0;
        min-height: 180px;
      }

      .freq-label {
        @apply text-xs font-medium text-center;
        @apply text-gray-600 dark:text-gray-400;
        white-space: nowrap;
        margin: 8px 0;
        height: 20px;
      }

      .gain-value {
        @apply text-xs font-medium text-center;
        @apply text-gray-600 dark:text-gray-400;
        white-space: nowrap;
        margin: 4px 0;
        height: 16px;
      }
    }
  }
}

:deep(.n-slider) {
  --n-rail-height: 4px;
  --n-rail-color: theme('colors.gray.200');
  --n-rail-color-hover: theme('colors.gray.300');
  --n-fill-color: theme('colors.green.500');
  --n-fill-color-hover: theme('colors.green.600');
  --n-handle-color: theme('colors.green.500');
  --n-handle-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .n-slider-handle {
    @apply transition-all duration-200;
    &:hover {
      transform: scale(1.2);
    }
  }
}
</style>

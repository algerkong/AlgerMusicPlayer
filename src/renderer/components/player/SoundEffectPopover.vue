<template>
  <n-tooltip trigger="hover" :z-index="9999999">
    <template #trigger>
      <div class="fx-btn" @click="open">
        <i class="ri-sound-module-line"></i>
      </div>
    </template>
    音效
  </n-tooltip>

  <n-modal v-model:show="show" :mask-closable="true" :unstable-show-mask="false" :z-index="9999999">
    <div class="fx-panel chrome-surface-strong">
      <div class="fx-head">
        <h3>音效</h3>
        <button type="button" class="fx-close" @click="show = false">
          <i class="ri-close-line" />
        </button>
      </div>

      <p class="fx-hint">预设音效（控件占位，逻辑稍后接入）</p>
      <div class="fx-grid">
        <button
          v-for="item in presets"
          :key="item.key"
          type="button"
          class="fx-chip"
          :class="{ 'fx-chip--on': active === item.key }"
          @click="active = item.key"
        >
          {{ item.label }}
        </button>
      </div>

      <!-- 输出设备：默认走系统，可选二级切换 -->
      <div class="fx-device">
        <div class="fx-device-head">
          <span class="fx-device-title">{{ t('settings.playback.audioDevice') }}</span>
          <button
            type="button"
            class="fx-icon-btn"
            :disabled="isLoading"
            :title="t('settings.playback.selectAudioDevice')"
            @click="handleRefresh"
          >
            <i class="ri-refresh-line" :class="{ 'fx-spin': isLoading }" />
          </button>
        </div>
        <n-select
          size="small"
          :value="playerStore.audioOutputDeviceId"
          :options="deviceOptions"
          :loading="isLoading"
          :placeholder="t('settings.playback.selectAudioDevice')"
          @update:value="handleDeviceChange"
        />
      </div>
    </div>
  </n-modal>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { usePlayerCoreStore } from '@/store/modules/playerCore';

const { t } = useI18n();
const playerStore = usePlayerCoreStore();

const show = ref(false);
const active = ref('none');
const isLoading = ref(false);

const presets = [
  { key: 'none', label: '关闭' },
  { key: '3d', label: '3D 环绕' },
  { key: 'bass', label: '超重低音' },
  { key: 'vocal', label: '人声增强' },
  { key: 'clear', label: '清澈人声' },
  { key: 'live', label: '现场' }
];

const deviceOptions = computed(() => {
  const systemLabel = t('settings.playback.systemDefault');
  const list = playerStore.availableAudioDevices.map((d) => ({
    label: d.isDefault || d.deviceId === 'default' || d.deviceId === '' ? systemLabel : d.label,
    value: d.deviceId || 'default'
  }));

  // 始终保留「系统默认」入口
  if (!list.some((d) => d.value === 'default' || d.value === '')) {
    list.unshift({ label: systemLabel, value: 'default' });
  }
  return list;
});

const handleRefresh = async () => {
  isLoading.value = true;
  try {
    await playerStore.refreshAudioDevices();
  } finally {
    isLoading.value = false;
  }
};

const handleDeviceChange = async (deviceId: string) => {
  isLoading.value = true;
  try {
    await playerStore.setAudioOutputDevice(deviceId || 'default');
  } finally {
    isLoading.value = false;
  }
};

const open = async () => {
  show.value = true;
  await handleRefresh();
};
</script>

<style scoped>
.fx-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  cursor: pointer;
  transition: color 0.15s;
}
.fx-btn:hover {
  color: var(--primary-color, #22c55e);
}

.fx-panel {
  position: relative;
  min-width: 320px;
  max-width: 92vw;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}

.fx-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.fx-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.fx-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
}
.fx-close:hover {
  color: var(--primary-color, #22c55e);
  background: rgba(0, 0, 0, 0.05);
}

.fx-hint {
  margin: 0 0 14px;
  font-size: 12px;
  color: var(--chrome-text-muted, #6b7280);
}

.fx-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.fx-chip {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--chrome-border, rgba(0, 0, 0, 0.08));
  background: var(--chrome-surface, rgba(255, 255, 255, 0.5));
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.fx-chip--on {
  border-color: var(--primary-color, #22c55e);
  color: var(--primary-color, #22c55e);
  background: rgba(34, 197, 94, 0.12);
}

.fx-device {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--chrome-border, rgba(0, 0, 0, 0.08));
}

.fx-device-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.fx-device-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--chrome-text, inherit);
}

.fx-icon-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
}
.fx-icon-btn:hover:not(:disabled) {
  color: var(--primary-color, #22c55e);
  background: rgba(0, 0, 0, 0.05);
}
.fx-icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fx-spin {
  animation: fx-spin 0.8s linear infinite;
}
@keyframes fx-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<template>
  <!-- 音效：先放控件占位，后续接汽水/本地音效引擎 -->
  <n-tooltip trigger="hover" :z-index="9999999">
    <template #trigger>
      <div class="fx-btn" @click="show = true">
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
    </div>
  </n-modal>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const show = ref(false);
const active = ref('none');

const presets = [
  { key: 'none', label: '关闭' },
  { key: '3d', label: '3D 环绕' },
  { key: 'bass', label: '超重低音' },
  { key: 'vocal', label: '人声增强' },
  { key: 'clear', label: '清澈人声' },
  { key: 'live', label: '现场' }
];
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
  color: #22c55e;
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
  color: #22c55e;
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
  border-color: #22c55e;
  color: #16a34a;
  background: rgba(34, 197, 94, 0.12);
}
</style>

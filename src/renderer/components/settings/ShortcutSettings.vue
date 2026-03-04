<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    class="shortcut-modal"
    :show-icon="false"
    :title="t('settings.shortcutSettings.title')"
    style="width: min(980px, 94vw)"
  >
    <div class="shortcut-panel">
      <div class="shortcut-panel__header">
        <div>
          <p class="shortcut-panel__summary">{{ summaryText }}</p>
        </div>
        <n-tag type="info" size="small" class="shortcut-count-tag">
          {{ t('settings.shortcutSettings.enabledCount') }}: {{ enabledCount }}
        </n-tag>
      </div>

      <div class="shortcut-panel__toolbar">
        <n-space>
          <n-button
            round
            size="small"
            class="toolbar-btn toolbar-btn--neutral"
            @click="resetShortcuts"
          >
            {{ t('settings.shortcutSettings.resetShortcuts') }}
          </n-button>
          <n-button
            round
            size="small"
            class="toolbar-btn toolbar-btn--danger"
            @click="disableAllShortcuts"
          >
            {{ t('settings.shortcutSettings.disableAll') }}
          </n-button>
          <n-button
            round
            size="small"
            class="toolbar-btn toolbar-btn--success"
            @click="enableAllShortcuts"
          >
            {{ t('settings.shortcutSettings.enableAll') }}
          </n-button>
        </n-space>
        <span class="shortcut-panel__tips">{{ t('settings.shortcutSettings.recordingTip') }}</span>
      </div>

      <n-alert
        v-if="registrationFailures.length"
        class="mb-3"
        type="warning"
        :title="t('settings.shortcutSettings.registrationWarningTitle')"
      >
        <div class="shortcut-warning-list">
          <div v-for="item in registrationFailures" :key="`failure-${item.action}-${item.key}`">
            {{ getShortcutLabel(item.action) }}: {{ formatShortcut(item.key) }} ({{
              getRegistrationFailureLabel(item.reason)
            }})
          </div>
        </div>
      </n-alert>

      <div class="shortcut-panel__content">
        <n-scrollbar class="shortcut-scrollbar">
          <div v-for="section in shortcutSections" :key="section.key" class="shortcut-section">
            <div class="shortcut-section__title">{{ section.title }}</div>

            <div
              v-for="action in section.actions"
              :key="action"
              class="shortcut-row"
              :class="{ 'shortcut-row--error': shortcutIssueMap.has(action) }"
            >
              <div class="shortcut-row__info">
                <div class="shortcut-row__name">{{ getShortcutLabel(action) }}</div>
                <div class="shortcut-row__desc">{{ getShortcutDescription(action) }}</div>
              </div>

              <div class="shortcut-row__editor">
                <button
                  :ref="(el) => setRecorderRef(action, el as HTMLButtonElement | null)"
                  type="button"
                  class="shortcut-recorder"
                  :class="{ 'shortcut-recorder--recording': recordingAction === action }"
                  @click="startRecording(action)"
                  @keydown="(event) => handleRecorderKeydown(event, action)"
                  @blur="() => handleRecorderBlur(action)"
                >
                  <span class="shortcut-recorder__value">{{
                    formatShortcut(draftShortcuts[action].key)
                  }}</span>
                  <span class="shortcut-recorder__hint">
                    {{
                      recordingAction === action
                        ? t('settings.shortcutSettings.recording')
                        : t('settings.shortcutSettings.clickToRecord')
                    }}
                  </span>
                </button>

                <n-button size="tiny" quaternary @click="resetSingleShortcut(action)">
                  {{ t('settings.shortcutSettings.restoreSingle') }}
                </n-button>
              </div>

              <div class="shortcut-row__controls">
                <n-switch v-model:value="draftShortcuts[action].enabled" size="small" />
                <n-select
                  v-model:value="draftShortcuts[action].scope"
                  size="small"
                  :options="scopeOptions"
                  :disabled="!draftShortcuts[action].enabled"
                  class="w-28"
                />
              </div>

              <div class="shortcut-row__status">
                <n-tag v-if="shortcutIssueMap.has(action)" type="error" size="small">
                  {{ getIssueLabel(action) }}
                </n-tag>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </div>

      <div class="shortcut-panel__footer">
        <n-space justify="end">
          <n-button round class="footer-btn footer-btn--cancel" @click="handleCancel">
            {{ t('common.cancel') }}
          </n-button>
          <n-button
            round
            class="footer-btn footer-btn--primary"
            :loading="saving"
            :disabled="hasLocalBlockingIssue"
            @click="handleSave"
          >
            {{ t('common.save') }}
          </n-button>
        </n-space>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { cloneDeep } from 'lodash';
import { useMessage } from 'naive-ui';
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { isElectron } from '@/utils';
import { setAppShortcutsSuspended } from '@/utils/appShortcuts';
import { keyboardEventToAccelerator } from '@/utils/shortcutKeyboard';

import {
  createDefaultShortcuts,
  formatShortcutForDisplay,
  getReservedAccelerators,
  getShortcutConflicts,
  isModifierOnlyShortcut,
  normalizeShortcutAccelerator,
  normalizeShortcutsConfig,
  type ShortcutAction,
  shortcutGroups,
  type ShortcutPlatform,
  type ShortcutsConfig,
  type ShortcutScope
} from '../../../shared/shortcuts';

type ShortcutValidationIssueReason = 'invalid' | 'conflict' | 'reserved';

type ShortcutValidationIssuePayload = {
  action: ShortcutAction;
  key: string;
  scope: ShortcutScope;
  reason: ShortcutValidationIssueReason;
  conflictWith?: ShortcutAction;
};

type ShortcutRegistrationFailureReason = 'invalid' | 'occupied';

type ShortcutRegistrationFailurePayload = {
  action: ShortcutAction;
  key: string;
  reason: ShortcutRegistrationFailureReason;
};

type ShortcutSaveResult = {
  ok: boolean;
  validation: {
    shortcuts: ShortcutsConfig;
    hasBlockingIssue: boolean;
    issues: ShortcutValidationIssuePayload[];
  };
  registration: {
    success: boolean;
    failed: ShortcutRegistrationFailurePayload[];
  };
};

const props = defineProps<{
  show?: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void;
  (event: 'change', value: ShortcutsConfig): void;
}>();

const { t } = useI18n();
const message = useMessage();

const visible = ref(false);
const saving = ref(false);
const platform = ref<ShortcutPlatform>('web');
const recordingAction = ref<ShortcutAction | null>(null);
const serverIssues = ref<ShortcutValidationIssuePayload[]>([]);
const registrationFailures = ref<ShortcutRegistrationFailurePayload[]>([]);

const defaultShortcuts = createDefaultShortcuts();

const storedShortcuts = ref<ShortcutsConfig>(cloneDeep(defaultShortcuts));
const draftShortcuts = ref<ShortcutsConfig>(cloneDeep(defaultShortcuts));

const recorderRefs = ref<Record<ShortcutAction, HTMLButtonElement | null>>({
  togglePlay: null,
  prevPlay: null,
  nextPlay: null,
  volumeUp: null,
  volumeDown: null,
  toggleFavorite: null,
  toggleWindow: null
});

const scopeOptions = computed(() => [
  { label: t('settings.shortcutSettings.scopeGlobal'), value: 'global' },
  { label: t('settings.shortcutSettings.scopeApp'), value: 'app' }
]);

const shortcutSections = computed(() => [
  {
    key: 'playback',
    title: t('settings.shortcutSettings.groups.playback'),
    actions: shortcutGroups.playback
  },
  {
    key: 'sound',
    title: t('settings.shortcutSettings.groups.sound'),
    actions: shortcutGroups.sound
  },
  {
    key: 'window',
    title: t('settings.shortcutSettings.groups.window'),
    actions: shortcutGroups.window
  }
]);

const conflictIssueMap = computed(() => {
  const map = new Map<ShortcutAction, ShortcutValidationIssuePayload>();

  getShortcutConflicts(draftShortcuts.value).forEach((conflict) => {
    conflict.actions.forEach((action, index) => {
      const conflictWith = conflict.actions[(index + 1) % conflict.actions.length];
      map.set(action, {
        action,
        key: conflict.key,
        scope: conflict.scope,
        reason: 'conflict',
        conflictWith
      });
    });
  });

  return map;
});

const invalidIssueMap = computed(() => {
  const map = new Map<ShortcutAction, ShortcutValidationIssuePayload>();

  Object.entries(draftShortcuts.value).forEach(([action, config]) => {
    const shortcutAction = action as ShortcutAction;
    if (!config.enabled) {
      return;
    }

    const normalizedKey = normalizeShortcutAccelerator(config.key);
    if (!normalizedKey || isModifierOnlyShortcut(config.key)) {
      map.set(shortcutAction, {
        action: shortcutAction,
        key: config.key,
        scope: config.scope,
        reason: 'invalid'
      });
    }
  });

  return map;
});

const reservedIssueMap = computed(() => {
  const map = new Map<ShortcutAction, ShortcutValidationIssuePayload>();
  const reservedAccelerators = new Set(getReservedAccelerators(platform.value));

  Object.entries(draftShortcuts.value).forEach(([action, config]) => {
    const shortcutAction = action as ShortcutAction;
    if (!config.enabled || config.scope !== 'global') {
      return;
    }

    const normalizedKey = normalizeShortcutAccelerator(config.key);
    if (normalizedKey && reservedAccelerators.has(normalizedKey)) {
      map.set(shortcutAction, {
        action: shortcutAction,
        key: normalizedKey,
        scope: config.scope,
        reason: 'reserved'
      });
    }
  });

  return map;
});

const localIssueMap = computed(() => {
  const map = new Map<ShortcutAction, ShortcutValidationIssuePayload>();

  invalidIssueMap.value.forEach((issue, action) => {
    map.set(action, issue);
  });

  conflictIssueMap.value.forEach((issue, action) => {
    if (!map.has(action)) {
      map.set(action, issue);
    }
  });

  reservedIssueMap.value.forEach((issue, action) => {
    if (!map.has(action)) {
      map.set(action, issue);
    }
  });

  return map;
});

const shortcutIssueMap = computed(() => {
  const map = new Map<ShortcutAction, ShortcutValidationIssuePayload>();

  localIssueMap.value.forEach((issue, action) => {
    map.set(action, issue);
  });

  serverIssues.value.forEach((issue) => {
    if (!map.has(issue.action)) {
      map.set(issue.action, issue);
    }
  });

  return map;
});

const hasLocalBlockingIssue = computed(() => localIssueMap.value.size > 0);

const enabledCount = computed(() => {
  return Object.values(draftShortcuts.value).filter((item) => item.enabled).length;
});

const summaryText = computed(() => {
  if (hasLocalBlockingIssue.value) {
    return t('settings.shortcutSettings.summaryBlocked');
  }

  if (recordingAction.value) {
    return t('settings.shortcutSettings.summaryRecording');
  }

  return t('settings.shortcutSettings.summaryReady');
});

watch(
  () => props.show,
  (newValue) => {
    const nextVisible = Boolean(newValue);
    if (nextVisible !== visible.value) {
      visible.value = nextVisible;
    }
  },
  { immediate: true }
);

watch(visible, (newValue, oldValue) => {
  emit('update:show', newValue);

  if (newValue === oldValue) {
    return;
  }

  if (newValue) {
    void handleOpen();
    return;
  }

  handleClose();
});

watch(
  draftShortcuts,
  () => {
    serverIssues.value = [];
    registrationFailures.value = [];
  },
  { deep: true }
);

function setRecorderRef(action: ShortcutAction, element: HTMLButtonElement | null) {
  recorderRefs.value[action] = element;
}

function getShortcutLabel(action: ShortcutAction) {
  const labels: Record<ShortcutAction, string> = {
    togglePlay: t('settings.shortcutSettings.togglePlay'),
    prevPlay: t('settings.shortcutSettings.prevPlay'),
    nextPlay: t('settings.shortcutSettings.nextPlay'),
    volumeUp: t('settings.shortcutSettings.volumeUp'),
    volumeDown: t('settings.shortcutSettings.volumeDown'),
    toggleFavorite: t('settings.shortcutSettings.toggleFavorite'),
    toggleWindow: t('settings.shortcutSettings.toggleWindow')
  };

  return labels[action];
}

function getShortcutDescription(action: ShortcutAction) {
  const descriptions: Record<ShortcutAction, string> = {
    togglePlay: t('settings.shortcutSettings.togglePlayDesc'),
    prevPlay: t('settings.shortcutSettings.prevPlayDesc'),
    nextPlay: t('settings.shortcutSettings.nextPlayDesc'),
    volumeUp: t('settings.shortcutSettings.volumeUpDesc'),
    volumeDown: t('settings.shortcutSettings.volumeDownDesc'),
    toggleFavorite: t('settings.shortcutSettings.toggleFavoriteDesc'),
    toggleWindow: t('settings.shortcutSettings.toggleWindowDesc')
  };

  return descriptions[action];
}

function getIssueLabel(action: ShortcutAction) {
  const issue = shortcutIssueMap.value.get(action);
  if (!issue) {
    return '';
  }

  if (issue.reason === 'invalid') {
    return t('settings.shortcutSettings.issueInvalid');
  }

  if (issue.reason === 'reserved') {
    return t('settings.shortcutSettings.issueReserved');
  }

  return t('settings.shortcutSettings.shortcutConflict');
}

function getRegistrationFailureLabel(reason: ShortcutRegistrationFailureReason) {
  return reason === 'occupied'
    ? t('settings.shortcutSettings.registrationOccupied')
    : t('settings.shortcutSettings.registrationInvalid');
}

function formatShortcut(shortcut: string) {
  return formatShortcutForDisplay(shortcut, platform.value);
}

function stopRecording() {
  recordingAction.value = null;
}

function startRecording(action: ShortcutAction) {
  recordingAction.value = action;

  nextTick(() => {
    recorderRefs.value[action]?.focus();
  });
}

function handleRecorderBlur(action: ShortcutAction) {
  if (recordingAction.value === action) {
    stopRecording();
  }
}

function handleRecorderKeydown(event: KeyboardEvent, action: ShortcutAction) {
  if (recordingAction.value !== action) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (event.key === 'Escape') {
    stopRecording();
    return;
  }

  if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
    stopRecording();
    return;
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    draftShortcuts.value[action].enabled = false;
    stopRecording();
    message.info(t('settings.shortcutSettings.messages.clearToDisable'));
    return;
  }

  const accelerator = keyboardEventToAccelerator(event);
  if (!accelerator || isModifierOnlyShortcut(accelerator)) {
    message.warning(t('settings.shortcutSettings.messages.invalidShortcut'));
    return;
  }

  draftShortcuts.value[action].key = accelerator;
  draftShortcuts.value[action].enabled = true;
  stopRecording();
}

function resetShortcuts() {
  draftShortcuts.value = cloneDeep(defaultShortcuts);
  message.success(t('settings.shortcutSettings.messages.resetSuccess'));
}

function resetSingleShortcut(action: ShortcutAction) {
  draftShortcuts.value[action] = cloneDeep(defaultShortcuts[action]);
}

function disableAllShortcuts() {
  Object.values(draftShortcuts.value).forEach((shortcut) => {
    shortcut.enabled = false;
  });
  message.info(t('settings.shortcutSettings.messages.disableAll'));
}

function enableAllShortcuts() {
  Object.values(draftShortcuts.value).forEach((shortcut) => {
    shortcut.enabled = true;
  });
  message.info(t('settings.shortcutSettings.messages.enableAll'));
}

async function loadShortcutsFromMain() {
  if (!isElectron) {
    const defaults = createDefaultShortcuts();
    storedShortcuts.value = cloneDeep(defaults);
    draftShortcuts.value = cloneDeep(defaults);
    return;
  }

  const platformValue = window.electron.ipcRenderer.sendSync('get-platform');
  if (platformValue === 'darwin' || platformValue === 'win32' || platformValue === 'linux') {
    platform.value = platformValue;
  }

  try {
    const shortcuts = await window.electron.ipcRenderer.invoke('shortcuts:get-config');
    const normalized = normalizeShortcutsConfig(shortcuts);
    storedShortcuts.value = cloneDeep(normalized);
    draftShortcuts.value = cloneDeep(normalized);
    return;
  } catch (error) {
    console.error('[ShortcutSettings] 获取快捷键配置失败:', error);
  }

  const stored = window.electron.ipcRenderer.sendSync('get-store-value', 'shortcuts');
  const normalized = normalizeShortcutsConfig(stored);
  storedShortcuts.value = cloneDeep(normalized);
  draftShortcuts.value = cloneDeep(normalized);
}

async function handleOpen() {
  serverIssues.value = [];
  registrationFailures.value = [];
  stopRecording();

  if (isElectron) {
    setAppShortcutsSuspended(true);
    window.electron.ipcRenderer.send('disable-shortcuts');
  }

  await loadShortcutsFromMain();
}

function resumeShortcutRuntime() {
  setAppShortcutsSuspended(false);

  if (isElectron) {
    window.electron.ipcRenderer.send('enable-shortcuts');
  }
}

function handleClose() {
  stopRecording();
  draftShortcuts.value = cloneDeep(storedShortcuts.value);
  resumeShortcutRuntime();
}

async function handleSave() {
  if (hasLocalBlockingIssue.value) {
    message.error(t('settings.shortcutSettings.messages.saveValidationError'));
    return;
  }

  saving.value = true;

  try {
    const shortcutsPayload = normalizeShortcutsConfig(
      JSON.parse(JSON.stringify(draftShortcuts.value)) as ShortcutsConfig
    );

    if (!isElectron) {
      storedShortcuts.value = cloneDeep(shortcutsPayload);
      message.success(t('settings.shortcutSettings.messages.saveSuccess'));
      emit('change', storedShortcuts.value);
      visible.value = false;
      return;
    }

    const result = (await window.electron.ipcRenderer.invoke(
      'shortcuts:save',
      shortcutsPayload
    )) as ShortcutSaveResult;

    if (!result?.ok) {
      serverIssues.value = result?.validation?.issues ?? [];
      message.error(t('settings.shortcutSettings.messages.saveValidationError'));
      return;
    }

    const normalizedShortcuts = normalizeShortcutsConfig(result.validation.shortcuts);
    storedShortcuts.value = cloneDeep(normalizedShortcuts);
    draftShortcuts.value = cloneDeep(normalizedShortcuts);
    emit('change', normalizedShortcuts);

    registrationFailures.value = result.registration.failed ?? [];
    if (registrationFailures.value.length > 0) {
      message.warning(t('settings.shortcutSettings.messages.partialRegistered'));
      return;
    }

    message.success(t('settings.shortcutSettings.messages.saveSuccess'));
    visible.value = false;
  } catch (error) {
    console.error('[ShortcutSettings] 保存快捷键失败:', error);
    message.error(t('settings.shortcutSettings.messages.saveError'));
  } finally {
    saving.value = false;
  }
}

function handleCancel() {
  visible.value = false;
}

onUnmounted(() => {
  resumeShortcutRuntime();
});
</script>

<style lang="scss" scoped>
:deep(.shortcut-modal .n-card) {
  border-radius: 22px;
  max-height: min(86vh, 920px);
  overflow: hidden;
}

:deep(.shortcut-modal .n-card-header) {
  padding: 18px 22px 12px;
  border-bottom: 1px solid #e5e7eb;
}

:deep(.shortcut-modal .n-card-header .n-card-header__main) {
  font-size: 19px;
  font-weight: 700;
  color: #111827;
}

:deep(.shortcut-modal .n-card__content) {
  padding: 14px 18px 18px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.shortcut-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: min(72vh, 740px);
  max-height: calc(100vh - 180px);
}

.shortcut-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9)),
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.08), transparent 40%);
  gap: 12px;
  margin-bottom: 12px;
}

.shortcut-panel__summary {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.shortcut-panel__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.shortcut-panel__tips {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.4;
}

.shortcut-panel__content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #f8fafc;
}

.shortcut-scrollbar {
  height: 100%;
}

:deep(.shortcut-scrollbar .n-scrollbar-content) {
  padding: 12px;
}

.shortcut-section {
  border: 1px solid #dbe2ea;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 12px 24px -22px rgba(15, 23, 42, 0.55);
}

.shortcut-section:last-child {
  margin-bottom: 0;
}

.shortcut-section__title {
  padding: 10px 13px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #334155;
  background: linear-gradient(90deg, rgba(226, 232, 240, 0.9), rgba(241, 245, 249, 0.65));
  border-bottom: 1px solid #e2e8f0;
}

.shortcut-row {
  display: grid;
  grid-template-columns: minmax(170px, 1fr) minmax(280px, 1.35fr) 170px auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-bottom: 1px dashed #e2e8f0;
}

.shortcut-row:last-child {
  border-bottom: none;
}

.shortcut-row--error {
  background: linear-gradient(90deg, rgba(254, 242, 242, 0.92), rgba(255, 247, 237, 0.76));
}

.shortcut-row__name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.shortcut-row__desc {
  margin-top: 2px;
  font-size: 12px;
  color: #6b7280;
}

.shortcut-row__editor {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shortcut-recorder {
  width: 100%;
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: #ffffff;
  text-align: left;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.shortcut-recorder:hover,
.shortcut-recorder:focus-visible {
  border-color: #14b8a6;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
  outline: none;
}

.shortcut-recorder--recording {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.shortcut-recorder__value {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.shortcut-recorder__hint {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #6b7280;
}

.shortcut-row__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shortcut-row__status {
  min-width: 96px;
  display: flex;
  justify-content: flex-end;
}

.shortcut-panel__footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.shortcut-warning-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

:deep(.shortcut-count-tag) {
  border-radius: 999px;
}

:deep(.toolbar-btn.n-button),
:deep(.footer-btn.n-button) {
  border: none;
  font-weight: 600;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

:deep(.toolbar-btn.n-button:hover),
:deep(.footer-btn.n-button:hover) {
  transform: translateY(-1px);
}

:deep(.toolbar-btn .n-button__border),
:deep(.toolbar-btn .n-button__state-border),
:deep(.footer-btn .n-button__border),
:deep(.footer-btn .n-button__state-border) {
  display: none;
}

:deep(.toolbar-btn--neutral.n-button) {
  color: #1f2937;
  background: #e5e7eb;
}

:deep(.toolbar-btn--neutral.n-button:hover) {
  background: #d1d5db;
}

:deep(.toolbar-btn--danger.n-button) {
  color: #fff;
  background: #ef4444;
  box-shadow: 0 10px 20px -14px rgba(239, 68, 68, 0.75);
}

:deep(.toolbar-btn--danger.n-button:hover) {
  background: #dc2626;
  box-shadow: 0 14px 28px -16px rgba(239, 68, 68, 0.8);
}

:deep(.toolbar-btn--success.n-button) {
  color: #fff;
  background: #10b981;
  box-shadow: 0 10px 20px -14px rgba(20, 184, 166, 0.75);
}

:deep(.toolbar-btn--success.n-button:hover) {
  background: #059669;
  box-shadow: 0 14px 28px -16px rgba(20, 184, 166, 0.8);
}

:deep(.footer-btn--cancel.n-button) {
  color: #334155;
  background: #e2e8f0;
}

:deep(.footer-btn--cancel.n-button:hover) {
  background: #cbd5e1;
}

:deep(.footer-btn--primary.n-button) {
  color: #fff;
  background: #059669;
  box-shadow: 0 14px 24px -18px rgba(5, 150, 105, 0.9);
}

:deep(.footer-btn--primary.n-button:hover) {
  background: #047857;
  box-shadow: 0 20px 30px -18px rgba(5, 150, 105, 0.9);
}

:deep(.footer-btn--primary.n-button.n-button--disabled) {
  color: #d1fae5;
  background: #9ca3af;
  box-shadow: none;
}

:deep(.dark) .shortcut-panel__summary {
  color: #f9fafb;
}

:deep(.dark) .shortcut-panel__tips {
  color: #9ca3af;
}

:deep(.dark) .shortcut-modal .n-card {
  background: #0f172a;
}

:deep(.dark) .shortcut-modal .n-card-header {
  border-bottom-color: #334155;
}

:deep(.dark) .shortcut-modal .n-card-header .n-card-header__main {
  color: #f8fafc;
}

:deep(.dark) .shortcut-modal .n-card__content {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.9));
}

:deep(.dark) .shortcut-panel__header {
  border-color: #334155;
  background:
    linear-gradient(160deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.88)),
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.24), transparent 45%);
}

:deep(.dark) .shortcut-panel__content {
  border-color: #334155;
  background: #0b1221;
}

:deep(.dark) .shortcut-section {
  border-color: #334155;
  background: linear-gradient(180deg, #111827, #0f172a);
}

:deep(.dark) .shortcut-section__title {
  color: #cbd5e1;
  background: linear-gradient(90deg, rgba(51, 65, 85, 0.75), rgba(30, 41, 59, 0.68));
  border-bottom-color: #334155;
}

:deep(.dark) .shortcut-row {
  border-bottom-color: #334155;
}

:deep(.dark) .shortcut-row--error {
  background: linear-gradient(90deg, rgba(127, 29, 29, 0.28), rgba(154, 52, 18, 0.2));
}

:deep(.dark) .shortcut-row__name,
:deep(.dark) .shortcut-recorder__value {
  color: #f9fafb;
}

:deep(.dark) .shortcut-row__desc,
:deep(.dark) .shortcut-recorder__hint {
  color: #9ca3af;
}

:deep(.dark) .shortcut-recorder {
  border-color: #4b5563;
  background: #0f172a;
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.07);
}

:deep(.dark) .shortcut-panel__footer {
  border-top-color: #334155;
}

:deep(.dark) .toolbar-btn--neutral.n-button {
  color: #e2e8f0;
  background: #334155;
}

:deep(.dark) .toolbar-btn--neutral.n-button:hover {
  background: #475569;
}

:deep(.dark) .footer-btn--cancel.n-button {
  color: #e2e8f0;
  background: #334155;
}

:deep(.dark) .footer-btn--cancel.n-button:hover {
  background: #475569;
}

:deep(.dark) .shortcut-count-tag {
  background: rgba(16, 185, 129, 0.14);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.36);
}

:deep(.dark) .footer-btn--primary.n-button.n-button--disabled {
  color: #cbd5e1;
  background: #475569;
}

@media (max-width: 900px) {
  .shortcut-panel {
    height: min(76vh, 690px);
    max-height: calc(100vh - 128px);
  }

  .shortcut-panel__toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .shortcut-panel__tips {
    font-size: 11px;
  }

  .shortcut-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .shortcut-row__status {
    justify-content: flex-start;
  }
}

@media (max-height: 760px) {
  .shortcut-panel {
    height: calc(100vh - 120px);
    max-height: calc(100vh - 120px);
  }
}
</style>

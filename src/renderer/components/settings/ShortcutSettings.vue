<template>
  <n-modal
    v-model:show="visible"
    preset="dialog"
    title="快捷键设置"
    :show-icon="false"
    style="width: 600px"
    @after-leave="handleAfterLeave"
  >
    <div class="shortcut-settings">
      <div class="shortcut-card">
        <div class="shortcut-content">
          <n-scrollbar>
            <n-space vertical>
              <div v-for="(shortcut, key) in tempShortcuts" :key="key" class="shortcut-item">
                <div class="shortcut-info">
                  <span class="shortcut-label">{{ getShortcutLabel(key) }}</span>
                </div>
                <div class="shortcut-input">
                  <n-input
                    :value="formatShortcut(shortcut)"
                    :status="duplicateKeys[key] ? 'error' : undefined"
                    placeholder="点击输入快捷键"
                    readonly
                    @keydown="(e) => handleKeyDown(e, key)"
                    @focus="() => startRecording(key)"
                    @blur="stopRecording"
                  />
                  <n-tooltip v-if="duplicateKeys[key]" trigger="hover">
                    <template #trigger>
                      <n-icon class="error-icon" size="18">
                        <i class="ri-error-warning-line"></i>
                      </n-icon>
                    </template>
                    快捷键冲突
                  </n-tooltip>
                </div>
              </div>
            </n-space>
          </n-scrollbar>
        </div>

        <div class="shortcut-footer">
          <n-space justify="end">
            <n-button size="small" @click="handleCancel">取消</n-button>
            <n-button size="small" @click="resetShortcuts">恢复默认</n-button>
            <n-button type="primary" size="small" :disabled="hasConflict" @click="handleSave">
              保存
            </n-button>
          </n-space>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script lang="ts" setup>
import { cloneDeep } from 'lodash';
import { useMessage } from 'naive-ui';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { isElectron } from '@/utils';

interface Shortcuts {
  togglePlay: string;
  prevPlay: string;
  nextPlay: string;
  volumeUp: string;
  volumeDown: string;
  toggleFavorite: string;
  toggleWindow: string;
}

const defaultShortcuts: Shortcuts = {
  togglePlay: 'CommandOrControl+Alt+P',
  prevPlay: 'Alt+Left',
  nextPlay: 'Alt+Right',
  volumeUp: 'Alt+Up',
  volumeDown: 'Alt+Down',
  toggleFavorite: 'CommandOrControl+Alt+L',
  toggleWindow: 'CommandOrControl+Alt+Shift+M'
};

const shortcuts = ref<Shortcuts>(
  isElectron
    ? window.electron.ipcRenderer.sendSync('get-store-value', 'shortcuts') || defaultShortcuts
    : { ...defaultShortcuts }
);

// 临时存储编辑中的快捷键
const tempShortcuts = ref<Shortcuts>({ ...shortcuts.value });

// 监听快捷键更新
if (isElectron) {
  window.electron.ipcRenderer.on('shortcuts-updated', () => {
    const newShortcuts = window.electron.ipcRenderer.sendSync('get-store-value', 'shortcuts');
    if (newShortcuts) {
      shortcuts.value = newShortcuts;
      tempShortcuts.value = { ...newShortcuts };
    }
  });
}

// 组件挂载时禁用快捷键
onMounted(() => {
  if (isElectron) {
    // 禁用全局快捷键
    window.electron.ipcRenderer.send('disable-shortcuts');

    const storedShortcuts = window.electron.ipcRenderer.sendSync('get-store-value', 'shortcuts');
    console.log('storedShortcuts', storedShortcuts);
    if (storedShortcuts) {
      shortcuts.value = storedShortcuts;
      tempShortcuts.value = { ...storedShortcuts };
    } else {
      shortcuts.value = { ...defaultShortcuts };
      tempShortcuts.value = { ...defaultShortcuts };
      window.electron.ipcRenderer.send('set-store-value', 'shortcuts', defaultShortcuts);
    }
  }
});

const shortcutLabels: Record<keyof Shortcuts, string> = {
  togglePlay: '播放/暂停',
  prevPlay: '上一首',
  nextPlay: '下一首',
  volumeUp: '音量增加',
  volumeDown: '音量减少',
  toggleFavorite: '收藏/取消收藏',
  toggleWindow: '显示/隐藏窗口'
};

const getShortcutLabel = (key: keyof Shortcuts) => shortcutLabels[key];

const isRecording = ref(false);
const currentKey = ref<keyof Shortcuts | ''>('');
const message = useMessage();

// 检查快捷键冲突
const duplicateKeys = computed(() => {
  const result: Record<string, boolean> = {};
  const usedShortcuts = new Set<string>();

  Object.entries(tempShortcuts.value).forEach(([key, shortcut]) => {
    if (usedShortcuts.has(shortcut)) {
      result[key] = true;
    } else {
      usedShortcuts.add(shortcut);
    }
  });

  return result;
});

// 是否存在冲突
const hasConflict = computed(() => Object.keys(duplicateKeys.value).length > 0);

const startRecording = (key: keyof Shortcuts) => {
  isRecording.value = true;
  currentKey.value = key;
  // 禁用全局快捷键
  if (isElectron) {
    window.electron.ipcRenderer.send('disable-shortcuts');
  }
};

const stopRecording = () => {
  isRecording.value = false;
  currentKey.value = '';
  // 重新启用全局快捷键
  if (isElectron) {
    window.electron.ipcRenderer.send('enable-shortcuts');
  }
};

const handleKeyDown = (e: KeyboardEvent, key: keyof Shortcuts) => {
  if (!isRecording.value || currentKey.value !== key) return;

  e.preventDefault();
  e.stopPropagation();

  const modifiers: string[] = [];

  // 统一使用 CommandOrControl
  if (e.ctrlKey || e.metaKey) {
    modifiers.push('CommandOrControl');
  }
  if (e.altKey) modifiers.push('Alt');
  if (e.shiftKey) modifiers.push('Shift');

  let keyName = e.key;

  // 特殊按键处理
  switch (e.key) {
    case 'ArrowLeft':
      keyName = 'Left';
      break;
    case 'ArrowRight':
      keyName = 'Right';
      break;
    case 'ArrowUp':
      keyName = 'Up';
      break;
    case 'ArrowDown':
      keyName = 'Down';
      break;
    case 'Control':
    case 'Alt':
    case 'Shift':
    case 'Meta':
    case 'Command':
      return; // 忽略单独的修饰键
    default:
      keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  }

  if (!['Control', 'Alt', 'Shift', 'Meta', 'Command'].includes(keyName)) {
    tempShortcuts.value[key] = [...modifiers, keyName].join('+');
  }
};

const resetShortcuts = () => {
  tempShortcuts.value = { ...defaultShortcuts };
  message.success('已恢复默认快捷键，请记得保存');
};

const saveShortcuts = () => {
  if (hasConflict.value) {
    message.error('存在冲突的快捷键，请重新设置');
    return;
  }

  // 创建一个新的 Shortcuts 对象
  const shortcutsToSave = cloneDeep(tempShortcuts.value);

  shortcuts.value = shortcutsToSave;

  if (isElectron) {
    try {
      // 先保存到 store
      window.electron.ipcRenderer.send('set-store-value', 'shortcuts', shortcutsToSave);
      // 然后更新快捷键
      window.electron.ipcRenderer.send('update-shortcuts');
      message.success('快捷键设置已保存');
    } catch (error) {
      console.error('保存快捷键失败:', error);
      message.error('保存快捷键失败，请重试');
    }
  }
};

const cancelEdit = () => {
  tempShortcuts.value = { ...shortcuts.value };
  message.info('已取消修改');
  emit('update:show', false);
};

// 组件卸载时确保快捷键被重新启用
onUnmounted(() => {
  if (isElectron) {
    window.electron.ipcRenderer.send('enable-shortcuts');
  }
});

// 格式化快捷键显示
const formatShortcut = (shortcut: string) => {
  const isMac = isElectron
    ? window.electron.ipcRenderer.sendSync('get-platform') === 'darwin'
    : false;
  return shortcut
    .replace(/CommandOrControl/g, isMac ? '⌘' : 'Ctrl')
    .replace(/\+/g, ' + ')
    .replace(/Meta/g, isMac ? '⌘' : 'Win')
    .replace(/Control/g, isMac ? '⌃' : 'Ctrl')
    .replace(/Alt/g, isMac ? '⌥' : 'Alt')
    .replace(/Shift/g, isMac ? '⇧' : 'Shift')
    .replace(/ArrowUp/g, '↑')
    .replace(/ArrowDown/g, '↓')
    .replace(/ArrowLeft/g, '←')
    .replace(/ArrowRight/g, '→');
};

const visible = ref(false);
const emit = defineEmits(['update:show', 'change']);

// 接收外部的 show 属性
const props = defineProps<{
  show?: boolean;
}>();

// 监听 show 属性变化
watch(
  () => props.show,
  (newVal) => {
    visible.value = newVal;
  }
);

// 监听内部 visible 变化
watch(visible, (newVal) => {
  emit('update:show', newVal);
});

// 处理弹窗关闭后的事件
const handleAfterLeave = () => {
  // 重置临时数据
  tempShortcuts.value = { ...shortcuts.value };
};

// 处理取消按钮点击
const handleCancel = () => {
  visible.value = false;
  cancelEdit();
};

// 处理保存按钮点击
const handleSave = () => {
  saveShortcuts();
  visible.value = false;
  emit('change', shortcuts.value);
};
</script>

<style lang="scss" scoped>
.shortcut-settings {
  height: 500px;

  .shortcut-card {
    @apply flex flex-col h-full;

    .shortcut-footer {
      @apply p-4 border-t border-gray-100 dark:border-gray-800;
    }

    .shortcut-content {
      @apply flex-1 overflow-hidden;

      :deep(.n-scrollbar) {
        @apply h-full;

        .n-scrollbar-content {
          @apply p-4;
        }
      }
    }
  }

  .shortcut-item {
    @apply flex items-center justify-between p-3 rounded-lg transition-all mb-3;
    @apply bg-gray-50 dark:bg-gray-800;

    &:last-child {
      margin-bottom: 0;
    }

    .shortcut-info {
      @apply flex flex-col;

      .shortcut-label {
        @apply text-base font-medium;
      }
    }

    .shortcut-input {
      @apply flex items-center gap-2;
      min-width: 200px;

      :deep(.n-input) {
        .n-input__input-el {
          @apply text-center font-mono;
        }
      }

      .error-icon {
        @apply text-red-500;
      }
    }
  }
}
</style>

import { onMounted, onUnmounted } from 'vue';

import i18n from '@/../i18n/renderer';
import { audioService } from '@/services/audioService';
import { usePlayerStore, useSettingsStore } from '@/store';

import { isElectron } from '.';
import { showShortcutToast } from './shortcutToast';

interface ShortcutConfig {
  key: string;
  enabled: boolean;
  scope: 'global' | 'app';
}

interface ShortcutsConfig {
  [key: string]: ShortcutConfig;
}

const { t } = i18n.global;

// 全局存储快捷键配置
let appShortcuts: ShortcutsConfig = {};

/**
 * 处理快捷键动作
 * @param action 快捷键动作
 */
export async function handleShortcutAction(action: string) {
  const playerStore = usePlayerStore();
  const settingsStore = useSettingsStore();

  const currentSound = audioService.getCurrentSound();
  const showToast = (message: string, iconName: string) => {
    if (settingsStore.isMiniMode) {
      return;
    }
    showShortcutToast(message, iconName);
  };

  switch (action) {
    case 'togglePlay':
      if (playerStore.play) {
        await audioService.pause();
        showToast(t('player.playBar.pause'), 'ri-pause-circle-line');
      } else {
        await audioService.play();
        showToast(t('player.playBar.play'), 'ri-play-circle-line');
      }
      break;
    case 'prevPlay':
      playerStore.prevPlay();
      showToast(t('player.playBar.prev'), 'ri-skip-back-line');
      break;
    case 'nextPlay':
      playerStore.nextPlay();
      showToast(t('player.playBar.next'), 'ri-skip-forward-line');
      break;
    case 'volumeUp':
      if (currentSound && currentSound?.volume() < 1) {
        currentSound?.volume((currentSound?.volume() || 0) + 0.1);
        showToast(
          `${t('player.playBar.volume')}${Math.round((currentSound?.volume() || 0) * 100)}%`,
          'ri-volume-up-line'
        );
      }
      break;
    case 'volumeDown':
      if (currentSound && currentSound?.volume() > 0) {
        currentSound?.volume((currentSound?.volume() || 0) - 0.1);
        showToast(
          `${t('player.playBar.volume')}${Math.round((currentSound?.volume() || 0) * 100)}%`,
          'ri-volume-down-line'
        );
      }
      break;
    case 'toggleFavorite': {
      const isFavorite = playerStore.favoriteList.includes(Number(playerStore.playMusic.id));
      const numericId = Number(playerStore.playMusic.id);
      if (isFavorite) {
        playerStore.removeFromFavorite(numericId);
      } else {
        playerStore.addToFavorite(numericId);
      }
      showToast(
        isFavorite
          ? t('player.playBar.favorite', { name: playerStore.playMusic.name })
          : t('player.playBar.unFavorite', { name: playerStore.playMusic.name }),
        isFavorite ? 'ri-heart-fill' : 'ri-heart-line'
      );
      break;
    }
    default:
      console.log('未知的快捷键动作:', action);
      break;
  }
}

/**
 * 检查按键是否匹配快捷键
 * @param e KeyboardEvent
 * @param shortcutKey 快捷键字符串
 * @returns 是否匹配
 */
function matchShortcut(e: KeyboardEvent, shortcutKey: string): boolean {
  const keys = shortcutKey.split('+');
  const pressedKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;

  // 检查修饰键
  const hasCommandOrControl = keys.includes('CommandOrControl');
  const hasAlt = keys.includes('Alt');
  const hasShift = keys.includes('Shift');

  // 检查主键
  let mainKey = keys.find((k) => !['CommandOrControl', 'Alt', 'Shift'].includes(k));
  if (!mainKey) return false;

  // 处理特殊键
  if (mainKey === 'Left' && pressedKey === 'ArrowLeft') mainKey = 'ArrowLeft';
  if (mainKey === 'Right' && pressedKey === 'ArrowRight') mainKey = 'ArrowRight';
  if (mainKey === 'Up' && pressedKey === 'ArrowUp') mainKey = 'ArrowUp';
  if (mainKey === 'Down' && pressedKey === 'ArrowDown') mainKey = 'ArrowDown';

  // 检查是否所有条件都匹配
  return (
    hasCommandOrControl === (e.ctrlKey || e.metaKey) &&
    hasAlt === e.altKey &&
    hasShift === e.shiftKey &&
    mainKey === pressedKey
  );
}

/**
 * 全局键盘事件处理函数
 * @param e KeyboardEvent
 */
function handleKeyDown(e: KeyboardEvent) {
  // 如果在输入框中则不处理快捷键
  if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
    return;
  }

  Object.entries(appShortcuts).forEach(([action, config]) => {
    if (config.enabled && config.scope === 'app' && matchShortcut(e, config.key)) {
      e.preventDefault();
      handleShortcutAction(action);
    }
  });
}

/**
 * 更新应用内快捷键
 * @param shortcuts 快捷键配置
 */
export function updateAppShortcuts(shortcuts: ShortcutsConfig) {
  appShortcuts = shortcuts;
}

/**
 * 初始化应用内快捷键
 */
export function initAppShortcuts() {
  if (isElectron) {
    // 监听全局快捷键事件
    window.electron.ipcRenderer.on('global-shortcut', async (_, action: string) => {
      handleShortcutAction(action);
    });

    // 监听应用内快捷键更新
    window.electron.ipcRenderer.on('update-app-shortcuts', (_, shortcuts: ShortcutsConfig) => {
      updateAppShortcuts(shortcuts);
    });

    // 获取初始快捷键配置
    const storedShortcuts = window.electron.ipcRenderer.sendSync('get-store-value', 'shortcuts');
    if (storedShortcuts) {
      updateAppShortcuts(storedShortcuts);
    }

    // 添加键盘事件监听
    document.addEventListener('keydown', handleKeyDown);
  }
}

/**
 * 清理应用内快捷键
 */
export function cleanupAppShortcuts() {
  if (isElectron) {
    // 移除全局事件监听
    window.electron.ipcRenderer.removeAllListeners('global-shortcut');
    window.electron.ipcRenderer.removeAllListeners('update-app-shortcuts');

    // 移除键盘事件监听
    document.removeEventListener('keydown', handleKeyDown);
  }
}

/**
 * 使用应用内快捷键的组合函数
 */
export function useAppShortcuts() {
  onMounted(() => {
    initAppShortcuts();
  });

  onUnmounted(() => {
    cleanupAppShortcuts();
  });
}

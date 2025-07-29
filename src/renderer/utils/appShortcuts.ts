import { onMounted, onUnmounted } from 'vue';

import i18n from '@/../i18n/renderer';
import { audioService } from '@/services/audioService';
import { usePlayerStore, useSettingsStore } from '@/store';

import { isElectron } from '.';
import { showShortcutToast } from './shortcutToast';

// 添加一个简单的防抖机制
let actionTimeout: NodeJS.Timeout | null = null;
const ACTION_DELAY = 300; // 毫秒

// 添加一个操作锁，记录最后一次操作的时间和动作
let lastActionInfo = {
  action: '',
  timestamp: 0
};

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
  const now = Date.now();

  // 如果存在未完成的动作，则忽略当前请求
  if (actionTimeout) {
    console.log('[AppShortcuts] 忽略快速连续的动作请求:', action);
    return;
  }

  // 检查是否是同一个动作的重复触发（300ms内）
  if (lastActionInfo.action === action && now - lastActionInfo.timestamp < ACTION_DELAY) {
    console.log(
      `[AppShortcuts] 忽略重复的 ${action} 动作，距上次仅 ${now - lastActionInfo.timestamp}ms`
    );
    return;
  }

  // 更新最后一次操作信息
  lastActionInfo = {
    action,
    timestamp: now
  };

  // 设置防抖锁
  actionTimeout = setTimeout(() => {
    actionTimeout = null;
  }, ACTION_DELAY);

  console.log(`[AppShortcuts] 执行动作: ${action}, 时间戳: ${now}`);

  const playerStore = usePlayerStore();
  const settingsStore = useSettingsStore();

  const showToast = (message: string, iconName: string) => {
    if (settingsStore.isMiniMode) {
      return;
    }
    showShortcutToast(message, iconName);
  };

  try {
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
        await playerStore.prevPlay();
        showToast(t('player.playBar.prev'), 'ri-skip-back-line');
        break;
      case 'nextPlay':
        await playerStore.nextPlay();
        showToast(t('player.playBar.next'), 'ri-skip-forward-line');
        break;
      case 'volumeUp':
        if (playerStore.getVolume() < 1) {
          const newVolume = playerStore.increaseVolume(0.1);
          showToast(
            `${t('player.playBar.volume')}${Math.round(newVolume * 100)}%`,
            'ri-volume-up-line'
          );
        }
        break;
      case 'volumeDown':
        if (playerStore.getVolume() > 0) {
          const newVolume = playerStore.decreaseVolume(0.1);
          showToast(
            `${t('player.playBar.volume')}${Math.round(newVolume * 100)}%`,
            'ri-volume-down-line'
          );
        }
        break;
      case 'toggleFavorite': {
        const isFavorite = playerStore.favoriteList.includes(Number(playerStore.playMusic.id));
        const numericId = Number(playerStore.playMusic.id);
        console.log(`[AppShortcuts] toggleFavorite 当前状态: ${isFavorite}, ID: ${numericId}`);
        if (isFavorite) {
          playerStore.removeFromFavorite(numericId);
          console.log(`[AppShortcuts] 已从收藏中移除: ${numericId}`);
        } else {
          playerStore.addToFavorite(numericId);
          console.log(`[AppShortcuts] 已添加到收藏: ${numericId}`);
        }
        showToast(
          isFavorite
            ? t('player.playBar.unFavorite', { name: playerStore.playMusic.name })
            : t('player.playBar.favorite', { name: playerStore.playMusic.name }),
          isFavorite ? 'ri-heart-line' : 'ri-heart-fill'
        );
        break;
      }
      default:
        console.log('未知的快捷键动作:', action);
        break;
    }
  } catch (error) {
    console.error(`执行快捷键动作 ${action} 时出错:`, error);
  } finally {
    // 确保在出错时也能清除超时
    clearTimeout(actionTimeout);
    actionTimeout = null;
    console.log(
      `[AppShortcuts] 动作完成: ${action}, 时间戳: ${Date.now()}, 耗时: ${Date.now() - now}ms`
    );
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

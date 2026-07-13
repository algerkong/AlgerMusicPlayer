import { onMounted, onUnmounted } from 'vue';

import i18n from '@/../i18n/renderer';
import { audioService } from '@/services/audioService';
import { usePlayerStore, useSettingsStore } from '@/store';

import {
  hasShortcutAction,
  normalizeShortcutAccelerator,
  normalizeShortcutsConfig,
  type ShortcutAction,
  shortcutActionOrder,
  type ShortcutsConfig
} from '../../shared/shortcuts';
import { isElectron } from '.';
import { isEditableTarget, keyboardEventToAccelerator } from './shortcutKeyboard';
import { showShortcutToast } from './shortcutToast';

const ACTION_DELAY = 260;

const actionTimestamps = new Map<ShortcutAction, number>();

const { t } = i18n.global;

let appShortcuts: ShortcutsConfig = normalizeShortcutsConfig(null);
let appShortcutsSuspended = false;
let appShortcutsInitialized = false;

const onGlobalShortcut = (action: string) => {
  if (!hasShortcutAction(action)) {
    return;
  }

  void handleShortcutAction(action);
};

const onUpdateAppShortcuts = (shortcuts: unknown) => {
  updateAppShortcuts(shortcuts);
};

const onMprisSeekOrSetPosition = (position: number) => {
  if (audioService) {
    audioService.seek(position);
  }
};

const shortcutUnsubscribers: Array<() => void> = [];

const onMprisPlay = async () => {
  const playerStore = usePlayerStore();
  if (!playerStore.play && playerStore.playMusic?.id) {
    await playerStore.setPlay({ ...playerStore.playMusic });
  }
};

const onMprisPause = async () => {
  const playerStore = usePlayerStore();
  if (playerStore.play) {
    await playerStore.handlePause();
  }
};

function shouldSkipAction(action: ShortcutAction): boolean {
  const now = Date.now();
  const lastTimestamp = actionTimestamps.get(action) ?? 0;

  if (now - lastTimestamp < ACTION_DELAY) {
    return true;
  }

  actionTimestamps.set(action, now);
  return false;
}

/**
 * 处理快捷键动作
 * @param action 快捷键动作
 */
export async function handleShortcutAction(action: ShortcutAction) {
  if (shouldSkipAction(action)) {
    return;
  }

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
          await playerStore.handlePause();
          showToast(t('player.playBar.pause'), 'ri-pause-circle-line');
        } else if (playerStore.playMusic?.id) {
          await playerStore.setPlay({ ...playerStore.playMusic });
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
        if (!playerStore.playMusic?.id) {
          return;
        }

        const currentSongId = Number(playerStore.playMusic.id);
        const isFavorite = playerStore.favoriteList.includes(currentSongId);

        if (isFavorite) {
          playerStore.removeFromFavorite(currentSongId);
        } else {
          playerStore.addToFavorite(currentSongId);
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
        break;
    }
  } catch (error) {
    console.error(`[AppShortcuts] 执行动作失败: ${action}`, error);
  }
}

/**
 * 全局键盘事件处理函数
 */
function handleKeyDown(event: KeyboardEvent) {
  if (appShortcutsSuspended) {
    return;
  }

  if (isEditableTarget(event.target)) {
    return;
  }

  const accelerator = keyboardEventToAccelerator(event);
  if (!accelerator) {
    return;
  }

  for (const action of shortcutActionOrder) {
    const config = appShortcuts[action];
    if (!config.enabled || config.scope !== 'app') {
      continue;
    }

    const shortcutKey = normalizeShortcutAccelerator(config.key);
    if (!shortcutKey || shortcutKey !== accelerator) {
      continue;
    }

    event.preventDefault();
    void handleShortcutAction(action);
    break;
  }
}

/**
 * 更新应用内快捷键
 */
export function updateAppShortcuts(shortcuts: unknown) {
  appShortcuts = normalizeShortcutsConfig(shortcuts);
}

export function setAppShortcutsSuspended(suspended: boolean) {
  appShortcutsSuspended = suspended;
}

/**
 * 初始化应用内快捷键
 */
export function initAppShortcuts() {
  if (!isElectron || appShortcutsInitialized) {
    return;
  }

  appShortcutsInitialized = true;

  shortcutUnsubscribers.push(
    window.api.onGlobalShortcut(onGlobalShortcut),
    window.api.onUpdateAppShortcuts(onUpdateAppShortcuts),
    window.api.onMprisSeek(onMprisSeekOrSetPosition),
    window.api.onMprisSetPosition(onMprisSeekOrSetPosition),
    window.api.onMprisPlay(onMprisPlay),
    window.api.onMprisPause(onMprisPause)
  );

  const storedShortcuts = window.api.getStoreValue('shortcuts');
  updateAppShortcuts(storedShortcuts);

  document.addEventListener('keydown', handleKeyDown);
}

/**
 * 清理应用内快捷键
 */
export function cleanupAppShortcuts() {
  if (!isElectron || !appShortcutsInitialized) {
    return;
  }

  appShortcutsInitialized = false;

  while (shortcutUnsubscribers.length) {
    const unsub = shortcutUnsubscribers.pop();
    unsub?.();
  }

  document.removeEventListener('keydown', handleKeyDown);
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

import i18n from '@/../i18n/renderer';
import { audioService } from '@/services/audioService';
import { usePlayerStore, useSettingsStore } from '@/store';

import { isElectron } from '.';
import { showShortcutToast } from './shortcutToast';

const { t } = i18n.global;

export function initShortcut() {
  if (isElectron) {
    window.electron.ipcRenderer.on('global-shortcut', async (_, action: string) => {
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
    });
  }
}

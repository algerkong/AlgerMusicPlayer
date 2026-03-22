import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { usePlayerStore } from '@/store/modules/player';

/**
 * 播放模式相关的 Hook
 * 提供播放模式的图标、文本和切换功能
 */
export function usePlayMode() {
  const { t } = useI18n();
  const playerStore = usePlayerStore();

  // 当前播放模式
  const playMode = computed(() => playerStore.playMode);

  // 播放模式图标（心动模式已移至 SearchBar，不参与循环切换）
  const playModeIcon = computed(() => {
    switch (playMode.value) {
      case 0:
        return 'ri-repeat-2-line';
      case 1:
        return 'ri-repeat-one-line';
      case 2:
        return 'ri-shuffle-line';
      default:
        return 'ri-repeat-2-line';
    }
  });

  // 播放模式文本
  const playModeText = computed(() => {
    switch (playMode.value) {
      case 0:
        return t('player.playBar.playMode.sequence');
      case 1:
        return t('player.playBar.playMode.loop');
      case 2:
        return t('player.playBar.playMode.random');
      default:
        return t('player.playBar.playMode.sequence');
    }
  });

  // 切换播放模式
  const togglePlayMode = () => {
    playerStore.togglePlayMode();
  };

  return {
    playMode,
    playModeIcon,
    playModeText,
    togglePlayMode
  };
}

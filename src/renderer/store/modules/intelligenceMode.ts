import { createDiscreteApi } from 'naive-ui';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import i18n from '@/../i18n/renderer';
import { getLocalStorageItem, setLocalStorageItem } from '@/utils/playerUtils';

const { message } = createDiscreteApi(['message']);

/**
 * 心动模式 Store — 在线音源移除后为 no-op
 */
export const useIntelligenceModeStore = defineStore('intelligenceMode', () => {
  const isIntelligenceMode = ref(getLocalStorageItem('isIntelligenceMode', false));
  const intelligenceModeInfo = ref<{
    playlistId: number;
    seedSongId: number;
  } | null>(getLocalStorageItem('intelligenceModeInfo', null));

  const playIntelligenceMode = async () => {
    const { t } = i18n.global;
    message.info(t('player.playBar.intelligenceMode.failed'));
  };

  const clearIntelligenceMode = (skipPlayModeChange: boolean = false) => {
    isIntelligenceMode.value = false;
    intelligenceModeInfo.value = null;
    setLocalStorageItem('isIntelligenceMode', false);
    localStorage.removeItem('intelligenceModeInfo');

    if (!skipPlayModeChange) {
      (async () => {
        const { usePlaylistStore } = await import('./playlist');
        const playlistStore = usePlaylistStore();
        if (playlistStore.playMode === 3) {
          playlistStore.playMode = 0;
        }
      })();
    }
  };

  return {
    isIntelligenceMode,
    intelligenceModeInfo,
    playIntelligenceMode,
    clearIntelligenceMode
  };
});

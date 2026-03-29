import { computed } from 'vue';

import { playMusic } from '@/hooks/MusicHook';
import { usePlayerStore } from '@/store/modules/player';

/**
 * 播放控制 composable（播放/暂停、上一首、下一首）
 */
export function usePlaybackControl() {
  const playerStore = usePlayerStore();

  /** 是否正在播放 */
  const isPlaying = computed(() => playerStore.isPlay);

  /** 播放/暂停切换 */
  const playMusicEvent = async () => {
    try {
      await playerStore.setPlay({ ...playMusic.value });
    } catch (error) {
      console.error('播放出错:', error);
      playerStore.nextPlay();
    }
  };

  /** 下一首 */
  const handleNext = () => {
    playerStore.nextPlay();
  };

  /** 上一首 */
  const handlePrev = () => {
    playerStore.prevPlay();
  };

  return {
    isPlaying,
    playMusicEvent,
    handleNext,
    handlePrev
  };
}

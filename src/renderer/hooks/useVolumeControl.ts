import { computed } from 'vue';

import { usePlayerStore } from '@/store/modules/player';

/**
 * 统一的音量控制 composable
 * 通过 playerStore 管理音量，确保所有播放栏组件的音量状态一致
 */
export function useVolumeControl() {
  const playerStore = usePlayerStore();

  /** 音量滑块值 (0-100) */
  const volumeSlider = computed({
    get: () => playerStore.volume * 100,
    set: (value: number) => {
      playerStore.setVolume(value / 100);
    }
  });

  /** 音量图标 class */
  const volumeIcon = computed(() => {
    if (playerStore.volume === 0) return 'ri-volume-mute-line';
    if (playerStore.volume <= 0.5) return 'ri-volume-down-line';
    return 'ri-volume-up-line';
  });

  /** 静音切换 (0 ↔ 30%) */
  const mute = () => {
    if (volumeSlider.value === 0) {
      volumeSlider.value = 30;
    } else {
      volumeSlider.value = 0;
    }
  };

  /** 鼠标滚轮调整音量 ±5% */
  const handleVolumeWheel = (e: WheelEvent) => {
    const delta = e.deltaY < 0 ? 5 : -5;
    const newValue = Math.min(Math.max(volumeSlider.value + delta, 0), 100);
    volumeSlider.value = newValue;
  };

  return {
    volumeSlider,
    volumeIcon,
    mute,
    handleVolumeWheel
  };
}

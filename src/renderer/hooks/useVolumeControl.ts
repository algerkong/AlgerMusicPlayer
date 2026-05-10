import { computed } from 'vue';

import { usePlayerStore } from '@/store/modules/player';

/**
 * 统一的音量控制 composable
 * 通过 playerStore 管理音量，确保所有播放栏组件的音量状态一致
 */
export function useVolumeControl() {
  const playerStore = usePlayerStore();

  /** 是否静音 */
  const isMuted = computed(() => playerStore.isMuted);

  /** 音量滑块值 (0-100)，静音时仍展示原始音量 */
  const volumeSlider = computed({
    get: () => playerStore.volume * 100,
    set: (value: number) => {
      playerStore.setVolume(value / 100);
    }
  });

  /** 音量图标 class */
  const volumeIcon = computed(() => {
    if (playerStore.isMuted || playerStore.volume === 0) return 'ri-volume-mute-line';
    if (playerStore.volume <= 0.5) return 'ri-volume-down-line';
    return 'ri-volume-up-line';
  });

  /** 切换静音（保留静音前的音量） */
  const mute = () => {
    playerStore.toggleMute();
  };

  /** 鼠标滚轮调整音量 ±5%；静音时向上滚轮会自动解除静音 */
  const handleVolumeWheel = (e: WheelEvent) => {
    const delta = e.deltaY < 0 ? 5 : -5;
    const newValue = Math.min(Math.max(volumeSlider.value + delta, 0), 100);
    volumeSlider.value = newValue;
  };

  return {
    isMuted,
    volumeSlider,
    volumeIcon,
    mute,
    handleVolumeWheel
  };
}

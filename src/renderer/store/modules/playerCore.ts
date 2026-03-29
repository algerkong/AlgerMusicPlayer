import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { audioService } from '@/services/audioService';
import type { AudioOutputDevice } from '@/types/audio';
import type { SongResult } from '@/types/music';

/**
 * 核心播放控制 Store
 * 负责：播放/暂停、当前歌曲、音频URL、音量、播放速度、全屏状态
 */
export const usePlayerCoreStore = defineStore(
  'playerCore',
  () => {
    // ==================== 状态 ====================
    const play = ref(false);
    const isPlay = ref(false);
    const playMusic = ref<SongResult>({} as SongResult);
    const playMusicUrl = ref('');
    const musicFull = ref(false);
    const playbackRate = ref(1.0);
    const volume = ref(1);
    const userPlayIntent = ref(false); // 用户是否想要播放
    const isFmPlaying = ref(false); // 是否正在播放私人FM

    // 音频输出设备
    const audioOutputDeviceId = ref<string>(
      localStorage.getItem('audioOutputDeviceId') || 'default'
    );
    const availableAudioDevices = ref<AudioOutputDevice[]>([]);

    // ==================== Computed ====================
    const currentSong = computed(() => playMusic.value);
    const isPlaying = computed(() => isPlay.value);

    // ==================== Actions ====================

    /**
     * 设置播放状态
     */
    const setIsPlay = (value: boolean) => {
      isPlay.value = value;
      play.value = value;
      window.electron?.ipcRenderer.send('update-play-state', value);
    };

    /**
     * 设置全屏状态
     */
    const setMusicFull = (value: boolean) => {
      musicFull.value = value;
    };

    /**
     * 设置播放速度
     */
    const setPlaybackRate = (rate: number) => {
      playbackRate.value = rate;
      audioService.setPlaybackRate(rate);
    };

    /**
     * 设置音量
     */
    const setVolume = (newVolume: number) => {
      const normalizedVolume = Math.max(0, Math.min(1, newVolume));
      volume.value = normalizedVolume;
      audioService.setVolume(normalizedVolume);
    };

    /**
     * 获取音量
     */
    const getVolume = () => volume.value;

    /**
     * 增加音量
     */
    const increaseVolume = (step: number = 0.1) => {
      const newVolume = Math.min(1, volume.value + step);
      setVolume(newVolume);
      return newVolume;
    };

    /**
     * 减少音量
     */
    const decreaseVolume = (step: number = 0.1) => {
      const newVolume = Math.max(0, volume.value - step);
      setVolume(newVolume);
      return newVolume;
    };

    /**
     * 暂停播放
     */
    const handlePause = async () => {
      try {
        const currentSound = audioService.getCurrentSound();
        if (currentSound) {
          currentSound.pause();
        }
        setPlayMusic(false);
        userPlayIntent.value = false;
      } catch (error) {
        console.error('暂停播放失败:', error);
      }
    };

    /**
     * 设置播放/暂停
     */
    const setPlayMusic = async (value: boolean | SongResult) => {
      if (typeof value === 'boolean') {
        setIsPlay(value);
        userPlayIntent.value = value;
      } else {
        const { playTrack } = await import('@/services/playbackController');
        await playTrack(value);
        play.value = true;
        isPlay.value = true;
        userPlayIntent.value = true;
      }
    };

    // ==================== 音频输出设备管理 ====================

    /**
     * 刷新可用音频输出设备列表
     */
    const refreshAudioDevices = async () => {
      availableAudioDevices.value = await audioService.getAudioOutputDevices();
    };

    /**
     * 切换音频输出设备
     */
    const setAudioOutputDevice = async (deviceId: string): Promise<boolean> => {
      const success = await audioService.setAudioOutputDevice(deviceId);
      if (success) {
        audioOutputDeviceId.value = deviceId;
      }
      return success;
    };

    /**
     * 初始化设备变化监听
     */
    const initAudioDeviceListener = () => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.addEventListener('devicechange', async () => {
          await refreshAudioDevices();
          const exists = availableAudioDevices.value.some(
            (d) => d.deviceId === audioOutputDeviceId.value
          );
          if (!exists && audioOutputDeviceId.value !== 'default') {
            await setAudioOutputDevice('default');
          }
        });
      }
    };

    return {
      // 状态
      play,
      isPlay,
      playMusic,
      playMusicUrl,
      musicFull,
      playbackRate,
      volume,
      userPlayIntent,
      isFmPlaying,
      audioOutputDeviceId,
      availableAudioDevices,

      // Computed
      currentSong,
      isPlaying,

      // Actions
      setIsPlay,
      setMusicFull,
      setPlayMusic,
      setPlaybackRate,
      setVolume,
      getVolume,
      increaseVolume,
      decreaseVolume,
      handlePause,
      refreshAudioDevices,
      setAudioOutputDevice,
      initAudioDeviceListener
    };
  },
  {
    persist: {
      key: 'player-core-store',
      storage: localStorage,
      pick: ['playMusic', 'playMusicUrl', 'playbackRate', 'volume', 'isPlay', 'audioOutputDeviceId']
    }
  }
);

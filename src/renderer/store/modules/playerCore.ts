import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { audioService } from '@/services/audioService';
import type { AudioOutputDevice } from '@/types/audio';
import type { SongResult } from '@/types/music';
import { debouncedLocalStorage } from '@/utils/debouncedStorage';
import { minifySong } from '@/utils/persistedSong';

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
    const isMuted = ref(false);
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
      // 用户调高音量时自动解除静音
      if (isMuted.value && normalizedVolume > 0) {
        isMuted.value = false;
      }
      audioService.setVolume(isMuted.value ? 0 : normalizedVolume);
    };

    /**
     * 设置静音状态（不改变 volume，仅控制音频输出）
     */
    const setMuted = (value: boolean) => {
      if (isMuted.value === value) return;
      isMuted.value = value;
      audioService.setVolume(isMuted.value ? 0 : volume.value);
    };

    /**
     * 切换静音
     */
    const toggleMute = () => {
      setMuted(!isMuted.value);
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
      isMuted,
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
      setMuted,
      toggleMute,
      handlePause,
      refreshAudioDevices,
      setAudioOutputDevice,
      initAudioDeviceListener
    };
  },
  {
    persist: {
      key: 'player-core-store',
      // 使用 debouncedLocalStorage：volume 拖动 / 静音切换会高频触发 mutation，
      // 直接写 localStorage 会导致每次都 stringify + minify 整个 state，浪费 I/O。
      // 防抖 2s 写一次足够，beforeunload 钩子兜底刷盘。
      // Trade-off：极端非正常退出（kill -9 / 断电 / 主进程崩溃）下 beforeunload 不触发，
      // 最近 2s 的 volume / isPlay / playMusic 变更会丢——这些状态丢一次无大碍，可接受
      storage: debouncedLocalStorage,
      pick: [
        'playMusic',
        'playMusicUrl',
        'playbackRate',
        'volume',
        'isMuted',
        'isPlay',
        'audioOutputDeviceId'
      ],
      // playMusic 持久化前过 minifySong：剥离 base64 封面、lyric、song 等大字段。
      // 单首歌的 lyric 持久化后没有用（重启后会重新加载），但 picUrl 若是 base64 会
      // 拖累整个 player-core-store 写入失败（5MB 配额）。playMusicUrl 在 store 层级单独
      // 持久化，不受 playMusic 内部精简影响——本地音乐 local:// URL 仍保持可恢复。
      // id 守卫：空 playMusic 走 minifySong 会得到 {picUrl:'', ar:[]}（stripDataUrl
      // 把 undefined 转成空串、ar 缺省返回空数组），下次启动 playbackController 的
      // Object.keys().length === 0 判空就会失效，误恢复一首无 id 的空歌
      serializer: {
        serialize: (state: any) =>
          JSON.stringify({
            ...state,
            playMusic: state.playMusic?.id ? minifySong(state.playMusic as SongResult) : {}
          }),
        deserialize: JSON.parse
      }
    }
  }
);

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { audioService } from '@/services/audioService';
import type { AudioOutputDevice } from '@/types/audio';
import type { SongResult } from '@/types/music';
import { debouncedLocalStorage } from '@/utils/debouncedStorage';
import { minifySong } from '@/utils/persistedSong';
import {
  normalizeSongResult,
  playableToSongResult,
  songResultToPlayable,
  songResultToRuntime,
  songResultToTrack
} from '@/utils/trackBridge';

import type { PlaybackRuntime, PlayableTrack, Track } from '../../../shared/domain/track';

const emptySong = {} as SongResult;

/**
 * 核心播放控制 Store（P2：内部分层 Track + Runtime）
 *
 * - 兼容壳 `playMusic`：仍是 SongResult，旧代码赋值/读字段继续可用
 * - `currentTrack` / `currentRuntime`：从壳同步投影（领域读口）
 * - 规范写口：`setCurrentSong`（整曲替换）、`patchCurrentSong`（运行态补丁）
 * - 换曲：playlist.setPlay → playbackCoordinator（勿在此塞 SongResult 换曲）
 */
export const usePlayerCoreStore = defineStore(
  'playerCore',
  () => {
    // ==================== 状态 ====================
    const play = ref(false);
    const isPlay = ref(false);
    /** 兼容壳：对外 SongResult；内部与 Track/Runtime 同步 */
    const playMusic = ref<SongResult>(emptySong);
    const playMusicUrl = ref('');
    const musicFull = ref(false);
    const playbackRate = ref(1.0);
    const volume = ref(1);
    const isMuted = ref(false);
    const userPlayIntent = ref(false);
    const isFmPlaying = ref(false);

    const audioOutputDeviceId = ref<string>(
      localStorage.getItem('audioOutputDeviceId') || 'default'
    );
    const availableAudioDevices = ref<AudioOutputDevice[]>([]);

    // ==================== P2 领域投影 ====================
    const currentTrack = computed<Track | null>(() => {
      const s = playMusic.value;
      if (s?.id == null || s.id === '') return null;
      return songResultToTrack(s);
    });

    const currentRuntime = computed<PlaybackRuntime>(() => {
      const s = playMusic.value;
      if (s?.id == null || s.id === '') return {};
      return songResultToRuntime(s);
    });

    const currentPlayable = computed<PlayableTrack | null>(() => {
      const t = currentTrack.value;
      if (!t) return null;
      return { track: t, runtime: currentRuntime.value };
    });

    // ==================== 计算属性 ====================
    const currentSong = computed(() => playMusic.value);
    const isPlaying = computed(() => isPlay.value);

    // ==================== 规范写口 ====================

    /** 整曲替换（换曲 / 恢复）；空 id 清空 */
    const setCurrentSong = (song: SongResult | null | undefined) => {
      if (!song || song.id == null || song.id === '') {
        playMusic.value = emptySong;
        playMusicUrl.value = '';
        return;
      }
      const n = normalizeSongResult(song);
      playMusic.value = n;
      playMusicUrl.value = n.playMusicUrl || '';
    };

    /** 从 PlayableTrack 写入（领域入口） */
    const setCurrentPlayable = (playable: PlayableTrack | null) => {
      if (!playable?.track?.id) {
        setCurrentSong(null);
        return;
      }
      setCurrentSong(playableToSongResult(playable));
    };

    /**
     * 补丁当前曲（歌词/颜色/URL/loading 等）。
     * 优先用此法替代 `playMusic.xxx =` 原地写，便于后续收口。
     */
    const patchCurrentSong = (patch: Partial<SongResult>) => {
      if (playMusic.value?.id == null || playMusic.value.id === '') return;
      const n = normalizeSongResult({ ...playMusic.value, ...patch });
      playMusic.value = n;
      if (patch.playMusicUrl !== undefined) {
        playMusicUrl.value = patch.playMusicUrl || '';
      }
    };

    /** 调试/迁移：当前壳拆成 PlayableTrack */
    const getCurrentPlayable = (): PlayableTrack | null => {
      if (playMusic.value?.id == null) return null;
      return songResultToPlayable(playMusic.value);
    };

    // ==================== 操作 ====================

    const setIsPlay = (value: boolean) => {
      isPlay.value = value;
      play.value = value;
      window.api?.updatePlayState(value);
    };

    const setMusicFull = (value: boolean) => {
      musicFull.value = value;
    };

    const setPlaybackRate = (rate: number) => {
      playbackRate.value = rate;
      audioService.setPlaybackRate(rate);
    };

    const setVolume = (newVolume: number) => {
      const normalizedVolume = Math.max(0, Math.min(1, newVolume));
      volume.value = normalizedVolume;
      if (isMuted.value && normalizedVolume > 0) {
        isMuted.value = false;
      }
      audioService.setVolume(isMuted.value ? 0 : normalizedVolume);
    };

    const setMuted = (value: boolean) => {
      if (isMuted.value === value) return;
      isMuted.value = value;
      audioService.setVolume(isMuted.value ? 0 : volume.value);
    };

    const toggleMute = () => {
      setMuted(!isMuted.value);
    };

    const getVolume = () => volume.value;

    const increaseVolume = (step: number = 0.1) => {
      const newVolume = Math.min(1, volume.value + step);
      setVolume(newVolume);
      return newVolume;
    };

    const decreaseVolume = (step: number = 0.1) => {
      const newVolume = Math.max(0, volume.value - step);
      setVolume(newVolume);
      return newVolume;
    };

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
     * 仅切换播放/暂停意图与 isPlay 标志。
     * 换曲请走 playlist.setPlay → playbackCoordinator.playTrack。
     */
    const setPlayMusic = (value: boolean) => {
      setIsPlay(value);
      userPlayIntent.value = value;
    };

    // ==================== 音频输出设备 ====================

    const refreshAudioDevices = async () => {
      availableAudioDevices.value = await audioService.getAudioOutputDevices();
    };

    const setAudioOutputDevice = async (deviceId: string): Promise<boolean> => {
      const success = await audioService.setAudioOutputDevice(deviceId);
      if (success) {
        audioOutputDeviceId.value = deviceId;
      }
      return success;
    };

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

      // P2 领域投影
      currentTrack,
      currentRuntime,
      currentPlayable,

      currentSong,
      isPlaying,

      setIsPlay,
      setMusicFull,
      setPlayMusic,
      setCurrentSong,
      setCurrentPlayable,
      patchCurrentSong,
      getCurrentPlayable,
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

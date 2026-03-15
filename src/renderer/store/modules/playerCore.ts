import { cloneDeep } from 'lodash';
import { createDiscreteApi } from 'naive-ui';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import i18n from '@/../i18n/renderer';
import { getParsingMusicUrl } from '@/api/music';
import { useLyrics, useSongDetail } from '@/hooks/usePlayerHooks';
import { audioService } from '@/services/audioService';
import { playbackRequestManager } from '@/services/playbackRequestManager';
import { preloadService } from '@/services/preloadService';
import { SongSourceConfigManager } from '@/services/SongSourceConfigManager';
import type { AudioOutputDevice } from '@/types/audio';
import type { Platform, SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { getImageLinearBackground } from '@/utils/linearColor';

import { usePlayHistoryStore } from './playHistory';

const { message } = createDiscreteApi(['message']);

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

    // 音频输出设备
    const audioOutputDeviceId = ref<string>(
      localStorage.getItem('audioOutputDeviceId') || 'default'
    );
    const availableAudioDevices = ref<AudioOutputDevice[]>([]);

    let checkPlayTime: NodeJS.Timeout | null = null;
    let checkPlaybackRetryCount = 0;
    const MAX_CHECKPLAYBACK_RETRIES = 3;

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
     * 播放状态检测
     * 在播放开始后延迟检查音频是否真正在播放，防止无声播放
     */
    const checkPlaybackState = (song: SongResult, requestId?: string, timeout: number = 6000) => {
      if (checkPlayTime) {
        clearTimeout(checkPlayTime);
      }
      const sound = audioService.getCurrentSound();
      if (!sound) return;

      // 如果没有提供 requestId，创建一个临时标识
      const actualRequestId = requestId || `check_${Date.now()}`;

      const onPlayHandler = () => {
        console.log(`[${actualRequestId}] 播放事件触发，歌曲成功开始播放`);
        audioService.off('play', onPlayHandler);
        audioService.off('playerror', onPlayErrorHandler);
        checkPlaybackRetryCount = 0; // 播放成功，重置重试计数
        if (checkPlayTime) {
          clearTimeout(checkPlayTime);
          checkPlayTime = null;
        }
      };

      const onPlayErrorHandler = async () => {
        console.log('播放错误事件触发，检查是否需要重新获取URL');
        audioService.off('play', onPlayHandler);
        audioService.off('playerror', onPlayErrorHandler);

        // 如果有 requestId，验证其有效性
        if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
          console.log('请求已过期，跳过重试');
          return;
        }

        // 检查重试次数限制
        if (checkPlaybackRetryCount >= MAX_CHECKPLAYBACK_RETRIES) {
          console.warn(`播放重试已达上限 (${MAX_CHECKPLAYBACK_RETRIES} 次)，停止重试`);
          checkPlaybackRetryCount = 0;
          setPlayMusic(false);
          return;
        }

        if (userPlayIntent.value && play.value) {
          checkPlaybackRetryCount++;
          console.log(
            `播放失败，尝试刷新URL并重新播放 (重试 ${checkPlaybackRetryCount}/${MAX_CHECKPLAYBACK_RETRIES})`
          );
          // 本地音乐不需要刷新 URL
          if (!playMusic.value.playMusicUrl?.startsWith('local://')) {
            playMusic.value.playMusicUrl = undefined;
          }
          const refreshedSong = { ...song, isFirstPlay: true };
          await handlePlayMusic(refreshedSong, true);
        }
      };

      audioService.on('play', onPlayHandler);
      audioService.on('playerror', onPlayErrorHandler);

      checkPlayTime = setTimeout(() => {
        // 如果有 requestId，验证其有效性
        if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
          console.log('请求已过期，跳过超时重试');
          audioService.off('play', onPlayHandler);
          audioService.off('playerror', onPlayErrorHandler);
          return;
        }

        // 双重确认：Howler 报告未播放 + 用户仍想播放
        // 额外检查底层 HTMLAudioElement 的状态，避免 EQ 重建期间的误判
        const currentSound = audioService.getCurrentSound();
        let htmlPlaying = false;
        if (currentSound) {
          try {
            const sounds = (currentSound as any)._sounds as any[];
            if (sounds?.[0]?._node instanceof HTMLMediaElement) {
              const node = sounds[0]._node as HTMLMediaElement;
              htmlPlaying = !node.paused && !node.ended && node.readyState > 2;
            }
          } catch {
            // 静默忽略
          }
        }

        if (htmlPlaying) {
          // 底层 HTMLAudioElement 实际在播放，不需要重试
          console.log('底层音频元素正在播放，跳过超时重试');
          audioService.off('play', onPlayHandler);
          audioService.off('playerror', onPlayErrorHandler);
          return;
        }

        if (!audioService.isActuallyPlaying() && userPlayIntent.value && play.value) {
          audioService.off('play', onPlayHandler);
          audioService.off('playerror', onPlayErrorHandler);

          // 检查重试次数限制
          if (checkPlaybackRetryCount >= MAX_CHECKPLAYBACK_RETRIES) {
            console.warn(`超时重试已达上限 (${MAX_CHECKPLAYBACK_RETRIES} 次)，停止重试`);
            checkPlaybackRetryCount = 0;
            setPlayMusic(false);
            return;
          }

          checkPlaybackRetryCount++;
          console.log(
            `${timeout}ms后歌曲未真正播放，尝试重新获取URL (重试 ${checkPlaybackRetryCount}/${MAX_CHECKPLAYBACK_RETRIES})`
          );

          // 本地音乐不需要刷新 URL
          if (!playMusic.value.playMusicUrl?.startsWith('local://')) {
            playMusic.value.playMusicUrl = undefined;
          }
          (async () => {
            const refreshedSong = { ...song, isFirstPlay: true };
            await handlePlayMusic(refreshedSong, true);
          })();
        } else {
          audioService.off('play', onPlayHandler);
          audioService.off('playerror', onPlayErrorHandler);
        }
      }, timeout);
    };

    /**
     * 核心播放处理函数
     */
    const handlePlayMusic = async (music: SongResult, shouldPlay: boolean = true) => {
      // 如果是新歌曲，重置已尝试的音源和重试计数
      if (music.id !== playMusic.value.id) {
        SongSourceConfigManager.clearTriedSources(music.id);
        checkPlaybackRetryCount = 0;
      }

      // 创建新的播放请求并取消之前的所有请求
      const requestId = playbackRequestManager.createRequest(music);
      console.log(`[handlePlayMusic] 开始处理歌曲: ${music.name}, 请求ID: ${requestId}`);

      const currentSound = audioService.getCurrentSound();
      if (currentSound) {
        console.log('主动停止并卸载当前音频实例');
        currentSound.stop();
        currentSound.unload();
      }

      // 验证请求是否仍然有效
      if (!playbackRequestManager.isRequestValid(requestId)) {
        console.log(`[handlePlayMusic] 请求已失效: ${requestId}`);
        return false;
      }

      // 激活请求
      if (!playbackRequestManager.activateRequest(requestId)) {
        console.log(`[handlePlayMusic] 无法激活请求: ${requestId}`);
        return false;
      }

      const originalMusic = { ...music };

      const { loadLrc } = useLyrics();
      const { getSongDetail } = useSongDetail();

      // 并行加载歌词和背景色
      const [lyrics, { backgroundColor, primaryColor }] = await Promise.all([
        (async () => {
          if (music.lyric && music.lyric.lrcTimeArray.length > 0) {
            return music.lyric;
          }
          return await loadLrc(music.id);
        })(),
        (async () => {
          if (music.backgroundColor && music.primaryColor) {
            return { backgroundColor: music.backgroundColor, primaryColor: music.primaryColor };
          }
          return await getImageLinearBackground(getImgUrl(music?.picUrl, '30y30'));
        })()
      ]);

      // 在更新状态前再次验证请求
      if (!playbackRequestManager.isRequestValid(requestId)) {
        console.log(`[handlePlayMusic] 加载歌词/背景色后请求已失效: ${requestId}`);
        return false;
      }

      // 设置歌词和背景色
      music.lyric = lyrics;
      music.backgroundColor = backgroundColor;
      music.primaryColor = primaryColor;
      music.playLoading = true;

      // 更新 playMusic 和播放状态
      playMusic.value = music;
      play.value = shouldPlay;
      isPlay.value = shouldPlay;
      userPlayIntent.value = shouldPlay;

      // 更新标题
      let title = music.name;
      if (music.source === 'netease' && music?.song?.artists) {
        title += ` - ${music.song.artists.reduce(
          (prev: string, curr: any) => `${prev}${curr.name}/`,
          ''
        )}`;
      }
      document.title = 'AlgerMusic - ' + title;

      try {
        // 添加到历史记录
        const playHistoryStore = usePlayHistoryStore();
        if (music.isPodcast) {
          if (music.program) {
            playHistoryStore.addPodcast(music.program);
          }
        } else {
          playHistoryStore.addMusic(music);
        }

        // 获取歌曲详情
        const updatedPlayMusic = await getSongDetail(originalMusic, requestId);

        // 在获取详情后再次验证请求
        if (!playbackRequestManager.isRequestValid(requestId)) {
          console.log(`[handlePlayMusic] 获取歌曲详情后请求已失效: ${requestId}`);
          playbackRequestManager.failRequest(requestId);
          return false;
        }

        updatedPlayMusic.lyric = lyrics;

        playMusic.value = updatedPlayMusic;
        playMusicUrl.value = updatedPlayMusic.playMusicUrl as string;
        music.playMusicUrl = updatedPlayMusic.playMusicUrl as string;

        // 在拆分后补充：触发预加载下一首/下下首（与 playlist store 保持一致）
        try {
          const { usePlaylistStore } = await import('./playlist');
          const playlistStore = usePlaylistStore();
          // 基于当前歌曲在播放列表中的位置来预加载
          const list = playlistStore.playList;
          if (Array.isArray(list) && list.length > 0) {
            const idx = list.findIndex(
              (item: SongResult) =>
                item.id === updatedPlayMusic.id && item.source === updatedPlayMusic.source
            );
            if (idx !== -1) {
              setTimeout(() => {
                playlistStore.preloadNextSongs(idx);
              }, 3000);
            }
          }
        } catch (e) {
          console.warn('预加载触发失败（可能是依赖未加载或循环依赖），已忽略:', e);
        }

        try {
          const result = await playAudio(requestId);

          if (result) {
            // 播放成功，清除 isFirstPlay 标记，避免暂停时被误判为新歌
            playMusic.value.isFirstPlay = false;
            playbackRequestManager.completeRequest(requestId);
            return true;
          } else {
            playbackRequestManager.failRequest(requestId);
            return false;
          }
        } catch (error) {
          console.error('自动播放音频失败:', error);
          playbackRequestManager.failRequest(requestId);
          return false;
        }
      } catch (error) {
        console.error('处理播放音乐失败:', error);
        message.error(i18n.global.t('player.playFailed'));
        if (playMusic.value) {
          playMusic.value.playLoading = false;
        }
        playbackRequestManager.failRequest(requestId);

        return false;
      }
    };

    /**
     * 播放音频
     */
    const playAudio = async (requestId?: string) => {
      if (!playMusicUrl.value || !playMusic.value) return null;

      // 如果提供了 requestId，验证请求是否仍然有效
      if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
        console.log(`[playAudio] 请求已失效: ${requestId}`);
        return null;
      }

      try {
        const shouldPlay = play.value;
        console.log('播放音频，当前播放状态:', shouldPlay ? '播放' : '暂停');

        // 检查保存的进度
        let initialPosition = 0;
        const savedProgress = JSON.parse(localStorage.getItem('playProgress') || '{}');
        console.log(
          '[playAudio] 读取保存的进度:',
          savedProgress,
          '当前歌曲ID:',
          playMusic.value.id
        );
        if (savedProgress.songId === playMusic.value.id) {
          initialPosition = savedProgress.progress;
          console.log('[playAudio] 恢复播放进度:', initialPosition);
        }

        // 使用 PreloadService 获取音频
        // 优先使用已预加载的 sound（通过 consume 获取并从缓存中移除）
        // 如果没有预加载，则进行加载
        let sound: Howl;
        try {
          // 先尝试消耗预加载的 sound
          const preloadedSound = preloadService.consume(playMusic.value.id);
          if (preloadedSound && preloadedSound.state() === 'loaded') {
            console.log(`[playAudio] 使用预加载的音频: ${playMusic.value.name}`);
            sound = preloadedSound;
          } else {
            // 没有预加载或预加载状态不正常，需要加载
            console.log(`[playAudio] 没有预加载，开始加载: ${playMusic.value.name}`);
            sound = await preloadService.load(playMusic.value);
          }
        } catch (error) {
          console.error('PreloadService 加载失败:', error);
          // 如果 PreloadService 失败，尝试直接播放作为回退
          // 但通常 PreloadService 失败意味着 URL 问题
          throw error;
        }

        // 播放新音频，传入已加载的 sound 实例
        const newSound = await audioService.play(
          playMusicUrl.value,
          playMusic.value,
          shouldPlay,
          initialPosition || 0,
          sound
        );

        // 播放后再次验证请求
        if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
          console.log(`[playAudio] 播放后请求已失效: ${requestId}`);
          newSound.stop();
          newSound.unload();
          return null;
        }

        // 添加播放状态检测
        if (shouldPlay && requestId) {
          checkPlaybackState(playMusic.value, requestId);
        }

        // 发布音频就绪事件
        window.dispatchEvent(
          new CustomEvent('audio-ready', { detail: { sound: newSound, shouldPlay } })
        );

        // 时长检查已在 preloadService.ts 中完成

        return newSound;
      } catch (error) {
        console.error('播放音频失败:', error);

        const errorMsg = error instanceof Error ? error.message : String(error);

        // 操作锁错误不应该停止播放状态，只需要重试
        if (errorMsg.includes('操作锁激活')) {
          console.log('由于操作锁正在使用，将在1000ms后重试');

          try {
            audioService.forceResetOperationLock();
            console.log('已强制重置操作锁');
          } catch (e) {
            console.error('重置操作锁失败:', e);
          }

          setTimeout(() => {
            // 验证请求是否仍然有效再重试
            if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
              console.log('重试时请求已失效，跳过重试');
              return;
            }
            if (userPlayIntent.value && play.value) {
              playAudio(requestId).catch((e) => {
                console.error('重试播放失败:', e);
                setPlayMusic(false);
              });
            }
          }, 1000);
        } else {
          // 非操作锁错误，停止播放并通知用户
          setPlayMusic(false);
          console.warn('播放音频失败（非操作锁错误），由调用方处理重试');
          message.error(i18n.global.t('player.playFailed'));
        }

        return null;
      }
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
        await handlePlayMusic(value);
        play.value = true;
        isPlay.value = true;
        userPlayIntent.value = true;
      }
    };

    /**
     * 使用指定音源重新解析当前歌曲
     */
    const reparseCurrentSong = async (sourcePlatform: Platform, isAuto: boolean = false) => {
      try {
        const currentSong = playMusic.value;
        if (!currentSong || !currentSong.id) {
          console.warn('没有有效的播放对象');
          return false;
        }

        // 使用 SongSourceConfigManager 保存配置
        SongSourceConfigManager.setConfig(
          currentSong.id,
          [sourcePlatform],
          isAuto ? 'auto' : 'manual'
        );

        const currentSound = audioService.getCurrentSound();
        if (currentSound) {
          currentSound.pause();
        }

        const numericId =
          typeof currentSong.id === 'string' ? parseInt(currentSong.id, 10) : currentSong.id;

        console.log(`使用音源 ${sourcePlatform} 重新解析歌曲 ${numericId}`);

        const songData = cloneDeep(currentSong);
        const res = await getParsingMusicUrl(numericId, songData);

        if (res && res.data && res.data.data && res.data.data.url) {
          const newUrl = res.data.data.url;
          console.log(`解析成功，获取新URL: ${newUrl.substring(0, 50)}...`);

          const updatedMusic = {
            ...currentSong,
            playMusicUrl: newUrl,
            expiredAt: Date.now() + 1800000
          };

          await handlePlayMusic(updatedMusic, true);

          // 更新播放列表中的歌曲信息
          const { usePlaylistStore } = await import('./playlist');
          const playlistStore = usePlaylistStore();
          playlistStore.updateSong(updatedMusic);

          return true;
        } else {
          console.warn(`使用音源 ${sourcePlatform} 解析失败`);
          return false;
        }
      } catch (error) {
        console.error('重新解析失败:', error);
        return false;
      }
    };

    /**
     * 初始化播放状态
     */
    const initializePlayState = async () => {
      const { useSettingsStore } = await import('./settings');
      const settingStore = useSettingsStore();

      if (playMusic.value && Object.keys(playMusic.value).length > 0) {
        try {
          console.log('恢复上次播放的音乐:', playMusic.value.name);
          const isPlaying = settingStore.setData.autoPlay;

          // 本地音乐（local:// 协议）不需要重新获取 URL，保留原始路径
          const isLocalMusic = playMusic.value.playMusicUrl?.startsWith('local://');

          await handlePlayMusic(
            {
              ...playMusic.value,
              isFirstPlay: true,
              playMusicUrl: isLocalMusic ? playMusic.value.playMusicUrl : undefined
            },
            isPlaying
          );
        } catch (error) {
          console.error('重新获取音乐链接失败:', error);
          play.value = false;
          isPlay.value = false;
          playMusic.value = {} as SongResult;
          playMusicUrl.value = '';
        }
      }

      setTimeout(() => {
        audioService.setPlaybackRate(playbackRate.value);
      }, 2000);
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
      handlePlayMusic,
      playAudio,
      handlePause,
      checkPlaybackState,
      reparseCurrentSong,
      initializePlayState,
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

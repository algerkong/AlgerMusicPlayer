import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import i18n from '@/../i18n/renderer';
import { getLocalStorageItem, setLocalStorageItem } from '@/utils/playerUtils';

// 定时关闭类型
export enum SleepTimerType {
  NONE = 'none',
  TIME = 'time',
  SONGS = 'songs',
  PLAYLIST_END = 'end'
}

// 定时关闭信息
export interface SleepTimerInfo {
  type: SleepTimerType;
  value: number;
  endTime?: number;
  startSongIndex?: number;
  remainingSongs?: number;
}

/**
 * 定时关闭管理 Store
 * 负责：定时关闭功能
 */
export const useSleepTimerStore = defineStore('sleepTimer', () => {
  // ==================== 状态 ====================
  const sleepTimer = ref<SleepTimerInfo>(
    getLocalStorageItem('sleepTimer', {
      type: SleepTimerType.NONE,
      value: 0
    })
  );
  const showSleepTimer = ref(false);
  const timerInterval = ref<number | null>(null);

  // ==================== Computed ====================
  const currentSleepTimer = computed(() => sleepTimer.value);
  const hasSleepTimerActive = computed(() => sleepTimer.value.type !== SleepTimerType.NONE);

  const sleepTimerRemainingTime = computed(() => {
    if (sleepTimer.value.type === SleepTimerType.TIME && sleepTimer.value.endTime) {
      const remaining = Math.max(0, sleepTimer.value.endTime - Date.now());
      return Math.ceil(remaining / 60000);
    }
    return 0;
  });

  const sleepTimerRemainingSongs = computed(() => {
    if (sleepTimer.value.type === SleepTimerType.SONGS) {
      return sleepTimer.value.remainingSongs || 0;
    }
    return 0;
  });

  // ==================== Actions ====================

  /**
   * 按时间设置定时关闭
   */
  const setSleepTimerByTime = (minutes: number) => {
    clearSleepTimer();

    if (minutes <= 0) {
      return false;
    }

    const endTime = Date.now() + minutes * 60 * 1000;

    sleepTimer.value = {
      type: SleepTimerType.TIME,
      value: minutes,
      endTime
    };

    setLocalStorageItem('sleepTimer', sleepTimer.value);

    timerInterval.value = window.setInterval(() => {
      checkSleepTimer();
    }, 1000) as unknown as number;

    console.log(`设置定时关闭: ${minutes}分钟后`);
    return true;
  };

  /**
   * 按歌曲数设置定时关闭
   */
  const setSleepTimerBySongs = async (songs: number) => {
    clearSleepTimer();

    if (songs <= 0) {
      return false;
    }

    const { usePlaylistStore } = await import('./playlist');
    const playlistStore = usePlaylistStore();

    sleepTimer.value = {
      type: SleepTimerType.SONGS,
      value: songs,
      startSongIndex: playlistStore.playListIndex,
      remainingSongs: songs
    };

    setLocalStorageItem('sleepTimer', sleepTimer.value);

    console.log(`设置定时关闭: 再播放${songs}首歌后`);
    return true;
  };

  /**
   * 播放列表结束时关闭
   */
  const setSleepTimerAtPlaylistEnd = () => {
    clearSleepTimer();

    sleepTimer.value = {
      type: SleepTimerType.PLAYLIST_END,
      value: 0
    };

    setLocalStorageItem('sleepTimer', sleepTimer.value);

    console.log('设置定时关闭: 播放列表结束时');
    return true;
  };

  /**
   * 取消定时关闭
   */
  const clearSleepTimer = () => {
    if (timerInterval.value) {
      window.clearInterval(timerInterval.value);
      timerInterval.value = null;
    }

    sleepTimer.value = {
      type: SleepTimerType.NONE,
      value: 0
    };

    setLocalStorageItem('sleepTimer', sleepTimer.value);

    console.log('取消定时关闭');
    return true;
  };

  /**
   * 检查定时关闭是否应该触发
   */
  const checkSleepTimer = () => {
    if (sleepTimer.value.type === SleepTimerType.NONE) {
      return;
    }

    if (sleepTimer.value.type === SleepTimerType.TIME && sleepTimer.value.endTime) {
      if (Date.now() >= sleepTimer.value.endTime) {
        stopPlayback();
      }
    }
  };

  /**
   * 停止播放并清除定时器
   */
  const stopPlayback = async () => {
    console.log('定时器触发：停止播放');

    const { usePlayerCoreStore } = await import('./playerCore');
    const playerCore = usePlayerCoreStore();
    const { audioService } = await import('@/services/audioService');

    if (playerCore.isPlaying) {
      playerCore.setIsPlay(false);
      audioService.pause();
    }

    // 发送通知
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('show-notification', {
        title: i18n.global.t('player.sleepTimer.timerEnded'),
        body: i18n.global.t('player.sleepTimer.playbackStopped')
      });
    }

    clearSleepTimer();
  };

  /**
   * 监听歌曲变化，处理按歌曲数定时和播放列表结束定时
   */
  const handleSongChange = async () => {
    console.log('歌曲已切换，检查定时器状态:', sleepTimer.value);

    // 处理按歌曲数定时
    if (
      sleepTimer.value.type === SleepTimerType.SONGS &&
      sleepTimer.value.remainingSongs !== undefined
    ) {
      sleepTimer.value.remainingSongs--;
      console.log(`剩余歌曲数: ${sleepTimer.value.remainingSongs}`);

      setLocalStorageItem('sleepTimer', sleepTimer.value);

      if (sleepTimer.value.remainingSongs <= 0) {
        console.log('已播放完设定的歌曲数，停止播放');
        stopPlayback();
        setTimeout(() => {
          stopPlayback();
        }, 1000);
      }
    }

    // 处理播放列表结束定时
    if (sleepTimer.value.type === SleepTimerType.PLAYLIST_END) {
      const { usePlaylistStore } = await import('./playlist');
      const playlistStore = usePlaylistStore();

      const isLastSong = playlistStore.playListIndex === playlistStore.playList.length - 1;

      if (isLastSong && playlistStore.playMode !== 1) {
        console.log('已到达播放列表末尾，将在当前歌曲结束后停止播放');
        sleepTimer.value = {
          type: SleepTimerType.SONGS,
          value: 1,
          remainingSongs: 1
        };
        setLocalStorageItem('sleepTimer', sleepTimer.value);
      }
    }
  };

  /**
   * 设置定时器弹窗显示状态
   */
  const setShowSleepTimer = (value: boolean) => {
    showSleepTimer.value = value;
  };

  /**
   * 应用重启/刷新后恢复定时器：
   * sleepTimer 状态会被持久化并在 ref 初始化时恢复，但 setInterval 不会，
   * 导致 TIME 类型定时器到点后不再触发停止。这里在 store 创建时重建 interval。
   */
  const restoreTimerInterval = () => {
    if (sleepTimer.value.type !== SleepTimerType.TIME || !sleepTimer.value.endTime) {
      return;
    }
    if (Date.now() >= sleepTimer.value.endTime) {
      // 重启时已过设定时间，直接停止播放
      stopPlayback();
      return;
    }
    if (!timerInterval.value) {
      timerInterval.value = window.setInterval(() => {
        checkSleepTimer();
      }, 1000) as unknown as number;
    }
  };

  // store 首次实例化时立即尝试恢复（player store 在启动阶段即会实例化本 store）
  restoreTimerInterval();

  return {
    // 状态
    sleepTimer,
    showSleepTimer,

    // Computed
    currentSleepTimer,
    hasSleepTimerActive,
    sleepTimerRemainingTime,
    sleepTimerRemainingSongs,

    // Actions
    setSleepTimerByTime,
    setSleepTimerBySongs,
    setSleepTimerAtPlaylistEnd,
    clearSleepTimer,
    checkSleepTimer,
    stopPlayback,
    handleSongChange,
    setShowSleepTimer
  };
});

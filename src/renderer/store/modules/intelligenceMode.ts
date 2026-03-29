import { createDiscreteApi } from 'naive-ui';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import i18n from '@/../i18n/renderer';
import { getLikedList } from '@/api/music';
import type { Platform } from '@/types/music';
import { getLocalStorageItem, setLocalStorageItem } from '@/utils/playerUtils';

const { message } = createDiscreteApi(['message']);

/**
 * 心动模式管理 Store
 * 负责：心动模式的播放和状态管理
 */
export const useIntelligenceModeStore = defineStore('intelligenceMode', () => {
  // ==================== 状态 ====================
  const isIntelligenceMode = ref(getLocalStorageItem('isIntelligenceMode', false));
  const intelligenceModeInfo = ref<{
    playlistId: number;
    seedSongId: number;
  } | null>(getLocalStorageItem('intelligenceModeInfo', null));

  // ==================== Actions ====================

  /**
   * 播放心动模式
   */
  const playIntelligenceMode = async () => {
    const { useUserStore } = await import('./user');
    const { usePlaylistStore } = await import('./playlist');

    const userStore = useUserStore();
    const playlistStore = usePlaylistStore();
    const { t } = i18n.global;

    // 检查是否使用cookie登录
    if (!userStore.user || userStore.loginType !== 'cookie') {
      message.warning(t('player.playBar.intelligenceMode.needCookieLogin'));
      return;
    }

    try {
      // 获取用户歌单列表
      if (userStore.playList.length === 0) {
        await userStore.initializePlaylist();
      }

      // 找到"我喜欢的音乐"歌单
      const favoritePlaylist = userStore.playList.find(
        (pl: any) => pl.userId === userStore.user?.userId && pl.specialType === 5
      );

      if (!favoritePlaylist) {
        message.warning(t('player.playBar.intelligenceMode.noFavoritePlaylist'));
        return;
      }

      // 获取喜欢的歌曲列表
      const likedListRes = await getLikedList(userStore.user.userId);
      const likedIds = likedListRes.data?.ids || [];

      if (likedIds.length === 0) {
        message.warning(t('player.playBar.intelligenceMode.noLikedSongs'));
        return;
      }

      // 随机选择一首歌曲
      const randomSongId = likedIds[Math.floor(Math.random() * likedIds.length)];

      // 调用心动模式API
      const { getIntelligenceList } = await import('@/api/music');
      const res = await getIntelligenceList({
        id: randomSongId,
        pid: favoritePlaylist.id
      });

      if (res.data?.data && res.data.data.length > 0) {
        const intelligenceSongs = res.data.data.map((item: any) => ({
          id: item.id,
          name: item.songInfo.name,
          picUrl: item.songInfo.al?.picUrl,
          source: 'netease' as Platform,
          song: item.songInfo,
          ...item.songInfo,
          playLoading: false
        }));

        // 设置心动模式状态
        isIntelligenceMode.value = true;
        intelligenceModeInfo.value = {
          playlistId: favoritePlaylist.id,
          seedSongId: randomSongId
        };
        playlistStore.playMode = 3; // 设置播放模式为心动模式

        setLocalStorageItem('isIntelligenceMode', true);
        setLocalStorageItem('intelligenceModeInfo', intelligenceModeInfo.value);

        // 替换播放列表并开始播放
        playlistStore.setPlayList(intelligenceSongs, false, true);
        const { playTrack } = await import('@/services/playbackController');
        await playTrack(intelligenceSongs[0], true);
      } else {
        message.error(t('player.playBar.intelligenceMode.failed'));
      }
    } catch (error) {
      console.error('心动模式播放失败:', error);
      message.error(t('player.playBar.intelligenceMode.error'));
    }
  };

  /**
   * 清除心动模式状态
   * @param skipPlayModeChange 是否跳过播放模式切换
   */
  const clearIntelligenceMode = (skipPlayModeChange: boolean = false) => {
    console.log(
      '[IntelligenceMode] clearIntelligenceMode 被调用，skipPlayModeChange:',
      skipPlayModeChange
    );

    isIntelligenceMode.value = false;
    intelligenceModeInfo.value = null;
    setLocalStorageItem('isIntelligenceMode', false);
    localStorage.removeItem('intelligenceModeInfo');

    console.log(
      '[IntelligenceMode] 心动模式状态已清除，isIntelligenceMode:',
      isIntelligenceMode.value
    );

    // 自动切换播放模式为顺序播放 (playMode = 0)
    if (!skipPlayModeChange) {
      (async () => {
        const { usePlaylistStore } = await import('./playlist');
        const playlistStore = usePlaylistStore();

        if (playlistStore.playMode === 3) {
          console.log('[IntelligenceMode] 退出心动模式，自动切换播放模式为顺序播放');
          playlistStore.playMode = 0;
        }
      })();
    }
  };

  return {
    // 状态
    isIntelligenceMode,
    intelligenceModeInfo,

    // Actions
    playIntelligenceMode,
    clearIntelligenceMode
  };
});

import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { SongResult } from '@/types/music';
import type { DjProgram } from '@/types/podcast';

// ==================== 类型定义 ====================

// 歌单历史记录
export type PlaylistHistoryItem = {
  id: number;
  name: string;
  coverImgUrl?: string;
  picUrl?: string;
  trackCount?: number;
  playCount?: number;
  creator?: {
    nickname: string;
    userId: number;
  };
  count?: number;
  lastPlayTime?: number;
};

// 专辑历史记录
export type AlbumHistoryItem = {
  id: number;
  name: string;
  picUrl?: string;
  size?: number;
  artist?: {
    name: string;
    id: number;
  };
  count?: number;
  lastPlayTime?: number;
};

// 播客电台历史记录
export type PodcastRadioHistoryItem = {
  id: number;
  name: string;
  picUrl: string;
  desc?: string;
  dj?: {
    nickname: string;
    userId: number;
  };
  count?: number;
  lastPlayTime?: number;
  type?: string;
};

// 历史记录最大条数
const MAX_HISTORY_SIZE = 500;

/**
 * 播放记录统一管理 Store
 * 使用 Pinia 单例模式，解决多实例不同步问题
 * 适配：音乐、播客、本地音乐、歌单、专辑
 */
export const usePlayHistoryStore = defineStore(
  'playHistory',
  () => {
    // ==================== 状态 ====================
    const musicHistory = ref<SongResult[]>([]);
    const podcastHistory = ref<DjProgram[]>([]);
    const playlistHistory = ref<PlaylistHistoryItem[]>([]);
    const albumHistory = ref<AlbumHistoryItem[]>([]);
    const podcastRadioHistory = ref<PodcastRadioHistoryItem[]>([]);

    // ==================== 音乐记录 ====================

    const addMusic = (music: SongResult): void => {
      const index = musicHistory.value.findIndex((item) => item.id === music.id);
      if (index !== -1) {
        musicHistory.value[index].count = (musicHistory.value[index].count || 0) + 1;
        musicHistory.value.unshift(musicHistory.value.splice(index, 1)[0]);
      } else {
        musicHistory.value.unshift({ ...music, count: 1 });
      }
      if (musicHistory.value.length > MAX_HISTORY_SIZE) {
        musicHistory.value.pop();
      }
    };

    const delMusic = (music: SongResult): void => {
      const index = musicHistory.value.findIndex((item) => item.id === music.id);
      if (index !== -1) {
        musicHistory.value.splice(index, 1);
      }
    };

    // ==================== 播客节目记录 ====================

    const addPodcast = (program: DjProgram): void => {
      const index = podcastHistory.value.findIndex((item) => item.id === program.id);
      if (index !== -1) {
        podcastHistory.value.unshift(podcastHistory.value.splice(index, 1)[0]);
      } else {
        podcastHistory.value.unshift(program);
      }
      if (podcastHistory.value.length > MAX_HISTORY_SIZE) {
        podcastHistory.value.pop();
      }
    };

    const delPodcast = (program: DjProgram): void => {
      const index = podcastHistory.value.findIndex((item) => item.id === program.id);
      if (index !== -1) {
        podcastHistory.value.splice(index, 1);
      }
    };

    // ==================== 歌单记录 ====================

    const addPlaylist = (playlist: PlaylistHistoryItem): void => {
      const index = playlistHistory.value.findIndex((item) => item.id === playlist.id);
      const now = Date.now();
      if (index !== -1) {
        playlistHistory.value[index].count = (playlistHistory.value[index].count || 0) + 1;
        playlistHistory.value[index].lastPlayTime = now;
        playlistHistory.value.unshift(playlistHistory.value.splice(index, 1)[0]);
      } else {
        playlistHistory.value.unshift({ ...playlist, count: 1, lastPlayTime: now });
      }
      if (playlistHistory.value.length > MAX_HISTORY_SIZE) {
        playlistHistory.value.pop();
      }
    };

    const delPlaylist = (playlist: PlaylistHistoryItem): void => {
      const index = playlistHistory.value.findIndex((item) => item.id === playlist.id);
      if (index !== -1) {
        playlistHistory.value.splice(index, 1);
      }
    };

    // ==================== 专辑记录 ====================

    const addAlbum = (album: AlbumHistoryItem): void => {
      const index = albumHistory.value.findIndex((item) => item.id === album.id);
      const now = Date.now();
      if (index !== -1) {
        albumHistory.value[index].count = (albumHistory.value[index].count || 0) + 1;
        albumHistory.value[index].lastPlayTime = now;
        albumHistory.value.unshift(albumHistory.value.splice(index, 1)[0]);
      } else {
        albumHistory.value.unshift({ ...album, count: 1, lastPlayTime: now });
      }
      if (albumHistory.value.length > MAX_HISTORY_SIZE) {
        albumHistory.value.pop();
      }
    };

    const delAlbum = (album: AlbumHistoryItem): void => {
      const index = albumHistory.value.findIndex((item) => item.id === album.id);
      if (index !== -1) {
        albumHistory.value.splice(index, 1);
      }
    };

    // ==================== 播客电台记录 ====================

    const addPodcastRadio = (radio: PodcastRadioHistoryItem): void => {
      const index = podcastRadioHistory.value.findIndex((item) => item.id === radio.id);
      const now = Date.now();
      if (index !== -1) {
        const existing = podcastRadioHistory.value.splice(index, 1)[0];
        existing.count = (existing.count || 0) + 1;
        existing.lastPlayTime = now;
        podcastRadioHistory.value.unshift(existing);
      } else {
        podcastRadioHistory.value.unshift({ ...radio, count: 1, lastPlayTime: now });
      }
      if (podcastRadioHistory.value.length > MAX_HISTORY_SIZE) {
        podcastRadioHistory.value.pop();
      }
    };

    const delPodcastRadio = (radio: PodcastRadioHistoryItem): void => {
      const index = podcastRadioHistory.value.findIndex((item) => item.id === radio.id);
      if (index !== -1) {
        podcastRadioHistory.value.splice(index, 1);
      }
    };

    // ==================== 清空操作 ====================

    const clearMusicHistory = (): void => {
      musicHistory.value = [];
    };

    const clearPodcastHistory = (): void => {
      podcastHistory.value = [];
    };

    const clearPlaylistHistory = (): void => {
      playlistHistory.value = [];
    };

    const clearAlbumHistory = (): void => {
      albumHistory.value = [];
    };

    const clearPodcastRadioHistory = (): void => {
      podcastRadioHistory.value = [];
    };

    const clearAll = (): void => {
      clearMusicHistory();
      clearPodcastHistory();
      clearPlaylistHistory();
      clearAlbumHistory();
      clearPodcastRadioHistory();
    };

    // ==================== 数据迁移 ====================

    /**
     * 从旧的 localStorage 数据迁移到 Pinia store
     * 只在首次启动时执行一次
     */
    const migrateFromLocalStorage = (): void => {
      const migrated = localStorage.getItem('playHistory-migrated');
      if (migrated) return;

      try {
        // 迁移音乐记录
        const oldMusic = localStorage.getItem('musicHistory');
        if (oldMusic) {
          const parsed = JSON.parse(oldMusic);
          if (Array.isArray(parsed) && parsed.length > 0 && musicHistory.value.length === 0) {
            musicHistory.value = parsed;
          }
        }

        // 迁移播客记录
        const oldPodcast = localStorage.getItem('podcastHistory');
        if (oldPodcast) {
          const parsed = JSON.parse(oldPodcast);
          if (Array.isArray(parsed) && parsed.length > 0 && podcastHistory.value.length === 0) {
            podcastHistory.value = parsed;
          }
        }

        // 迁移歌单记录
        const oldPlaylist = localStorage.getItem('playlistHistory');
        if (oldPlaylist) {
          const parsed = JSON.parse(oldPlaylist);
          if (Array.isArray(parsed) && parsed.length > 0 && playlistHistory.value.length === 0) {
            playlistHistory.value = parsed;
          }
        }

        // 迁移专辑记录
        const oldAlbum = localStorage.getItem('albumHistory');
        if (oldAlbum) {
          const parsed = JSON.parse(oldAlbum);
          if (Array.isArray(parsed) && parsed.length > 0 && albumHistory.value.length === 0) {
            albumHistory.value = parsed;
          }
        }

        // 迁移播客电台记录
        const oldRadio = localStorage.getItem('podcastRadioHistory');
        if (oldRadio) {
          const parsed = JSON.parse(oldRadio);
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            podcastRadioHistory.value.length === 0
          ) {
            podcastRadioHistory.value = parsed;
          }
        }

        localStorage.setItem('playHistory-migrated', '1');
        console.log('[PlayHistory] 数据迁移完成');
      } catch (error) {
        console.error('[PlayHistory] 数据迁移失败:', error);
      }
    };

    return {
      // 状态
      musicHistory,
      podcastHistory,
      playlistHistory,
      albumHistory,
      podcastRadioHistory,

      // 音乐
      addMusic,
      delMusic,
      clearMusicHistory,

      // 播客节目
      addPodcast,
      delPodcast,
      clearPodcastHistory,

      // 歌单
      addPlaylist,
      delPlaylist,
      clearPlaylistHistory,

      // 专辑
      addAlbum,
      delAlbum,
      clearAlbumHistory,

      // 播客电台
      addPodcastRadio,
      delPodcastRadio,
      clearPodcastRadioHistory,

      // 通用
      clearAll,
      migrateFromLocalStorage
    };
  },
  {
    persist: {
      key: 'play-history-store',
      storage: localStorage,
      pick: [
        'musicHistory',
        'podcastHistory',
        'playlistHistory',
        'albumHistory',
        'podcastRadioHistory'
      ]
    }
  }
);

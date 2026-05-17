import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { SongResult } from '@/types/music';
import type { DjProgram } from '@/types/podcast';
import { debouncedLocalStorage, flushDebouncedStorage } from '@/utils/debouncedStorage';
import type { MusicHistoryItem } from '@/utils/persistedSong';
import {
  minifyHistoryEntry,
  minifyHistoryList,
  stripBase64CoversList
} from '@/utils/persistedSong';

export type { MusicHistoryItem };

// 一次性清理 v1 时代遗留的 localStorage key。
// 旧版本以 5 个独立 key 单独存历史，新版本合并到 PERSIST_KEY 由 persistedstate 管。
// 不做数据迁移：历史是低关键性衍生数据，老用户升级后看到空"最近播放"，重新听几次即可。
// 仅清掉旧 key 释放配额，避免和新 key 双倍占用
const LEGACY_KEYS = [
  'musicHistory',
  'podcastHistory',
  'playlistHistory',
  'albumHistory',
  'podcastRadioHistory',
  // v1 迁移方案的 flag，已随 e53a035 发布到用户机器上
  'playHistory-migrated',
  // v1 时代独立持久化的播放模式，现已并入 player-core-store
  'playMode'
];

export const cleanupLegacyPlayHistoryStorage = (): void => {
  if (localStorage.getItem('playHistory-cleaned-v1')) return;
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem('playHistory-cleaned-v1', '1');
};

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

// persistedstate 的 storage key
const PERSIST_KEY = 'play-history-store';

// pick 出来的持久化状态，给 persistedstate.serializer 与 clearAll 同步落盘共用
type PersistedPlayHistoryState = {
  musicHistory: MusicHistoryItem[];
  podcastHistory: DjProgram[];
  playlistHistory: PlaylistHistoryItem[];
  albumHistory: AlbumHistoryItem[];
  podcastRadioHistory: PodcastRadioHistoryItem[];
};

// 序列化层兜底：哪怕有代码绕过 addMusic 直接 push 完整 SongResult，也能在 serialize 时
// 再过一遍 minifyHistoryList，确保 localStorage 里的 musicHistory 不混入 lyric/song/base64 封面
//
// podcast/playlist/album/podcastRadio 等历史也走 stripBase64CoversList 兜底：
// 它们的图片字段（picUrl / coverImgUrl / coverUrl）若被注入 base64 Data URL，
// 同样会撑爆 5MB 配额；保持四类历史的防御对称，避免某一处漏掉变成隐患
//
// 入参用 any 是为了同时兼容 persistedstate 的 StateTree 与 clearAll 手工构造的 PersistedPlayHistoryState
const serializePlayHistoryState = (state: any): string => {
  const s = state as PersistedPlayHistoryState;
  return JSON.stringify({
    ...state,
    musicHistory: minifyHistoryList(
      s.musicHistory as unknown as (SongResult & {
        count?: number;
        lastPlayTime?: number;
      })[]
    ),
    podcastHistory: stripBase64CoversList(s.podcastHistory),
    playlistHistory: stripBase64CoversList(s.playlistHistory),
    albumHistory: stripBase64CoversList(s.albumHistory),
    podcastRadioHistory: stripBase64CoversList(s.podcastRadioHistory)
  });
};

/**
 * 播放记录统一管理 Store
 * 使用 Pinia 单例模式，解决多实例不同步问题
 * 适配：音乐、播客、本地音乐、歌单、专辑
 */
export const usePlayHistoryStore = defineStore(
  'playHistory',
  () => {
    // ==================== 状态 ====================
    // musicHistory 用 MusicHistoryItem 而非完整 SongResult：lyric/song/expiredAt 等
    // 派生字段不进 localStorage，避免 5MB 配额被撑爆。详见 utils/persistedSong.ts
    const musicHistory = ref<MusicHistoryItem[]>([]);
    const podcastHistory = ref<DjProgram[]>([]);
    const playlistHistory = ref<PlaylistHistoryItem[]>([]);
    const albumHistory = ref<AlbumHistoryItem[]>([]);
    const podcastRadioHistory = ref<PodcastRadioHistoryItem[]>([]);

    // ==================== 音乐记录 ====================

    // lastPlayTime 语义：每次播放都刷新为当前时间（"最近一次播放"），不是"首次添加"。
    // 与 playlistHistory/albumHistory 等其他历史保持一致；count 仍为累计播放次数
    const addMusic = (music: SongResult): void => {
      const index = musicHistory.value.findIndex((item) => item.id === music.id);
      // 单步 ref 重赋值，避免 splice/pop + unshift 多次触发 watch 与持久化
      let next: MusicHistoryItem[];
      if (index !== -1) {
        // 命中已有条目：累加计数 + 刷新时间戳，picUrl/al 等用新数据覆盖（封面可能换了短引用）
        const existing = musicHistory.value[index];
        const refreshed: MusicHistoryItem = {
          ...minifyHistoryEntry(music),
          count: (existing.count || 0) + 1,
          lastPlayTime: Date.now()
        };
        next = [
          refreshed,
          ...musicHistory.value.slice(0, index),
          ...musicHistory.value.slice(index + 1)
        ];
      } else {
        next = [
          minifyHistoryEntry({ ...music, count: 1, lastPlayTime: Date.now() }),
          ...musicHistory.value
        ];
      }
      musicHistory.value = next.length > MAX_HISTORY_SIZE ? next.slice(0, MAX_HISTORY_SIZE) : next;
    };

    // 删除入参允许 SongResult 或 MusicHistoryItem，仅按 id 匹配，类型放宽不影响逻辑
    const delMusic = (music: { id: SongResult['id'] }): void => {
      const index = musicHistory.value.findIndex((item) => item.id === music.id);
      if (index !== -1) {
        musicHistory.value.splice(index, 1);
      }
    };

    // ==================== 播客节目记录 ====================

    const addPodcast = (program: DjProgram): void => {
      const index = podcastHistory.value.findIndex((item) => item.id === program.id);
      // 单步 ref 重赋值，避免 splice/unshift/pop 多次触发 watch 与持久化（与 addMusic 一致）
      let next: DjProgram[];
      if (index !== -1) {
        next = [
          podcastHistory.value[index],
          ...podcastHistory.value.slice(0, index),
          ...podcastHistory.value.slice(index + 1)
        ];
      } else {
        next = [program, ...podcastHistory.value];
      }
      podcastHistory.value =
        next.length > MAX_HISTORY_SIZE ? next.slice(0, MAX_HISTORY_SIZE) : next;
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
      let next: PlaylistHistoryItem[];
      if (index !== -1) {
        const existing = playlistHistory.value[index];
        next = [
          { ...existing, count: (existing.count || 0) + 1, lastPlayTime: now },
          ...playlistHistory.value.slice(0, index),
          ...playlistHistory.value.slice(index + 1)
        ];
      } else {
        next = [{ ...playlist, count: 1, lastPlayTime: now }, ...playlistHistory.value];
      }
      playlistHistory.value =
        next.length > MAX_HISTORY_SIZE ? next.slice(0, MAX_HISTORY_SIZE) : next;
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
      let next: AlbumHistoryItem[];
      if (index !== -1) {
        const existing = albumHistory.value[index];
        next = [
          { ...existing, count: (existing.count || 0) + 1, lastPlayTime: now },
          ...albumHistory.value.slice(0, index),
          ...albumHistory.value.slice(index + 1)
        ];
      } else {
        next = [{ ...album, count: 1, lastPlayTime: now }, ...albumHistory.value];
      }
      albumHistory.value = next.length > MAX_HISTORY_SIZE ? next.slice(0, MAX_HISTORY_SIZE) : next;
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
      let next: PodcastRadioHistoryItem[];
      if (index !== -1) {
        const existing = podcastRadioHistory.value[index];
        next = [
          { ...existing, count: (existing.count || 0) + 1, lastPlayTime: now },
          ...podcastRadioHistory.value.slice(0, index),
          ...podcastRadioHistory.value.slice(index + 1)
        ];
      } else {
        next = [{ ...radio, count: 1, lastPlayTime: now }, ...podcastRadioHistory.value];
      }
      podcastRadioHistory.value =
        next.length > MAX_HISTORY_SIZE ? next.slice(0, MAX_HISTORY_SIZE) : next;
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
      // 同步落盘空状态：persistedstate 的 watch 异步触发，clearAll 同步代码返回时
      // watch 还没把空状态送进 storage；再叠 2s 防抖窗口 → 立刻 kill -9 会让 PERSIST_KEY
      // 留在旧历史。手动 setItem 让"clearAll 返回 = 落盘完成"成立。
      // 前面 flushDebouncedStorage 是顺手清掉别的 store 排队的写入与防抖定时器，
      // 避免后续 watch 异步把同一份空状态再写一次（无害但多余 I/O）
      flushDebouncedStorage();
      try {
        localStorage.setItem(
          PERSIST_KEY,
          serializePlayHistoryState({
            musicHistory: [],
            podcastHistory: [],
            playlistHistory: [],
            albumHistory: [],
            podcastRadioHistory: []
          })
        );
      } catch (error) {
        console.error('[PlayHistory] 清空落盘失败:', error);
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
      clearAll
    };
  },
  {
    persist: {
      key: PERSIST_KEY,
      // 共用防抖 storage：addMusic 在播放切换时会触发 mutation，避免每次都 stringify
      // 整条 musicHistory（最多 500 条）走一遍 minifyHistoryList
      storage: debouncedLocalStorage,
      pick: [
        'musicHistory',
        'podcastHistory',
        'playlistHistory',
        'albumHistory',
        'podcastRadioHistory'
      ],
      // 与 clearAll 的同步落盘共用同一个序列化函数，避免格式漂移
      serializer: {
        serialize: serializePlayHistoryState,
        deserialize: JSON.parse
      }
    }
  }
);

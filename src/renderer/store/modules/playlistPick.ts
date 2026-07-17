/**
 * 「添加到歌单」点选模式：发现页点添加 → 左侧歌单闪烁点选，无中间弹窗。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { msAppendPlaylistTracks, msLikeTrack } from '@/api/musicSource';
import type { SongResult } from '@/types/music';
import { showBottomToast } from '@/utils/shortcutToast';
import { getSongArtistNames, getSongCoverUrl } from '@/utils/songFields';

import { useFavoriteStore } from './favorite';
import { isLikedPlaylist, useUserPlaylistsStore } from './userPlaylists';

export type PlaylistPickSong = {
  id: string;
  name: string;
  coverUrl: string;
  artistText: string;
};

export const usePlaylistPickStore = defineStore('playlistPick', () => {
  const active = ref(false);
  const song = ref<PlaylistPickSong | null>(null);
  const busy = ref(false);
  /** 从侧栏 + 展开的新建面板 */
  const createOpen = ref(false);

  const hasSong = computed(() => !!song.value?.id);

  /** 当前点选曲是否已在「我喜欢」（用于不闪该封面 + tip 文案） */
  const songAlreadyLiked = computed(() => {
    const s = song.value;
    if (!s?.id) return false;
    return useFavoriteStore().isFavorite(s.id);
  });

  const toPickSong = (s: SongResult): PlaylistPickSong => ({
    id: String(s.id),
    name: s.name || '未知歌曲',
    coverUrl: getSongCoverUrl(s) || s.picUrl || '',
    artistText: getSongArtistNames(s, ' / ', '未知歌手')
  });

  const start = (s: SongResult) => {
    if (s?.id == null || s.id === '') {
      showBottomToast('没有可添加的歌曲');
      return;
    }
    song.value = toPickSong(s);
    active.value = true;
    createOpen.value = false;
    if (useFavoriteStore().isFavorite(s.id)) {
      showBottomToast('点击左侧歌单添加 · 已在「我喜欢」，该封面不闪');
    } else {
      showBottomToast('点击左侧歌单添加');
    }
  };

  const cancel = () => {
    active.value = false;
    song.value = null;
    createOpen.value = false;
    busy.value = false;
  };

  const openCreate = () => {
    createOpen.value = true;
  };

  const closeCreate = () => {
    createOpen.value = false;
  };

  /** 点选目标是否应闪烁：已在喜欢的「我喜欢」歌单不闪 */
  const shouldPulsePlaylist = (pl: { name?: string; kind?: string; id?: string }) => {
    if (!active.value) return false;
    if (isLikedPlaylist(pl) && songAlreadyLiked.value) return false;
    return true;
  };

  const appendTo = async (
    playlistId: string,
    opts?: { toastName?: string; kind?: string; name?: string }
  ) => {
    const s = song.value;
    if (!s?.id || busy.value) return false;
    busy.value = true;
    const plStore = useUserPlaylistsStore();
    const fav = useFavoriteStore();
    const asLiked = isLikedPlaylist({ kind: opts?.kind, name: opts?.name || opts?.toastName });
    try {
      await msAppendPlaylistTracks(String(playlistId), [s.id]);
      // 任意歌单：侧栏封面立刻换成刚加的这首
      if (s.coverUrl) plStore.patchCover(playlistId, s.coverUrl);
      // 「我喜欢」额外：同步点赞
      if (asLiked) {
        try {
          if (!fav.isFavorite(s.id)) {
            await msLikeTrack(s.id);
            await fav.addToFavorite(s.id);
          }
        } catch (e) {
          console.warn('[playlistPick] like sync failed', e);
        }
      }
      showBottomToast(opts?.toastName ? `已加入「${opts.toastName}」` : '已加入歌单');
      cancel();
      return true;
    } catch (e: any) {
      showBottomToast(e?.message || '添加失败');
      return false;
    } finally {
      busy.value = false;
    }
  };

  return {
    active,
    song,
    busy,
    createOpen,
    hasSong,
    songAlreadyLiked,
    start,
    cancel,
    openCreate,
    closeCreate,
    appendTo,
    shouldPulsePlaylist,
    toPickSong
  };
});

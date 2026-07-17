import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
  isMusicSourceAvailable,
  msCreatePlaylist,
  msDeletePlaylist,
  msGetAuthState,
  msListUserPlaylists,
  type MsPlaylist,
  msUpdatePlaylist
} from '@/api/musicSource';
import { isElectron } from '@/utils';

export type SidebarPlaylist = {
  id: string;
  name: string;
  coverUrl?: string;
  trackCount?: number;
  kind?: string;
};

/** 过滤汽水空歌单假封面（仅 CDN 前缀 …/img/ 会显示破图） */
function sanitizeCoverUrl(url?: string | null): string | undefined {
  if (!url || !String(url).trim()) return undefined;
  const s = String(url).trim();
  try {
    const path = new URL(s).pathname.replace(/\/+$/, '') || '';
    if (!path || path === '/img') return undefined;
  } catch {
    return undefined;
  }
  return s;
}

function mapPl(p: MsPlaylist): SidebarPlaylist {
  return {
    id: String(p.id),
    name: p.name || '未命名歌单',
    coverUrl: sanitizeCoverUrl(p.coverUrl),
    trackCount: p.trackCount,
    kind: p.kind
  };
}

/** 汽水「我喜欢的音乐」系统歌单 */
export function isLikedPlaylist(pl: { name?: string; kind?: string } | null | undefined): boolean {
  if (!pl) return false;
  const kind = String(pl.kind || '').toLowerCase();
  if (kind === 'liked' || kind === 'favorite' || kind.includes('like')) return true;
  return /我喜欢/.test(String(pl.name || ''));
}

export const useUserPlaylistsStore = defineStore('userPlaylists', () => {
  const items = ref<SidebarPlaylist[]>([]);
  const loading = ref(false);
  const authenticated = ref(false);
  const lastError = ref('');

  const hasPlaylists = computed(() => items.value.length > 0);
  const likedPlaylist = computed(() => items.value.find((p) => isLikedPlaylist(p)) || null);

  const reload = async () => {
    if (!isElectron || !isMusicSourceAvailable()) {
      authenticated.value = false;
      items.value = [];
      return;
    }
    loading.value = true;
    lastError.value = '';
    try {
      const auth = await msGetAuthState();
      authenticated.value = !!auth.authenticated;
      if (!auth.authenticated) {
        items.value = [];
        return;
      }
      const list = await msListUserPlaylists({ limit: 100 });
      items.value = (list || []).map(mapPl);
    } catch (error: any) {
      console.error('[userPlaylists] reload failed', error);
      lastError.value = error?.message || '加载歌单失败';
      items.value = [];
    } finally {
      loading.value = false;
    }
  };

  const create = async (name: string) => {
    const n = name.trim();
    if (!n) throw new Error('请输入歌单名称');
    const pl = await msCreatePlaylist({ name: n, isPrivate: true });
    await reload();
    return mapPl(pl);
  };

  const rename = async (playlistId: string, name: string) => {
    const n = name.trim();
    if (!n) throw new Error('请输入歌单名称');
    await msUpdatePlaylist(playlistId, { name: n });
    const idx = items.value.findIndex((p) => p.id === playlistId);
    if (idx >= 0) {
      items.value[idx] = { ...items.value[idx], name: n };
    }
    await reload();
  };

  const remove = async (playlistId: string) => {
    await msDeletePlaylist(playlistId);
    items.value = items.value.filter((p) => p.id !== playlistId);
    await reload();
  };

  /** 乐观更新封面；传 null/'' 清空（空歌单显示空空如也图） */
  const patchCover = (playlistId: string, coverUrl?: string | null) => {
    const i = items.value.findIndex((p) => String(p.id) === String(playlistId));
    if (i < 0) return;
    if (coverUrl == null || coverUrl === '') {
      if (items.value[i].coverUrl == null) return;
      items.value[i] = { ...items.value[i], coverUrl: undefined };
      return;
    }
    const safe = sanitizeCoverUrl(coverUrl);
    if (!safe) {
      if (items.value[i].coverUrl == null) return;
      items.value[i] = { ...items.value[i], coverUrl: undefined };
      return;
    }
    if (items.value[i].coverUrl === safe) return;
    items.value[i] = { ...items.value[i], coverUrl: safe };
  };

  const coversMatch = (a?: string, b?: string) => {
    if (!a || !b) return false;
    const aa = a.split('?')[0] || '';
    const bb = b.split('?')[0] || '';
    if (!aa || !bb) return false;
    return aa === bb || a.includes(bb.slice(-40)) || b.includes(aa.slice(-40));
  };

  /**
   * 移出曲目后：
   * - 封面不是这首 → 不动
   * - 是这首且歌单已空 → 清封面（占位图标）
   * - 是这首且还有歌 → reload 拿下一首封面
   */
  const onTrackRemovedFromPlaylist = async (
    playlistId: string,
    songCoverUrl?: string,
    remainingCount?: number
  ) => {
    const pl = items.value.find((p) => String(p.id) === String(playlistId));
    if (!pl) return;
    const count =
      remainingCount != null && Number.isFinite(remainingCount) ? remainingCount : pl.trackCount;
    if (count === 0) {
      patchCover(playlistId, null);
      return;
    }
    if (!songCoverUrl || !pl.coverUrl) return;
    if (!coversMatch(pl.coverUrl, songCoverUrl)) return;
    await reload();
  };

  /** 曲目数本地微调；未知 count 时 +1 → 1，-1 → 0 */
  const patchTrackCount = (playlistId: string, delta: number) => {
    const i = items.value.findIndex((p) => String(p.id) === String(playlistId));
    if (i < 0) return;
    const cur = items.value[i].trackCount;
    let next: number;
    if (cur == null || !Number.isFinite(cur)) {
      next = delta > 0 ? delta : 0;
    } else {
      next = Math.max(0, cur + delta);
    }
    items.value[i] = { ...items.value[i], trackCount: next };
  };

  /** 打开歌单详情后把真实 count 写回侧栏 tip */
  const setTrackCount = (playlistId: string, count: number) => {
    const i = items.value.findIndex((p) => String(p.id) === String(playlistId));
    if (i < 0) return;
    if (!Number.isFinite(count)) return;
    const n = Math.max(0, Math.floor(count));
    if (items.value[i].trackCount === n) return;
    items.value[i] = { ...items.value[i], trackCount: n };
  };

  /** 取消喜欢：仅「我喜欢」且封面匹配时 reload */
  const refreshLikedCoverIfMatches = async (songCoverUrl?: string) => {
    const liked = likedPlaylist.value;
    if (!liked) return;
    await onTrackRemovedFromPlaylist(liked.id, songCoverUrl);
  };

  return {
    items,
    loading,
    authenticated,
    lastError,
    hasPlaylists,
    likedPlaylist,
    reload,
    create,
    rename,
    remove,
    patchCover,
    patchTrackCount,
    setTrackCount,
    onTrackRemovedFromPlaylist,
    refreshLikedCoverIfMatches
  };
});

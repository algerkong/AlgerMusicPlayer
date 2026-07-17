import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
  isMusicSourceAvailable,
  msCreatePlaylist,
  msDeletePlaylist,
  msGetAuthState,
  msListUserPlaylists,
  type MsPlaylist,
  msUpdatePlaylist} from '@/api/musicSource';
import { isElectron } from '@/utils';

export type SidebarPlaylist = {
  id: string;
  name: string;
  coverUrl?: string;
  trackCount?: number;
  kind?: string;
};

function mapPl(p: MsPlaylist): SidebarPlaylist {
  return {
    id: String(p.id),
    name: p.name || '未命名歌单',
    coverUrl: p.coverUrl,
    trackCount: p.trackCount,
    kind: p.kind
  };
}

export const useUserPlaylistsStore = defineStore('userPlaylists', () => {
  const items = ref<SidebarPlaylist[]>([]);
  const loading = ref(false);
  const authenticated = ref(false);
  const lastError = ref('');

  const hasPlaylists = computed(() => items.value.length > 0);

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

  return {
    items,
    loading,
    authenticated,
    lastError,
    hasPlaylists,
    reload,
    create,
    rename,
    remove
  };
});

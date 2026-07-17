import { defineStore } from 'pinia';
import { ref } from 'vue';

import { getLocalStorageItem, isBilibiliIdMatch, setLocalStorageItem } from '@/utils/playerUtils';

/** 雪花 id 一律用 string，禁止 parseInt/Number 丢精度 */
export function favoriteIdKey(id: number | string | null | undefined): string {
  if (id == null) return '';
  return String(id);
}

function idsEqual(a: number | string, b: number | string): boolean {
  const sa = favoriteIdKey(a);
  const sb = favoriteIdKey(b);
  if (!sa || !sb) return false;
  if (sa.includes('--') || sb.includes('--')) {
    return isBilibiliIdMatch(sa, sb);
  }
  return sa === sb;
}

/**
 * 收藏管理 Store — 仅 localStorage，无云端同步
 * id 统一存 string，兼容历史 number 条目
 */
export const useFavoriteStore = defineStore('favorite', () => {
  const favoriteList = ref<Array<number | string>>(getLocalStorageItem('favoriteList', []));
  const dislikeList = ref<Array<number | string>>(getLocalStorageItem('dislikeList', []));

  const normalizeList = (list: Array<number | string>) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of list) {
      const k = favoriteIdKey(id);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    return out;
  };

  const addToFavorite = async (id: number | string) => {
    const key = favoriteIdKey(id);
    if (!key) return;
    if (favoriteList.value.some((existingId) => idsEqual(existingId, key))) return;
    favoriteList.value = [...normalizeList(favoriteList.value), key];
    setLocalStorageItem('favoriteList', favoriteList.value);
  };

  const removeFromFavorite = async (id: number | string) => {
    favoriteList.value = favoriteList.value.filter((existingId) => !idsEqual(existingId, id));
    setLocalStorageItem('favoriteList', favoriteList.value);
  };

  const addToDislikeList = (id: number | string) => {
    const key = favoriteIdKey(id);
    if (!key) return;
    if (dislikeList.value.some((x) => idsEqual(x, key))) return;
    dislikeList.value = [...normalizeList(dislikeList.value as string[]), key];
    setLocalStorageItem('dislikeList', dislikeList.value);
  };

  const removeFromDislikeList = (id: number | string) => {
    dislikeList.value = dislikeList.value.filter((existingId) => !idsEqual(existingId, id));
    setLocalStorageItem('dislikeList', dislikeList.value);
  };

  const initializeFavoriteList = async () => {
    const localFavoriteList = localStorage.getItem('favoriteList');
    const localList: Array<number | string> = localFavoriteList
      ? JSON.parse(localFavoriteList)
      : [];
    favoriteList.value = normalizeList(localList);
    setLocalStorageItem('favoriteList', favoriteList.value);

    const localDislike = localStorage.getItem('dislikeList');
    if (localDislike) {
      try {
        dislikeList.value = normalizeList(JSON.parse(localDislike));
        setLocalStorageItem('dislikeList', dislikeList.value);
      } catch {
        /* ignore */
      }
    }
  };

  const isFavorite = (id: number | string): boolean => {
    return favoriteList.value.some((existingId) => idsEqual(existingId, id));
  };

  const isDisliked = (id: number | string): boolean => {
    return dislikeList.value.some((existingId) => idsEqual(existingId, id));
  };

  /**
   * 批量写入喜欢（如打开汽水「我喜欢的音乐」歌单时同步服务端曲目 id）。
   * 只增不减，避免清掉用户在本机另点的喜欢。
   */
  const seedFavorites = (ids: Array<number | string | null | undefined>) => {
    const set = new Set(normalizeList(favoriteList.value));
    let added = 0;
    for (const id of ids) {
      const k = favoriteIdKey(id as number | string);
      if (!k || set.has(k)) continue;
      set.add(k);
      added += 1;
    }
    if (added === 0) return;
    favoriteList.value = [...set];
    setLocalStorageItem('favoriteList', favoriteList.value);
  };

  return {
    favoriteList,
    dislikeList,
    addToFavorite,
    removeFromFavorite,
    addToDislikeList,
    removeFromDislikeList,
    initializeFavoriteList,
    isFavorite,
    isDisliked,
    seedFavorites
  };
});

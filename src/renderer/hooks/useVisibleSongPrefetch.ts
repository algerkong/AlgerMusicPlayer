import { type Ref, watch, type WatchSource } from 'vue';

import { prefetchSongUrl } from '@/hooks/usePlayerHooks';
import type { SongResult } from '@/types/music';

type Options = {
  /** 同时 resolve 上限，默认 3 */
  maxConcurrent?: number;
  /** 每次调度最多入队几首，默认 12 */
  maxPrefetch?: number;
  /** 是否在列表变化时自动调度，默认 true */
  auto?: boolean;
};

/**
 * 列表可见区预取：搜索/歌单加载后，对前 N 首并发 prefetchSongUrl（带上限）。
 * 与 getSongDetail inflight / audio standby 共用，不重复打网。
 */
export function useVisibleSongPrefetch(
  songs: WatchSource<SongResult[] | undefined | null> | Ref<SongResult[] | undefined | null>,
  options: Options = {}
) {
  const maxConcurrent = options.maxConcurrent ?? 3;
  const maxPrefetch = options.maxPrefetch ?? 12;
  const auto = options.auto !== false;

  let running = 0;
  const queue: SongResult[] = [];
  const queuedIds = new Set<string>();

  const pump = () => {
    while (running < maxConcurrent && queue.length) {
      const song = queue.shift()!;
      const id = String(song.id);
      running += 1;
      void prefetchSongUrl(song)
        .catch(() => null)
        .finally(() => {
          queuedIds.delete(id);
          running -= 1;
          pump();
        });
    }
  };

  const schedulePrefetch = (list: SongResult[] | undefined | null) => {
    if (!list?.length) return;
    const slice = list.slice(0, maxPrefetch);
    for (const song of slice) {
      if (!song?.id) continue;
      const id = String(song.id);
      if (queuedIds.has(id)) continue;
      // 有/无 URL 都入队：prefetchSongUrl 会 resolve 或 warm standby
      queuedIds.add(id);
      queue.push(song);
    }
    pump();
  };

  if (auto) {
    watch(
      songs,
      (list) => {
        schedulePrefetch(list as SongResult[] | undefined);
      },
      { immediate: true, deep: false }
    );
  }

  return { schedulePrefetch };
}

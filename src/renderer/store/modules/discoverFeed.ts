import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
  isMusicSourceAvailable,
  mapMsSongToSongResult,
  msDislikeTrack,
  msGetAuthState,
  msGetRelatedSongs,
  msGetSongFeed,
  msLikeTrack,
  msUnlikeTrack
} from '@/api/musicSource';
import { useFavoriteStore } from '@/store/modules/favorite';
import { usePlayerStore } from '@/store/modules/player';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';
import { showBottomToast } from '@/utils/shortcutToast';

const PREFETCH_BEFORE = 1;
const PREFETCH_AFTER = 3;
const LOAD_MORE_THRESHOLD = 4;
/** 切歌代数：快速连切时丢弃过期 setPlay */
let playGen = 0;
/** 正在预取的 songId，避免重复打 API */
const prefetchingIds = new Set<string>();

export const useDiscoverFeedStore = defineStore('discoverFeed', () => {
  /** 展示序列：播放全部时 = 全局队列 + 推荐尾；单曲点播 = 当前曲 + 推荐尾 */
  const items = ref<SongResult[]>([]);
  /** 纯推荐流（API），与外部队列分离，便于「队列播完再进推荐」 */
  const recommendItems = ref<SongResult[]>([]);
  const index = ref(0);
  const loading = ref(false);
  const loadingMore = ref(false);
  const hasMore = ref(true);
  const error = ref('');
  const needLogin = ref(false);
  const active = ref(false);
  const mixSessionCount = ref(1);
  /** generation token to ignore stale async results */
  let gen = 0;

  const current = computed(() => items.value[index.value] || null);
  const isEmpty = computed(() => !loading.value && items.value.length === 0);

  const playedMedia = () =>
    items.value.slice(0, Math.max(0, index.value)).map((s) => ({
      id: String(s.id),
      type: 'track' as const
    }));

  /** 互动数：优先保留 >0 的值，避免 queue/playMusic 无字段冲掉 feed stats */
  const pickCount = (...vals: Array<number | undefined | null>): number | undefined => {
    for (const v of vals) {
      if (v != null && Number.isFinite(Number(v)) && Number(v) > 0) return Number(v);
    }
    for (const v of vals) {
      if (v != null && Number.isFinite(Number(v)) && Number(v) >= 0) return Number(v);
    }
    return undefined;
  };

  const mergeRuntime = (base: SongResult, extra?: SongResult | null): SongResult => {
    if (!extra) return { ...base };
    return {
      ...base,
      ...extra,
      id: base.id,
      playMusicUrl: extra.playMusicUrl || base.playMusicUrl,
      streamQuality: extra.streamQuality || base.streamQuality,
      streamBitrate: extra.streamBitrate || base.streamBitrate,
      availableQualities: extra.availableQualities || base.availableQualities,
      expiredAt: extra.expiredAt || base.expiredAt,
      lyric: extra.lyric || base.lyric,
      backgroundColor: extra.backgroundColor || base.backgroundColor,
      primaryColor: extra.primaryColor || base.primaryColor,
      isPreviewStream: extra.isPreviewStream ?? base.isPreviewStream,
      preview: extra.preview || base.preview,
      picUrl: extra.picUrl || base.picUrl,
      al: extra.al || base.al,
      ar: extra.ar || base.ar,
      artists: extra.artists || base.artists,
      name: extra.name || base.name,
      likedCount: pickCount(extra.likedCount, base.likedCount),
      commentCount: pickCount(extra.commentCount, base.commentCount),
      shareCount: pickCount(extra.shareCount, base.shareCount)
    };
  };

  /** 用推荐流里同 id 的 stats 盖回队列/播放器精简曲 */
  const withFeedStats = (song: SongResult, feedById: Map<string, SongResult>): SongResult => {
    const fromFeed = feedById.get(String(song.id));
    if (!fromFeed) return song;
    const likedCount = pickCount(song.likedCount, fromFeed.likedCount);
    const commentCount = pickCount(song.commentCount, fromFeed.commentCount);
    const shareCount = pickCount(song.shareCount, fromFeed.shareCount);
    if (
      likedCount === song.likedCount &&
      commentCount === song.commentCount &&
      shareCount === song.shareCount
    ) {
      return song;
    }
    return { ...song, likedCount, commentCount, shareCount };
  };

  const patchSongRuntime = (list: SongResult[], songId: string, patch: Partial<SongResult>) => {
    const i = list.findIndex((s) => String(s.id) === songId);
    if (i < 0) return list;
    const next = list.slice();
    next[i] = { ...next[i], ...patch };
    return next;
  };

  /** 把已 resolve 的 URL/音质写回 feed 项，返回上一首时免二次加载 */
  const cacheSongRuntime = (songId: string | number | undefined) => {
    if (songId == null) return;
    const player = usePlayerStore();
    const cur = player.playMusic as SongResult | undefined;
    if (!cur || String(cur.id) !== String(songId)) return;
    const id = String(songId);
    const patch: Partial<SongResult> = {
      playMusicUrl: cur.playMusicUrl,
      streamQuality: cur.streamQuality,
      streamBitrate: cur.streamBitrate,
      availableQualities: cur.availableQualities,
      expiredAt: cur.expiredAt,
      lyric: cur.lyric,
      backgroundColor: cur.backgroundColor,
      primaryColor: cur.primaryColor,
      isPreviewStream: cur.isPreviewStream,
      preview: cur.preview
    };
    items.value = patchSongRuntime(items.value, id, {
      ...patch,
      lyric: cur.lyric || items.value.find((s) => String(s.id) === id)?.lyric,
      backgroundColor:
        cur.backgroundColor || items.value.find((s) => String(s.id) === id)?.backgroundColor,
      primaryColor: cur.primaryColor || items.value.find((s) => String(s.id) === id)?.primaryColor,
      preview: cur.preview || items.value.find((s) => String(s.id) === id)?.preview
    });
    recommendItems.value = patchSongRuntime(recommendItems.value, id, {
      ...patch,
      lyric: cur.lyric || recommendItems.value.find((s) => String(s.id) === id)?.lyric,
      backgroundColor:
        cur.backgroundColor ||
        recommendItems.value.find((s) => String(s.id) === id)?.backgroundColor,
      primaryColor:
        cur.primaryColor || recommendItems.value.find((s) => String(s.id) === id)?.primaryColor,
      preview: cur.preview || recommendItems.value.find((s) => String(s.id) === id)?.preview
    });
  };

  /**
   * 按全局播放意图重建发现页序列：
   * - 播放全部（队列 >1 且当前曲在队列内）：先完整队列，再拼推荐流
   * - 点播单曲（队列 ≤1）：只展示当前曲，下一首进推荐流
   */
  const rebuildItemsFromPlayer = (songId?: string | number | null) => {
    const player = usePlayerStore();
    const cur = player.playMusic as SongResult | undefined;
    const targetId =
      songId != null && songId !== '' ? String(songId) : cur?.id != null ? String(cur.id) : '';

    if (!targetId) {
      items.value = recommendItems.value.map((s) => ({ ...s }));
      index.value = 0;
      return;
    }

    const queue = (player.playList || []) as SongResult[];
    const qi = queue.findIndex((s) => String(s.id) === targetId);
    const isListQueue = queue.length > 1 && qi >= 0;
    const runtimeMap = new Map(items.value.map((s) => [String(s.id), s]));
    // 推荐流 stats 字典：队列前缀里同 id 的曲也要盖回数字
    const feedById = new Map(recommendItems.value.map((s) => [String(s.id), s]));

    if (isListQueue) {
      const queueIds = new Set(queue.map((s) => String(s.id)));
      const prefix = queue.map((s) => {
        const id = String(s.id);
        let song = mergeRuntime(s, runtimeMap.get(id));
        if (cur && String(cur.id) === id) song = mergeRuntime(song, cur);
        return withFeedStats(song, feedById);
      });
      const tail = recommendItems.value
        .filter((s) => !queueIds.has(String(s.id)))
        .map((s) => withFeedStats(mergeRuntime(s, runtimeMap.get(String(s.id))), feedById));
      items.value = [...prefix, ...tail];
      index.value = qi;
      // 接上推荐尾：队列播完后自动进推荐（不打断当前曲）
      if (active.value) {
        player.setPlayList([...items.value], true, true);
      }
      return;
    }

    // 单曲：当前 + 推荐尾
    const existing = runtimeMap.get(targetId);
    const snapRaw =
      cur && String(cur.id) === targetId
        ? mergeRuntime(existing || cur, cur)
        : existing
          ? { ...existing }
          : null;
    const snap = snapRaw ? withFeedStats(snapRaw, feedById) : null;
    if (snap) {
      const tail = recommendItems.value
        .filter((s) => String(s.id) !== targetId)
        .map((s) => withFeedStats(mergeRuntime(s, runtimeMap.get(String(s.id))), feedById));
      items.value = [snap, ...tail];
      index.value = 0;
      // 下一首（含播完自动）进推荐流
      if (active.value) {
        player.setPlayList([...items.value], true, true);
      }
      return;
    }

    // 仅在推荐流内
    const fi = recommendItems.value.findIndex((s) => String(s.id) === targetId);
    if (fi >= 0) {
      items.value = recommendItems.value.map((s) =>
        withFeedStats(mergeRuntime(s, runtimeMap.get(String(s.id))), feedById)
      );
      index.value = items.value.findIndex((s) => String(s.id) === targetId);
      cacheSongRuntime(targetId);
    }
  };

  const playAt = async (i: number, opts?: { forceResolve?: boolean }) => {
    const song = items.value[i];
    if (!song) return;
    const player = usePlayerStore();
    // 列表与 feed 对齐，便于播完自动下一首
    player.setPlayList([...items.value], true, true);

    const force = !!opts?.forceResolve;
    const cur = player.playMusic as SongResult | undefined;
    // 已在播同一首且有有效 URL：不要 setPlay 重进加载态（HMR / 回发现页）
    if (
      !force &&
      cur &&
      String(cur.id) === String(song.id) &&
      cur.playMusicUrl &&
      !(cur.expiredAt && cur.expiredAt < Date.now())
    ) {
      cacheSongRuntime(song.id);
      return;
    }

    const hasCache =
      !force && !!song.playMusicUrl && !(song.expiredAt && song.expiredAt < Date.now());
    // 仅带本曲缓存的 lyric，禁止沿用上一首 playMusic 上的歌词字段
    const ownLyric =
      song.lyric &&
      typeof song.lyric === 'object' &&
      Array.isArray((song.lyric as any).lrcArray) &&
      (song.lyric as any).lrcArray.length > 0
        ? song.lyric
        : undefined;

    // 壳层色：只带本曲已取色；切歌闪黑由 AppLayout「无新色则保留上一层」兜底。
    // 禁止把上一首 color 写进本曲 SongResult，否则 loadMetadata 会当成真色，
    // resolve 后再 apply 把发现页正确取色冲掉。
    const myPlay = ++playGen;
    const targetId = String(song.id);

    // 不阻塞 UI：快速连切时后发起的 play 会作废先前的
    void player
      .setPlay({
        ...song,
        lyric: ownLyric,
        backgroundColor: song.backgroundColor,
        primaryColor: song.primaryColor,
        playMusicUrl: hasCache ? song.playMusicUrl : undefined,
        streamQuality: hasCache ? song.streamQuality : undefined,
        streamBitrate: hasCache ? song.streamBitrate : undefined,
        availableQualities: hasCache ? song.availableQualities : song.availableQualities,
        preferredQuality: undefined,
        forceQualityResolve: force,
        expiredAt: hasCache ? song.expiredAt : undefined,
        isFirstPlay: !hasCache,
        // 有 URL 缓存时不要转圈；无缓存也尽快出声，loading 仍提示 resolve 中
        playLoading: !hasCache
      })
      .then(() => {
        if (myPlay !== playGen) return;
        if (String(player.playMusic?.id) !== targetId) return;
        cacheSongRuntime(song.id);
      })
      .catch(() => undefined);
  };

  const syncPlayerQueue = async (playCurrent = true) => {
    if (!items.value.length) return;
    if (playCurrent) {
      await playAt(index.value);
    } else {
      const player = usePlayerStore();
      player.setPlayList([...items.value], true, true);
    }
  };

  const mapPage = (songs: Parameters<typeof mapMsSongToSongResult>[0][]) =>
    songs.map((s) => mapMsSongToSongResult(s));

  const loadInitial = async (force = false) => {
    if (!isElectron || !isMusicSourceAvailable()) {
      error.value = '仅桌面端可用发现流';
      needLogin.value = false;
      return;
    }
    if (loading.value) return;
    // 已有 feed：只标记 active，不抢当前播放（用户可能在歌单里听歌）
    if (!force && items.value.length > 0) {
      active.value = true;
      return;
    }

    loading.value = true;
    error.value = '';
    needLogin.value = false;
    const myGen = ++gen;

    try {
      // 鉴权与 feed 并行：首启少串一轮 RTT
      const authP = msGetAuthState().catch(
        () => ({ authenticated: false }) as { authenticated: boolean }
      );
      const pageP = msGetSongFeed({
        isFirst: true,
        playedMedia: [],
        mixSessionCount: mixSessionCount.value
      });
      const [auth, page] = await Promise.all([authP, pageP]);

      if (myGen !== gen) return;

      const list = mapPage(page.items || []);
      if (!list.length) {
        if (!auth.authenticated) {
          needLogin.value = true;
          error.value = '登录后开启发现';
        } else {
          error.value = '暂时没有推荐歌曲';
        }
        recommendItems.value = [];
        items.value = [];
        index.value = 0;
        hasMore.value = false;
        return;
      }

      recommendItems.value = list;
      hasMore.value = Boolean(page.hasMore !== false);
      active.value = true;

      // 歌单/搜索等已在播：按队列意图对齐 UI，不抢播 feed[0]、不 setPlayList
      const player = usePlayerStore();
      const playingId = player.playMusic?.id;
      if (playingId != null && String(playingId) !== '') {
        rebuildItemsFromPlayer(playingId);
        void ensureWindow();
      } else {
        // 空闲：纯推荐流起播
        items.value = list.map((s) => ({ ...s }));
        index.value = 0;
        void prefetchOne(0);
        void ensureWindow();
        await syncPlayerQueue(true);
      }
    } catch (e: any) {
      if (myGen !== gen) return;
      const code = String(e?.code || e?.message || '');
      const msg = String(e?.message || e || '加载失败');
      if (
        /auth|login|cookie|401|未登录|UNAUTHORIZED/i.test(code + msg) ||
        !(await msGetAuthState()
          .then((a) => a.authenticated)
          .catch(() => false))
      ) {
        needLogin.value = true;
        error.value = '登录后开启发现';
      } else {
        error.value = msg || '加载失败';
      }
      recommendItems.value = [];
      items.value = [];
      index.value = 0;
    } finally {
      if (myGen === gen) loading.value = false;
    }
  };

  const loadMore = async () => {
    if (!hasMore.value || loadingMore.value || loading.value) return;
    loadingMore.value = true;
    const myGen = gen;
    try {
      const page = await msGetSongFeed({
        isFirst: false,
        playedMedia: playedMedia(),
        mixSessionCount: mixSessionCount.value
      });
      if (myGen !== gen) return;

      let nextItems = mapPage(page.items || []);
      if (!nextItems.length) {
        // 降级：用当前曲 related 补流
        const seed = current.value;
        if (seed) {
          try {
            const related = await msGetRelatedSongs(String(seed.id), {
              artistIds: (seed.ar || seed.artists || [])
                .map((a: any) => String(a.id || ''))
                .filter(Boolean),
              sceneName: 'player',
              playedMedia: playedMedia(),
              limit: 12
            });
            nextItems = mapPage(related.items || []);
          } catch {
            /* ignore */
          }
        }
      }

      if (!nextItems.length) {
        hasMore.value = false;
        return;
      }

      const recSeen = new Set(recommendItems.value.map((s) => String(s.id)));
      const merged = nextItems.filter((s) => !recSeen.has(String(s.id)));
      if (!merged.length) {
        hasMore.value = Boolean(page.hasMore);
        return;
      }
      recommendItems.value = [...recommendItems.value, ...merged];
      // 展示序列追加未见过的推荐（队列前缀已在 items 前部）
      const itemSeen = new Set(items.value.map((s) => String(s.id)));
      const toShow = merged.filter((s) => !itemSeen.has(String(s.id)));
      if (toShow.length) {
        items.value = [...items.value, ...toShow];
      }
      hasMore.value = Boolean(page.hasMore !== false);
      // 发现页活跃时把新推荐接进播放队列尾
      if (active.value) {
        const player = usePlayerStore();
        player.setPlayList([...items.value], true, true);
      }
    } catch (e: any) {
      if (myGen !== gen) return;
      console.warn('[discoverFeed] loadMore failed', e);
    } finally {
      if (myGen === gen) loadingMore.value = false;
    }
  };

  /** 单曲预取：URL / 歌词 / 取色尽量并行；URL 走 getSongDetail inflight，与 playTrack 去重 */
  const prefetchOne = async (idx: number) => {
    if (idx < 0 || idx >= items.value.length) return;
    const s = items.value[idx];
    if (!s?.id) return;
    const id = String(s.id);
    if (prefetchingIds.has(id)) return;

    const needUrl = !s.playMusicUrl || (s.expiredAt != null && s.expiredAt < Date.now());
    const needLrc = !(s.lyric && (s.lyric as any).lrcArray?.length);
    const needColor = !s.backgroundColor || !s.primaryColor;
    if (!needUrl && !needLrc && !needColor) return;

    prefetchingIds.add(id);
    try {
      const [{ prefetchSongUrl, loadLrc }, { getImageLinearBackground }, { getImgUrl }] =
        await Promise.all([
          import('@/hooks/usePlayerHooks'),
          import('@/utils/linearColor'),
          import('@/utils')
        ]);

      let detailed: SongResult = { ...s };
      // URL 优先开火（与 playTrack 共享 inflight）；歌词/取色并行
      const tasks: Promise<void>[] = [];
      if (needUrl) {
        tasks.push(
          prefetchSongUrl({ ...s })
            .then((d) => {
              if (!d) return;
              detailed = {
                ...detailed,
                ...d,
                lyric: detailed.lyric || d.lyric,
                backgroundColor: detailed.backgroundColor || d.backgroundColor,
                primaryColor: detailed.primaryColor || d.primaryColor
              };
            })
            .catch(() => undefined)
        );
      }
      if (needLrc && s.id) {
        tasks.push(
          loadLrc(s.id)
            .then((lyric) => {
              if (lyric?.lrcArray?.length) detailed = { ...detailed, lyric };
            })
            .catch(() => undefined)
        );
      }
      if (needColor && s.picUrl) {
        tasks.push(
          getImageLinearBackground(getImgUrl(s.picUrl, '200y200'))
            .then(({ backgroundColor, primaryColor }) => {
              if (backgroundColor) detailed.backgroundColor = backgroundColor;
              if (primaryColor) detailed.primaryColor = primaryColor;
            })
            .catch(() => undefined)
        );
      }
      if (tasks.length) await Promise.all(tasks);

      const runtimePatch = {
        playMusicUrl: detailed.playMusicUrl,
        streamQuality: detailed.streamQuality,
        streamBitrate: detailed.streamBitrate,
        availableQualities: detailed.availableQualities,
        expiredAt: detailed.expiredAt,
        lyric: detailed.lyric,
        backgroundColor: detailed.backgroundColor,
        primaryColor: detailed.primaryColor,
        isPreviewStream: detailed.isPreviewStream,
        preview: detailed.preview
      };
      const at = items.value.findIndex((x) => String(x.id) === id);
      if (at >= 0) {
        items.value[at] = {
          ...items.value[at],
          playMusicUrl: runtimePatch.playMusicUrl || items.value[at].playMusicUrl,
          streamQuality: runtimePatch.streamQuality || items.value[at].streamQuality,
          streamBitrate: runtimePatch.streamBitrate || items.value[at].streamBitrate,
          availableQualities: runtimePatch.availableQualities || items.value[at].availableQualities,
          expiredAt: runtimePatch.expiredAt || items.value[at].expiredAt,
          lyric: runtimePatch.lyric || items.value[at].lyric,
          backgroundColor: runtimePatch.backgroundColor || items.value[at].backgroundColor,
          primaryColor: runtimePatch.primaryColor || items.value[at].primaryColor,
          isPreviewStream: runtimePatch.isPreviewStream ?? items.value[at].isPreviewStream,
          preview: runtimePatch.preview || items.value[at].preview
        };
      }
      const rAt = recommendItems.value.findIndex((x) => String(x.id) === id);
      if (rAt >= 0) {
        recommendItems.value[rAt] = {
          ...recommendItems.value[rAt],
          playMusicUrl: runtimePatch.playMusicUrl || recommendItems.value[rAt].playMusicUrl,
          streamQuality: runtimePatch.streamQuality || recommendItems.value[rAt].streamQuality,
          streamBitrate: runtimePatch.streamBitrate || recommendItems.value[rAt].streamBitrate,
          availableQualities:
            runtimePatch.availableQualities || recommendItems.value[rAt].availableQualities,
          expiredAt: runtimePatch.expiredAt || recommendItems.value[rAt].expiredAt,
          lyric: runtimePatch.lyric || recommendItems.value[rAt].lyric,
          backgroundColor:
            runtimePatch.backgroundColor || recommendItems.value[rAt].backgroundColor,
          primaryColor: runtimePatch.primaryColor || recommendItems.value[rAt].primaryColor,
          isPreviewStream:
            runtimePatch.isPreviewStream ?? recommendItems.value[rAt].isPreviewStream,
          preview: runtimePatch.preview || recommendItems.value[rAt].preview
        };
      }
      if (at < 0) return;
      // P2：写回 feed 后若是「当前下一首」，再保证 standby（prefetchSongUrl 内已 warm，此处兜底）
      const merged = items.value[at];
      if (merged.playMusicUrl && at === index.value + 1) {
        try {
          const { audioService } = await import('@/services/audioService');
          audioService.preload(merged.playMusicUrl, merged);
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      console.warn('[discoverFeed] prefetch failed', s?.name, e);
    } finally {
      prefetchingIds.delete(id);
    }
  };

  const ensureWindow = async () => {
    const i = index.value;
    for (
      let k = Math.max(0, i - PREFETCH_BEFORE);
      k <= Math.min(items.value.length - 1, i + PREFETCH_AFTER);
      k++
    ) {
      if (k === i) continue;
      const song = items.value[k];
      if (song?.picUrl) {
        const img = new Image();
        img.src = song.picUrl;
      }
    }
    if (items.value.length - 1 - i <= LOAD_MORE_THRESHOLD) {
      void loadMore();
    }
    // 下一首最优先，再 +2 / 上一首
    void prefetchOne(i + 1);
    void prefetchOne(i + 2);
    void prefetchOne(i - 1);
  };

  const goTo = async (nextIndex: number) => {
    if (!items.value.length) return;
    if (nextIndex < 0) return;
    if (nextIndex >= items.value.length) {
      // 先翻页，不阻塞 UI；到不了就 return
      await loadMore();
      if (nextIndex >= items.value.length) return;
    }
    if (nextIndex === index.value) {
      const player = usePlayerStore();
      if (String(player.playMusic?.id) !== String(items.value[nextIndex]?.id)) {
        void playAt(nextIndex);
      }
      return;
    }
    cacheSongRuntime(items.value[index.value]?.id);
    index.value = nextIndex;
    active.value = true;
    // 不 await：UI 立刻切页，音频后台跟上；连切可打断
    void playAt(nextIndex);
    void ensureWindow();
  };

  /** 用户在发现页主动开始刷（首次或从歌单切回来） */
  const resumeDiscoverPlayback = async () => {
    if (!items.value.length) {
      await loadInitial(true);
      return;
    }
    active.value = true;
    await playAt(index.value);
    void ensureWindow();
  };

  const next = async () => goTo(index.value + 1);
  const prev = async () => goTo(index.value - 1);

  const requireAuth = async () => {
    try {
      const auth = await msGetAuthState();
      if (auth.authenticated) return true;
    } catch {
      /* */
    }
    showBottomToast('请先登录');
    needLogin.value = true;
    return false;
  };

  const patchCurrentCount = (delta: number) => {
    const i = index.value;
    const song = items.value[i];
    if (!song) return;
    const base = Number(song.likedCount) || 0;
    const next = Math.max(0, base + delta);
    items.value[i] = { ...song, likedCount: next };
  };

  const likeCurrent = async () => {
    const song = current.value;
    if (!song) return;
    if (!(await requireAuth())) return;
    const fav = useFavoriteStore();
    try {
      if (fav.isFavorite(song.id)) {
        await msUnlikeTrack(String(song.id));
        await fav.removeFromFavorite(song.id);
        patchCurrentCount(-1);
        showBottomToast('已取消喜欢');
      } else {
        await msLikeTrack(String(song.id));
        await fav.addToFavorite(song.id);
        patchCurrentCount(1);
        showBottomToast('已喜欢');
      }
    } catch (e: any) {
      showBottomToast(e?.message || '操作失败');
    }
  };

  /**
   * 底栏/播完自动下一首 / 从歌单回发现页：对齐到全局当前曲。
   * - 播放全部：items = 完整队列 + 推荐尾
   * - 点播单曲：items = 当前曲 + 推荐尾
   * 仅 UI，不 setPlay。
   */
  const syncIndexToSongId = (songId: string | number | undefined | null) => {
    if (!active.value || songId == null || songId === '') return;
    rebuildItemsFromPlayer(songId);
    void ensureWindow();
  };

  const dislikeCurrent = async () => {
    const song = current.value;
    if (!song) return;
    if (!(await requireAuth())) return;
    const fav = useFavoriteStore();
    const id = song.id;
    const artistIds = (song.ar || song.artists || [])
      .map((a: any) => String(a.id || ''))
      .filter(Boolean);
    try {
      await msDislikeTrack(String(id), { artistIds });
      fav.addToDislikeList(id);
      const removedAt = index.value;
      const rid = String(id);
      items.value = items.value.filter((s) => String(s.id) !== rid);
      recommendItems.value = recommendItems.value.filter((s) => String(s.id) !== rid);
      if (!items.value.length) {
        index.value = 0;
        await loadMore();
        if (items.value.length) {
          index.value = 0;
          await syncPlayerQueue(true);
        }
        showBottomToast('已标记不喜欢');
        return;
      }
      if (removedAt >= items.value.length) {
        index.value = items.value.length - 1;
      } else {
        index.value = removedAt;
      }
      await syncPlayerQueue(true);
      void ensureWindow();
      showBottomToast('已标记不喜欢');
    } catch (e: any) {
      showBottomToast(e?.message || '操作失败');
    }
  };

  const deactivate = () => {
    active.value = false;
  };

  const reset = () => {
    gen += 1;
    items.value = [];
    recommendItems.value = [];
    index.value = 0;
    hasMore.value = true;
    error.value = '';
    needLogin.value = false;
    loading.value = false;
    loadingMore.value = false;
    active.value = false;
  };

  return {
    items,
    index,
    loading,
    loadingMore,
    hasMore,
    error,
    needLogin,
    active,
    current,
    isEmpty,
    loadInitial,
    loadMore,
    next,
    prev,
    goTo,
    likeCurrent,
    dislikeCurrent,
    syncIndexToSongId,
    resumeDiscoverPlayback,
    cacheSongRuntime,
    deactivate,
    reset,
    ensureWindow
  };
});

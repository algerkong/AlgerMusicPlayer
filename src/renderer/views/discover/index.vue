<template>
  <div
    ref="rootEl"
    class="discover-page"
    @wheel.passive="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div v-if="feed.loading && !feed.current" class="discover-state">
      <i class="ri-loader-4-line animate-spin text-3xl opacity-70" />
      <p>正在加载发现…</p>
    </div>

    <div v-else-if="!feed.current" class="discover-state">
      <i class="ri-compass-discover-line text-4xl opacity-50" />
      <p class="discover-state-title">{{ feed.error || '暂无推荐' }}</p>
      <p v-if="feed.needLogin" class="discover-state-desc">登录汽水账号后即可刷歌</p>
      <div class="discover-state-actions">
        <ui-button v-if="feed.needLogin" @click="openLogin">去登录</ui-button>
        <ui-button variant="outline" :disabled="feed.loading" @click="retry">重试</ui-button>
      </div>
    </div>

    <div v-else class="discover-stage">
      <!-- 抖音式整页竖滑：Transition 叠层进出 -->
      <div class="discover-viewport" :style="dragStyle">
        <Transition :name="slideName">
          <div :key="String(feed.current.id)" class="discover-slide">
            <div class="discover-body">
              <div class="discover-cover-col">
                <div class="discover-cover-wrap">
                  <img
                    v-if="coverUrl"
                    ref="coverImgEl"
                    :src="coverUrl"
                    class="discover-cover"
                    alt=""
                    crossorigin="anonymous"
                    draggable="false"
                    @load="onCoverLoad"
                  />
                  <div v-else class="discover-cover discover-cover--empty">
                    <i class="ri-music-2-line text-4xl opacity-40" />
                  </div>
                </div>

                <div ref="titleRowEl" class="discover-title-row">
                  <div class="discover-title-scroll" :class="{ 'is-marquee': titleNeedMarquee }">
                    <div class="discover-title-track">
                      <!-- 每段带右 padding，两段等宽，-50% 无缝不跳 -->
                      <span class="discover-title-item">
                        <span class="discover-title">{{ feed.current.name }}</span>
                      </span>
                      <span v-if="titleNeedMarquee" class="discover-title-item" aria-hidden="true">
                        <span class="discover-title">{{ feed.current.name }}</span>
                      </span>
                    </div>
                  </div>
                  <div class="discover-chips">
                    <span v-if="feed.current.isVip" class="discover-chip" :style="chipStyle"
                      >VIP</span
                    >
                    <button
                      type="button"
                      class="discover-chip discover-chip--btn"
                      data-discover-chip="quality"
                      :style="chipStyle"
                      @click.stop="toggleQualityMenu"
                    >
                      {{ qualityLabel }}
                    </button>
                    <button
                      v-if="activeEffect !== 'none'"
                      type="button"
                      class="discover-chip discover-chip--btn"
                      data-discover-chip="effect"
                      :style="chipStyle"
                      @click.stop="toggleEffectMenu"
                    >
                      {{ effectLabel }}
                    </button>
                  </div>
                </div>

                <div
                  v-if="qualityOpen"
                  class="discover-menu chrome-surface-strong"
                  data-discover-menu="quality"
                  @click.stop
                >
                  <button
                    v-for="opt in songQualityMenu"
                    :key="opt.value"
                    type="button"
                    class="discover-menu-item"
                    :class="{ active: opt.active, disabled: opt.disabled }"
                    :disabled="opt.disabled"
                    @click="onPickQuality(opt)"
                  >
                    <span>{{ opt.label }}</span>
                    <span v-if="opt.svip" class="discover-menu-tag">SVIP</span>
                  </button>
                </div>

                <div
                  v-if="effectOpen"
                  class="discover-menu chrome-surface-strong"
                  data-discover-menu="effect"
                  @click.stop
                >
                  <button
                    v-for="p in effectPresets"
                    :key="p.key"
                    type="button"
                    class="discover-menu-item"
                    :class="{ active: activeEffect === p.key }"
                    @click="onPickEffect(p.key)"
                  >
                    {{ p.label }}
                  </button>
                </div>

                <p class="discover-artist">{{ artistText }}</p>

                <div class="discover-ops">
                  <button type="button" class="discover-op" @click.stop="onLike">
                    <span v-if="likeCountText" class="discover-op-badge">{{ likeCountText }}</span>
                    <i
                      :class="isLiked ? 'ri-heart-fill is-liked' : 'ri-heart-fill'"
                      :style="isLiked ? undefined : { opacity: 0.55 }"
                    />
                  </button>
                  <button type="button" class="discover-op" @click.stop="onDislike">
                    <i class="ri-dislike-fill" />
                  </button>
                  <button type="button" class="discover-op" @click.stop="addOpen = true">
                    <i class="ri-play-list-add-fill" />
                  </button>
                  <button type="button" class="discover-op" @click.stop="onComment">
                    <span v-if="commentCountText" class="discover-op-badge">{{
                      commentCountText
                    }}</span>
                    <i class="ri-chat-3-fill" />
                  </button>
                  <button type="button" class="discover-op" @click.stop="onShare">
                    <span v-if="shareCountText" class="discover-op-badge">{{
                      shareCountText
                    }}</span>
                    <i class="ri-share-forward-fill" />
                  </button>
                </div>
              </div>

              <div class="discover-lyric-col" @wheel.stop @pointerdown.stop>
                <div v-if="!lrcArray.length" class="discover-lrc-empty">暂无歌词</div>
                <scroll-area v-else class="discover-lyric-scroll">
                  <div class="discover-lyric-pad">
                    <div
                      v-for="(item, i) in lrcArray"
                      :id="`discover-lrc-${i}`"
                      :key="`${feed.current?.id}-${i}`"
                      class="discover-lrc-line"
                      :class="{ 'is-active': i === nowIndex }"
                      @click="item.startTime !== -1 ? setAudioTime(i) : null"
                    >
                      <div
                        v-if="item.hasWordByWord && item.words && item.words.length > 0"
                        class="discover-word-line"
                      >
                        <span
                          v-for="(word, wi) in item.words"
                          :key="wi"
                          class="discover-word"
                          :style="getWordStyle(i, word)"
                          >{{ word.text }}<template v-if="word.space">&nbsp;</template></span
                        >
                      </div>
                      <span v-else class="discover-lrc-text" :style="lineTextStyle(i)">{{
                        item.text
                      }}</span>
                      <span v-if="item.trText" class="discover-lrc-tr">{{ item.trText }}</span>
                    </div>
                  </div>
                </scroll-area>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- 右侧竖胶囊不随页滑走，固定在舞台上 -->
      <div class="discover-rail">
        <button type="button" class="discover-rail-btn" @click.stop="switchSong(-1)">
          <span class="discover-rail-chev">‹</span>
          <span class="discover-rail-label">上一个</span>
        </button>
        <div class="discover-rail-sep" />
        <button type="button" class="discover-rail-btn" @click.stop="switchSong(1)">
          <span class="discover-rail-label">下一个</span>
          <span class="discover-rail-chev">›</span>
        </button>
      </div>
    </div>

    <login-qr-modal v-model:show="showLoginModal" @success="onLoginSuccess" />

    <ui-dialog :open="addOpen" @update:open="addOpen = $event">
      <dialog-content class="max-w-sm">
        <dialog-header>
          <dialog-title>添加到歌单</dialog-title>
          <dialog-description>{{ feed.current?.name || '当前歌曲' }}</dialog-description>
        </dialog-header>
        <div v-if="!plStore.authenticated" class="py-4 text-sm text-muted-foreground">
          请先登录后再添加
        </div>
        <div v-else-if="!plStore.items.length" class="py-4 text-sm text-muted-foreground">
          暂无歌单，可在侧栏新建
        </div>
        <scroll-area v-else class="max-h-64">
          <button
            v-for="pl in plStore.items"
            :key="pl.id"
            type="button"
            class="discover-pl-item"
            :disabled="adding"
            @click="appendTo(pl.id)"
          >
            <img v-if="pl.coverUrl" :src="pl.coverUrl" class="discover-pl-cover" alt="" />
            <div v-else class="discover-pl-cover discover-pl-cover--ph">
              <i class="ri-play-list-2-fill" />
            </div>
            <span class="truncate">{{ pl.name }}</span>
          </button>
        </scroll-area>
        <dialog-footer>
          <ui-button variant="outline" @click="addOpen = false">关闭</ui-button>
        </dialog-footer>
      </dialog-content>
    </ui-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  watch
} from 'vue';

import { msAppendPlaylistTracks } from '@/api/musicSource';
import LoginQrModal from '@/components/login/LoginQrModal.vue';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog as UiDialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ensureLyricsLoaded,
  getLrcStyle,
  getLyricClockSec,
  lrcArray,
  nowIndex,
  nowTime,
  setAudioTime,
  textColors
} from '@/hooks/MusicHook';
import { type SoundEffectKey, useSoundEffect } from '@/hooks/useSoundEffect';
import { type QualityMenuItem, useStreamQuality } from '@/hooks/useStreamQuality';
import { useDiscoverFeedStore } from '@/store/modules/discoverFeed';
import { useFavoriteStore } from '@/store/modules/favorite';
import { usePlayerStore } from '@/store/modules/player';
import { useUserPlaylistsStore } from '@/store/modules/userPlaylists';
import { getImgUrl } from '@/utils';
import { getImageBackground, getImageLinearBackground } from '@/utils/linearColor';
import { getActiveLineWordStyle } from '@/utils/lyricWordStyle';
import { showBottomToast } from '@/utils/shortcutToast';
import { sameTrackId } from '@/utils/playerUtils';
import { getSongArtists, getSongCoverUrl } from '@/utils/songFields';

defineOptions({ name: 'Discover' });

const feed = useDiscoverFeedStore();
const playerStore = usePlayerStore();
const favStore = useFavoriteStore();
const plStore = useUserPlaylistsStore();
const { qualityLabel, songQualityMenu, setQuality } = useStreamQuality();
const { activeEffect, setEffect, effectLabel, presets: effectPresets } = useSoundEffect();

const rootEl = ref<HTMLElement | null>(null);
const coverImgEl = ref<HTMLImageElement | null>(null);
const titleRowEl = ref<HTMLElement | null>(null);
const addOpen = ref(false);
const adding = ref(false);
const showLoginModal = ref(false);
const qualityOpen = ref(false);
const effectOpen = ref(false);

const closeChipMenus = () => {
  qualityOpen.value = false;
  effectOpen.value = false;
};

const toggleQualityMenu = () => {
  const next = !qualityOpen.value;
  qualityOpen.value = next;
  if (next) effectOpen.value = false;
};

const toggleEffectMenu = () => {
  const next = !effectOpen.value;
  effectOpen.value = next;
  if (next) qualityOpen.value = false;
};

/** 点菜单/对应芯片外的任意区域关闭（capture，避免被 stopPropagation 吃掉） */
const onDocPointerDownCloseMenus = (e: PointerEvent) => {
  if (!qualityOpen.value && !effectOpen.value) return;
  const t = e.target as HTMLElement | null;
  if (!t?.closest) {
    closeChipMenus();
    return;
  }
  if (t.closest('[data-discover-menu], [data-discover-chip]')) return;
  closeChipMenus();
};

const onDocKeydownCloseMenus = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (!qualityOpen.value && !effectOpen.value) return;
  closeChipMenus();
};
const titleNeedMarquee = ref(false);
/** disc-next: 上滑去下一首；disc-prev: 下滑回上一首 */
const slideName = ref('disc-next');
const animating = ref(false);
const dragOffset = ref(0);
const draggingSlide = ref(false);

const dragStyle = computed(() => {
  if (!draggingSlide.value || dragOffset.value === 0) return undefined;
  return {
    transform: `translate3d(0, ${dragOffset.value}px, 0)`,
    transition: 'none'
  };
});

const coverUrl = computed(() => {
  const pic = getSongCoverUrl(feed.current);
  return pic ? getImgUrl(pic, '500y500') : '';
});

const artistText = computed(() => {
  const names = getSongArtists(feed.current)
    .map((a) => a.name)
    .filter(Boolean);
  return names.join(' / ') || '未知歌手';
});

const isLiked = computed(() => {
  const id = feed.current?.id;
  return id != null && favStore.isFavorite(id);
});

/** <1万原样；≥1万 → Nw+ */
const formatCount = (n?: number) => {
  if (n == null || !Number.isFinite(n) || n <= 0) return '';
  const v = Math.floor(n);
  if (v < 10000) return String(v);
  return `${Math.floor(v / 10000)}w+`;
};

const likeCountText = computed(() => formatCount(Number(feed.current?.likedCount) || 0));
const commentCountText = computed(() => formatCount(feed.current?.commentCount));
const shareCountText = computed(() => formatCount(feed.current?.shareCount));

const chipStyle = computed(() => {
  const bg =
    playerStore.playMusic?.primaryColor ||
    feed.current?.primaryColor ||
    'var(--primary-color, #22c55e)';
  return {
    background: bg,
    color: '#fff'
  };
});

const wordColors = computed(() => {
  const c = textColors.value || {};
  return {
    primary: c.primary || 'var(--chrome-text-muted, rgba(255,255,255,0.45))',
    active: c.active || 'var(--chrome-text, #fff)'
  };
});

/** 订阅播放进度，驱动逐字刷新（否则只有换行才重绘） */
const lyricClockMs = computed(() => {
  void nowTime.value;
  return getLyricClockSec() * 1000;
});

const getWordStyle = (lineIndex: number, word: any) => {
  // 非当前行：纯色，避免整页 background-clip 重绘卡顿
  if (lineIndex !== nowIndex.value) {
    return {
      color: wordColors.value.primary,
      WebkitTextFillColor: wordColors.value.primary
    };
  }
  return getActiveLineWordStyle(lyricClockMs.value, word, wordColors.value);
};

const lineTextStyle = (index: number) => {
  if (index !== nowIndex.value) return { color: wordColors.value.primary };
  // 非逐字行：用行进度渐变；依赖 lyricClockMs 连续更新
  void lyricClockMs.value;
  const raw = getLrcStyle(index) as Record<string, string>;
  if (raw.backgroundImage) {
    const active = wordColors.value.active;
    const muted = wordColors.value.primary;
    const m = String(raw.backgroundImage).match(/(\d+(?:\.\d+)?)%/);
    const pct = m ? Number(m[1]) : 0;
    return {
      backgroundImage: `linear-gradient(to right, ${active} ${pct}%, ${muted} ${pct}%)`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent'
    };
  }
  return { color: wordColors.value.active };
};

const measureTitle = async () => {
  await nextTick();
  const row = titleRowEl.value;
  if (!row) {
    titleNeedMarquee.value = false;
    return;
  }
  const scroll = row.querySelector('.discover-title-scroll') as HTMLElement | null;
  const item = row.querySelector('.discover-title-item') as HTMLElement | null;
  if (!scroll || !item) return;
  // 单段（含 padding）宽度 vs 可见区
  titleNeedMarquee.value = item.offsetWidth > scroll.clientWidth + 2;
};

const applyPaletteToPlayer = (primary?: string, background?: string) => {
  if (!playerStore.playMusic) return;
  if (!sameTrackId(playerStore.playMusic.id, feed.current?.id)) return;
  if (primary || background) {
    playerStore.patchCurrentSong({
      ...(primary ? { primaryColor: primary } : {}),
      ...(background ? { backgroundColor: background } : {})
    });
  }
  // 写回 feed，下次切到此曲直接有色
  const id = feed.current?.id;
  if (id != null) {
    const i = feed.items.findIndex((s) => sameTrackId(s.id, id));
    if (i >= 0) {
      feed.items[i] = {
        ...feed.items[i],
        primaryColor: primary || feed.items[i].primaryColor,
        backgroundColor: background || feed.items[i].backgroundColor
      };
    }
  }
};

const extractCoverColor = async () => {
  const songId = feed.current?.id;
  // 已有缓存色：直接上，避免再闪上一首色太久
  if (feed.current?.backgroundColor && feed.current?.primaryColor) {
    applyPaletteToPlayer(feed.current.primaryColor, feed.current.backgroundColor);
    return;
  }
  const url = coverUrl.value;
  if (!url) return;
  try {
    const el = coverImgEl.value;
    if (el && el.complete && el.naturalWidth > 0) {
      const c = await getImageBackground(el);
      if (!sameTrackId(feed.current?.id, songId)) return;
      if (c.primaryColor || c.backgroundColor) {
        applyPaletteToPlayer(c.primaryColor, c.backgroundColor);
        return;
      }
    }
    const c = await getImageLinearBackground(getImgUrl(url.split('?')[0], '200y200') || url);
    if (!sameTrackId(feed.current?.id, songId)) return;
    applyPaletteToPlayer(c.primaryColor, c.backgroundColor);
  } catch (e) {
    console.warn('[discover] cover color failed', e);
  }
};

const onCoverLoad = () => {
  void extractCoverColor();
  void measureTitle();
};

const switchSong = (delta: number) => {
  // 加载中/动画中也允许连切：只做最短 UI 锁，不阻塞等音频
  qualityOpen.value = false;
  effectOpen.value = false;
  dragOffset.value = 0;
  draggingSlide.value = false;
  slideName.value = delta > 0 ? 'disc-next' : 'disc-prev';
  animating.value = true;
  // 不 await：立刻改 index + 发起播放，可连续滑
  if (delta < 0) void feed.prev();
  else void feed.next();
  window.setTimeout(() => {
    animating.value = false;
  }, 280);
};

/** 滚轮/拖动手势是否发生在歌词区（应交给滚动，不切歌） */
const isInLyricArea = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el?.closest) return false;
  return !!el.closest(
    '.discover-lyric-col, .discover-lyric-scroll, [data-slot="scroll-area-viewport"]'
  );
};

const openLogin = () => {
  showLoginModal.value = true;
};
const retry = () => feed.loadInitial(true);
const onLoginSuccess = () => {
  showLoginModal.value = false;
  void feed.loadInitial(true);
  void plStore.reload();
};
const onLike = () => feed.likeCurrent();
const onDislike = () => feed.dislikeCurrent();

const onPickQuality = (opt: QualityMenuItem) => {
  if (opt.disabled) return;
  qualityOpen.value = false;
  void setQuality(opt.value);
};

const onPickEffect = (key: SoundEffectKey) => {
  setEffect(key);
  effectOpen.value = false;
};

const onComment = () => {
  const n = feed.current?.commentCount;
  showBottomToast(n != null ? `评论 ${formatCount(n)} · 详情稍后支持` : '评论稍后支持');
};

const onShare = async () => {
  const song = feed.current;
  if (!song) return;
  const text = `${song.name} - ${artistText.value}`;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showBottomToast('已复制歌名');
    } else {
      showBottomToast(text);
    }
  } catch {
    showBottomToast(text);
  }
};

const appendTo = async (playlistId: string) => {
  const song = feed.current;
  if (!song) return;
  adding.value = true;
  try {
    await msAppendPlaylistTracks(playlistId, [String(song.id)]);
    showBottomToast('已加入歌单');
    addOpen.value = false;
    void plStore.reload();
  } catch (e: any) {
    showBottomToast(e?.message || '添加失败');
  } finally {
    adding.value = false;
  }
};

const WHEEL_COOLDOWN_MS = 420;
const SWIPE_THRESHOLD = 72;
let lastWheelAt = 0;
let dragY0 = 0;
let dragging = false;
let dragDy = 0;

const onWheel = (e: WheelEvent) => {
  if (!feed.current) return;
  // 歌词区滚轮只滚歌词，不切歌
  if (isInLyricArea(e.target)) return;
  const now = Date.now();
  if (now - lastWheelAt < WHEEL_COOLDOWN_MS) return;
  if (Math.abs(e.deltaY) < 18) return;
  lastWheelAt = now;
  switchSong(e.deltaY > 0 ? 1 : -1);
};

const onPointerDown = (e: PointerEvent) => {
  if (!feed.current) return;
  if (
    (e.target as HTMLElement)?.closest?.(
      'button,a,input,[role="dialog"],.discover-menu,.discover-rail'
    )
  )
    return;
  // 歌词区拖动/滑动用于滚歌词，不触发整页切歌
  if (isInLyricArea(e.target)) return;
  dragging = true;
  draggingSlide.value = true;
  dragY0 = e.clientY;
  dragDy = 0;
  dragOffset.value = 0;
  rootEl.value?.setPointerCapture?.(e.pointerId);
};

const onPointerMove = (e: PointerEvent) => {
  if (!dragging) return;
  dragDy = e.clientY - dragY0;
  // 跟手阻尼
  dragOffset.value = dragDy * 0.92;
};

const onPointerUp = () => {
  if (!dragging) return;
  dragging = false;
  draggingSlide.value = false;
  const dy = dragDy;
  dragDy = 0;
  if (dy <= -SWIPE_THRESHOLD) {
    dragOffset.value = 0;
    void switchSong(1);
  } else if (dy >= SWIPE_THRESHOLD) {
    dragOffset.value = 0;
    void switchSong(-1);
  } else {
    // 回弹
    dragOffset.value = 0;
  }
};

/**
 * 歌词跟滚：固定时长 easeInOutCubic，一次到位。
 * 偏慢、起停都软——方便跟着逐字唱；说唱短行也别 200ms 闪一下。
 */
let lrcScrollAnimId = 0;
/** 切歌后短暂吞 soft，避免与 instant 叠滚 */
let lrcSkipSoftUntil = 0;
let lrcSongScrollGen = 0;
/** 本次跟滚对应的行号；过期 rAF 丢弃 */
let lrcScrollForIndex = -1;

const stopLrcScrollAnim = () => {
  if (lrcScrollAnimId) {
    cancelAnimationFrame(lrcScrollAnimId);
    lrcScrollAnimId = 0;
  }
};

/** easeInOutCubic：中间匀一些，不抢逐字视线 */
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const softScrollLrcTo = (el: HTMLElement, targetTop: number) => {
  stopLrcScrollAnim();
  const startTop = el.scrollTop;
  const delta = targetTop - startTop;
  if (Math.abs(delta) < 0.5) {
    el.scrollTop = targetTop;
    return;
  }
  // 行距级约 0.6–0.8s；大跳最多约 1s。说唱短行也按下限走，别太冲
  const durationMs = Math.min(1000, Math.max(620, Math.abs(delta) * 6));
  const startTs = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - startTs) / durationMs);
    el.scrollTop = startTop + delta * easeInOutCubic(p);
    if (p < 1) {
      lrcScrollAnimId = requestAnimationFrame(tick);
    } else {
      el.scrollTop = targetTop;
      lrcScrollAnimId = 0;
    }
  };
  lrcScrollAnimId = requestAnimationFrame(tick);
};

const getLrcViewport = (line: HTMLElement): HTMLElement | null =>
  (line.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null) ||
  (line.closest('[data-reka-scroll-area-viewport]') as HTMLElement | null) ||
  (line.parentElement as HTMLElement | null);

const scrollActiveLyric = (behavior: 'soft' | 'instant' = 'soft', index = nowIndex.value) => {
  const line = document.getElementById(`discover-lrc-${index}`);
  if (!line) return;
  const viewport = getLrcViewport(line);
  if (!viewport) return;

  const containerHeight = viewport.clientHeight;
  // 静止帧测量：内容坐标 = 视口相对位置 + 当前 scrollTop（动画过程中不再重测）
  const lineTop =
    line.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
  // 固定锚点 30%
  const anchor = 0.3;
  const target = Math.max(0, lineTop - containerHeight * anchor + line.offsetHeight / 2);

  if (behavior === 'instant') {
    stopLrcScrollAnim();
    viewport.scrollTop = target;
    return;
  }
  softScrollLrcTo(viewport, target);
};

/** 布局稳定后再滚：nextTick + 一帧，保证 is-active 已上且只跟一次 */
const scheduleScrollActiveLyric = (behavior: 'soft' | 'instant', index: number) => {
  if (Date.now() < lrcSkipSoftUntil && behavior === 'soft') return;
  lrcScrollForIndex = index;
  void nextTick(() => {
    requestAnimationFrame(() => {
      if (lrcScrollForIndex !== index) return;
      if (nowIndex.value !== index && behavior === 'soft') return;
      if (Date.now() < lrcSkipSoftUntil && behavior === 'soft') return;
      scrollActiveLyric(behavior, index);
    });
  });
};

watch(nowIndex, (idx) => {
  if (Date.now() < lrcSkipSoftUntil) return;
  // 每一行只 schedule 一次；换行打断上一段，从当前位置新开一段短 ease
  scheduleScrollActiveLyric(idx < 0 ? 'instant' : 'soft', idx);
});

// 歌词异步到齐：切歌 instant 窗口内跳过
watch(
  () => lrcArray.value.length,
  (n, prev) => {
    if (!(n > 0 && (prev === 0 || prev === undefined))) return;
    if (Date.now() < lrcSkipSoftUntil) return;
    scheduleScrollActiveLyric('soft', nowIndex.value);
  }
);

watch(
  () => feed.current?.id,
  async (id, prev) => {
    qualityOpen.value = false;
    effectOpen.value = false;
    await nextTick();
    void extractCoverColor();
    void measureTitle();
    // 切歌：MusicHook 会按 playMusic.id 清歌词并重载；这里 force，避免串曲
    if (id && id !== prev) {
      const g = ++lrcSongScrollGen;
      lrcSkipSoftUntil = Date.now() + 500;
      stopLrcScrollAnim();
      await ensureLyricsLoaded(true);
      if (g !== lrcSongScrollGen) return;
      await nextTick();
      if (g !== lrcSongScrollGen) return;
      // 只 instant 一次钉住当前行
      scheduleScrollActiveLyric('instant', nowIndex.value);
      lrcSkipSoftUntil = Date.now() + 280;
    }
  }
);

watch(
  () => playerStore.playMusic?.id,
  (id) => {
    if (!feed.active) return;
    feed.syncIndexToSongId(id);
    feed.cacheSongRuntime(id);
  }
);

watch(
  () => [feed.current?.name, qualityLabel.value, activeEffect.value],
  () => void measureTitle()
);

const enter = async () => {
  // 允许大屏展开
  feed.active = true;
  if (!plStore.items.length) void plStore.reload();
  // 不抢队列：仅加载 feed UI
  await feed.loadInitial(false);
  await nextTick();
  // 若当前正在播的就是 feed 曲，对齐 index + 缓存歌词
  feed.syncIndexToSongId(playerStore.playMusic?.id);
  const same = feed.current && sameTrackId(playerStore.playMusic?.id, feed.current.id);
  if (same) {
    // HMR 后 lrcArray 常被清空：空则 force 重拉，避免一直「暂无歌词」
    await ensureLyricsLoaded(lrcArray.value.length === 0);
  } else if (playerStore.playMusic?.id && lrcArray.value.length === 0) {
    await ensureLyricsLoaded(true);
  }
  void extractCoverColor();
  void measureTitle();
};

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDownCloseMenus, true);
  document.addEventListener('keydown', onDocKeydownCloseMenus);
  void enter();
});
onActivated(() => {
  void enter();
});
onDeactivated(() => {
  closeChipMenus();
  stopLrcScrollAnim();
  feed.deactivate();
  dragging = false;
  draggingSlide.value = false;
  dragOffset.value = 0;
  animating.value = false;
});
onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDownCloseMenus, true);
  document.removeEventListener('keydown', onDocKeydownCloseMenus);
  closeChipMenus();
  stopLrcScrollAnim();
  feed.deactivate();
  dragging = false;
  draggingSlide.value = false;
  dragOffset.value = 0;
  animating.value = false;
  try {
    // 释放可能残留的 pointer capture，避免整页点不了
    if (rootEl.value && (rootEl.value as any).hasPointerCapture) {
      /* noop probe */
    }
  } catch {
    /* ignore */
  }
});
</script>

<style scoped lang="scss">
.discover-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  touch-action: pan-y;
  user-select: none;
  background: transparent;
}

.discover-state {
  @apply flex h-full flex-col items-center justify-center gap-3 px-6 text-center;
  color: var(--chrome-text-muted, #6b7280);
}
.discover-state-title {
  @apply text-base font-medium;
  color: var(--chrome-text, #111827);
}
.discover-state-desc {
  @apply text-sm opacity-70;
}
.discover-state-actions {
  @apply mt-2 flex gap-2;
}

.discover-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}

/* 整页竖滑视口 */
.discover-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  will-change: transform;
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.discover-slide {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* 下一首：旧页上滑出去，新页从下方上来 */
.disc-next-enter-active,
.disc-next-leave-active,
.disc-prev-enter-active,
.disc-prev-leave-active {
  transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
  /* leave 层勿挡点击（HMR/动画中断时尤其重要） */
  pointer-events: none;
}
.disc-next-enter-active,
.disc-prev-enter-active {
  pointer-events: auto;
}
.disc-next-leave-to {
  transform: translateY(-100%);
}
.disc-next-enter-from {
  transform: translateY(100%);
}
.disc-prev-leave-to {
  transform: translateY(100%);
}
.disc-prev-enter-from {
  transform: translateY(-100%);
}
.disc-next-enter-to,
.disc-prev-enter-to,
.disc-next-leave-from,
.disc-prev-leave-from {
  transform: translateY(0);
}

/*
 * 封面 + 歌词：作为一组水平居中；整体略偏下（上 padding 大于顶对齐时的 2rem）
 */
.discover-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  gap: 4.5rem;
  width: 100%;
  height: 100%;
  max-width: 1280px;
  margin: 0 auto;
  /* 往下一点点：上 7vh，下留给底栏 */
  padding: 7vh 3rem 5.5rem 2rem;
  box-sizing: border-box;
}

.discover-cover-col {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  min-width: 0;
  flex: 0 0 auto;
  width: min(38vw, 360px);
  max-width: 380px;
  position: relative;
  text-align: left;
  /* 封面整块略靠左，歌词列位置不动 */
  transform: translateX(-3rem);
}

.discover-cover-wrap {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 20px 48px rgba(0, 0, 0, 0.28),
    0 0 0 1px var(--chrome-border, rgba(255, 255, 255, 0.08));
  background: var(--chrome-surface, rgba(0, 0, 0, 0.12));
}
.discover-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.discover-cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--chrome-text-muted, #9ca3af);
  min-height: 180px;
}

/* 歌名 + chips：左对齐，芯片紧挨歌名（不贴封面右缘） */
.discover-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
.discover-title-scroll {
  /* 不 stretch 到整行，只占歌名需要的宽度；溢出时再缩 */
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
.discover-title-scroll.is-marquee {
  flex: 1 1 auto;
  min-width: 0;
}
.discover-title-track {
  display: inline-flex;
  white-space: nowrap;
  width: max-content;
  will-change: transform;
}
/* 用 padding 做间距，保证两段总宽 = 2×单段，-50% 无缝循环不跳 */
.discover-title-item {
  display: inline-flex;
  flex-shrink: 0;
  padding-right: 2.5rem;
  box-sizing: content-box;
}
.discover-title-scroll.is-marquee .discover-title-track {
  animation: discover-marquee 14s linear infinite;
}
@keyframes discover-marquee {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    /* 正好滚过第一段（含 padding），接到第二段相同内容 */
    transform: translate3d(-50%, 0, 0);
  }
}
.discover-title {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--chrome-text, #111827);
  white-space: nowrap;
}
.discover-chips {
  display: flex;
  flex: 0 0 auto;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
}
.discover-chip {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  white-space: nowrap;
  border: none;
}
.discover-chip--btn {
  cursor: pointer;
  transition: filter 0.12s;
}
.discover-chip--btn:hover {
  filter: brightness(1.08);
}

.discover-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% - 120px);
  z-index: 20;
  max-height: 220px;
  overflow: auto;
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}
.discover-menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--chrome-text, #111);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.discover-menu-item:hover:not(.disabled) {
  background: color-mix(in srgb, var(--chrome-text, #000) 6%, transparent);
}
.discover-menu-item.active {
  color: var(--primary-color, #22c55e);
  font-weight: 700;
}
.discover-menu-item.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.discover-menu-tag {
  font-size: 10px;
  font-weight: 700;
  color: var(--primary-color, #22c55e);
}

.discover-artist {
  margin: 0;
  width: 100%;
  text-align: left;
  font-size: 0.875rem;
  color: var(--chrome-text-muted, #6b7280);
}

/* 实心图标、无按钮底 */
.discover-ops {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: flex-start;
  padding-top: 2px;
}
.discover-op {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--chrome-text, #111827);
  transition: transform 0.12s ease;
}
.discover-op i {
  font-size: 26px;
  line-height: 1;
  /* 实心图标观感 */
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.18));
}
.discover-op .is-liked,
.discover-op .ri-heart-fill.is-liked {
  color: #ef4444;
}
.discover-op:hover {
  transform: scale(1.08);
}
.discover-op:active {
  transform: scale(0.94);
}
.discover-op-badge {
  position: absolute;
  top: -2px;
  right: -4px;
  z-index: 1;
  min-width: 16px;
  max-width: 48px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
  color: var(--chrome-text, #111);
  background: var(--chrome-surface-strong, rgba(255, 255, 255, 0.92));
  border: 1px solid var(--chrome-border, rgba(0, 0, 0, 0.06));
  pointer-events: none;
  white-space: nowrap;
}

/* 歌词：与封面顶齐，宽度固定便于和封面一起居中成组 */
.discover-lyric-col {
  min-width: 0;
  flex: 0 1 auto;
  width: min(40vw, 420px);
  /* 至少盖住封面高度，并可略向下延伸 */
  height: min(58vh, 520px);
  max-height: calc(100% - 0.5rem);
  align-self: start;
  margin-top: 0;
  margin-left: 0;
  padding-left: 0;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 10%,
    black 90%,
    transparent 100%
  );
}
.discover-lyric-scroll {
  height: 100%;
}
/*
 * 顶 padding 不能太大：否则 scrollTop=0 / 首句时第一行落在封面垂直中部。
 * 底 padding 保留，方便后半段跟滚。
 */
.discover-lyric-pad {
  padding: 8px 8px 48% 8px;
}
.discover-lrc-line {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 0;
  font-size: var(--lyric-font-size, 22px) !important;
  line-height: 1.5;
  color: var(--chrome-text-muted, rgba(255, 255, 255, 0.45));
  cursor: default;
  /* 不 transition font-size，避免逐字/换行时 reflow 卡顿 */
  will-change: auto;
}
.discover-lrc-line.is-active {
  /* 不改 font-weight：避免行高 reflow 让跟滚目标再蹭一截 */
  color: var(--chrome-text, #fff);
}
.discover-word-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}
.discover-word {
  display: inline;
  white-space: pre;
  /* 渐变裁切更稳 */
  -webkit-background-clip: text;
  background-clip: text;
}
.discover-lrc-tr {
  font-size: 0.72em;
  font-weight: 400;
  opacity: 0.75;
  color: var(--chrome-text-muted, inherit);
}
.discover-lrc-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  text-align: center;
  font-size: 0.95rem;
  color: var(--chrome-text-muted, #9ca3af);
  opacity: 0.75;
}

/* 竖胶囊：保持紧凑高度，仅上下内容拉开一点 */
.discover-rail {
  position: absolute;
  right: 10px;
  top: 50%;
  z-index: 5;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 0;
  /* 不要整体拉很高，只在胶囊内把上下项推开 */
  padding: 12px 4px;
  min-height: 0;
  height: auto;
  border-radius: 999px;
  background: var(--chrome-surface-strong, rgba(255, 255, 255, 0.12));
  border: 1px solid var(--chrome-border, rgba(255, 255, 255, 0.1));
  backdrop-filter: blur(var(--chrome-blur, 12px));
  -webkit-backdrop-filter: blur(var(--chrome-blur, 12px));
}
.discover-rail-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 26px;
  flex: 0 0 auto;
  padding: 8px 2px;
  border: none;
  background: transparent;
  color: var(--chrome-text, #111827);
  cursor: pointer;
  transition: opacity 0.15s;
}
.discover-rail-btn:first-child {
  padding-top: 4px;
  padding-bottom: 14px;
}
.discover-rail-btn:last-child {
  padding-top: 14px;
  padding-bottom: 4px;
}
.discover-rail-btn:hover {
  opacity: 0.75;
}
.discover-rail-chev {
  font-size: 14px;
  font-weight: 300;
  line-height: 1;
  font-family: system-ui, sans-serif;
  transform: rotate(90deg);
}
.discover-rail-label {
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}
.discover-rail-sep {
  width: 12px;
  height: 1px;
  flex-shrink: 0;
  margin: 0;
  background: var(--chrome-border, rgba(255, 255, 255, 0.2));
}

.discover-pl-item {
  @apply flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors;
}
.discover-pl-item:hover {
  background: hsl(var(--muted) / 0.6);
}
.discover-pl-cover {
  @apply size-9 shrink-0 rounded-md object-cover;
}
.discover-pl-cover--ph {
  @apply flex items-center justify-center bg-muted text-muted-foreground;
}

@media (max-width: 1024px) {
  .discover-body {
    flex-direction: column;
    align-items: center;
    gap: 1.75rem;
    padding: 5vh 2.5rem 4rem 1.25rem;
  }
  .discover-cover-col {
    width: min(52vw, 220px);
    max-width: 240px;
  }
  .discover-lyric-col {
    width: min(92%, 420px);
    height: min(36vh, 260px);
    max-height: min(36vh, 260px);
  }
  .discover-rail {
    right: 6px;
  }
}
</style>

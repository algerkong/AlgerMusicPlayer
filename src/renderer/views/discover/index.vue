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

    <div v-else class="discover-stage" :class="{ 'has-comments': commentOpen }">
      <!-- 抖音式整页竖滑：拖动时露出上下首预览 -->
      <div class="discover-viewport">
        <!-- 下一首预览（上滑时从下方露出） -->
        <div
          v-if="adjacentNext"
          class="discover-peek discover-peek--next"
          :class="{ 'is-active': draggingSlide && dragOffset < 0 }"
          :style="peekNextStyle"
          aria-hidden="true"
        >
          <div class="discover-peek-inner">
            <img
              v-if="peekNextCover"
              :src="peekNextCover"
              class="discover-peek-cover"
              alt=""
              draggable="false"
            />
            <div class="discover-peek-meta">
              <p class="discover-peek-title">{{ adjacentNext.name }}</p>
              <p class="discover-peek-artist">{{ peekNextArtist }}</p>
            </div>
          </div>
        </div>
        <!-- 上一首预览（下滑时从上方露出） -->
        <div
          v-if="adjacentPrev"
          class="discover-peek discover-peek--prev"
          :class="{ 'is-active': draggingSlide && dragOffset > 0 }"
          :style="peekPrevStyle"
          aria-hidden="true"
        >
          <div class="discover-peek-inner">
            <img
              v-if="peekPrevCover"
              :src="peekPrevCover"
              class="discover-peek-cover"
              alt=""
              draggable="false"
            />
            <div class="discover-peek-meta">
              <p class="discover-peek-title">{{ adjacentPrev.name }}</p>
              <p class="discover-peek-artist">{{ peekPrevArtist }}</p>
            </div>
          </div>
        </div>
        <Transition :name="slideName">
          <div :key="String(feed.current.id)" class="discover-slide" :style="currentSlideDragStyle">
            <!--
              稳定 DOM（便于 FLIP）：
              hero=封面+歌名 | lyric | ops
              默认 grid 两列；开评论变 封面|歌名 → 歌词 → 按钮，FLIP 沿轨迹滑动
            -->
            <div class="discover-body">
              <div class="discover-hero">
                <div ref="coverWrapEl" class="discover-cover-wrap">
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

                <div ref="metaEl" class="discover-meta">
                  <!--
                    未开评论：歌名 | 芯片 同行
                    开评论：歌名 → 歌手 → 芯片（第三行）
                  -->
                  <div ref="titleRowEl" class="discover-title-row">
                    <div class="discover-title-scroll" :class="{ 'is-marquee': titleNeedMarquee }">
                      <div class="discover-title-track">
                        <span class="discover-title-item">
                          <span class="discover-title">{{ feed.current.name }}</span>
                        </span>
                        <span
                          v-if="titleNeedMarquee"
                          class="discover-title-item"
                          aria-hidden="true"
                        >
                          <span class="discover-title">{{ feed.current.name }}</span>
                        </span>
                      </div>
                    </div>
                    <div v-if="!commentOpen" class="discover-chips discover-chips--inline">
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

                  <p class="discover-artist">{{ artistText }}</p>

                  <div v-if="commentOpen" class="discover-chips discover-chips--below">
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
              </div>

              <div
                ref="lyricColEl"
                class="discover-lyric-col"
                :class="{ 'is-empty': !lrcArray.length }"
                @wheel.stop
                @pointerdown.stop
              >
                <div v-if="!lrcArray.length" class="discover-lrc-empty">暂无歌词</div>
                <scroll-area v-else class="discover-lyric-scroll">
                  <div class="discover-lyric-pad">
                    <!--
                      性能：v-memo 冻住非当前行，避免 nowTime 60fps 整表重绘。
                      仅当前行挂逐字 span；其余整行文本，DOM 量小、跟滚不卡。
                    -->
                    <div
                      v-for="(item, i) in lrcArray"
                      :id="`discover-lrc-${i}`"
                      :key="`${feed.current?.id}-${i}`"
                      v-memo="[
                        i === nowIndex,
                        i === nowIndex ? lyricPaintBucket : 0,
                        item.text,
                        item.trText,
                        wordColors.primary,
                        wordColors.active
                      ]"
                      class="discover-lrc-line"
                      :class="{ 'is-active': i === nowIndex }"
                      @click="item.startTime !== -1 ? setAudioTime(i) : null"
                    >
                      <div
                        v-if="
                          i === nowIndex &&
                          item.hasWordByWord &&
                          item.words &&
                          item.words.length > 0
                        "
                        class="discover-word-line"
                      >
                        <span
                          v-for="(word, wi) in item.words"
                          :key="wi"
                          class="discover-word"
                          :style="getActiveWordStyle(word)"
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

              <div ref="opsWrapEl" class="discover-ops-wrap">
                <tooltip-provider :delay-duration="200">
                  <div class="discover-ops">
                    <tooltip>
                      <tooltip-trigger as-child>
                        <button type="button" class="discover-op" @click.stop="onLike">
                          <span v-if="likeCountText" class="discover-op-badge">{{
                            likeCountText
                          }}</span>
                          <i
                            :class="isLiked ? 'ri-heart-fill is-liked' : 'ri-heart-fill'"
                            :style="isLiked ? undefined : { opacity: 0.55 }"
                          />
                        </button>
                      </tooltip-trigger>
                      <tooltip-content side="bottom" :side-offset="8">
                        {{ isLiked ? '取消喜欢' : '喜欢' }}
                      </tooltip-content>
                    </tooltip>

                    <tooltip>
                      <tooltip-trigger as-child>
                        <button type="button" class="discover-op" @click.stop="onDislike">
                          <i class="ri-dislike-fill" />
                        </button>
                      </tooltip-trigger>
                      <tooltip-content side="bottom" :side-offset="8">不感兴趣</tooltip-content>
                    </tooltip>

                    <tooltip>
                      <tooltip-trigger as-child>
                        <button
                          type="button"
                          class="discover-op"
                          :class="{ 'is-on': pick.active }"
                          @click.stop="onAddToPlaylist"
                        >
                          <i class="ri-play-list-add-fill" />
                        </button>
                      </tooltip-trigger>
                      <tooltip-content side="bottom" :side-offset="8">
                        {{ pick.active ? '点击左侧歌单' : '添加到歌单' }}
                      </tooltip-content>
                    </tooltip>

                    <tooltip>
                      <tooltip-trigger as-child>
                        <button type="button" class="discover-op" @click.stop="onComment">
                          <span v-if="commentCountText" class="discover-op-badge">{{
                            commentCountText
                          }}</span>
                          <i class="ri-chat-3-fill" />
                        </button>
                      </tooltip-trigger>
                      <tooltip-content side="bottom" :side-offset="8">评论</tooltip-content>
                    </tooltip>

                    <tooltip>
                      <tooltip-trigger as-child>
                        <button type="button" class="discover-op" @click.stop="onShare">
                          <span v-if="shareCountText" class="discover-op-badge">{{
                            shareCountText
                          }}</span>
                          <i class="ri-share-forward-fill" />
                        </button>
                      </tooltip-trigger>
                      <tooltip-content side="bottom" :side-offset="8">分享</tooltip-content>
                    </tooltip>
                  </div>
                </tooltip-provider>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!--
        评论：右侧抽屉。勿用 v-if 绑 song，切歌时卸载会误关面板。
        保持挂载，仅换 song-id，体验：边听边刷评论不中断。
      -->
      <discover-comment-panel
        :open="commentOpen"
        :song-id="feed.current ? String(feed.current.id) : ''"
        :song-name="feed.current?.name"
        :seed-count="feed.current?.commentCount"
        @update:open="setCommentOpen"
        @need-login="onCommentNeedLogin"
        @count-change="onCommentCountChange"
      />

      <!-- 右侧竖胶囊；评论展开时淡出，避免 v-show 瞬切 -->
      <div class="discover-rail" :class="{ 'is-hidden': commentOpen }">
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

    <!-- 音质/音效菜单：teleport + 智能定位，风格贴近评论面板 -->
    <Teleport to="body">
      <Transition :name="qualityMenuFlip ? 'discover-menu-pop-up' : 'discover-menu-pop'">
        <div
          v-if="qualityOpen"
          class="discover-menu"
          :class="{ 'discover-menu--up': qualityMenuFlip }"
          data-discover-menu="quality"
          :style="qualityMenuStyle"
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
      </Transition>
      <Transition :name="effectMenuFlip ? 'discover-menu-pop-up' : 'discover-menu-pop'">
        <div
          v-if="effectOpen"
          class="discover-menu"
          :class="{ 'discover-menu--up': effectMenuFlip }"
          data-discover-menu="effect"
          :style="effectMenuStyle"
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
      </Transition>
    </Teleport>

    <login-qr-modal v-model:show="showLoginModal" @success="onLoginSuccess" />
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

import LoginQrModal from '@/components/login/LoginQrModal.vue';
import { Button as UiButton } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DiscoverCommentPanel from '@/views/discover/DiscoverCommentPanel.vue';
import {
  clearDisplayedLyrics,
  ensureLyricsLoaded,
  getLrcStyle,
  getLyricClockSec,
  lrcArray,
  lyricLinesHaveWords,
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
import { usePlaylistPickStore } from '@/store/modules/playlistPick';
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
const pick = usePlaylistPickStore();
const { qualityLabel, songQualityMenu, setQuality } = useStreamQuality();
const { activeEffect, setEffect, effectLabel, presets: effectPresets } = useSoundEffect();

const rootEl = ref<HTMLElement | null>(null);
const coverImgEl = ref<HTMLImageElement | null>(null);
const titleRowEl = ref<HTMLElement | null>(null);
const coverWrapEl = ref<HTMLElement | null>(null);
const metaEl = ref<HTMLElement | null>(null);
const lyricColEl = ref<HTMLElement | null>(null);
const opsWrapEl = ref<HTMLElement | null>(null);
const commentOpen = ref(false);
const layoutFlipping = ref(false);

const LAYOUT_FLIP_MS = 480;
const LAYOUT_FLIP_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * FLIP：先记 First，切换布局后记 Last，用 transform 从 First 补间到 Last。
 * 封面：translate + scale（边移动边改大小）；其它块：只 translate（避免按钮收尾抽搐）。
 */
function flipDiscoverLayout(apply: () => void) {
  if (layoutFlipping.value) {
    apply();
    return;
  }
  const cover = coverWrapEl.value;
  const nodes = [cover, metaEl.value, lyricColEl.value, opsWrapEl.value].filter(
    (el): el is HTMLElement => !!el
  );
  if (!nodes.length) {
    apply();
    return;
  }
  const first = nodes.map((el) => el.getBoundingClientRect());
  layoutFlipping.value = true;

  const slides = Array.from(
    document.querySelectorAll<HTMLElement>('.discover-stage .discover-slide')
  );
  slides.forEach((s) => {
    s.style.transition = 'none';
  });

  apply();
  void nextTick(() => {
    void document.body.offsetHeight;
    requestAnimationFrame(() => {
      const animated: HTMLElement[] = [];
      nodes.forEach((el, i) => {
        const last = el.getBoundingClientRect();
        const dx = first[i].left - last.left;
        const dy = first[i].top - last.top;
        const isCover = el === cover;
        const sx = isCover ? first[i].width / Math.max(last.width, 1) : 1;
        const sy = isCover ? first[i].height / Math.max(last.height, 1) : 1;
        const moved = Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5;
        const scaled = isCover && (Math.abs(sx - 1) >= 0.01 || Math.abs(sy - 1) >= 0.01);
        if (!moved && !scaled) return;
        el.style.transition = 'none';
        el.style.willChange = 'transform';
        el.style.zIndex = isCover ? '4' : '3';
        // top-left 原点：scale 与 translate 复合时轨迹与矩形对齐
        el.style.transformOrigin = 'top left';
        el.style.transform = isCover
          ? `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`
          : `translate3d(${dx}px, ${dy}px, 0)`;
        animated.push(el);
      });
      slides.forEach((s) => {
        s.style.transition = '';
      });
      if (!animated.length) {
        layoutFlipping.value = false;
        return;
      }
      requestAnimationFrame(() => {
        animated.forEach((el) => {
          el.style.transition = `transform ${LAYOUT_FLIP_MS}ms ${LAYOUT_FLIP_EASE}`;
          el.style.transform =
            el === cover ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(0, 0, 0)';
        });
        let settled = false;
        const clear = () => {
          if (settled) return;
          settled = true;
          animated.forEach((el) => {
            el.style.transition = '';
            el.style.transform = '';
            el.style.transformOrigin = '';
            el.style.willChange = '';
            el.style.zIndex = '';
          });
          layoutFlipping.value = false;
        };
        let left = animated.length;
        const onEnd = (e: TransitionEvent) => {
          if (e.propertyName !== 'transform') return;
          (e.currentTarget as HTMLElement).removeEventListener('transitionend', onEnd);
          left -= 1;
          if (left <= 0) clear();
        };
        animated.forEach((el) => el.addEventListener('transitionend', onEnd));
        window.setTimeout(clear, LAYOUT_FLIP_MS + 80);
      });
    });
  });
}

function setCommentOpen(next: boolean) {
  if (commentOpen.value === next) return;
  flipDiscoverLayout(() => {
    commentOpen.value = next;
  });
  // 布局变宽/变窄后，跟滚锚点与字号 max 变了：软跟一次，字号继续缓动不瞬间
  void nextTick(() => {
    if (!lrcArray.value.length) return;
    scheduleScrollActiveLyric('soft', nowIndex.value);
  });
}
const showLoginModal = ref(false);
const qualityOpen = ref(false);
const effectOpen = ref(false);
const qualityMenuStyle = ref<Record<string, string>>({});
const effectMenuStyle = ref<Record<string, string>>({});
const qualityMenuFlip = ref(false);
const effectMenuFlip = ref(false);

const closeChipMenus = () => {
  qualityOpen.value = false;
  effectOpen.value = false;
};

/** 智能展开：下方空间不足（易被播放条挡住）则向上弹出 */
function placeChipMenu(kind: 'quality' | 'effect') {
  const sel =
    kind === 'quality' ? '[data-discover-chip="quality"]' : '[data-discover-chip="effect"]';
  // 开评论时芯片在下方行，可能有两处；取当前可见的
  const chips = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0
  );
  const chip = chips[chips.length - 1] || chips[0];
  if (!chip) return;

  const rect = chip.getBoundingClientRect();
  const gap = 8;
  const menuEstH = 220;
  const playBarH =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--play-bar-height')) ||
    80;
  const spaceBelow = window.innerHeight - rect.bottom - playBarH - gap;
  const spaceAbove = rect.top - gap;
  const openUp = spaceBelow < Math.min(menuEstH, 168) && spaceAbove > spaceBelow;
  const maxH = Math.max(120, Math.min(menuEstH, openUp ? spaceAbove : spaceBelow));
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 176));

  const style: Record<string, string> = {
    position: 'fixed',
    left: `${left}px`,
    zIndex: '120',
    maxHeight: `${maxH}px`,
    width: 'min(200px, 72vw)'
  };
  if (openUp) {
    style.bottom = `${window.innerHeight - rect.top + gap}px`;
    style.top = 'auto';
    style.transformOrigin = 'bottom left';
  } else {
    style.top = `${rect.bottom + gap}px`;
    style.bottom = 'auto';
    style.transformOrigin = 'top left';
  }

  if (kind === 'quality') {
    qualityMenuFlip.value = openUp;
    qualityMenuStyle.value = style;
  } else {
    effectMenuFlip.value = openUp;
    effectMenuStyle.value = style;
  }
}

const toggleQualityMenu = () => {
  const next = !qualityOpen.value;
  qualityOpen.value = next;
  if (next) {
    effectOpen.value = false;
    void nextTick(() => placeChipMenu('quality'));
  }
};

const toggleEffectMenu = () => {
  const next = !effectOpen.value;
  effectOpen.value = next;
  if (next) {
    qualityOpen.value = false;
    void nextTick(() => placeChipMenu('effect'));
  }
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

/** 拖动只移当前页，viewport 不动，才能露出上下预览页 */
const currentSlideDragStyle = computed(() => {
  if (!draggingSlide.value) return undefined;
  return {
    transform: `translate3d(0, ${dragOffset.value}px, 0)`,
    transition: 'none',
    zIndex: 2
  };
});

const adjacentNext = computed(() => {
  const i = feed.index;
  const list = feed.items;
  if (i < 0 || i >= list.length - 1) return null;
  return list[i + 1] || null;
});
const adjacentPrev = computed(() => {
  const i = feed.index;
  if (i <= 0) return null;
  return feed.items[i - 1] || null;
});

const peekNextCover = computed(() => {
  const pic = getSongCoverUrl(adjacentNext.value);
  return pic ? getImgUrl(pic, '300y300') : '';
});
const peekPrevCover = computed(() => {
  const pic = getSongCoverUrl(adjacentPrev.value);
  return pic ? getImgUrl(pic, '300y300') : '';
});
const peekNextArtist = computed(() => {
  const names = getSongArtists(adjacentNext.value)
    .map((a) => a.name)
    .filter(Boolean);
  return names.join(' / ') || '未知歌手';
});
const peekPrevArtist = computed(() => {
  const names = getSongArtists(adjacentPrev.value)
    .map((a) => a.name)
    .filter(Boolean);
  return names.join(' / ') || '未知歌手';
});

const peekNextStyle = computed(() => {
  if (!draggingSlide.value || dragOffset.value >= 0) {
    return { visibility: 'hidden' as const, pointerEvents: 'none' as const };
  }
  return {
    transform: `translate3d(0, calc(100% + ${dragOffset.value}px), 0)`,
    transition: 'none',
    visibility: 'visible' as const,
    zIndex: 1
  };
});
const peekPrevStyle = computed(() => {
  if (!draggingSlide.value || dragOffset.value <= 0) {
    return { visibility: 'hidden' as const, pointerEvents: 'none' as const };
  }
  return {
    transform: `translate3d(0, calc(-100% + ${dragOffset.value}px), 0)`,
    transition: 'none',
    visibility: 'visible' as const,
    zIndex: 1
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

/** 订阅播放进度；约 60 桶/秒，给 v-memo 用，避免无意义的亚毫秒重绘 */
const lyricClockMs = computed(() => {
  void nowTime.value;
  return getLyricClockSec() * 1000;
});
const lyricPaintBucket = computed(() => Math.floor(lyricClockMs.value / 16));

/** 仅当前行逐字：非当前行已降级整行文本，不进这里 */
const getActiveWordStyle = (word: any) =>
  getActiveLineWordStyle(lyricClockMs.value, word, wordColors.value);

const lineTextStyle = (index: number) => {
  // 非当前行：纯色，无渐变、无 clock 依赖 → v-memo 可整行冻结
  if (index !== nowIndex.value) {
    return { color: wordColors.value.primary };
  }
  // 当前行且无逐字：行级渐变，依赖 clock
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
  if (!feed.current?.id) {
    showBottomToast('暂无歌曲');
    return;
  }
  setCommentOpen(!commentOpen.value);
};

const onCommentNeedLogin = () => {
  // 保持面板打开，只弹出登录；登录成功后可继续发评
  showLoginModal.value = true;
  showBottomToast('登录后即可互动');
};

const onCommentCountChange = (n: number | undefined) => {
  if (!feed.current || n == null) return;
  feed.current.commentCount = n;
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

/** 添加到歌单：无弹窗，左侧歌单闪烁点选（见 playlistPick store + AppMenu） */
const onAddToPlaylist = () => {
  // 关掉 tip 残留：先 blur 当前按钮
  try {
    (document.activeElement as HTMLElement | null)?.blur?.();
  } catch {
    /* ignore */
  }
  if (!plStore.authenticated) {
    showLoginModal.value = true;
    showBottomToast('请先登录后再添加');
    return;
  }
  const song = feed.current;
  if (!song) {
    showBottomToast('没有可添加的歌曲');
    return;
  }
  if (pick.active && pick.song?.id === String(song.id)) {
    pick.cancel();
    return;
  }
  void plStore.reload();
  pick.start(song);
};

// 切歌时退出点选，避免加错歌
watch(
  () => feed.current?.id,
  () => {
    if (pick.active) pick.cancel();
  }
);

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
 * 字号不做跟滚缩放（transform 发糊 + 全曲种都晃），只靠 is-active 轻微字号层级。
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
  // 略短：跟滚本身吃主线程；配合 v-memo 后更容易贴 60fps
  const durationMs = Math.min(720, Math.max(380, Math.abs(delta) * 4.2));
  const startTs = performance.now();
  // 滚动期间减少 layout 读：只写 scrollTop，不测布局
  const tick = (now: number) => {
    const p = Math.min(1, (now - startTs) / durationMs);
    // 直接写，避免额外对象/日志
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
    // 切歌：feed 先于 playMusic 变 id；若立刻 ensure 会按「旧 playMusic」绑歌词 → 串台
    if (id && id !== prev) {
      const g = ++lrcSongScrollGen;
      lrcSkipSoftUntil = Date.now() + 500;
      stopLrcScrollAnim();
      // 先清空展示，UI 立刻跟 feed 走（无歌词先显示空态）
      clearDisplayedLyrics();
      // 播放器已对齐本曲才拉；否则等 playMusic.id watch
      if (sameTrackId(playerStore.playMusic?.id, id)) {
        await ensureLyricsLoaded(true);
      }
      if (g !== lrcSongScrollGen) return;
      await nextTick();
      if (g !== lrcSongScrollGen) return;
      scheduleScrollActiveLyric('instant', nowIndex.value);
      lrcSkipSoftUntil = Date.now() + 280;
    }
  }
);

watch(
  () => playerStore.playMusic?.id,
  async (id) => {
    if (!feed.active) return;
    feed.syncIndexToSongId(id);
    feed.cacheSongRuntime(id);
    // 播放器切到 feed 当前曲后，再绑歌词（修「feed 已切、playMusic 滞后」串台）
    if (id && sameTrackId(id, feed.current?.id)) {
      const g = ++lrcSongScrollGen;
      lrcSkipSoftUntil = Date.now() + 400;
      stopLrcScrollAnim();
      await ensureLyricsLoaded(true);
      if (g !== lrcSongScrollGen) return;
      await nextTick();
      if (g !== lrcSongScrollGen) return;
      scheduleScrollActiveLyric('instant', nowIndex.value);
      lrcSkipSoftUntil = Date.now() + 280;
    }
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
    // 展示层挂 globalThis：HMR 后若已有逐字则不动；仅空/行级才 force
    const needForce = lrcArray.value.length === 0 || !lyricLinesHaveWords(lrcArray.value as any);
    if (needForce) await ensureLyricsLoaded(true);
  } else if (playerStore.playMusic?.id) {
    const needForce = lrcArray.value.length === 0 || !lyricLinesHaveWords(lrcArray.value as any);
    if (needForce) await ensureLyricsLoaded(true);
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
  /* 与 DiscoverCommentPanel 宽度一致，主区 right 让位（勿随意改面板宽高） */
  --discover-comment-w: min(460px, 44vw);
  --discover-comment-gap: 12px;
  --discover-comment-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --discover-comment-dur: 0.48s;
  /* 开评论时左侧封面尺寸（与暂无歌词左偏移共用） */
  --discover-left-cover: clamp(120px, 13vw, 156px);
  --discover-left-gap: 16px;
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

/*
 * slide 是 absolute，padding 父级挤不动它。
 * 开评论时改 right，把主内容区域从右侧收窄（五按钮等结构不变，只整体让位）。
 */
.discover-slide {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: auto;
  height: auto;
  transition: right var(--discover-comment-dur) var(--discover-comment-ease);
}
.discover-stage.has-comments .discover-slide {
  right: calc(var(--discover-comment-w) + var(--discover-comment-gap) * 2);
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
 * 固定三块：hero(封面+歌名) / lyric / ops
 * 默认：hero+ops 左列，lyric 右列
 * 开评论：hero 横排封面|歌名，整列 歌词、按钮；FLIP 负责轨迹动画
 */
.discover-body {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: min(38vw, 360px) min(40vw, 420px);
  grid-template-rows: auto auto minmax(0, 1fr);
  grid-template-areas:
    'hero lyric'
    'ops lyric'
    '. lyric';
  justify-content: center;
  align-content: start;
  column-gap: 4.5rem;
  row-gap: 12px;
  width: 100%;
  height: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 7vh 3rem 5.5rem 2rem;
  box-sizing: border-box;
}

.discover-hero {
  grid-area: hero;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  min-width: 0;
  width: 100%;
  /* 用 margin 左偏，把 transform 留给 FLIP，避免动画结束抽搐 */
  margin-left: -3rem;
}

.discover-cover-wrap {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
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

.discover-meta {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  width: 100%;
  text-align: left;
}

.discover-ops-wrap {
  grid-area: ops;
  min-width: 0;
  width: 100%;
  /* 与 hero 同列左偏（勿用 transform，否则和 FLIP 抢） */
  margin-left: -3rem;
}

/* 歌词右列 */
.discover-lyric-col {
  grid-area: lyric;
  min-width: 0;
  width: 100%;
  height: min(58vh, 520px);
  max-height: calc(100% - 0.5rem);
  align-self: start;
  overflow: hidden;
  /* 顶部不淡出：作词/作曲接在歌词最前，scrollTop=0 时也要能读 */
  mask-image: linear-gradient(to bottom, black 0%, black 88%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 88%, transparent 100%);
}

/* —— 评论展开布局：左列铺满可用宽（右缘外扩），内容随宽变大 —— */
.discover-stage.has-comments .discover-body {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas:
    'hero'
    'lyric'
    'ops';
  justify-content: stretch;
  align-content: stretch;
  max-width: none;
  width: 100%;
  height: 100%;
  margin: 0;
  column-gap: 0;
  row-gap: 8px;
  /* 底 padding 只留与播放条的间隙（舞台高度已扣底栏），五按钮可贴底 */
  padding: 2vh 0.5rem 12px 1.75rem;
}

.discover-stage.has-comments .discover-hero {
  flex-direction: row;
  /* 歌名+歌手+芯片 整体相对封面垂直居中 */
  align-items: center;
  gap: var(--discover-left-gap, 16px);
  margin-left: 0;
  max-width: none;
  width: 100%;
}

.discover-stage.has-comments .discover-cover-wrap {
  /* 随视口变大，左缘仍贴 body 左 padding */
  width: var(--discover-left-cover, 132px);
  max-width: var(--discover-left-cover, 132px);
  flex-shrink: 0;
  border-radius: 14px;
}

.discover-stage.has-comments .discover-meta {
  flex: 1 1 auto;
  justify-content: center;
  gap: 8px;
  max-width: 100%;
  min-width: 0;
}

.discover-stage.has-comments .discover-title {
  font-size: clamp(1.15rem, 2.1vw, 1.55rem);
}

.discover-stage.has-comments .discover-artist {
  font-size: clamp(0.9rem, 1.35vw, 1.05rem);
}

.discover-stage.has-comments .discover-lyric-col {
  width: 100%;
  max-width: none;
  height: 100%;
  min-height: 140px;
  max-height: none;
  align-self: stretch;
  mask-image: linear-gradient(to bottom, black 0%, black 90%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 90%, transparent 100%);
}

.discover-stage.has-comments .discover-ops-wrap {
  margin-left: 0;
  max-width: none;
  width: 100%;
  /* 贴网格底行，与播放条之间只靠 body 的 12px 间隙 */
  margin-top: 0;
  padding-top: 4px;
  padding-bottom: 0;
}

.discover-stage.has-comments .discover-ops {
  gap: clamp(12px, 1.5vw, 20px);
}

.discover-stage.has-comments .discover-op {
  width: clamp(44px, 4.4vw, 54px);
  height: clamp(44px, 4.4vw, 54px);
}

.discover-stage.has-comments .discover-op i {
  font-size: clamp(26px, 2.7vw, 32px);
}

/*
 * 开评论 + 无歌词：与歌手左缘对齐（封面 + gap）
 */
.discover-stage.has-comments .discover-lyric-col.is-empty {
  max-width: none;
  width: 100%;
  justify-self: stretch;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  mask-image: none;
  -webkit-mask-image: none;
}
.discover-stage.has-comments .discover-lrc-empty {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin: 0 0 0 calc(var(--discover-left-cover, 132px) + var(--discover-left-gap, 16px));
  width: auto;
  max-width: calc(100% - var(--discover-left-cover, 132px) - var(--discover-left-gap, 16px));
  height: auto;
  min-height: 0;
  padding: 0;
  text-align: left;
  box-sizing: border-box;
  font-size: clamp(0.95rem, 1.4vw, 1.1rem);
}

.discover-stage.has-comments .discover-lyric-pad {
  /* 底部留白从 20% 收到约一行，避免吃掉可滚动高度 */
  padding: 4px 4px 12% 0;
}

/* 歌名行：未开评论时芯片紧挨歌名（约 4px ≈ 半个字间距） */
.discover-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
.discover-title-scroll {
  /* 不 stretch 整行，只占歌名宽，芯片紧挨后面 */
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
/* 默认无右 padding，避免歌名与芯片之间空一大截；跑马灯时再加段间距 */
.discover-title-item {
  display: inline-flex;
  flex-shrink: 0;
  padding-right: 0;
  box-sizing: content-box;
}
.discover-title-scroll.is-marquee .discover-title-item {
  padding-right: 2.5rem;
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
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--chrome-text, #111827);
  white-space: nowrap;
}
.discover-chips {
  display: flex;
  flex: 0 0 auto;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}
/* 跟在歌名右侧：不占满宽 */
.discover-chips--inline {
  width: auto;
  max-width: 45%;
}
/* 开评论：歌手下整行 */
.discover-chips--below {
  width: 100%;
}
.discover-chip {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 9px;
  border-radius: 5px;
  font-size: 12.5px;
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

/*
 * 音质/音效菜单：仿评论面板磨砂壳
 * fixed 定位 + 智能上/下展开（见 placeChipMenu）
 */
.discover-menu {
  min-width: 156px;
  max-width: min(220px, 72vw);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 8px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(8, 8, 10, 0.42);
  backdrop-filter: blur(28px) saturate(1.25);
  -webkit-backdrop-filter: blur(28px) saturate(1.25);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.1) inset,
    0 16px 48px rgba(0, 0, 0, 0.32);
  transform-origin: top left;
  scrollbar-width: none;
}
.discover-menu--up {
  transform-origin: bottom left;
}
.discover-menu::-webkit-scrollbar {
  display: none;
}
.discover-menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: rgba(255, 255, 255, 0.92);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.18s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.18s ease,
    transform 0.16s ease;
}
.discover-menu-item:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.1);
}
.discover-menu-item.active {
  color: #fff;
  font-weight: 700;
  background: color-mix(in srgb, var(--primary-color, #22c55e) 38%, transparent);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.08) inset;
}
.discover-menu-item.disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
.discover-menu-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--primary-color, #22c55e) 45%, #fff);
  color: #fff;
  background: color-mix(in srgb, var(--primary-color, #22c55e) 42%, transparent);
}

/*
 * 音质/音效：从芯片旁「极小 → 长大」
 * transform-origin 由 placeChipMenu 设为 top/bottom left
 */
.discover-menu-pop-enter-active,
.discover-menu-pop-leave-active {
  transition:
    opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.48s cubic-bezier(0.16, 1, 0.3, 1);
}
.discover-menu-pop-enter-from {
  opacity: 0;
  transform: scale(0.06);
}
.discover-menu-pop-leave-to {
  opacity: 0;
  transform: scale(0.1);
}
.discover-menu-pop-enter-to,
.discover-menu-pop-leave-from {
  opacity: 1;
  transform: scale(1);
}
/* 向上展开 */
.discover-menu-pop-up-enter-active,
.discover-menu-pop-up-leave-active {
  transition:
    opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.48s cubic-bezier(0.16, 1, 0.3, 1);
}
.discover-menu-pop-up-enter-from {
  opacity: 0;
  transform: scale(0.06);
}
.discover-menu-pop-up-leave-to {
  opacity: 0;
  transform: scale(0.1);
}
.discover-menu-pop-up-enter-to,
.discover-menu-pop-up-leave-from {
  opacity: 1;
  transform: scale(1);
}

/* 拖动切歌时的上下首预览页 */
.discover-peek {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: transparent;
}
.discover-peek-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  max-width: min(72vw, 360px);
  padding: 24px;
  text-align: center;
}
.discover-peek-cover {
  width: min(42vw, 220px);
  height: min(42vw, 220px);
  border-radius: 16px;
  object-fit: cover;
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.08);
}
.discover-peek-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--chrome-text, #f3f4f6);
  line-height: 1.3;
}
.discover-peek-artist {
  margin: 4px 0 0;
  font-size: 0.95rem;
  color: var(--chrome-text-muted, rgba(255, 255, 255, 0.65));
}

.discover-artist {
  margin: 0;
  width: 100%;
  text-align: left;
  font-size: 1rem;
  color: var(--chrome-text-muted, #6b7280);
}

/* 实心图标、无按钮底 */
.discover-ops {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  justify-content: flex-start;
  padding-top: 2px;
}
.discover-op {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--chrome-text, #111827);
  transition: transform 0.12s ease;
}
.discover-op i {
  font-size: 30px;
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
/* 点选添加歌单中 */
.discover-op.is-on {
  color: var(--primary-color, #22c55e);
}
.discover-op.is-on i {
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--primary-color, #22c55e) 55%, transparent));
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

.discover-lyric-scroll {
  height: 100%;
}
/*
 * 顶 padding 不能太大：否则 scrollTop=0 / 首句时第一行落在封面垂直中部。
 * 底 padding 保留，方便后半段跟滚。
 */
.discover-lyric-pad {
  padding: 8px 8px 48% 8px;
  /*
   * 布局永远按「高亮字号」排；缩放只动 transform，换行宽不变 → 不跳。
   * 评论开/关同一套字号（展开时用户觉得清晰，未展开对齐）。
   */
  --lrc-size: 28px;
  --lrc-scale-idle: 0.86; /* ≈24/28，非当前也够读 */
}
.discover-lrc-line {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 0;
  /*
   * 关键：font-size 固定为最大档，只 scale 视觉大小。
   * 长句在放大过程中不会突然多/少折行，跟滚不再卡顿跳。
   * 当前句 scale(1) = 原生 --lrc-size 绘制，不糊。
   */
  font-size: var(--lrc-size) !important;
  line-height: 1.45;
  color: var(--chrome-text-muted, rgba(255, 255, 255, 0.45));
  cursor: default;
  transform: scale(var(--lrc-scale-idle));
  transform-origin: left center;
  content-visibility: auto;
  contain-intrinsic-size: auto 3.4em;
  contain: layout style;
  transition:
    transform 0.38s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.22s ease;
}
.discover-lrc-line.is-active {
  transform: scale(1);
  color: var(--chrome-text, #fff);
  content-visibility: visible;
  contain: none;
}
.discover-word-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}
.discover-word {
  display: inline;
  white-space: pre;
  -webkit-background-clip: text;
  background-clip: text;
}
.discover-lrc-tr {
  /* 相对父级 --lrc-size；整行 transform 时译文一起缩放 */
  font-size: 0.72em;
  font-weight: 400;
  opacity: 0.72;
  color: var(--chrome-text-muted, inherit);
  transition: opacity 0.28s ease;
}
.discover-lrc-line.is-active .discover-lrc-tr {
  opacity: 0.9;
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
  opacity: 1;
  transition: opacity var(--discover-comment-dur, 0.45s) var(--discover-comment-ease, ease);
  pointer-events: auto;
}
.discover-rail.is-hidden {
  opacity: 0;
  pointer-events: none;
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
    grid-template-columns: min(52vw, 220px);
    grid-template-areas:
      'hero'
      'ops'
      'lyric';
    justify-content: center;
    column-gap: 0;
    row-gap: 12px;
    padding: 5vh 2.5rem 4rem 1.25rem;
  }
  .discover-hero {
    margin-left: 0;
    width: min(52vw, 220px);
  }
  .discover-ops-wrap {
    margin-left: 0;
  }
  .discover-lyric-col {
    width: min(92vw, 420px);
    height: min(36vh, 260px);
    max-height: min(36vh, 260px);
    justify-self: center;
  }
  .discover-rail {
    right: 6px;
  }
  .discover-stage {
    --discover-comment-w: min(400px, 90vw);
    --discover-left-cover: clamp(100px, 22vw, 128px);
  }
  .discover-stage.has-comments .discover-body {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'hero'
      'lyric'
      'ops';
    padding: 3vh 0.75rem 4rem 1rem;
  }
  .discover-stage.has-comments .discover-cover-wrap {
    width: 100px;
    max-width: 100px;
  }
}
</style>

<template>
  <!-- 全 shadcn：Sheet 侧栏 + Button / ScrollArea / Separator / Textarea / Tooltip -->
  <sheet :open="open" :modal="false" @update:open="onOpenChange">
    <sheet-content
      side="right"
      :show-overlay="false"
      :show-close-button="false"
      :class="sheetClass"
      @pointer-down-outside="preventOutsideDismiss"
      @focus-outside="preventOutsideDismiss"
      @interact-outside="preventOutsideDismiss"
    >
      <!--
        列表铺满；顶栏/输入绝对叠在列表上。
        这样 backdrop-filter 才能糊到底下正在滚的评论。
      -->
      <div class="discover-comment-body">
        <scroll-area
          ref="listScrollRef"
          class="discover-comment-scroll px-5"
          :viewport-class="loading && !comments.length ? 'h-full' : undefined"
        >
          <!-- 加载中 -->
          <div
            v-if="loading && !comments.length"
            class="discover-comment-skeleton-wrap relative box-border h-full w-full"
            :style="{ minHeight: `${discoverCommentsBones.height}px` }"
          >
            <skeleton
              name="discover-comments"
              :loading="true"
              :initial-bones="discoverCommentsBones"
              animate="shimmer"
              :transition="true"
              color="rgba(255,255,255,0.1)"
              dark-color="rgba(255,255,255,0.12)"
              class="discover-comment-skeleton absolute inset-0 h-full w-full"
            />
          </div>

          <div v-else class="discover-comment-list">
            <div
              v-if="error && !comments.length"
              class="flex min-h-[140px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
            >
              <p>{{ error }}</p>
              <ui-button size="sm" variant="outline" @click="() => loadInitial(props.songId)">
                重试
              </ui-button>
            </div>

            <div
              v-else-if="!comments.length"
              class="flex min-h-[140px] items-center justify-center text-sm text-muted-foreground"
            >
              还没有评论，来抢沙发吧
            </div>

            <div v-else class="flex flex-col">
              <template v-for="(item, idx) in comments" :key="item.id">
                <separator v-if="idx > 0" class="opacity-30" />
                <div class="py-3.5">
                  <discover-comment-item
                    :comment="item"
                    :my-user-id="myUserId"
                    :busy="busyId === item.id"
                    @like="toggleLike(item)"
                    @reply="startReply(item)"
                    @delete="removeComment(item)"
                    @toggle-replies="toggleReplies(item)"
                  />

                  <div
                    v-if="item._repliesOpen"
                    class="mt-2.5 ml-12 border-l border-white/10 pl-3.5"
                  >
                    <p
                      v-if="item._repliesLoading && !item._replies?.length"
                      class="py-1 text-xs text-muted-foreground"
                    >
                      加载回复…
                    </p>
                    <div v-for="rep in item._replies || []" :key="rep.id" class="py-2">
                      <discover-comment-item
                        compact
                        :comment="rep"
                        :my-user-id="myUserId"
                        :busy="busyId === rep.id"
                        @like="toggleLike(rep, item)"
                        @reply="startReply(item, rep)"
                        @delete="removeComment(rep, item)"
                      />
                    </div>
                    <ui-button
                      v-if="item._repliesHasMore"
                      variant="link"
                      size="sm"
                      class="h-auto px-0 py-1"
                      :disabled="item._repliesLoading"
                      @click="loadMoreReplies(item)"
                    >
                      {{ item._repliesLoading ? '加载中…' : '更多回复' }}
                    </ui-button>
                  </div>
                </div>
              </template>

              <!-- 无限滚动哨兵：提前进视口即静默预取，无按钮 -->
              <div ref="loadSentinelEl" class="discover-comment-load-sentinel" aria-hidden="true" />
            </div>
          </div>
        </scroll-area>

        <!-- 顶栏：关闭/标题胶囊用封面取色磨砂 -->
        <div class="discover-comment-header" :style="{ '--header-accent': sendBtnBg }">
          <sheet-close as-child>
            <ui-button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="discover-comment-header-close"
            >
              <i class="ri-close-line text-lg" />
              <span class="sr-only">关闭</span>
            </ui-button>
          </sheet-close>
          <sheet-title class="discover-comment-header-title">
            评论
            <span v-if="totalCount != null" class="discover-comment-header-count">
              {{ formatCount(totalCount) }}
            </span>
          </sheet-title>
          <span class="discover-comment-header-spacer" aria-hidden="true" />
          <sheet-description class="sr-only">当前歌曲评论列表</sheet-description>
        </div>

        <!-- 底栏叠在列表上：无实色挡板，仅输入/发送磨砂 -->
        <div class="discover-comment-composer">
          <div
            v-if="replyTarget"
            class="discover-comment-reply-chip mb-2 flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2 text-sm text-muted-foreground"
          >
            <span class="min-w-0 truncate">
              回复
              <span class="font-semibold text-foreground">@{{ replyTarget.userLabel }}</span>
              <span v-if="replyTarget.preview" class="opacity-70">
                ：{{ replyTarget.preview }}
              </span>
            </span>
            <ui-button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="shrink-0"
              @click="clearReply"
            >
              <i class="ri-close-line" />
              <span class="sr-only">取消回复</span>
            </ui-button>
          </div>

          <div class="discover-comment-composer-row flex w-full items-end gap-2.5">
            <textarea-input
              ref="draftEl"
              v-model="draft"
              rows="1"
              :placeholder="placeholder"
              :disabled="submitting"
              class="discover-comment-draft max-h-[7.5rem] min-h-10 flex-1 resize-none overflow-y-auto rounded-2xl px-3.5 py-2.5 text-[15px] leading-5 text-[color:var(--chrome-text,#f3f4f6)] placeholder:text-white/58 md:text-[15px]"
              @input="resizeDraft"
              @keydown="onDraftKeydown"
            />
            <button
              type="button"
              class="discover-comment-send shrink-0"
              :disabled="submitting || !draft.trim()"
              :aria-label="submitting ? '发送中' : '发送'"
              :style="{ '--send-bg': sendBtnBg }"
              @click="submit"
            >
              <i class="ri-send-plane-2-fill" />
            </button>
          </div>
        </div>
      </div>
    </sheet-content>
  </sheet>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';

import Skeleton from 'boneyard-js/vue';

import {
  msCreateComment,
  msDeleteComment,
  msGetAuthState,
  msGetProfile,
  msLikeComment,
  msListCommentReplies,
  msListComments,
  type MsComment
} from '@/api/musicSource';
import { discoverCommentsBones } from '@/bones/discover-comments';
import { Button as UiButton } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle
} from '@/components/ui/sheet';
import { Textarea as TextareaInput } from '@/components/ui/textarea';
import { usePlayerStore } from '@/store/modules/player';
import DiscoverCommentItem from '@/views/discover/DiscoverCommentItem.vue';
import { showBottomToast } from '@/utils/shortcutToast';

type UiComment = MsComment & {
  _digged?: boolean;
  _repliesOpen?: boolean;
  _replies?: UiComment[];
  _repliesCursor?: string;
  _repliesHasMore?: boolean;
  _repliesLoading?: boolean;
};

type CommentCacheEntry = {
  comments: UiComment[];
  cursor?: string;
  hasMore: boolean;
  totalCount?: number;
  prompts: string[];
  at: number;
};
const commentCache = new Map<string, CommentCacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

const props = defineProps<{
  open: boolean;
  songId: string;
  songName?: string;
  seedCount?: number;
}>();

const emit = defineEmits<{
  'update:open': [boolean];
  'need-login': [];
  'count-change': [number | undefined];
}>();

const playerStore = usePlayerStore();
/** 发送钮跟封面取色，无色时退回主题绿 */
const sendBtnBg = computed(
  () => playerStore.playMusic?.primaryColor || 'var(--primary-color, #22c55e)'
);

const comments = ref<UiComment[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const submitting = ref(false);
const error = ref('');
const cursor = ref<string | undefined>();
const hasMore = ref(false);
const totalCount = ref<number | undefined>();
const prompts = ref<string[]>([]);
const draft = ref('');
/** 输入框 DOM（Textarea 单根），用于单行自适应增高 */
const draftEl = ref<{ $el?: HTMLElement } | HTMLElement | null>(null);
/** 列表 ScrollArea，用于无限滚动 root */
const listScrollRef = ref<{ getViewport?: () => HTMLElement | null } | null>(null);
/** 列表底部哨兵：靠近时静默预取下一页 */
const loadSentinelEl = ref<HTMLElement | null>(null);
/** 输入区最高约 5 行，避免挡住评论列表 */
const DRAFT_MAX_PX = 120;
/** 每页条数略多一点，减少滚动中的缺口 */
const PAGE_LIMIT = 24;
const busyId = ref('');
const myUserId = ref('');
const myNickname = ref('');
const myAvatarUrl = ref('');
const myVipLevel = ref('');
const authenticated = ref(false);
const loadedSongId = ref('');
let refreshGen = 0;
let loadIo: IntersectionObserver | null = null;

function applyMyProfile(profile: {
  id?: string;
  nickname?: string;
  avatarUrl?: string;
  vipLevel?: string;
}) {
  myUserId.value = profile.id || myUserId.value || '';
  if (profile.nickname) myNickname.value = profile.nickname;
  if (profile.avatarUrl) myAvatarUrl.value = profile.avatarUrl;
  if (profile.vipLevel) myVipLevel.value = profile.vipLevel;
}

function myUserSnapshot(): NonNullable<UiComment['user']> {
  return {
    id: myUserId.value || undefined,
    nickname: myNickname.value || '我',
    avatarUrl: myAvatarUrl.value || undefined,
    isVip: myVipLevel.value === 'vip' || myVipLevel.value === 'svip' || undefined,
    vipLevel: myVipLevel.value || undefined
  };
}

function getDraftTextarea(): HTMLTextAreaElement | null {
  const r = draftEl.value;
  if (!r) return null;
  if (r instanceof HTMLTextAreaElement) return r;
  const el = (r as { $el?: HTMLElement }).$el ?? (r as HTMLElement);
  if (el instanceof HTMLTextAreaElement) return el;
  return el?.querySelector?.('textarea') ?? null;
}

const DRAFT_MIN_PX = 40;
/** 避免动画中途多次 input 互相打断 */
let draftResizeRaf = 0;

/**
 * 按内容增高（有上限），高度变化用 CSS transition 丝滑过渡。
 * 测高时短暂关掉 transition，再从当前高度补间到目标。
 */
function resizeDraft(opts?: { animate?: boolean }) {
  const el = getDraftTextarea();
  if (!el) return;
  const animate = opts?.animate !== false;

  if (draftResizeRaf) cancelAnimationFrame(draftResizeRaf);
  draftResizeRaf = requestAnimationFrame(() => {
    draftResizeRaf = 0;
    const from = el.offsetHeight || DRAFT_MIN_PX;
    // 先无动画测真实 scrollHeight
    el.style.transition = 'none';
    el.style.height = 'auto';
    const raw = el.scrollHeight;
    const to = Math.min(Math.max(raw, DRAFT_MIN_PX), DRAFT_MAX_PX);
    el.style.overflowY = raw > DRAFT_MAX_PX ? 'auto' : 'hidden';

    if (!animate || Math.abs(from - to) < 1) {
      el.style.height = `${to}px`;
      el.style.transition = '';
      return;
    }

    el.style.height = `${from}px`;
    // 强制回流，再开 transition 到目标高度
    void el.offsetHeight;
    el.style.transition = 'height 0.22s cubic-bezier(0.22, 1, 0.36, 1)';
    el.style.height = `${to}px`;
  });
}

/** Enter 发送；Shift+Enter 换行（类 Telegram） */
function onDraftKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter') return;
  if (e.shiftKey) return;
  e.preventDefault();
  void submit();
}

function resetDraftHeight() {
  nextTick(() => resizeDraft({ animate: true }));
}

type ReplyTarget = {
  topId: string;
  replyId?: string;
  replyToUserId?: string;
  userLabel: string;
  preview: string;
};
const replyTarget = ref<ReplyTarget | null>(null);

const placeholder = computed(() => {
  if (replyTarget.value) return `回复 @${replyTarget.value.userLabel}`;
  return prompts.value[0] || '写下你想说的...';
});

/**
 * Sheet 会 teleport 到 body，scoped :deep 无效。
 * 外观/动画以非 scoped 的 .discover-comment-sheet 为准（TW3 无 tw-animate 插件，
 * data-open:animate-in / slide-in-from-* 不会生效）。
 */
const sheetClass = [
  'discover-comment-sheet',
  'gap-0 p-0',
  'text-[color:var(--chrome-text,#f3f4f6)]'
].join(' ');

function formatCount(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return '';
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (n < 100000000) return `${(n / 10000).toFixed(1).replace(/\.0$/, '')}万`;
  return `${(n / 100000000).toFixed(1).replace(/\.0$/, '')}亿`;
}

function toUi(c: MsComment): UiComment {
  return { ...c, _digged: c.digged === true };
}

function onOpenChange(v: boolean) {
  emit('update:open', v);
}

/**
 * 体验：听歌/切歌/点播放条时绝不因「点面板外」关掉评论。
 * 关闭只走：关闭钮、Esc、再点评论按钮。
 * reka DismissableLayer 在 pointerdown/focus outside 且未 preventDefault 时会 dismiss。
 */
function preventOutsideDismiss(e: Event) {
  e.preventDefault();
}

function clearReply() {
  replyTarget.value = null;
}

function startReply(top: UiComment, reply?: UiComment) {
  const target = reply || top;
  replyTarget.value = {
    topId: top.id,
    replyId: reply?.id,
    replyToUserId: reply?.user?.id || target.user?.id,
    userLabel: target.user?.nickname || '用户',
    preview: (target.content || '').slice(0, 24)
  };
}

async function ensureAuth(): Promise<boolean> {
  try {
    const auth = await msGetAuthState();
    authenticated.value = !!auth.authenticated;
    if (!auth.authenticated) {
      emit('need-login');
      return false;
    }
    // 发评/点赞前尽量补齐昵称头像，乐观展示用
    if (!myUserId.value || !myNickname.value || !myAvatarUrl.value) {
      try {
        const profile = await msGetProfile();
        applyMyProfile(profile);
      } catch {
        /* ignore */
      }
    }
    return true;
  } catch {
    emit('need-login');
    return false;
  }
}

function cloneComments(list: UiComment[]): UiComment[] {
  return list.map((c) => ({
    ...c,
    _replies: c._replies ? c._replies.map((r) => ({ ...r })) : undefined
  }));
}

function snapshotCache(songId: string) {
  if (!songId || !comments.value.length) return;
  commentCache.set(songId, {
    comments: cloneComments(comments.value),
    cursor: cursor.value,
    hasMore: hasMore.value,
    totalCount: totalCount.value,
    prompts: [...prompts.value],
    at: Date.now()
  });
}

function listFingerprint(
  list: UiComment[],
  total?: number,
  nextCursor?: string,
  more?: boolean
): string {
  const head = list
    .slice(0, 40)
    .map(
      (c) =>
        `${c.id}:${c.diggCount ?? 0}:${c.replyCount ?? 0}:${(c.content || '').length}:${c._digged ? 1 : 0}`
    )
    .join(',');
  return `${list.length}|${total ?? ''}|${nextCursor ?? ''}|${more ? 1 : 0}|${head}`;
}

function hydrateFromCache(songId: string, opts?: { allowStale?: boolean }): boolean {
  const hit = commentCache.get(songId);
  if (!hit || !hit.comments.length) return false;
  const stale = Date.now() - hit.at > CACHE_TTL_MS;
  if (stale && !opts?.allowStale) {
    commentCache.delete(songId);
    return false;
  }
  comments.value = cloneComments(hit.comments);
  cursor.value = hit.cursor;
  hasMore.value = hit.hasMore;
  totalCount.value = hit.totalCount ?? props.seedCount;
  prompts.value = hit.prompts.length ? [...hit.prompts] : prompts.value;
  error.value = '';
  loading.value = false;
  loadedSongId.value = songId;
  emit('count-change', totalCount.value);
  return true;
}

function hydrateFromMemory(songId: string): boolean {
  if (loadedSongId.value !== songId || !comments.value.length) return false;
  loading.value = false;
  error.value = '';
  emit('count-change', totalCount.value ?? props.seedCount);
  return true;
}

async function ensureProfileQuiet() {
  try {
    const auth = await msGetAuthState();
    authenticated.value = !!auth.authenticated;
    if (auth.authenticated && (!myUserId.value || !myNickname.value || !myAvatarUrl.value)) {
      const profile = await msGetProfile();
      applyMyProfile(profile);
    }
  } catch {
    /* ignore */
  }
}

async function loadInitial(songId: string) {
  loading.value = true;
  error.value = '';
  comments.value = [];
  cursor.value = undefined;
  hasMore.value = false;
  try {
    await ensureProfileQuiet();
    const page = await msListComments(songId, { limit: PAGE_LIMIT });
    if (props.songId !== songId || !props.open) return;
    applyPage(songId, page, { replace: true });
    await nextTick();
    connectLoadIo();
    // 首屏不够长时立刻再拉，用户还没开始刷就填满缓冲
    void fillAheadIfShort();
  } catch (e: any) {
    if (props.songId !== songId) return;
    error.value = e?.message || '加载评论失败';
  } finally {
    if (props.songId === songId) loading.value = false;
  }
}

async function softRefresh(songId: string) {
  const gen = ++refreshGen;
  try {
    await ensureProfileQuiet();
    const page = await msListComments(songId, { limit: 20 });
    if (gen !== refreshGen) return;
    if (props.songId !== songId || !props.open) return;

    const nextList = (page.comments || []).map(toUi);
    const nextTotal = page.count ?? props.seedCount;
    const nextCursor = page.cursor != null ? String(page.cursor) : undefined;
    const nextMore = !!page.hasMore;
    const nextFp = listFingerprint(nextList, nextTotal, nextCursor, nextMore);
    const curFp = listFingerprint(comments.value, totalCount.value, cursor.value, hasMore.value);

    if (nextFp === curFp) {
      snapshotCache(songId);
      return;
    }
    applyPage(songId, page, { replace: true, mapped: nextList });
  } catch {
    /* keep old list */
  }
}

function applyPage(
  songId: string,
  page: {
    comments?: MsComment[];
    count?: number;
    cursor?: string;
    hasMore?: boolean;
    prompts?: string[];
  },
  opts: { replace: boolean; mapped?: UiComment[] }
) {
  const list = opts.mapped ?? (page.comments || []).map(toUi);
  if (opts.replace) {
    const prevOpen = new Map(
      comments.value
        .filter((c) => c._repliesOpen)
        .map((c) => [
          c.id,
          { replies: c._replies, cursor: c._repliesCursor, more: c._repliesHasMore }
        ])
    );
    comments.value = list.map((c) => {
      const keep = prevOpen.get(c.id);
      if (!keep) return c;
      return {
        ...c,
        _repliesOpen: true,
        _replies: keep.replies,
        _repliesCursor: keep.cursor,
        _repliesHasMore: keep.more
      };
    });
  }
  cursor.value = page.cursor != null ? String(page.cursor) : undefined;
  hasMore.value = !!page.hasMore;
  totalCount.value = page.count ?? props.seedCount;
  if (page.prompts?.length) prompts.value = page.prompts;
  loadedSongId.value = songId;
  error.value = '';
  emit('count-change', totalCount.value);
  snapshotCache(songId);
}

function openForSong(songId: string) {
  draft.value = '';
  clearReply();
  resetDraftHeight();
  disconnectLoadIo();

  const shown = hydrateFromMemory(songId) || hydrateFromCache(songId, { allowStale: true });
  if (shown) {
    void nextTick(() => {
      connectLoadIo();
      void fillAheadIfShort();
    });
    void softRefresh(songId);
    return;
  }
  totalCount.value = props.seedCount;
  void loadInitial(songId);
}

function getListViewport(): HTMLElement | null {
  return listScrollRef.value?.getViewport?.() ?? null;
}

function disconnectLoadIo() {
  loadIo?.disconnect();
  loadIo = null;
}

/** 哨兵靠近视口（含大幅 rootMargin）时静默预取 */
function connectLoadIo() {
  disconnectLoadIo();
  if (!props.open || !hasMore.value) return;
  const root = getListViewport();
  const target = loadSentinelEl.value;
  if (!root || !target) return;
  loadIo = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      void silentPrefetchMore();
    },
    {
      root,
      // 提前约 2～3 屏触发，滚到时页往往已到
      rootMargin: '0px 0px 1400px 0px',
      threshold: 0
    }
  );
  loadIo.observe(target);
}

/**
 * 静默加载下一页：无按钮、无「加载中」文案。
 * 失败只 toast，成功尽量无感。
 */
async function silentPrefetchMore() {
  if (!props.open || !props.songId || !hasMore.value || loadingMore.value || loading.value) {
    return;
  }
  await loadMore();
  await nextTick();
  // 仍不够高 / 哨兵仍在扩展区内 → 继续填
  void fillAheadIfShort();
}

/** 列表高度不足约 2.2 屏时连拉几页，避免一打开就见底 */
async function fillAheadIfShort() {
  if (!props.open || !props.songId) return;
  const vp = getListViewport();
  if (!vp) return;
  let rounds = 0;
  while (rounds < 4 && props.open && hasMore.value && !loadingMore.value && !loading.value) {
    // 内容高度已够「下面还有一截」就停
    if (vp.scrollHeight >= vp.clientHeight * 2.2) break;
    const before = comments.value.length;
    await loadMore();
    await nextTick();
    if (comments.value.length === before) break;
    rounds += 1;
  }
  // 数据变了，确保 IO 绑在最新 sentinel 上
  connectLoadIo();
}

async function loadMore() {
  if (!props.songId || !hasMore.value || loadingMore.value) return;
  const songId = props.songId;
  loadingMore.value = true;
  try {
    const page = await msListComments(songId, {
      limit: PAGE_LIMIT,
      cursor: cursor.value
    });
    // 已切歌 / 关面板则丢弃
    if (!props.open || props.songId !== songId) return;
    const next = (page.comments || []).map(toUi);
    const seen = new Set(comments.value.map((c) => c.id));
    for (const c of next) {
      if (!seen.has(c.id)) comments.value.push(c);
    }
    cursor.value = page.cursor != null ? String(page.cursor) : undefined;
    hasMore.value = !!page.hasMore;
    if (page.count != null) {
      totalCount.value = page.count;
      emit('count-change', totalCount.value);
    }
    snapshotCache(songId);
  } catch (e: any) {
    if (props.open && props.songId === songId) {
      showBottomToast(e?.message || '加载更多失败');
    }
  } finally {
    loadingMore.value = false;
  }
}

async function toggleReplies(item: UiComment) {
  if (item._repliesOpen) {
    item._repliesOpen = false;
    return;
  }
  item._repliesOpen = true;
  if (item._replies?.length) return;
  await loadMoreReplies(item, true);
}

async function loadMoreReplies(item: UiComment, reset = false) {
  if (item._repliesLoading) return;
  item._repliesLoading = true;
  try {
    const page = await msListCommentReplies(item.id, {
      limit: 20,
      cursor: reset ? undefined : item._repliesCursor
    });
    const mapped = (page.comments || []).map(toUi);
    if (reset || !item._replies) item._replies = [];
    const seen = new Set(item._replies.map((r) => r.id));
    for (const r of mapped) {
      if (!seen.has(r.id)) item._replies.push(r);
    }
    item._repliesCursor = page.cursor;
    item._repliesHasMore = !!page.hasMore;
    snapshotCache(props.songId);
  } catch (e: any) {
    showBottomToast(e?.message || '加载回复失败');
  } finally {
    item._repliesLoading = false;
  }
}

async function toggleLike(item: UiComment, parent?: UiComment) {
  if (!(await ensureAuth())) return;
  if (!props.songId || busyId.value) return;
  const next = !item._digged;
  busyId.value = item.id;
  try {
    if (parent) {
      await msLikeComment(props.songId, parent.id, next, { replyId: item.id });
    } else {
      await msLikeComment(props.songId, item.id, next);
    }
    item._digged = next;
    const base = item.diggCount ?? 0;
    item.diggCount = Math.max(0, base + (next ? 1 : -1));
    snapshotCache(props.songId);
  } catch (e: any) {
    showBottomToast(e?.message || '操作失败');
  } finally {
    busyId.value = '';
  }
}

async function removeComment(item: UiComment, parent?: UiComment) {
  if (!(await ensureAuth())) return;
  if (busyId.value) return;
  busyId.value = item.id;
  try {
    if (parent) {
      await msDeleteComment(parent.id, { replyId: item.id });
      parent._replies = (parent._replies || []).filter((r) => r.id !== item.id);
      parent.replyCount = Math.max(0, (parent.replyCount ?? 1) - 1);
    } else {
      await msDeleteComment(item.id);
      comments.value = comments.value.filter((c) => c.id !== item.id);
      if (totalCount.value != null) {
        totalCount.value = Math.max(0, totalCount.value - 1);
        emit('count-change', totalCount.value);
      }
    }
    showBottomToast('已删除');
    snapshotCache(props.songId);
  } catch (e: any) {
    showBottomToast(e?.message || '删除失败');
  } finally {
    busyId.value = '';
  }
}

async function submit() {
  const text = draft.value.trim();
  if (!text || submitting.value) return;
  if (!(await ensureAuth())) return;
  if (!props.songId) return;
  submitting.value = true;
  try {
    const opts = replyTarget.value
      ? {
          replyId: replyTarget.value.topId,
          replyToReplyId: replyTarget.value.replyId || '',
          replyToUserId: replyTarget.value.replyToUserId || ''
        }
      : undefined;
    const { commentId } = await msCreateComment(props.songId, text, opts);
    // 再补一次资料（可能首次登录后才有）
    if (!myNickname.value || !myAvatarUrl.value) {
      try {
        applyMyProfile(await msGetProfile());
      } catch {
        /* ignore */
      }
    }
    const optimistic: UiComment = {
      id: commentId || `local-${Date.now()}`,
      content: text,
      diggCount: 0,
      replyCount: 0,
      createdAt: Math.floor(Date.now() / 1000),
      user: myUserSnapshot(),
      _digged: false
    };
    if (replyTarget.value) {
      const top = comments.value.find((c) => c.id === replyTarget.value!.topId);
      if (top) {
        if (replyTarget.value.replyId) {
          optimistic.replyTo = {
            id: replyTarget.value.replyId,
            user: { nickname: replyTarget.value.userLabel }
          };
        }
        top._repliesOpen = true;
        top._replies = top._replies || [];
        top._replies.unshift(optimistic);
        top.replyCount = (top.replyCount ?? 0) + 1;
      }
    } else {
      comments.value.unshift(optimistic);
      totalCount.value = (totalCount.value ?? 0) + 1;
      emit('count-change', totalCount.value);
    }
    draft.value = '';
    clearReply();
    resetDraftHeight();
    showBottomToast('已发送');
    snapshotCache(props.songId);
  } catch (e: any) {
    showBottomToast(e?.message || '发送失败');
  } finally {
    submitting.value = false;
  }
}

watch(
  () => [props.open, props.songId] as const,
  ([open, songId]) => {
    if (!open || !songId) return;
    openForSong(songId);
  }
);

watch(
  () => props.open,
  (open, wasOpen) => {
    if (wasOpen && !open) {
      refreshGen += 1;
      if (props.songId && comments.value.length) snapshotCache(props.songId);
      disconnectLoadIo();
    }
  }
);

/** Esc 关闭评论面板（capture，优先于其它全局快捷键） */
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' && e.code !== 'Escape') return;
  if (!props.open) return;
  e.preventDefault();
  e.stopPropagation();
  onOpenChange(false);
}

watch(
  () => props.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown, true);
    else window.removeEventListener('keydown', onKeydown, true);
  },
  { immediate: true }
);

/** 列表渲染后（含 v-if 从 loading 切到列表）重新绑哨兵 */
watch(
  () => [props.open, loading.value, comments.value.length, hasMore.value] as const,
  () => {
    if (!props.open || loading.value || !comments.value.length) {
      if (!props.open) disconnectLoadIo();
      return;
    }
    void nextTick(() => connectLoadIo());
  }
);

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown, true);
  disconnectLoadIo();
});
</script>

<!-- teleport 到 body，必须用非 scoped；动画用 keyframes（不依赖 tw-animate） -->
<style>
.discover-comment-sheet[data-slot='sheet-content'] {
  /*
   * teleport 到 body + z-50 会盖住整页 stacking context，
   * 必须上下避开 TitleBar（~48px）与底栏（--play-bar-height），
   * 否则会挡住最小化/关闭和播放条。
   */
  top: calc(48px + 10px) !important;
  right: 12px !important;
  bottom: calc(var(--play-bar-height, 5rem) + 10px) !important;
  left: auto !important;
  /* 有 top/bottom 时高度由 inset 撑满；强制 flex 列，避免子项 flex-1 塌掉 */
  height: auto !important;
  max-height: none !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 0 !important;
  /* 与 --discover-comment-w 一致，勿随意改宽高 */
  width: min(460px, 44vw) !important;
  max-width: min(460px, 44vw) !important;
  /* iOS 风大圆角（continuous 感用偏大 radius 近似） */
  --discover-sheet-r: 24px;
  border-radius: var(--discover-sheet-r) !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  /* 半透明毛玻璃（盖掉 bg-popover 实色） */
  background: rgba(8, 8, 10, 0.38) !important;
  background-color: rgba(8, 8, 10, 0.38) !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28) !important;
  backdrop-filter: blur(28px) saturate(1.2) !important;
  -webkit-backdrop-filter: blur(28px) saturate(1.2) !important;
  overflow: hidden !important;
  will-change: transform, opacity;
  /* 关掉 Sheet 默认 transition，避免和 keyframes 抢 */
  transition: none !important;
  animation: none;
  /* 仍低于系统级浮层，但高于页面内容；不盖 TitleBar/PlayBar 靠 inset 而非降 z */
  z-index: 40 !important;
}

/* 中间区占满；列表全高，顶/底栏绝对叠在上面 */
.discover-comment-sheet .discover-comment-body {
  position: relative;
  display: block !important;
  flex: 1 1 0 !important;
  min-height: 0 !important;
  overflow: hidden;
}

.discover-comment-sheet .discover-comment-scroll {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
}

/* 从右侧整块滑入，约 0.48s */
.discover-comment-sheet[data-slot='sheet-content'][data-state='open'] {
  animation: discover-comment-sheet-in 0.48s cubic-bezier(0.22, 1, 0.36, 1) both !important;
}

/* 关闭时滑出；Presence 会等 animationend */
.discover-comment-sheet[data-slot='sheet-content'][data-state='closed'] {
  animation: discover-comment-sheet-out 0.36s cubic-bezier(0.4, 0, 1, 1) both !important;
}

@keyframes discover-comment-sheet-in {
  from {
    opacity: 0.35;
    transform: translate3d(calc(100% + 20px), 0, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes discover-comment-sheet-out {
  from {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
  to {
    opacity: 0;
    transform: translate3d(calc(100% + 20px), 0, 0);
  }
}

/*
 * 顶栏：托层全透明；关闭钮 + 标题各自带磨砂，保证字可读。
 */
.discover-comment-sheet .discover-comment-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 48px;
  padding: 8px 10px 10px;
  background: transparent !important;
  border: none;
  pointer-events: none;
}
.discover-comment-sheet .discover-comment-header::before {
  content: none;
  display: none;
}
.discover-comment-sheet .discover-comment-header > * {
  pointer-events: auto;
  position: relative;
  z-index: 1;
}
.discover-comment-sheet .discover-comment-header-close {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 9999px;
  color: #fff;
  /* 封面取色半透明 + 磨砂 */
  background: color-mix(
    in srgb,
    var(--header-accent, var(--primary-color, #22c55e)) 52%,
    transparent
  ) !important;
  border: 1px solid
    color-mix(in srgb, var(--header-accent, var(--primary-color, #22c55e)) 40%, #fff);
  backdrop-filter: blur(22px) saturate(1.35);
  -webkit-backdrop-filter: blur(22px) saturate(1.35);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.14) inset;
}
.discover-comment-sheet .discover-comment-header-close:hover {
  color: #fff;
  background: color-mix(
    in srgb,
    var(--header-accent, var(--primary-color, #22c55e)) 68%,
    transparent
  ) !important;
  filter: brightness(1.06);
}
.discover-comment-sheet .discover-comment-header-title {
  /* 不占满 flex 宽，做成居中磨砂胶囊（封面取色） */
  flex: 0 1 auto;
  margin: 0 auto !important;
  min-width: 0;
  max-width: calc(100% - 88px);
  padding: 6px 14px !important;
  text-align: center !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  line-height: 1.2 !important;
  color: #fff !important;
  border-radius: 9999px;
  border: 1px solid
    color-mix(in srgb, var(--header-accent, var(--primary-color, #22c55e)) 38%, #fff);
  background: color-mix(
    in srgb,
    var(--header-accent, var(--primary-color, #22c55e)) 48%,
    transparent
  ) !important;
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.14) inset,
    0 4px 14px rgba(0, 0, 0, 0.16);
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.28);
}
.discover-comment-sheet .discover-comment-header-count {
  margin-left: 6px;
  font-size: 13px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.78);
}
.discover-comment-sheet .discover-comment-header-spacer {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  pointer-events: none !important;
}

/* 骨架 absolute 铺满；高度跟 wrap（h-full 或设计 minHeight）走 */
.discover-comment-sheet .discover-comment-skeleton {
  min-height: 100%;
}

/* 列表上下留白，内容可滚进顶/底磨砂区 */
.discover-comment-sheet .discover-comment-list {
  padding-top: 56px;
  padding-bottom: 88px;
}

/* 无限滚动哨兵：极矮，靠 rootMargin 提前触发预取 */
.discover-comment-sheet .discover-comment-load-sentinel {
  width: 100%;
  height: 1px;
  pointer-events: none;
  visibility: hidden;
}
.discover-comment-sheet .discover-comment-skeleton-wrap {
  padding-top: 48px;
  padding-bottom: 72px;
  box-sizing: border-box;
}

/*
 * 底栏：托层全透明，只有输入框/发送钮自身有磨砂。
 */
.discover-comment-sheet .discover-comment-composer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  padding: 1.35rem 1rem 0.9rem;
  pointer-events: none;
  background: transparent !important;
}
/* 去掉托层伪元素（不再铺雾/模糊） */
.discover-comment-sheet .discover-comment-composer::before {
  content: none;
  display: none;
}
.discover-comment-sheet .discover-comment-composer > * {
  position: relative;
  z-index: 1;
  pointer-events: auto;
}

.discover-comment-sheet .discover-comment-reply-chip {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(22px) saturate(1.25);
  -webkit-backdrop-filter: blur(22px) saturate(1.25);
  border-radius: 14px;
}

/* 输入框：略实一点的底 + 轻磨砂，placeholder 要能读清 */
.discover-comment-sheet .discover-comment-draft {
  min-height: 40px !important;
  max-height: 120px !important;
  height: 40px;
  field-sizing: fixed;
  line-height: 1.25rem;
  transition: height 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: height;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  /* 底更不透，少糊字；blur 从 28 收到 14 */
  background: rgba(18, 18, 22, 0.52) !important;
  background-color: rgba(18, 18, 22, 0.52) !important;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 6px 18px rgba(0, 0, 0, 0.2) !important;
  backdrop-filter: blur(14px) saturate(1.2) !important;
  -webkit-backdrop-filter: blur(14px) saturate(1.2) !important;
  color: rgba(255, 255, 255, 0.95) !important;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.discover-comment-sheet .discover-comment-draft::placeholder {
  color: rgba(255, 255, 255, 0.58) !important;
  opacity: 1;
}
.discover-comment-sheet .discover-comment-draft::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

/* 发送：封面色半透 + 磨砂 */
.discover-comment-sheet .discover-comment-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid color-mix(in srgb, var(--send-bg, var(--primary-color, #22c55e)) 45%, #fff);
  border-radius: 9999px;
  background: color-mix(
    in srgb,
    var(--send-bg, var(--primary-color, #22c55e)) 58%,
    transparent
  ) !important;
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.22) inset,
    0 4px 14px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(26px) saturate(1.4);
  -webkit-backdrop-filter: blur(26px) saturate(1.4);
  transition:
    filter 0.15s ease,
    transform 0.12s ease,
    opacity 0.15s ease;
}
.discover-comment-sheet .discover-comment-send i {
  transform: translate(1px, -0.5px);
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.25));
}
.discover-comment-sheet .discover-comment-send:hover:not(:disabled) {
  filter: brightness(1.1);
}
.discover-comment-sheet .discover-comment-send:active:not(:disabled) {
  transform: scale(0.94);
}
.discover-comment-sheet .discover-comment-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: none;
}
.discover-comment-sheet .discover-comment-send:focus-visible {
  outline: 2px solid
    color-mix(in srgb, var(--send-bg, var(--primary-color, #22c55e)) 55%, transparent);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .discover-comment-sheet[data-slot='sheet-content'] {
    width: min(400px, 90vw) !important;
    max-width: min(400px, 90vw) !important;
    top: calc(48px + 8px) !important;
    right: 8px !important;
    bottom: calc(var(--play-bar-height, 5rem) + 8px) !important;
    --discover-sheet-r: 20px;
    border-radius: var(--discover-sheet-r) !important;
  }
}
</style>

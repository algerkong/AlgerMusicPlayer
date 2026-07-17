<template>
  <tooltip-provider :delay-duration="300">
    <!-- 整条可点回复；头像/昵称/点赞/展开/删除 stop -->
    <div
      class="discover-comment-item group flex cursor-pointer gap-3.5 rounded-xl px-1 py-0.5 transition-colors hover:bg-white/[0.04]"
      role="button"
      tabindex="0"
      @click="onRowClick"
      @keydown.enter.prevent="emit('reply')"
    >
      <ui-avatar
        :size="compact ? 'default' : 'lg'"
        class="shrink-0 after:rounded-full"
        :class="compact ? '!size-9' : '!size-11'"
        @click.stop
      >
        <avatar-image
          v-if="comment.user?.avatarUrl"
          :src="comment.user.avatarUrl"
          :alt="comment.user?.nickname || '用户'"
        />
        <avatar-fallback>
          <i class="ri-user-3-fill" />
        </avatar-fallback>
      </ui-avatar>

      <div class="min-w-0 flex-1 space-y-1.5">
        <!-- 昵称 + VIP · 点赞最右 -->
        <div class="flex items-start gap-2">
          <div class="flex min-w-0 flex-1 items-center gap-1.5" @click.stop>
            <span class="truncate text-[15px] font-semibold text-foreground">
              {{ comment.user?.nickname || '用户' }}
            </span>
            <vip-badge
              v-if="userVipLevel === 'vip' || userVipLevel === 'svip'"
              :level="userVipLevel"
              compact
              @click.stop
            />
          </div>
          <tooltip>
            <tooltip-trigger as-child>
              <ui-button
                type="button"
                variant="ghost"
                size="sm"
                class="h-7 shrink-0 gap-1 px-2 text-[13px]"
                :class="
                  comment._digged ? 'text-red-500 hover:text-red-500' : 'text-muted-foreground'
                "
                :disabled="busy"
                @click.stop="emit('like')"
              >
                <i :class="comment._digged ? 'ri-heart-3-fill' : 'ri-heart-3-line'" />
                <span v-if="diggCountText">{{ diggCountText }}</span>
              </ui-button>
            </tooltip-trigger>
            <tooltip-content side="bottom">
              {{ comment._digged ? '取消赞' : '点赞' }}
            </tooltip-content>
          </tooltip>
        </div>

        <div v-if="comment.replyTo?.user?.nickname" class="text-[13px] text-muted-foreground">
          回复
          <span class="text-primary">@{{ comment.replyTo.user.nickname }}</span>
          <span v-if="comment.replyTo.content" class="opacity-70">
            ：{{ comment.replyTo.content.slice(0, 40) }}
          </span>
        </div>

        <div
          class="whitespace-pre-wrap break-words leading-relaxed text-foreground"
          :class="compact ? 'text-[14px]' : 'text-[15px]'"
        >
          <template v-for="(part, i) in parts" :key="i">
            <span v-if="part.tag" class="pointer-events-none font-medium text-primary">
              {{ part.t.startsWith('#') ? part.t : `#${part.t}` }}
            </span>
            <span v-else>{{ part.t }}</span>
          </template>
        </div>

        <div
          v-if="showStandaloneTags"
          class="flex flex-wrap gap-1.5 text-[15px] font-medium text-primary"
        >
          <span
            v-for="t in comment.hashtags || []"
            :key="t.id || t.text"
            class="pointer-events-none"
          >
            #{{ t.text }}
          </span>
        </div>

        <div v-if="comment.imageUrls?.length" class="flex flex-wrap gap-2 pt-0.5">
          <a
            v-for="url in comment.imageUrls"
            :key="url"
            :href="url"
            target="_blank"
            rel="noreferrer"
            class="block size-[72px] shrink-0 overflow-hidden rounded-xl border border-border/40"
            @click.stop
          >
            <img :src="url" alt="" loading="lazy" class="size-full object-cover" />
          </a>
        </div>

        <!-- 正文下：日期 · IP · 回复/展开一块 · 删除 -->
        <div
          class="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-[13px] text-muted-foreground"
        >
          <span v-if="timeText">{{ timeText }}</span>
          <span v-if="comment.ipLabel">{{ comment.ipLabel }}</span>

          <!-- 回复 + 展开合成一组 -->
          <span
            class="inline-flex items-center gap-0.5 rounded-md text-[13px] text-muted-foreground"
            @click.stop
          >
            <button
              type="button"
              class="rounded-md px-1 py-0.5 transition-colors hover:bg-white/10 hover:text-foreground"
              @click="emit('reply')"
            >
              回复
            </button>
            <template v-if="!compact && (comment.replyCount ?? 0) > 0">
              <span class="opacity-40">·</span>
              <button
                type="button"
                class="inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 transition-colors hover:bg-white/10 hover:text-foreground"
                @click="emit('toggle-replies')"
              >
                {{
                  comment._repliesOpen
                    ? '收起回复'
                    : `展开 ${formatCount(comment.replyCount)} 条回复`
                }}
                <i
                  class="text-sm"
                  :class="comment._repliesOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'"
                />
              </button>
            </template>
          </span>

          <ui-button
            v-if="isMine"
            type="button"
            variant="ghost"
            size="sm"
            class="ml-auto h-7 gap-1 px-2 text-[12px] text-destructive hover:text-destructive"
            :disabled="busy"
            @click.stop="emit('delete')"
          >
            <i class="ri-delete-bin-line" />
            删除
          </ui-button>
        </div>
      </div>
    </div>
  </tooltip-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import VipBadge from '@/components/common/VipBadge.vue';
import { Avatar as UiAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button as UiButton } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type CommentItemModel = {
  id: string;
  content?: string;
  diggCount?: number;
  replyCount?: number;
  createdAt?: number;
  ipLabel?: string;
  featured?: boolean;
  featuredTags?: string[];
  hashtags?: { id?: string; text: string }[];
  imageUrls?: string[];
  user?: {
    id?: string;
    nickname?: string;
    avatarUrl?: string;
    isVip?: boolean;
    vipLevel?: string;
  };
  replyTo?: { content?: string; user?: { nickname?: string } };
  _digged?: boolean;
  _repliesOpen?: boolean;
};

const props = withDefaults(
  defineProps<{
    comment: CommentItemModel;
    myUserId?: string;
    busy?: boolean;
    compact?: boolean;
  }>(),
  {
    myUserId: '',
    busy: false,
    compact: false
  }
);

const emit = defineEmits<{
  like: [];
  reply: [];
  delete: [];
  'toggle-replies': [];
}>();

const isMine = computed(
  () =>
    !!(
      props.myUserId &&
      props.comment.user?.id &&
      String(props.comment.user.id) === String(props.myUserId)
    )
);

function formatCount(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return '';
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (n < 100000000) return `${(n / 10000).toFixed(1).replace(/\.0$/, '')}万`;
  return `${(n / 100000000).toFixed(1).replace(/\.0$/, '')}亿`;
}

function formatTime(sec?: number): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return '';
  const ms = sec < 1e12 ? sec * 1000 : sec;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  if (diff < 86400_000 * 30) return `${Math.floor(diff / 86400_000)} 天前`;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y === new Date().getFullYear() ? `${m}-${day}` : `${y}-${m}-${day}`;
}

/** 有数才显示；0 赞不显示数字更干净 */
const diggCountText = computed(() => {
  const n = props.comment.diggCount;
  if (n == null || !Number.isFinite(n) || n <= 0) return '';
  return formatCount(n);
});
const timeText = computed(() => formatTime(props.comment.createdAt));

/** HAR: user.vip_stage / is_vip → vip | svip | none */
const userVipLevel = computed(() => {
  const u = props.comment.user;
  if (!u) return 'none';
  const raw = String(u.vipLevel || '').toLowerCase();
  if (raw.includes('svip') || raw.includes('super')) return 'svip';
  if (raw.includes('vip')) return 'vip';
  if (u.isVip) return 'vip';
  return 'none';
});

function onRowClick() {
  emit('reply');
}

const parts = computed(() => {
  const text = props.comment.content || '';
  const tags = (props.comment.hashtags || []).map((t) => t.text).filter(Boolean);
  const out: Array<{ t: string; tag?: boolean }> = [];
  if (!text) return out;
  const patterns = tags.length
    ? tags
        .slice()
        .sort((a, b) => b.length - a.length)
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    : ['#[^\\s#]+'];
  const re = new RegExp(`(${patterns.join('|')})`, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    out.push({ t: m[0], tag: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  if (!out.length) out.push({ t: text });
  return out;
});

const showStandaloneTags = computed(
  () => !!(props.comment.hashtags?.length && !parts.value.some((x) => x.tag))
);
</script>

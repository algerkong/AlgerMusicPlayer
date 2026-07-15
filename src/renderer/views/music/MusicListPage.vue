<template>
  <div
    class="music-list-page h-full w-full min-h-0 flex flex-col page-padding"
    :class="{ 'music-list-page--empty': !loading && !songList.length }"
  >
    <div v-if="loading && !songList.length" class="flex-1 flex items-center justify-center">
      <i class="ri-loader-4-line animate-spin text-2xl opacity-60" />
    </div>
    <div v-else-if="!songList.length" class="empty-state">
      <!-- 原图保留白底；外圈光晕跟封面取色 -->
      <div class="empty-art" aria-hidden="true">
        <div class="empty-art-ring" />
        <img class="empty-art-img" :src="emptyArtSrc" alt="" />
      </div>
      <h2 class="empty-title">{{ emptyTitle }}</h2>
      <p class="empty-desc">{{ emptyDesc }}</p>
      <div v-if="isUserPlaylist" class="empty-actions">
        <button type="button" class="empty-btn" @click="openRename">
          <i class="ri-edit-line" />
          重命名
        </button>
        <button type="button" class="empty-btn empty-btn--ghost" @click="openDelete">
          <i class="ri-delete-bin-line" />
          删除
        </button>
      </div>
      <button
        v-if="loadFailed"
        type="button"
        class="empty-btn empty-btn--primary"
        @click="() => loadRemotePlaylist(true)"
      >
        <i class="ri-refresh-line" />
        重试
      </button>
    </div>
    <template v-else>
      <div class="flex items-center justify-between py-4 gap-4 flex-shrink-0">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold truncate" style="color: var(--chrome-text, inherit)">
            {{ name }}
          </h1>
          <p class="text-sm mt-1 opacity-60">
            {{ displayCount }}
            <span v-if="hasMore" class="opacity-70"> · 滚动加载更多</span>
          </p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <template v-if="isUserPlaylist">
            <ui-button variant="outline" size="sm" @click="openRename">重命名</ui-button>
            <ui-button variant="outline" size="sm" @click="openDelete">删除歌单</ui-button>
          </template>
          <ui-button :disabled="!songList.length" @click="handlePlayAll">
            <i class="ri-play-fill" />
            播放全部
          </ui-button>
        </div>
      </div>
      <div class="flex-1 min-h-0">
        <scroll-area class="h-full" @scroll="onScroll">
          <div class="space-y-1 pb-32">
            <song-item
              v-for="(song, index) in songList"
              :key="song.id"
              :item="formatSong(song)"
              :index="index"
              :can-remove="canRemove"
              @remove-song="handleRemoveSong"
            />
            <div v-if="loadingMore" class="py-6 text-center text-sm opacity-50">加载中…</div>
            <div
              v-else-if="!hasMore && songList.length"
              class="py-4 text-center text-xs opacity-40"
            >
              已加载全部
            </div>
          </div>
        </scroll-area>
      </div>
    </template>

    <!-- 重命名 -->
    <ui-dialog :open="renameOpen" @update:open="renameOpen = $event">
      <dialog-content class="max-w-sm">
        <dialog-header>
          <dialog-title>重命名歌单</dialog-title>
          <dialog-description>修改当前歌单名称</dialog-description>
        </dialog-header>
        <input
          v-model="renameName"
          class="field-input"
          type="text"
          maxlength="40"
          @keydown.enter.prevent="submitRename"
        />
        <dialog-footer>
          <ui-button variant="outline" @click="renameOpen = false">取消</ui-button>
          <ui-button :disabled="busy" @click="submitRename">保存</ui-button>
        </dialog-footer>
      </dialog-content>
    </ui-dialog>

    <!-- 删除歌单 -->
    <ui-dialog :open="deleteOpen" @update:open="deleteOpen = $event">
      <dialog-content class="max-w-sm">
        <dialog-header>
          <dialog-title>删除歌单</dialog-title>
          <dialog-description>确定删除「{{ name }}」？此操作不可恢复。</dialog-description>
        </dialog-header>
        <dialog-footer>
          <ui-button variant="outline" @click="deleteOpen = false">取消</ui-button>
          <ui-button variant="destructive" :disabled="busy" @click="submitDelete">删除</ui-button>
        </dialog-footer>
      </dialog-content>
    </ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { mapMsSongToSongResult, msGetPlaylist, msRemovePlaylistTracks } from '@/api/musicSource';
import emptyArtSrc from '@/assets/empty-playlist.png';
import SongItem from '@/components/common/SongItem.vue';
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
import { useMusicStore, usePlayerStore, useRecommendStore, useUserPlaylistsStore } from '@/store';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';
import { showBottomToast } from '@/utils/shortcutToast';

defineOptions({ name: 'MusicList' });

const PAGE_SIZE = 50;

const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();
const musicStore = useMusicStore();
const recommendStore = useRecommendStore();
const plStore = useUserPlaylistsStore();

const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const nextCursor = ref<string | undefined>(undefined);
const totalHint = ref(0);
const busy = ref(false);
const renameOpen = ref(false);
const deleteOpen = ref(false);
const renameName = ref('');
/** 加载失败 vs 真·空歌单 */
const loadFailed = ref(false);

const isDailyRecommend = computed(() => route.query.type === 'dailyRecommend');
const source = computed(() => String(route.query.source || ''));
const listId = computed(() => String(route.params.id || ''));
const listType = computed(() => String(route.query.type || ''));

const isUserPlaylist = computed(
  () => listType.value === 'playlist' && source.value === 'qishui' && !!listId.value
);
const canRemove = computed(() => isUserPlaylist.value || musicStore.canRemoveSong);

const name = computed(() => {
  if (isDailyRecommend.value) return '每日推荐';
  return musicStore.currentMusicListName || '';
});

const songList = computed(() => {
  if (isDailyRecommend.value) return recommendStore.dailyRecommendSongs;
  return musicStore.currentMusicList || [];
});

const displayCount = computed(() => {
  if (isDailyRecommend.value) return `${songList.value.length} 首`;
  if (totalHint.value > 0) {
    return `已加载 ${songList.value.length} / ${totalHint.value} 首`;
  }
  return `${songList.value.length} 首`;
});

const emptyTitle = computed(() => {
  if (loadFailed.value) return '加载失败';
  if (isUserPlaylist.value) return '空空如也';
  return '暂无歌曲';
});

const emptyDesc = computed(() => {
  if (loadFailed.value) return '网络或接口异常，点下方重试一下';
  if (isUserPlaylist.value) return '这个歌单里还没有歌曲，去发现页加点吧';
  return '这里暂时没有可播放的内容';
});

const formatSong = (item: any): SongResult => {
  if (!item) return item;
  const picUrl = item.al?.picUrl || item.picUrl || '';
  return {
    ...item,
    picUrl,
    song: {
      artists: item.ar || item.artists,
      name: item.name,
      id: item.id
    }
  };
};

const handlePlayAll = () => {
  if (!songList.value.length) return;
  const list = songList.value.map(formatSong);
  playerStore.setPlayList(list);
  playerStore.setPlay(list[0]);
};

const isRemotePlaylist = () =>
  listType.value === 'playlist' && source.value === 'qishui' && !!listId.value;

const loadRemotePlaylist = async (reset = true) => {
  if (!isElectron || !isRemotePlaylist()) return;

  if (reset) {
    if (
      musicStore.currentListInfo?.id?.toString() === listId.value &&
      musicStore.currentMusicList?.length
    ) {
      // 仍允许显示，并确保 canRemove
      musicStore.canRemoveSong = true;
      loadFailed.value = false;
      return;
    }
    loading.value = true;
    loadFailed.value = false;
    nextCursor.value = undefined;
    hasMore.value = false;
    totalHint.value = 0;
  } else {
    if (!hasMore.value || loadingMore.value || loading.value) return;
    loadingMore.value = true;
  }

  try {
    const detail = await msGetPlaylist(listId.value, {
      limit: PAGE_SIZE,
      cursor: reset ? '0' : nextCursor.value || '0'
    });
    const songs = detail.songs.map(mapMsSongToSongResult);
    totalHint.value = detail.playlist.trackCount || totalHint.value || 0;
    nextCursor.value = detail.nextCursor;
    hasMore.value = !!detail.hasMore && !!detail.nextCursor;
    loadFailed.value = false;

    if (reset) {
      musicStore.setCurrentMusicList(
        songs,
        detail.playlist.name,
        {
          id: detail.playlist.id,
          name: detail.playlist.name,
          picUrl: detail.playlist.coverUrl,
          source: 'qishui',
          trackCount: detail.playlist.trackCount
        },
        true
      );
    } else {
      const merged = [...(musicStore.currentMusicList || []), ...songs];
      const seen = new Set<string>();
      const unique = merged.filter((s) => {
        const k = String(s.id);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      musicStore.setCurrentMusicList(
        unique,
        musicStore.currentMusicListName || detail.playlist.name,
        {
          ...(musicStore.currentListInfo || {}),
          id: detail.playlist.id,
          name: detail.playlist.name || musicStore.currentMusicListName,
          picUrl: detail.playlist.coverUrl || musicStore.currentListInfo?.picUrl,
          source: 'qishui',
          trackCount: detail.playlist.trackCount
        },
        true
      );
    }
  } catch (error: any) {
    console.error('[MusicListPage] getPlaylist failed:', error);
    if (reset) {
      loadFailed.value = true;
      musicStore.setCurrentMusicList(
        [],
        musicStore.currentMusicListName || '歌单',
        {
          id: listId.value,
          name: musicStore.currentMusicListName,
          source: 'qishui'
        },
        true
      );
    }
    showBottomToast(error?.message || '加载歌单失败');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const onScroll = (e: Event) => {
  if (!isRemotePlaylist() || !hasMore.value || loadingMore.value) return;
  const el = e.target as HTMLElement;
  if (!el) return;
  const remain = el.scrollHeight - el.scrollTop - el.clientHeight;
  if (remain < 240) {
    void loadRemotePlaylist(false);
  }
};

/** 下拉菜单 emit 的是 id，不是整首歌对象 */
const handleRemoveSong = async (songOrId: SongResult | string | number) => {
  if (!isUserPlaylist.value || !listId.value) return;
  const id = songOrId && typeof songOrId === 'object' ? (songOrId as SongResult).id : songOrId;
  if (id == null || id === '') return;
  try {
    await msRemovePlaylistTracks(listId.value, [String(id)]);
    musicStore.removeSongFromList(id);
    if (totalHint.value > 0) totalHint.value -= 1;
    void plStore.reload();
    showBottomToast('已从歌单移除');
  } catch (error: any) {
    showBottomToast(error?.message || '移除失败');
  }
};

const openRename = () => {
  renameName.value = name.value;
  renameOpen.value = true;
};

const openDelete = () => {
  deleteOpen.value = true;
};

const submitRename = async () => {
  if (busy.value || !listId.value) return;
  busy.value = true;
  try {
    await plStore.rename(listId.value, renameName.value);
    musicStore.currentMusicListName = renameName.value.trim() || musicStore.currentMusicListName;
    if (musicStore.currentListInfo) {
      musicStore.currentListInfo = {
        ...musicStore.currentListInfo,
        name: musicStore.currentMusicListName
      };
    }
    renameOpen.value = false;
    showBottomToast('已重命名');
  } catch (error: any) {
    showBottomToast(error?.message || '重命名失败');
  } finally {
    busy.value = false;
  }
};

const submitDelete = async () => {
  if (busy.value || !listId.value) return;
  busy.value = true;
  try {
    await plStore.remove(listId.value);
    deleteOpen.value = false;
    showBottomToast('已删除');
    router.push('/');
  } catch (error: any) {
    showBottomToast(error?.message || '删除失败');
  } finally {
    busy.value = false;
  }
};

onMounted(() => {
  void loadRemotePlaylist(true);
});

watch([listId, listType, source], () => {
  void loadRemotePlaylist(true);
});
</script>

<style scoped>
.music-list-page {
  /* 透出 AppLayout 封面渐变，别盖死白/黑底 */
  background: transparent;
}

.music-list-page--empty {
  background: transparent;
}

.field-input {
  width: 100%;
  box-sizing: border-box;
  margin: 8px 0 4px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--chrome-border, rgba(255, 255, 255, 0.14));
  background: var(--chrome-surface, rgba(255, 255, 255, 0.06));
  color: var(--chrome-text, #f8fafc);
  font-size: 14px;
  outline: none;
}
.field-input:focus {
  border-color: rgb(var(--chrome-accent, 34, 197, 94));
  box-shadow: 0 0 0 2px rgba(var(--chrome-accent, 34, 197, 94), 0.2);
}

/* —— 空态：不套卡片，直接透封面取色底 —— */
.empty-state {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px 20px 96px;
  text-align: center;
  /* 透出 layout 封面色，不另铺实色底 */
  background: transparent;
}

.empty-art {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 环贴着图：同尺寸，只留 2px 描边叠在图外沿 */
.empty-art-ring {
  position: absolute;
  inset: -2px;
  border-radius: 999px;
  background: transparent;
  border: 2px solid color-mix(in srgb, var(--primary-color, #22c55e) 72%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--primary-color, #22c55e) 18%, transparent),
    0 0 28px color-mix(in srgb, var(--primary-color, #22c55e) 28%, transparent);
  pointer-events: none;
  z-index: 2;
}

/* 原图白底圆，与环贴紧 */
.empty-art-img {
  position: relative;
  z-index: 1;
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
}

.empty-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--chrome-text, #f8fafc);
}

.empty-desc {
  margin: 0;
  max-width: 16rem;
  font-size: 13px;
  line-height: 1.55;
  color: var(--chrome-text-muted, rgba(248, 250, 252, 0.72));
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 6px;
}

.empty-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--primary-color, #22c55e) 40%, transparent);
  background: color-mix(in srgb, var(--primary-color, #22c55e) 14%, transparent);
  color: var(--chrome-text, #f8fafc);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.12s;

  &:hover {
    background: color-mix(in srgb, var(--primary-color, #22c55e) 24%, transparent);
    border-color: color-mix(in srgb, var(--primary-color, #22c55e) 60%, transparent);
  }

  &:active {
    transform: scale(0.97);
  }

  i {
    font-size: 15px;
  }
}

.empty-btn--ghost {
  border-color: var(--chrome-border, rgba(255, 255, 255, 0.14));
  background: transparent;
  color: var(--chrome-text-muted, rgba(248, 250, 252, 0.78));
  font-weight: 500;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.22);
    color: var(--chrome-text, #f8fafc);
  }
}

.empty-btn--primary {
  background: var(--primary-color, #22c55e);
  border-color: transparent;
  color: #0a0a0b;

  &:hover {
    filter: brightness(1.06);
    background: var(--primary-color, #22c55e);
  }
}
</style>

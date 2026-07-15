<template>
  <div class="home-page h-full w-full">
    <scroll-area class="h-full">
      <div class="home-inner page-padding mx-auto max-w-3xl pb-32 pt-8">
        <header class="mb-8">
          <h1 class="home-title text-3xl font-bold tracking-tight">LYMusic</h1>
          <p class="home-desc mt-2 text-sm leading-relaxed">刷发现、听歌单，继续你的音乐节奏</p>
        </header>

        <!-- 主 CTA：发现 -->
        <button type="button" class="home-hero" @click="router.push('/discover')">
          <div class="home-hero-icon">
            <i class="ri-compass-discover-line text-2xl" />
          </div>
          <div class="home-hero-text">
            <div class="home-hero-title">开始发现</div>
            <div class="home-hero-sub">封面 · 歌词 · 像刷短视频一样听歌</div>
          </div>
          <i class="ri-arrow-right-s-line text-xl opacity-50" />
        </button>

        <!-- 快捷入口 -->
        <div class="mt-6 flex flex-wrap gap-2">
          <ui-button variant="outline" size="sm" @click="router.push('/search')">
            <i class="ri-search-line" />
            搜索
          </ui-button>
          <ui-button variant="outline" size="sm" @click="router.push('/history')">
            <i class="ri-history-line" />
            播放历史
          </ui-button>
          <ui-button variant="outline" size="sm" @click="router.push('/favorite')">
            <i class="ri-heart-line" />
            我的收藏
          </ui-button>
        </div>

        <!-- 最近播放 -->
        <section v-if="recentSongs.length" class="home-section">
          <div class="home-section-head">
            <h2 class="home-section-title">最近播放</h2>
            <button type="button" class="home-section-more" @click="router.push('/history')">
              全部
            </button>
          </div>
          <div class="home-song-list">
            <button
              v-for="(song, i) in recentSongs"
              :key="String(song.id) + i"
              type="button"
              class="home-song-row"
              @click="playRecent(song)"
            >
              <img
                v-if="song.picUrl"
                :src="getImgUrl(song.picUrl, '100y100')"
                class="home-song-cover"
                alt=""
              />
              <div v-else class="home-song-cover home-song-cover--ph">
                <i class="ri-music-2-line" />
              </div>
              <div class="min-w-0 flex-1 text-left">
                <div class="truncate text-sm font-medium">{{ song.name }}</div>
                <div class="truncate text-xs opacity-55">{{ recentArtist(song) }}</div>
              </div>
            </button>
          </div>
        </section>

        <!-- 我的歌单摘要 -->
        <section v-if="plStore.items.length" class="home-section">
          <div class="home-section-head">
            <h2 class="home-section-title">我的歌单</h2>
          </div>
          <div class="home-pl-grid">
            <button
              v-for="pl in plStore.items.slice(0, 8)"
              :key="pl.id"
              type="button"
              class="home-pl-card"
              @click="openPlaylist(pl)"
            >
              <div class="home-pl-cover">
                <img v-if="pl.coverUrl" :src="pl.coverUrl" alt="" />
                <i v-else class="ri-play-list-2-fill text-xl opacity-40" />
              </div>
              <div class="truncate text-xs font-medium">{{ pl.name }}</div>
            </button>
          </div>
        </section>

        <section v-else-if="!plStore.loading" class="home-section home-muted">
          <p class="text-sm opacity-60">登录后可在侧栏同步歌单；或先去发现刷几首。</p>
        </section>
      </div>
    </scroll-area>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import { Button as UiButton } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlayerStore } from '@/store/modules/player';
import { usePlayHistoryStore } from '@/store/modules/playHistory';
import { type SidebarPlaylist, useUserPlaylistsStore } from '@/store/modules/userPlaylists';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';

defineOptions({ name: 'Home' });

const router = useRouter();
const historyStore = usePlayHistoryStore();
const playerStore = usePlayerStore();
const plStore = useUserPlaylistsStore();

const recentSongs = computed(() => (historyStore.musicHistory || []).slice(0, 8));

const recentArtist = (song: { ar?: { name?: string }[]; artists?: { name?: string }[] }) => {
  const list = song.ar || song.artists || [];
  return (
    list
      .map((a) => a.name)
      .filter(Boolean)
      .join(' / ') || '未知歌手'
  );
};

const playRecent = async (song: SongResult | any) => {
  const list = recentSongs.value as SongResult[];
  playerStore.setPlayList(list as SongResult[], false, true);
  await playerStore.setPlay({ ...song, isFirstPlay: true } as SongResult);
};

const openPlaylist = (pl: SidebarPlaylist) => {
  navigateToMusicList(router, {
    id: pl.id,
    type: 'playlist',
    name: pl.name,
    listInfo: {
      id: pl.id,
      name: pl.name,
      picUrl: pl.coverUrl,
      source: 'qishui'
    },
    source: 'qishui'
  });
};

onMounted(() => {
  if (!plStore.items.length) void plStore.reload();
});
</script>

<style scoped>
.home-title {
  color: var(--chrome-text, #111827);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
.home-desc {
  color: var(--chrome-text-muted, #6b7280);
}

.home-hero {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 14px;
  border-radius: 16px;
  border: 1px solid var(--chrome-border, rgba(0, 0, 0, 0.08));
  background: var(--chrome-surface, rgba(255, 255, 255, 0.55));
  backdrop-filter: blur(12px);
  padding: 16px 18px;
  text-align: left;
  transition:
    transform 0.12s ease,
    filter 0.15s ease;
  color: var(--chrome-text, #111827);
}
.home-hero:hover {
  filter: brightness(1.03);
}
.home-hero:active {
  transform: scale(0.99);
}
.home-hero-icon {
  display: flex;
  height: 48px;
  width: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: color-mix(in srgb, var(--primary-color, #22c55e) 18%, transparent);
  color: var(--primary-color, #22c55e);
}
.home-hero-title {
  font-size: 16px;
  font-weight: 700;
}
.home-hero-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--chrome-text-muted, #6b7280);
}
.home-hero-text {
  min-width: 0;
  flex: 1;
}

.home-section {
  margin-top: 28px;
}
.home-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}
.home-section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--chrome-text, #111827);
}
.home-section-more {
  font-size: 12px;
  color: var(--primary-color, #22c55e);
}
.home-muted {
  color: var(--chrome-text-muted, #6b7280);
}

.home-song-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.home-song-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  border-radius: 12px;
  padding: 8px;
  color: var(--chrome-text, #111827);
  transition: background 0.12s ease;
}
.home-song-row:hover {
  background: color-mix(in srgb, var(--chrome-text, #111) 6%, transparent);
}
.home-song-cover {
  height: 40px;
  width: 40px;
  flex-shrink: 0;
  border-radius: 8px;
  object-fit: cover;
}
.home-song-cover--ph {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--chrome-surface, #eee);
  color: var(--chrome-text-muted, #999);
}

.home-pl-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 640px) {
  .home-pl-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.home-pl-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  color: var(--chrome-text, #111827);
}
.home-pl-cover {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 12px;
  background: var(--chrome-surface, #eee);
  display: flex;
  align-items: center;
  justify-content: center;
}
.home-pl-cover img {
  height: 100%;
  width: 100%;
  object-fit: cover;
}
</style>

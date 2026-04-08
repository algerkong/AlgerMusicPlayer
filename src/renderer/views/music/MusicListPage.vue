<template>
  <div class="music-list-page h-full w-full bg-white dark:bg-black transition-colors duration-500">
    <n-scrollbar ref="scrollbarRef" class="h-full" @scroll="handleScroll">
      <div class="music-list-content" :style="{ paddingBottom: contentPaddingBottom }">
        <!-- Hero Section 和 Action Bar -->
        <n-spin :show="loading">
          <!-- Hero Section -->
          <section class="hero-section relative overflow-hidden rounded-tl-2xl">
            <!-- Background Image with Blur -->
            <div class="hero-bg absolute inset-0 -top-20">
              <div
                class="absolute inset-0 bg-cover bg-center scale-110 blur-3xl opacity-40 dark:opacity-30"
                :style="{
                  backgroundImage: `url(${getImgUrl(getCoverImgUrl, '800y800')})`
                }"
              ></div>
              <div
                class="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white dark:via-black/80 dark:to-black"
              ></div>
            </div>

            <!-- Hero Content -->
            <div class="hero-content relative z-10 page-padding-x pt-4 md:pt-10 pb-8">
              <div class="flex flex-col md:flex-row gap-8 md:gap-12 items-center md:items-end">
                <!-- Playlist Cover -->
                <div class="cover-wrapper relative group">
                  <div
                    class="cover-glow absolute -inset-2 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  ></div>
                  <div
                    class="cover-container relative w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/50 dark:ring-neutral-800/50"
                  >
                    <n-image
                      :src="getImgUrl(getCoverImgUrl, '500y500')"
                      class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      preview-disabled
                    />
                    <!-- Play overlay on cover -->
                    <div
                      class="absolute inset-0 flex items-center justify-center bg-transparent group-hover:bg-black/30 transition-all duration-300"
                      :class="isMobile ? 'pointer-events-none' : 'cursor-pointer'"
                      @click="!isMobile && handlePlayAll()"
                    >
                      <button
                        v-if="!isMobile"
                        type="button"
                        class="play-icon w-16 h-16 rounded-full bg-white/90 flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-xl hover:scale-110 active:scale-95 pointer-events-auto"
                        @click.stop="handlePlayAll"
                      >
                        <i class="ri-play-fill text-3xl text-neutral-900 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Playlist Info -->
                <div class="playlist-info flex-1 text-center md:text-left">
                  <div class="playlist-badge mb-3">
                    <span
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider"
                    >
                      {{ isAlbum ? 'Album' : 'Playlist' }}
                    </span>
                  </div>
                  <h1
                    ref="titleElRef"
                    class="playlist-name text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4"
                  >
                    {{ name }}
                  </h1>

                  <!-- Meta Info -->
                  <div
                    class="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6"
                  >
                    <div v-if="isAlbum && listInfo?.artist" class="flex items-center gap-2">
                      <n-avatar
                        round
                        :size="28"
                        :src="getImgUrl(listInfo.artist.picUrl, '50y50')"
                      />
                      <span
                        class="text-sm font-semibold text-neutral-700 dark:text-neutral-200 hover:text-primary cursor-pointer transition-colors"
                        >{{ listInfo.artist.name }}</span
                      >
                    </div>
                    <div v-else-if="!isAlbum && listInfo?.creator" class="flex items-center gap-2">
                      <n-avatar
                        round
                        :size="28"
                        :src="getImgUrl(listInfo.creator.avatarUrl, '50y50')"
                      />
                      <span class="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{{
                        listInfo.creator.nickname
                      }}</span>
                    </div>
                    <div class="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700"></div>
                    <span class="text-sm text-neutral-500 dark:text-neutral-400">
                      {{ t('player.songNum', { num: total }) }}
                    </span>
                  </div>

                  <p
                    v-if="listInfo?.description"
                    class="text-sm md:text-base text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed max-w-3xl"
                  >
                    {{ listInfo.description }}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </n-spin>

        <!-- Action Bar (Sticky) -->
        <section
          v-if="songList.length > 0"
          class="action-bar sticky top-0 z-20 page-padding-x py-3 md:py-4 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-neutral-100 dark:border-neutral-800/50"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <!-- Play All Button -->
              <button
                class="play-all-btn flex items-center gap-1.5 md:gap-2 px-3.5 md:px-6 py-1.5 md:py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs md:text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
                @click="handlePlayAll"
              >
                <i class="ri-play-circle-line text-base md:text-lg" />
                <span>{{ t('comp.musicList.playAll') }}</span>
              </button>

              <!-- Collect Button -->
              <button
                v-if="canCollect"
                class="action-btn-pill flex items-center gap-1.5 md:gap-2 px-3.5 md:px-6 py-1.5 md:py-2.5 rounded-full font-semibold text-xs md:text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm border"
                :class="
                  isCollected
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-red-500 border-neutral-200 dark:border-neutral-700'
                    : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'
                "
                @click="toggleCollect"
              >
                <i
                  :class="isCollected ? 'ri-heart-fill' : 'ri-heart-line'"
                  class="text-base md:text-lg"
                />
                <span>{{
                  isCollected ? t('comp.musicList.cancelCollect') : t('comp.musicList.collect')
                }}</span>
              </button>

              <!-- Batch Actions -->
              <div
                v-if="filteredSongs.length > 0 && isElectron"
                class="h-8 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-1 hidden md:block"
              ></div>

              <button
                v-if="!isSelecting && isElectron"
                class="action-btn-icon w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                @click="startSelect"
              >
                <i class="ri-checkbox-multiple-line text-lg" />
              </button>

              <div
                v-if="isSelecting"
                class="flex items-center gap-2 animate-in fade-in slide-in-from-left-2"
              >
                <n-checkbox
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @update:checked="handleSelectAll"
                >
                  {{ t('common.selectAll') }}
                </n-checkbox>
                <button
                  class="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
                  :disabled="selectedSongs.length === 0 || isDownloading"
                  @click="handleBatchDownload"
                >
                  <i class="ri-download-line mr-1" />
                  {{ t('favorite.download', { count: selectedSongs.length }) }}
                </button>
                <button
                  class="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
                  :disabled="selectedSongs.length === 0"
                  @click="handleAddToPlaylist"
                >
                  <i class="ri-play-list-add-line mr-1" />
                  {{ t('comp.musicList.addToPlaylist') }}
                </button>
                <button
                  class="text-xs text-neutral-400 hover:text-neutral-600"
                  @click="cancelSelect"
                >
                  {{ t('common.cancel') }}
                </button>
              </div>
            </div>

            <!-- Right Tools -->
            <div class="flex items-center gap-3">
              <!-- Search within list -->
              <div class="relative group hidden sm:block">
                <n-input
                  v-model:value="searchKeyword"
                  :placeholder="t('comp.musicList.searchSongs')"
                  round
                  clearable
                  size="small"
                  class="w-48 focus:w-64 transition-all duration-300 !bg-neutral-100 dark:!bg-neutral-900 border-none"
                >
                  <template #prefix>
                    <i class="ri-search-line text-neutral-400"></i>
                  </template>
                </n-input>
              </div>

              <!-- Locate Current Song -->
              <n-tooltip v-if="currentPlayingIndex >= 0" trigger="hover">
                <template #trigger>
                  <button
                    class="action-btn-icon w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                    @click="scrollToCurrentSong"
                  >
                    <i class="ri-focus-3-line text-lg" />
                  </button>
                </template>
                {{ t('comp.musicList.locateCurrent') }}
              </n-tooltip>

              <!-- Layout Toggle -->
              <n-tooltip v-if="!isMobile" trigger="hover">
                <template #trigger>
                  <button
                    class="action-btn-icon w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                    @click="toggleLayout"
                  >
                    <i
                      :class="isCompactLayout ? 'ri-list-check-2' : 'ri-grid-line'"
                      class="text-lg"
                    />
                  </button>
                </template>
                {{
                  isCompactLayout
                    ? t('comp.musicList.normalLayout')
                    : t('comp.musicList.compactLayout')
                }}
              </n-tooltip>

              <!-- Scroll to Top -->
              <n-tooltip trigger="hover">
                <template #trigger>
                  <button
                    class="action-btn-icon w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                    @click="scrollToTop"
                  >
                    <i class="ri-arrow-up-line text-lg" />
                  </button>
                </template>
                {{ t('comp.musicList.scrollToTop') }}
              </n-tooltip>
            </div>
          </div>
        </section>

        <!-- List Content -->
        <section class="song-list-section page-padding-x mt-6">
          <div
            v-if="filteredSongs.length === 0 && searchKeyword"
            class="empty-state py-20 text-center text-neutral-400"
          >
            <i class="ri-search-line text-4xl mb-4 opacity-20" />
            <p>{{ t('comp.musicList.noSearchResults') }}</p>
          </div>

          <div v-else class="song-list-container">
            <div
              v-for="(item, index) in filteredSongs"
              :key="item.id"
              class="mb-2"
              :class="{ 'animate-item': index < initialAnimateCount }"
              :style="
                index < initialAnimateCount
                  ? { animationDelay: calculateAnimationDelay(index, 0.03) }
                  : undefined
              "
            >
              <song-item
                :index="index"
                :compact="isCompactLayout"
                :item="formatSong(item)"
                :can-remove="canRemove"
                :selectable="isSelecting"
                :selected="selectedSongs.includes(item.id as number)"
                @play="handlePlayItem(item)"
                @remove-song="handleRemoveSong"
                @select="(id, selected) => handleSelect(id, selected)"
              />
            </div>

            <!-- 未渲染项占位，保持滚动条高度稳定 -->
            <div v-if="placeholderHeight > 0" :style="{ height: placeholderHeight + 'px' }" />

            <!-- 底部加载指示器 -->
            <div v-if="loadingList" class="flex items-center justify-center py-6 gap-2">
              <n-spin :size="18" />
              <span class="text-sm text-neutral-400">{{ t('common.loading') }}</span>
            </div>
            <div
              v-else-if="
                !hasMore &&
                renderLimit >= allFilteredSongs.length &&
                filteredSongs.length > 0 &&
                !searchKeyword
              "
              class="py-6 text-center text-sm text-neutral-300 dark:text-neutral-600"
            >
              — {{ t('common.noMore') }} —
            </div>
          </div>
        </section>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import PinyinMatch from 'pinyin-match';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { getAlbum, getListDetail } from '@/api/list';
import {
  getMusicDetail,
  subscribeAlbum,
  subscribePlaylist,
  updatePlaylistTracks
} from '@/api/music';
import SongItem from '@/components/common/SongItem.vue';
import { useDownload } from '@/hooks/useDownload';
import { useScrollTitle } from '@/hooks/useScrollTitle';
import { useMusicStore, usePlayerStore, useRecommendStore, useUserStore } from '@/store';
import { usePlayHistoryStore } from '@/store/modules/playHistory';
import { SongResult } from '@/types/music';
import { calculateAnimationDelay, getImgUrl, isElectron, isMobile } from '@/utils';
import { getLoginErrorMessage, hasPermission } from '@/utils/auth';

defineOptions({
  name: 'MusicList'
});

const { t } = useI18n();
const route = useRoute();
const playerStore = usePlayerStore();
const musicStore = useMusicStore();
const recommendStore = useRecommendStore();
const userStore = useUserStore();
const message = useMessage();
const playHistoryStore = usePlayHistoryStore();

const loading = ref(false);
const isPlaying = computed(() => !!playerStore.playMusicUrl);
const contentPaddingBottom = computed(() =>
  isPlaying.value && !isMobile.value ? '220px' : '80px'
);

const fetchData = async () => {
  const id = route.params.id;
  const type = route.query.type;

  if (!id || type === 'dailyRecommend') return;

  // 检查是否需要加载数据
  if (
    musicStore.currentListInfo?.id?.toString() === id.toString() &&
    musicStore.currentMusicList &&
    musicStore.currentMusicList.length > 0
  ) {
    return;
  }

  loading.value = true;
  try {
    let data: any;
    if (type === 'album') {
      const res = await getAlbum(Number(id));
      data = res.data;
      if (data.code === 200) {
        musicStore.setCurrentMusicList(
          data.songs,
          data.album.name,
          { ...data.album, picUrl: data.album.picUrl },
          false
        );
      } else {
        message.error(t('common.loadFailed'));
      }
    } else if (type === 'playlist') {
      const res = await getListDetail(id.toString());
      data = res.data;
      if (data.code === 200) {
        const playlist = data.playlist;
        musicStore.setCurrentMusicList(
          playlist.tracks || [],
          playlist.name,
          playlist,
          playlist.creator?.userId === userStore.user?.userId
        );
      } else {
        message.error(t('common.loadFailed'));
      }
    }
  } catch (error) {
    console.error('加载列表数据失败:', error);
    message.error(t('common.loadFailed'));
  } finally {
    loading.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    fetchData();
  },
  { immediate: true }
);
const isDailyRecommend = computed(() => route.query.type === 'dailyRecommend');
const isAlbum = computed(() => route.query.type === 'album');

const name = computed(() => {
  if (isDailyRecommend.value) return t('comp.recommendSinger.songlist');
  return musicStore.currentMusicListName || '';
});

const titleElRef = ref<HTMLElement | null>(null);
useScrollTitle(name, titleElRef);

const songList = computed(() => {
  if (isDailyRecommend.value) return recommendStore.dailyRecommendSongs;
  return musicStore.currentMusicList || [];
});

const listInfo = computed(() => {
  if (isDailyRecommend.value) return null;
  return musicStore.currentListInfo || null;
});

const canRemove = computed(() => {
  if (isDailyRecommend.value) return false;
  return musicStore.canRemoveSong || false;
});

const canCollect = ref(false);
const isCollected = ref(false);
const pageSize = 200;
const initialAnimateCount = 20; // 仅前 20 项有入场动画
const displayedSongs = ref<SongResult[]>([]);
const renderLimit = ref(pageSize); // DOM 渲染上限，数据全部在内存
const loadingList = ref(false);
const loadedIds = ref(new Set<number>());
const isPlaylistLoading = ref(false);
const completePlaylist = ref<SongResult[]>([]);
const hasMore = ref(true);
const searchKeyword = ref('');
const isFullPlaylistLoaded = ref(false);

const isSelecting = ref(false);
const selectedSongs = ref<number[]>([]);
const { isDownloading, batchDownloadMusic } = useDownload();

const isCompactLayout = ref(
  isMobile.value ? false : localStorage.getItem('musicListLayout') === 'compact'
);

const total = computed(() => {
  if (listInfo.value?.trackIds) return listInfo.value.trackIds.length;
  return songList.value.length;
});

const getCoverImgUrl = computed(() => {
  const coverImgUrl = listInfo.value?.coverImgUrl || listInfo.value?.picUrl;
  if (coverImgUrl) return coverImgUrl;
  const song = songList.value[0];
  return song?.picUrl || song?.al?.picUrl || song?.album?.picUrl || '';
});

// 全量歌曲列表（用于"播放全部"等操作）
const allFilteredSongs = computed(() => {
  const sourceList = isDailyRecommend.value ? songList.value : displayedSongs.value;
  return sourceList.filter((s) => !playerStore.dislikeList.includes(s.id));
});

// 实际渲染到 DOM 的歌曲（搜索时显示全部匹配，非搜索时按 renderLimit 分页渲染）
const filteredSongs = computed(() => {
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase().trim();
    return allFilteredSongs.value.filter((song) => {
      const songName = song.name?.toLowerCase() || '';
      const albumName = song.al?.name?.toLowerCase() || '';
      const artists = song.ar || song.artists || [];
      return (
        songName.includes(keyword) ||
        albumName.includes(keyword) ||
        artists.some((a: any) => a.name?.toLowerCase().includes(keyword)) ||
        PinyinMatch.match(songName, keyword)
      );
    });
  }
  return allFilteredSongs.value.slice(0, renderLimit.value);
});

// 未渲染项的占位高度，让滚动条从一开始就反映真实总高度
const estimatedItemHeight = computed(() => (isCompactLayout.value ? 50 : 70));
const placeholderHeight = computed(() => {
  if (searchKeyword.value) return 0;
  const unrenderedCount = allFilteredSongs.value.length - filteredSongs.value.length;
  return Math.max(0, unrenderedCount) * estimatedItemHeight.value;
});

const resetListState = () => {
  loadedIds.value.clear();
  displayedSongs.value = [];
  completePlaylist.value = [];
  hasMore.value = true;
  isFullPlaylistLoaded.value = false;
};

const formatSong = (item: any) => {
  if (!item) return null;
  // 专辑歌曲的 al.picUrl 可能为空，使用专辑封面兜底
  const picUrl = item.al?.picUrl || item.picUrl || (isAlbum.value ? getCoverImgUrl.value : '');
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

const loadSongs = async (ids: number[], appendToList = true, updateComplete = false) => {
  if (ids.length === 0) return [];
  try {
    const { data } = await getMusicDetail(ids);
    if (data?.songs) {
      const { songs } = data;
      songs.forEach((song: any) => loadedIds.value.add(song.id));
      if (appendToList) displayedSongs.value.push(...songs);
      if (updateComplete) completePlaylist.value.push(...songs);
      return songs;
    }
  } catch (error) {
    console.error('加载歌曲失败:', error);
  }
  return [];
};

const loadFullPlaylist = async () => {
  if (isPlaylistLoading.value || isFullPlaylistLoaded.value) return;
  isPlaylistLoading.value = true;
  try {
    if (!listInfo.value?.trackIds) {
      isFullPlaylistLoaded.value = true;
      return;
    }
    const allIds = listInfo.value.trackIds.map((item) => item.id);
    const loadedSongIds = new Set(displayedSongs.value.map((s) => s.id as number));
    completePlaylist.value = [...displayedSongs.value];
    const unloadedIds = allIds.filter((id) => !loadedSongIds.has(id));

    if (unloadedIds.length === 0) {
      isFullPlaylistLoaded.value = true;
      return;
    }

    const batchSize = 500;
    for (let i = 0; i < unloadedIds.length; i += batchSize) {
      const batchIds = unloadedIds.slice(i, i + batchSize);
      const loadedBatch = await loadSongs(batchIds, false, false);
      if (loadedBatch.length > 0) {
        displayedSongs.value = [...displayedSongs.value, ...loadedBatch];
        completePlaylist.value = [...completePlaylist.value, ...loadedBatch];
      }
    }
    isFullPlaylistLoaded.value = true;
    hasMore.value = false;
  } catch (error) {
    console.error('加载完整播放列表失败:', error);
  } finally {
    isPlaylistLoading.value = false;
  }
};

const handlePlayAll = () => {
  if (displayedSongs.value.length === 0) return;
  saveHistory();
  const list = searchKeyword.value
    ? filteredSongs.value
    : isFullPlaylistLoaded.value
      ? completePlaylist.value
      : allFilteredSongs.value;
  playerStore.setPlayList(list.map(formatSong));
  playerStore.setPlay(formatSong(list[0]));
  if (!isFullPlaylistLoaded.value) loadFullPlaylist();
};

const handlePlayItem = (item: any) => {
  playerStore.setPlay(formatSong(item));
  if (!playerStore.playList.some((s) => s.id === item.id)) {
    playerStore.addToNextPlay(formatSong(item));
  }
};

const handleRemoveSong = async (songId: number) => {
  if (!listInfo.value?.id || !canRemove.value) return;
  try {
    const res = await updatePlaylistTracks({
      op: 'del',
      pid: listInfo.value.id,
      tracks: songId.toString()
    });
    if (res.status === 200) {
      message.success(t('user.message.deleteSuccess'));
      displayedSongs.value = displayedSongs.value.filter((s) => s.id !== songId);
      completePlaylist.value = completePlaylist.value.filter((s) => s.id !== songId);
      musicStore.removeSongFromList(songId);
    }
  } catch (error) {
    console.error('删除歌曲失败:', error);
    message.error(t('user.message.deleteFailed'));
  }
};

// 根据滚动位置计算需要渲染多少项，快速滚动也不会出现空白
const handleScroll = (e: Event) => {
  if (searchKeyword.value) return;

  const target = e.target as HTMLElement;
  const { scrollTop, clientHeight } = target;

  // 列表区域在滚动内容中的起始偏移（hero + action bar + margin）
  const listSection = document.querySelector('.song-list-section') as HTMLElement;
  const listStart = listSection?.offsetTop || 0;

  // 当前可见区域底部在列表中的位置
  const visibleBottom = scrollTop + clientHeight - listStart;
  if (visibleBottom <= 0) return;

  // 计算需要渲染到第几项（多渲染一屏作为缓冲）
  const bufferHeight = clientHeight;
  const neededIndex = Math.ceil((visibleBottom + bufferHeight) / estimatedItemHeight.value);
  const allCount = allFilteredSongs.value.length;

  if (neededIndex > renderLimit.value) {
    renderLimit.value = Math.min(neededIndex, allCount);
  }

  // 内存数据全部渲染完但还有更多数据需要从 API 加载
  if (renderLimit.value >= allCount && !loadingList.value && hasMore.value) {
    loadMoreSongs();
  }
};

const loadMoreSongs = async () => {
  if (
    isFullPlaylistLoaded.value ||
    searchKeyword.value ||
    displayedSongs.value.length >= total.value
  )
    return;
  loadingList.value = true;
  try {
    const start = displayedSongs.value.length;
    const end = Math.min(start + pageSize, total.value);
    if (listInfo.value?.trackIds) {
      const ids = listInfo.value.trackIds
        .slice(start, end)
        .map((i) => i.id)
        .filter((id) => !loadedIds.value.has(id));
      if (ids.length > 0) await loadSongs(ids);
    }
    hasMore.value = displayedSongs.value.length < total.value;
    // 新数据加载后扩展渲染窗口
    renderLimit.value = displayedSongs.value.length;
  } finally {
    loadingList.value = false;
  }
};

const saveHistory = () => {
  if (!listInfo.value?.id) return;
  if (isAlbum.value) {
    playHistoryStore.addAlbum({
      id: listInfo.value.id,
      name: listInfo.value.name || '',
      picUrl: getCoverImgUrl.value,
      size: total.value,
      artist: listInfo.value.artist
    });
  } else if (route.query.type === 'playlist') {
    playHistoryStore.addPlaylist({
      id: listInfo.value.id,
      name: listInfo.value.name || '',
      coverImgUrl: getCoverImgUrl.value,
      trackCount: total.value,
      playCount: listInfo.value.playCount,
      creator: listInfo.value.creator
    });
  }
};

const toggleCollect = async () => {
  if (!listInfo.value?.id || !hasPermission(true)) {
    if (!listInfo.value?.id) return;
    message.error(getLoginErrorMessage(true));
    return;
  }
  const type = route.query.type as string;
  try {
    const tVal = isCollected.value ? 2 : 1;
    const response =
      type === 'album'
        ? await subscribeAlbum({ t: tVal, id: listInfo.value.id })
        : await subscribePlaylist({ t: tVal, id: listInfo.value.id });
    if (response.data.code === 200) {
      isCollected.value = !isCollected.value;
      message.success(
        t(
          isCollected.value
            ? 'comp.musicList.collectSuccess'
            : 'comp.musicList.cancelCollectSuccess'
        )
      );
      if (type === 'album') {
        isCollected.value
          ? userStore.addCollectedAlbum(listInfo.value.id)
          : userStore.removeCollectedAlbum(listInfo.value.id);
      } else {
        listInfo.value.subscribed = isCollected.value;
      }
    }
  } catch (error) {
    console.error('操作收藏失败:', error);
    message.error(t('comp.musicList.operationFailed'));
  }
};

const startSelect = () => {
  isSelecting.value = true;
  selectedSongs.value = [];
};
const cancelSelect = () => {
  isSelecting.value = false;
  selectedSongs.value = [];
};
const handleSelect = (id: number, selected: boolean) => {
  selected
    ? selectedSongs.value.push(id)
    : (selectedSongs.value = selectedSongs.value.filter((i) => i !== id));
};
const isAllSelected = computed(
  () => filteredSongs.value.length > 0 && selectedSongs.value.length === filteredSongs.value.length
);
const isIndeterminate = computed(
  () => selectedSongs.value.length > 0 && selectedSongs.value.length < filteredSongs.value.length
);
const handleSelectAll = (checked: boolean) => {
  selectedSongs.value = checked ? filteredSongs.value.map((s) => s.id as number) : [];
};
const handleBatchDownload = async () => {
  const list = selectedSongs.value
    .map((id) => filteredSongs.value.find((s) => s.id === id))
    .filter((s) => s) as SongResult[];
  await batchDownloadMusic(list);
  cancelSelect();
};

const handleAddToPlaylist = () => {
  const songs = selectedSongs.value
    .map((id) => filteredSongs.value.find((s) => s.id === id))
    .filter((s) => s)
    .map((s) => formatSong(s))
    .filter((s) => s) as SongResult[];
  if (songs.length === 0) return;

  const currentList = playerStore.playList;
  const newSongs = songs.filter((s) => !currentList.some((item) => item.id === s.id));
  if (newSongs.length === 0) {
    message.warning(t('comp.musicList.songsAlreadyInPlaylist'));
    return;
  }

  playerStore.setPlayList([...currentList, ...newSongs], true);
  message.success(t('comp.musicList.addToPlaylistSuccess', { count: newSongs.length }));
  cancelSelect();
};

// 当前播放歌曲在列表中的索引
const currentPlayingIndex = computed(() => {
  const currentId = playerStore.playMusic?.id;
  if (!currentId) return -1;
  return allFilteredSongs.value.findIndex((s) => s.id === currentId);
});

const scrollbarRef = ref<any>(null);

// 滚动到当前播放歌曲
const scrollToCurrentSong = async () => {
  const index = currentPlayingIndex.value;
  if (index < 0) return;

  // 确保目标歌曲已渲染到 DOM
  if (index >= renderLimit.value) {
    renderLimit.value = index + 5;
    await nextTick();
  }

  const container = document.querySelector('.song-list-container') as HTMLElement;
  const target = container?.children[index] as HTMLElement;
  if (!target || !scrollbarRef.value) return;

  // 获取 n-scrollbar 内部的可滚动容器
  const scrollEl = document.querySelector('.music-list-page .n-scrollbar-container') as HTMLElement;
  if (!scrollEl) return;

  // 用 getBoundingClientRect 精确测量目标位置
  const scrollRect = scrollEl.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const currentScrollTop = scrollEl.scrollTop;

  // 目标在滚动内容中的绝对位置
  const targetAbsoluteTop = currentScrollTop + targetRect.top - scrollRect.top;

  // 粘性 action bar 占用的高度
  const actionBarEl = document.querySelector('.action-bar') as HTMLElement;
  const actionBarHeight = actionBarEl?.offsetHeight || 0;

  // 可视区域高度（去掉 action bar）
  const visibleHeight = scrollRect.height - actionBarHeight;

  // 滚动到目标居中（在可视区域中间）
  const scrollTop = targetAbsoluteTop - actionBarHeight - visibleHeight / 2 + targetRect.height / 2;

  scrollbarRef.value.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });

  // 短暂高亮效果
  await nextTick();
  target.classList.add('song-highlight');
  setTimeout(() => target.classList.remove('song-highlight'), 2000);
};

const toggleLayout = () => {
  isCompactLayout.value = !isCompactLayout.value;
  localStorage.setItem('musicListLayout', isCompactLayout.value ? 'compact' : 'normal');
};

const scrollToTop = () => {
  scrollbarRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

const checkCollectionStatus = () => {
  const type = route.query.type as string;
  if (type === 'playlist' && listInfo.value?.id) {
    canCollect.value = true;
    isCollected.value = listInfo.value.subscribed || false;
  } else if (type === 'album' && listInfo.value?.id) {
    canCollect.value = true;
    isCollected.value = userStore.isAlbumCollected(listInfo.value.id);
  } else {
    canCollect.value = false;
  }
};

watch(
  songList,
  (newSongs) => {
    resetListState();
    renderLimit.value = pageSize; // 重置 DOM 渲染窗口
    if (newSongs.length > 0) {
      displayedSongs.value = [...newSongs];
      newSongs.forEach((s) => loadedIds.value.add(s.id));
    }
    hasMore.value = displayedSongs.value.length < total.value;
    checkCollectionStatus();
  },
  { immediate: true }
);

onMounted(checkCollectionStatus);
</script>

<style scoped lang="scss">
.music-list-page {
  position: relative;
}

.hero-section {
  min-height: 300px;
}

.action-bar {
  transition:
    background-color 0.3s,
    box-shadow 0.3s;
}

.animate-item {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.action-btn-pill {
  @apply transition-all border-neutral-200 dark:border-neutral-800;
  &:hover:not(:disabled) {
    @apply border-primary/30 bg-primary/5;
  }
}

.action-btn-icon {
  @apply transition-all;
  &:hover {
    @apply scale-110 text-primary bg-primary/10;
  }
}

.song-list-container {
  padding-bottom: 100px;
}

.song-highlight {
  animation: highlightPulse 2s ease-out;
}

@keyframes highlightPulse {
  0%,
  30% {
    background-color: rgba(var(--primary-color-rgb, 64, 128, 255), 0.15);
    border-radius: 12px;
  }
  100% {
    background-color: transparent;
  }
}

.mobile {
  .hero-section {
    min-height: auto;
  }
  .action-bar {
    @apply py-2;
  }
}
</style>

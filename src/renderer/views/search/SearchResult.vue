<template>
  <div class="search-result-page h-full w-full bg-white dark:bg-black">
    <scroll-area class="h-full">
      <!-- 播放条占位由布局 PlayBottom 负责，这里只留一点滚到底的呼吸距 -->
      <div class="result-scroll-body">
        <!-- 复用分类选择器：line 变体 = 底线高亮，不要手搓圆角胶囊 -->
        <category-selector
          variant="line"
          :model-value="searchType"
          :categories="typeOptions"
          label-key="label"
          value-key="key"
          animation-class=""
          @change="setSearchType"
        />

        <div class="page-padding result-list">
          <!-- 有缓存时安静刷新，别每次切 tab 整页转圈把列表抽空 -->
          <n-spin :show="blockingLoad">
            <div class="result-list-inner">
              <template v-if="!blockingLoad && isEmpty">
                <n-empty :description="emptyText" class="pt-16" />
              </template>

              <!-- 歌曲 -->
              <div v-else-if="searchType === SEARCH_TYPE.MUSIC" class="space-y-1">
                <song-item
                  v-for="(song, index) in songs"
                  :key="song.id"
                  :item="song"
                  :index="index"
                  :is-next="true"
                />
              </div>

              <!-- 歌单 / 专辑网格 -->
              <div
                v-else
                class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              >
                <div
                  v-for="item in gridItems"
                  :key="item.id"
                  class="cursor-pointer group"
                  @click="openItem(item)"
                >
                  <div
                    class="aspect-square rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900"
                  >
                    <n-image
                      v-if="item.picUrl"
                      :src="item.picUrl"
                      object-fit="cover"
                      class="w-full h-full"
                      preview-disabled
                    />
                  </div>
                  <div class="mt-2 text-sm font-medium truncate text-neutral-900 dark:text-white">
                    {{ item.name }}
                  </div>
                  <div class="text-xs text-neutral-500 truncate">{{ item.desc }}</div>
                </div>
              </div>
            </div>
          </n-spin>
        </div>
      </div>
    </scroll-area>
  </div>
</template>

<script setup lang="ts">
import { NEmpty, NImage, NSpin, useMessage } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import {
  isMusicSourceAvailable,
  mapMsAlbumToItem,
  mapMsPlaylistToItem,
  mapMsSongToSongResult,
  msSearchAlbums,
  msSearchPlaylists,
  msSearchSongs
} from '@/api/musicSource';
import CategorySelector from '@/components/common/CategorySelector.vue';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import SongItem from '@/components/common/SongItem.vue';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SEARCH_TYPE } from '@/const/bar-const';
import type { SongResult } from '@/types/music';

defineOptions({ name: 'SearchResult' });

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const message = useMessage();

const keyword = computed(() => String(route.query.keyword || '').trim());
/** 与 URL ?type= 同步；默认单曲 */
const searchType = computed(() => Number(route.query.type) || SEARCH_TYPE.MUSIC);
/** 仅「当前 tab 还没数据」时全页转圈，避免切筛选把列表抽空再灌回去 */
const blockingLoad = ref(false);
const songs = ref<SongResult[]>([]);
const playlists = ref<any[]>([]);
const albums = ref<any[]>([]);
/** 各类型对应的关键词，用来判断缓存是否还属于这次搜索 */
const loadedKeywordByType = ref<Record<number, string>>({});

const typeOptions = computed(() => [
  { key: SEARCH_TYPE.MUSIC, label: t('search.search.single') },
  { key: SEARCH_TYPE.ALBUM, label: t('search.search.album') },
  { key: SEARCH_TYPE.PLAYLIST, label: t('search.search.playlist') }
]);

const setSearchType = (type: number) => {
  if (type === searchType.value) return;
  router.replace({
    path: '/search-result',
    query: { keyword: keyword.value, type: String(type) }
  });
};

const gridItems = computed(() =>
  searchType.value === SEARCH_TYPE.PLAYLIST ? playlists.value : albums.value
);

const listForType = (type: number) => {
  if (type === SEARCH_TYPE.MUSIC) return songs.value;
  if (type === SEARCH_TYPE.PLAYLIST) return playlists.value;
  return albums.value;
};

const hasFreshCache = (type: number, kw: string) =>
  loadedKeywordByType.value[type] === kw && listForType(type).length > 0;

const isEmpty = computed(() => {
  if (searchType.value === SEARCH_TYPE.MUSIC) return songs.value.length === 0;
  if (searchType.value === SEARCH_TYPE.PLAYLIST) return playlists.value.length === 0;
  return albums.value.length === 0;
});

const emptyText = computed(() => {
  if (!isMusicSourceAvailable()) return '在线搜索仅支持桌面端';
  if (!keyword.value) return t('comp.musicList.noSearchResults');
  return t('comp.musicList.noSearchResults');
});

const load = async () => {
  if (!keyword.value) {
    songs.value = [];
    playlists.value = [];
    albums.value = [];
    loadedKeywordByType.value = {};
    return;
  }
  if (!isMusicSourceAvailable()) {
    message.warning('在线搜索仅支持桌面端（ly-music-source）');
    return;
  }

  const kw = keyword.value;
  const type = searchType.value;
  // 关键词变了：旧列表作废
  if (
    loadedKeywordByType.value[SEARCH_TYPE.MUSIC] &&
    loadedKeywordByType.value[SEARCH_TYPE.MUSIC] !== kw
  ) {
    songs.value = [];
  }
  if (
    loadedKeywordByType.value[SEARCH_TYPE.PLAYLIST] &&
    loadedKeywordByType.value[SEARCH_TYPE.PLAYLIST] !== kw
  ) {
    playlists.value = [];
  }
  if (
    loadedKeywordByType.value[SEARCH_TYPE.ALBUM] &&
    loadedKeywordByType.value[SEARCH_TYPE.ALBUM] !== kw
  ) {
    albums.value = [];
  }

  const useBlocking = !hasFreshCache(type, kw);
  if (useBlocking) blockingLoad.value = true;

  try {
    if (type === SEARCH_TYPE.MUSIC) {
      const list = await msSearchSongs(kw, { limit: 30 });
      if (kw !== keyword.value || type !== searchType.value) return;
      songs.value = list.map(mapMsSongToSongResult);
      loadedKeywordByType.value = { ...loadedKeywordByType.value, [type]: kw };
    } else if (type === SEARCH_TYPE.PLAYLIST) {
      const list = await msSearchPlaylists(kw, { limit: 30 });
      if (kw !== keyword.value || type !== searchType.value) return;
      playlists.value = list.map(mapMsPlaylistToItem);
      loadedKeywordByType.value = { ...loadedKeywordByType.value, [type]: kw };
    } else if (type === SEARCH_TYPE.ALBUM) {
      const list = await msSearchAlbums(kw, { limit: 30 });
      if (kw !== keyword.value || type !== searchType.value) return;
      albums.value = list.map(mapMsAlbumToItem);
      loadedKeywordByType.value = { ...loadedKeywordByType.value, [type]: kw };
    }
  } catch (error: any) {
    console.error('[search]', error);
    message.error(error?.message || '搜索失败');
    if (type === SEARCH_TYPE.MUSIC) songs.value = [];
    else if (type === SEARCH_TYPE.PLAYLIST) playlists.value = [];
    else albums.value = [];
  } finally {
    if (useBlocking) blockingLoad.value = false;
  }
};

const openItem = async (item: any) => {
  if (item.type === 'playlist') {
    navigateToMusicList(router, {
      id: item.id,
      type: 'playlist',
      name: item.name,
      listInfo: { ...item, source: 'qishui' },
      source: 'qishui'
    });
  } else {
    message.info('专辑详情将在后续版本完善');
  }
};

watch(
  [keyword, searchType],
  () => {
    void load();
  },
  { immediate: true }
);
</script>

<style scoped>
.result-scroll-body {
  /* 别再 pb-32 跟 PlayBottom 叠两层，否则底下一截像透明洞 */
  padding-bottom: 1rem;
}

.result-list {
  padding-top: 0.75rem;
}

.result-list-inner {
  /* 切 tab 时空态/列表切换时少塌一截 */
  min-height: 12rem;
}
</style>

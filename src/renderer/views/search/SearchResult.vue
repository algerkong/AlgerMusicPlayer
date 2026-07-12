<template>
  <div class="search-result-page h-full w-full bg-white dark:bg-black">
    <n-scrollbar class="h-full">
      <div class="pb-32">
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
          <n-spin :show="loading">
            <template v-if="!loading && isEmpty">
              <n-empty :description="emptyText" class="pt-16" />
            </template>

            <!-- Songs -->
            <div v-else-if="searchType === SEARCH_TYPE.MUSIC" class="space-y-1">
              <song-item
                v-for="(song, index) in songs"
                :key="song.id"
                :item="song"
                :index="index"
                :is-next="true"
              />
            </div>

            <!-- Playlists / Albums grid -->
            <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
          </n-spin>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { NEmpty, NImage, NScrollbar, NSpin, useMessage } from 'naive-ui';
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
const loading = ref(false);
const songs = ref<SongResult[]>([]);
const playlists = ref<any[]>([]);
const albums = ref<any[]>([]);

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
    return;
  }
  if (!isMusicSourceAvailable()) {
    message.warning('在线搜索仅支持桌面端（ly-music-source）');
    return;
  }

  loading.value = true;
  const kw = keyword.value;
  const type = searchType.value;
  try {
    if (type === SEARCH_TYPE.MUSIC) {
      const list = await msSearchSongs(kw, { limit: 30 });
      if (kw !== keyword.value || type !== searchType.value) return;
      songs.value = list.map(mapMsSongToSongResult);
    } else if (type === SEARCH_TYPE.PLAYLIST) {
      const list = await msSearchPlaylists(kw, { limit: 30 });
      if (kw !== keyword.value || type !== searchType.value) return;
      playlists.value = list.map(mapMsPlaylistToItem);
    } else if (type === SEARCH_TYPE.ALBUM) {
      const list = await msSearchAlbums(kw, { limit: 30 });
      if (kw !== keyword.value || type !== searchType.value) return;
      albums.value = list.map(mapMsAlbumToItem);
    }
  } catch (error: any) {
    console.error('[search]', error);
    message.error(error?.message || '搜索失败');
    songs.value = [];
    playlists.value = [];
    albums.value = [];
  } finally {
    loading.value = false;
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
.result-list {
  padding-top: 0.75rem;
}
</style>

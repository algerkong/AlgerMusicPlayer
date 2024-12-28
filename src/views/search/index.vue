<template>
  <div class="search-page">
    <n-layout
      v-if="isMobile ? !searchDetail : true"
      class="hot-search"
      :class="setAnimationClass('animate__fadeInDown')"
      :native-scrollbar="false"
    >
      <div class="title">热搜列表</div>
      <div class="hot-search-list">
        <template v-for="(item, index) in hotSearchData?.data" :key="index">
          <div
            :class="setAnimationClass('animate__bounceInLeft')"
            :style="setAnimationDelay(index, 10)"
            class="hot-search-item"
            @click.stop="loadSearch(item.searchWord, 1)"
          >
            <span class="hot-search-item-count" :class="{ 'hot-search-item-count-3': index < 3 }">{{ index + 1 }}</span>
            {{ item.searchWord }}
          </div>
        </template>
      </div>
    </n-layout>
    <!-- 搜索到的歌曲列表 -->
    <n-layout
      v-if="isMobile ? searchDetail : true"
      class="search-list"
      :class="setAnimationClass('animate__fadeInUp')"
      :native-scrollbar="false"
    >
      <div class="title">{{ hotKeyword }}</div>
      <div v-loading="searchDetailLoading" class="search-list-box">
        <template v-if="searchDetail">
          <div
            v-for="(item, index) in searchDetail?.songs"
            :key="item.id"
            :class="setAnimationClass('animate__bounceInRight')"
            :style="setAnimationDelay(index, 50)"
          >
            <song-item :item="item" @play="handlePlay" />
          </div>
          <template v-for="(list, key) in searchDetail">
            <template v-if="key.toString() !== 'songs'">
              <div
                v-for="(item, index) in list"
                :key="item.id"
                :class="setAnimationClass('animate__bounceInRight')"
                :style="setAnimationDelay(index, 50)"
              >
                <SearchItem :item="item" />
              </div>
            </template>
          </template>
        </template>
      </div>
    </n-layout>
  </div>
</template>

<script lang="ts" setup>
import { useDateFormat } from '@vueuse/core';
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';

import { getHotSearch } from '@/api/home';
import { getSearch } from '@/api/search';
import SongItem from '@/components/common/SongItem.vue';
import type { IHotSearch } from '@/type/search';
import { isMobile, setAnimationClass, setAnimationDelay } from '@/utils';

defineOptions({
  name: 'Search',
});

const route = useRoute();
const store = useStore();

const searchDetail = ref<any>();
const searchType = computed(() => store.state.searchType as number);
const searchDetailLoading = ref(false);

// 热搜列表
const hotSearchData = ref<IHotSearch>();
const loadHotSearch = async () => {
  const { data } = await getHotSearch();
  hotSearchData.value = data;
};

onMounted(() => {
  loadHotSearch();
  loadSearch(route.query.keyword);
});

const hotKeyword = ref(route.query.keyword || '搜索列表');

watch(
  () => store.state.searchValue,
  (value) => {
    loadSearch(value);
  },
);

const dateFormat = (time: any) => useDateFormat(time, 'YYYY.MM.DD').value;
const loadSearch = async (keywords: any, type: any = null) => {
  hotKeyword.value = keywords;
  searchDetail.value = undefined;
  if (!keywords) return;

  searchDetailLoading.value = true;
  const { data } = await getSearch({ keywords, type: type || searchType.value });

  const songs = data.result.songs || [];
  const albums = data.result.albums || [];
  const mvs = (data.result.mvs || []).map((item: any) => ({
    ...item,
    picUrl: item.cover,
    playCount: item.playCount,
    desc: item.artists.map((artist: any) => artist.name).join('/'),
    type: 'mv',
  }));

  const playlists = (data.result.playlists || []).map((item: any) => ({
    ...item,
    picUrl: item.coverImgUrl,
    playCount: item.playCount,
    desc: item.creator.nickname,
    type: 'playlist',
  }));

  // songs map 替换属性
  songs.forEach((item: any) => {
    item.picUrl = item.al.picUrl;
    item.artists = item.ar;
  });
  albums.forEach((item: any) => {
    item.desc = `${item.artist.name} ${item.company} ${dateFormat(item.publishTime)}`;
  });
  searchDetail.value = {
    songs,
    albums,
    mvs,
    playlists,
  };

  searchDetailLoading.value = false;
};

watch(
  () => route.path,
  async (path) => {
    if (path === '/search') {
      store.state.searchValue = route.query.keyword;
    }
  },
);

const handlePlay = () => {
  const tracks = searchDetail.value?.songs || [];
  store.commit('setPlayList', tracks);
};
</script>

<style lang="scss" scoped>
.search-page {
  @apply flex h-full;
}

.hot-search {
  @apply mr-4 rounded-xl flex-1 overflow-hidden;
  @apply bg-light-100 dark:bg-dark-100;
  animation-duration: 0.2s;
  min-width: 400px;
  height: 100%;

  &-list {
    @apply pb-28;
  }

  &-item {
    @apply px-4 py-3 text-lg rounded-xl cursor-pointer;
    @apply text-gray-900 dark:text-white;
    transition: all 0.3s ease;

    &:hover {
      @apply bg-light-100 dark:bg-dark-200;
    }

    &-count {
      @apply inline-block ml-3 w-8;
      @apply text-green-500;

      &-3 {
        @apply font-bold inline-block ml-3 w-8;
        @apply text-red-500;
      }
    }
  }
}

.search-list {
  @apply flex-1 rounded-xl;
  @apply bg-light-100 dark:bg-dark-100;
  height: 100%;

  &-box {
    @apply pb-28;
  }
}

.title {
  @apply text-xl font-bold my-2 mx-4;
  @apply text-gray-900 dark:text-white;
}

.mobile {
  .hot-search {
    @apply mr-0 w-full;
  }
}
</style>

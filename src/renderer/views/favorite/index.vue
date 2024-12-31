<template>
  <div v-if="isComponent ? favoriteSongs.length : true" class="favorite-page">
    <div class="favorite-header" :class="setAnimationClass('animate__fadeInLeft')">
      <h2>我的收藏</h2>
      <div class="favorite-count">共 {{ favoriteList.length }} 首</div>
    </div>
    <div class="favorite-main" :class="setAnimationClass('animate__bounceInRight')">
      <n-scrollbar ref="scrollbarRef" class="favorite-content" @scroll="handleScroll">
        <div v-if="favoriteList.length === 0" class="empty-tip">
          <n-empty description="还没有收藏歌曲" />
        </div>
        <div v-else class="favorite-list">
          <song-item
            v-for="(song, index) in favoriteSongs"
            :key="song.id"
            :item="song"
            :favorite="!isComponent"
            :class="setAnimationClass('animate__bounceInLeft')"
            :style="getItemAnimationDelay(index)"
            @play="handlePlay"
          />
          <div v-if="isComponent" class="favorite-list-more text-center">
            <n-button text type="primary" @click="handleMore">查看更多</n-button>
          </div>

          <div v-if="loading" class="loading-wrapper">
            <n-spin size="large" />
          </div>

          <div v-if="noMore" class="no-more-tip">没有更多了</div>
        </div>
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';

import { getMusicDetail } from '@/api/music';
import SongItem from '@/components/common/SongItem.vue';
import type { SongResult } from '@/type/music';
import { setAnimationClass, setAnimationDelay } from '@/utils';

const store = useStore();
const favoriteList = computed(() => store.state.favoriteList);
const favoriteSongs = ref<SongResult[]>([]);
const loading = ref(false);
const noMore = ref(false);
const scrollbarRef = ref();

// 无限滚动相关
const pageSize = 16;
const currentPage = ref(1);

const props = defineProps({
  isComponent: {
    type: Boolean,
    default: false
  }
});

// 获取当前页的收藏歌曲ID
const getCurrentPageIds = () => {
  const reversedList = [...favoriteList.value];
  const startIndex = (currentPage.value - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return reversedList.slice(startIndex, endIndex);
};

// 获取收藏歌曲详情
const getFavoriteSongs = async () => {
  if (favoriteList.value.length === 0) {
    favoriteSongs.value = [];
    return;
  }

  if (props.isComponent && favoriteSongs.value.length >= 16) {
    return;
  }

  loading.value = true;
  try {
    const currentIds = getCurrentPageIds();
    const res = await getMusicDetail(currentIds);
    if (res.data.songs) {
      const newSongs = res.data.songs.map((song: SongResult) => ({
        ...song,
        picUrl: song.al?.picUrl || ''
      }));

      // 追加新数据而不是替换
      if (currentPage.value === 1) {
        favoriteSongs.value = newSongs;
      } else {
        favoriteSongs.value = [...favoriteSongs.value, ...newSongs];
      }

      // 判断是否还有更多数据
      noMore.value = favoriteSongs.value.length >= favoriteList.value.length;
    }
  } catch (error) {
    console.error('获取收藏歌曲失败:', error);
  } finally {
    loading.value = false;
  }
};

// 处理滚动事件
const handleScroll = (e: any) => {
  const { scrollTop, scrollHeight, offsetHeight } = e.target;
  const threshold = 100; // 距离底部多少像素时加载更多

  if (!loading.value && !noMore.value && scrollHeight - (scrollTop + offsetHeight) < threshold) {
    currentPage.value++;
    getFavoriteSongs();
  }
};

onMounted(() => {
  getFavoriteSongs();
});

// 监听收藏列表变化
watch(
  favoriteList,
  () => {
    currentPage.value = 1;
    noMore.value = false;
    getFavoriteSongs();
  },
  { deep: true, immediate: true }
);

const handlePlay = () => {
  store.commit('setPlayList', favoriteSongs.value);
};

const getItemAnimationDelay = (index: number) => {
  return setAnimationDelay(index, 30);
};

const router = useRouter();
const handleMore = () => {
  router.push('/favorite');
};
</script>

<style lang="scss" scoped>
.favorite-page {
  @apply h-full flex flex-col pt-2;
  @apply bg-light dark:bg-black;

  .favorite-header {
    @apply flex items-center justify-between flex-shrink-0 px-4;

    h2 {
      @apply text-xl font-bold pb-2;
      @apply text-gray-900 dark:text-white;
    }

    .favorite-count {
      @apply text-gray-500 dark:text-gray-400 text-sm;
    }
  }

  .favorite-main {
    @apply flex flex-col flex-grow min-h-0;

    .favorite-content {
      @apply flex-grow min-h-0;

      .empty-tip {
        @apply h-full flex items-center justify-center;
        @apply text-gray-500 dark:text-gray-400;
      }

      .favorite-list {
        @apply space-y-2 pb-4 px-4;

        &-more {
          @apply mt-4;

          .n-button {
            @apply text-green-500 hover:text-green-600;
          }
        }
      }
    }
  }
}

.loading-wrapper {
  @apply flex justify-center items-center py-20;
}

.no-more-tip {
  @apply text-center py-4 text-sm;
  @apply text-gray-500 dark:text-gray-400;
}

.mobile {
  .favorite-page {
    @apply p-4;

    .favorite-header {
      @apply mb-4;

      h2 {
        @apply text-xl;
      }
    }
  }
}
</style>

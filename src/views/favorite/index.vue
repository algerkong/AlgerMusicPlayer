<template>
  <div v-if="isComponent ? favoriteSongs.length : true" class="favorite-page">
    <div class="favorite-header" :class="setAnimationClass('animate__fadeInRight')">
      <h2>我的收藏</h2>
      <div class="favorite-count">共 {{ favoriteList.length }} 首</div>
    </div>
    <div class="favorite-main" :class="setAnimationClass('animate__bounceInRight')">
      <n-scrollbar class="favorite-content">
        <div v-if="favoriteList.length === 0" class="empty-tip">
          <n-empty description="还没有收藏歌曲" />
        </div>
        <div v-else class="favorite-list">
          <div v-if="loading" class="loading-wrapper">
            <n-spin size="large" />
          </div>
          <template v-else>
            <song-item
              v-for="(song, index) in favoriteSongs"
              :key="song.id"
              :item="song"
              :favorite="!isComponent"
              :class="setAnimationClass('animate__bounceInUp')"
              :style="getItemAnimationDelay(index)"
              @play="handlePlay"
            />
          </template>

          <div v-if="isComponent" class="favorite-list-more text-center">
            <n-button text type="primary" @click="handleMore">查看更多</n-button>
          </div>
        </div>
      </n-scrollbar>
      <div v-if="favoriteList.length > 0 && !loading && !isComponent" class="pagination-wrapper">
        <n-pagination
          v-model:page="currentPage"
          :page-size="pageSize"
          :item-count="favoriteList.length"
          :page-slot="5"
          size="small"
          @update:page="handlePageChange"
        />
      </div>
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

// 分页相关
const pageSize = 16;
const currentPage = ref(1);

defineProps({
  isComponent: {
    type: Boolean,
    default: false,
  },
});

// 获取当前页的收藏歌曲ID
const getCurrentPageIds = () => {
  // 反转列表顺序，最新收藏的在前面
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

  loading.value = true;
  try {
    const currentIds = getCurrentPageIds();
    const res = await getMusicDetail(currentIds);
    if (res.data.songs) {
      favoriteSongs.value = res.data.songs.map((song: SongResult) => {
        return {
          ...song,
          picUrl: song.al?.picUrl || '',
        };
      });
    }
  } catch (error) {
    console.error('获取收藏歌曲失败:', error);
  } finally {
    loading.value = false;
  }
};

// 处理页码变化
const handlePageChange = () => {
  getFavoriteSongs();
};

onMounted(() => {
  getFavoriteSongs();
});

// 监听收藏列表变化
watch(
  favoriteList,
  () => {
    currentPage.value = 1;
    getFavoriteSongs();
  },
  { deep: true, immediate: true },
);

const handlePlay = () => {
  store.commit('setPlayList', favoriteSongs.value);
};

const getItemAnimationDelay = (index: number) => {
  const currentPageIndex = index % pageSize;
  return setAnimationDelay(currentPageIndex, 30);
};

const router = useRouter();
const handleMore = () => {
  router.push('/favorite');
};
</script>

<style lang="scss" scoped>
.favorite-page {
  @apply h-full flex flex-col p-6;

  .favorite-header {
    @apply flex items-center justify-between mb-6 flex-shrink-0;

    h2 {
      @apply text-2xl font-bold;
    }

    .favorite-count {
      @apply text-gray-400 text-sm;
    }
  }

  .favorite-main {
    @apply flex flex-col flex-grow min-h-0;

    .favorite-content {
      @apply flex-grow min-h-0;

      .empty-tip {
        @apply h-full flex items-center justify-center;
      }

      .favorite-list {
        @apply space-y-2 pb-4;
      }
    }
  }
}

.loading-wrapper {
  @apply flex justify-center items-center py-20;
}

.pagination-wrapper {
  @apply flex justify-center py-4 flex-shrink-0;

  :deep(.n-pagination) {
    @apply bg-gray-800 rounded-full px-4 py-1;

    .n-pagination-item {
      @apply text-gray-300 hover:text-white;

      &--active {
        @apply text-green-500;
      }
    }
  }
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

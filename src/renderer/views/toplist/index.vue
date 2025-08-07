<template>
  <div class="toplist-page">
    <n-scrollbar class="toplist-container" style="height: 100%" :size="100">
      <div v-loading="loading" class="toplist-list">
        <div
          v-for="(item, index) in topList"
          :key="item.id"
          class="toplist-item"
          :class="setAnimationClass('animate__bounceIn')"
          :style="getItemAnimationDelay(index)"
          @click.stop="openToplist(item)"
        >
          <div class="toplist-item-img">
            <n-image
              class="toplist-item-img-img"
              :src="getImgUrl(item.coverImgUrl, '300y300')"
              width="200"
              height="200"
              lazy
              preview-disabled
            />
            <div class="top">
              <div class="play-count">{{ formatNumber(item.playCount) }}</div>
              <i class="iconfont icon-videofill"></i>
            </div>
          </div>
          <div class="toplist-item-title">{{ item.name }}</div>
          <div class="toplist-item-desc">{{ item.updateFrequency || '' }}</div>
        </div>
      </div>
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-more">
        <n-spin size="small" />
        <span class="ml-2">加载中...</span>
      </div>
    </n-scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';

import { getListDetail, getToplist } from '@/api/list';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import type { IListDetail } from '@/types/listDetail';
import { formatNumber, getImgUrl, setAnimationClass, setAnimationDelay } from '@/utils';

defineOptions({
  name: 'Toplist'
});

const topList = ref<any[]>([]);

// 计算每个项目的动画延迟
const getItemAnimationDelay = (index: number) => {
  return setAnimationDelay(index, 30);
};

const listDetail = ref<IListDetail | null>();
const listLoading = ref(true);

const router = useRouter();

const openToplist = (item: any) => {
  listLoading.value = true;

  getListDetail(item.id).then((res) => {
    listDetail.value = res.data;
    listLoading.value = false;

    navigateToMusicList(router, {
      id: item.id,
      type: 'playlist',
      name: item.name,
      songList: res.data.playlist.tracks || [],
      listInfo: res.data.playlist,
      canRemove: false
    });
  });
};

const loading = ref(false);
const loadToplist = async () => {
  loading.value = true;
  try {
    const { data } = await getToplist();
    topList.value = data.list || [];
  } catch (error) {
    console.error('加载排行榜列表失败:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadToplist();
});
</script>

<style lang="scss" scoped>
.toplist-page {
  @apply relative h-full w-full;
  @apply bg-light dark:bg-black;
}

.toplist-container {
  @apply p-4;
}

.toplist-list {
  @apply grid gap-x-8 gap-y-6 pb-28 pr-4;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.toplist-item {
  @apply flex flex-col;

  &-img {
    @apply rounded-xl overflow-hidden relative w-full aspect-square;

    &-img {
      @apply block w-full h-full;
    }

    img {
      @apply absolute top-0 left-0 w-full h-full object-cover rounded-xl;
    }

    &:hover img {
      @apply hover:scale-110 transition-all duration-300 ease-in-out;
    }

    .top {
      @apply absolute w-full h-full top-0 left-0 flex justify-center items-center transition-all duration-300 ease-in-out cursor-pointer;
      @apply bg-black bg-opacity-50;
      opacity: 0;

      i {
        @apply text-5xl text-white transition-all duration-500 ease-in-out opacity-0;
      }

      &:hover {
        @apply opacity-100;
      }

      &:hover i {
        @apply transform scale-150 opacity-100;
      }

      .play-count {
        @apply absolute top-2 left-2 text-sm text-white;
      }
    }
  }

  &-title {
    @apply mt-2 text-sm line-clamp-1 font-bold;
    @apply text-gray-900 dark:text-white;
  }

  &-desc {
    @apply mt-1 text-xs line-clamp-1;
    @apply text-gray-500 dark:text-gray-400;
  }
}

.loading-more {
  @apply flex justify-center items-center py-4;
  @apply text-gray-500 dark:text-gray-400;
}

.mobile {
  .toplist-list {
    @apply px-4 gap-4;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>

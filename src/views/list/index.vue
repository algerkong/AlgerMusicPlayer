<script lang="ts" setup>
import { useRoute } from 'vue-router';

import { getListByCat, getListDetail, getRecommendList } from '@/api/list';
import MusicList from '@/components/MusicList.vue';
import type { IRecommendItem } from '@/type/list';
import type { IListDetail } from '@/type/listDetail';
import { formatNumber, getImgUrl, setAnimationClass, setAnimationDelay } from '@/utils';

defineOptions({
  name: 'List',
});

const TOTAL_ITEMS = 42; // 每页数量

const recommendList = ref<any[]>([]);
const showMusic = ref(false);
const page = ref(0);
const hasMore = ref(true);
const isLoadingMore = ref(false);

// 计算每个项目的动画延迟
const getItemAnimationDelay = (index: number) => {
  return setAnimationDelay(index, 30);
};

const recommendItem = ref<IRecommendItem | null>();
const listDetail = ref<IListDetail | null>();
const listLoading = ref(true);

const selectRecommendItem = async (item: IRecommendItem) => {
  listLoading.value = true;
  recommendItem.value = null;
  listDetail.value = null;
  showMusic.value = true;
  recommendItem.value = item;
  const { data } = await getListDetail(item.id);
  listDetail.value = data;
  listLoading.value = false;
};

const route = useRoute();
const listTitle = ref(route.query.type || '歌单列表');

const loading = ref(false);
const loadList = async (type: string, isLoadMore = false) => {
  if (!hasMore.value && isLoadMore) return;
  if (isLoadMore) {
    isLoadingMore.value = true;
  } else {
    loading.value = true;
    page.value = 0;
    recommendList.value = [];
  }

  try {
    const params = {
      cat: type || '',
      limit: TOTAL_ITEMS,
      offset: page.value * TOTAL_ITEMS,
    };
    const { data } = await getListByCat(params);
    if (isLoadMore) {
      recommendList.value.push(...data.playlists);
    } else {
      recommendList.value = data.playlists;
    }
    hasMore.value = data.more;
    page.value++;
  } catch (error) {
    console.error('加载歌单列表失败:', error);
  } finally {
    loading.value = false;
    isLoadingMore.value = false;
  }
};

// 监听滚动事件
const handleScroll = (e: any) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  // 距离底部100px时加载更多
  if (scrollTop + clientHeight >= scrollHeight - 100 && !isLoadingMore.value && hasMore.value) {
    loadList(route.query.type as string, true);
  }
};

onMounted(() => {
  if (route.query.type) {
    loadList(route.query.type as string);
  } else {
    getRecommendList(TOTAL_ITEMS).then((res: { data: { result: any } }) => {
      recommendList.value = res.data.result;
    });
  }
});

watch(
  () => route.query,
  async (newParams) => {
    if (newParams.type) {
      recommendList.value = [];
      listTitle.value = newParams.type || '歌单列表';
      loadList(newParams.type as string);
    }
  },
);
</script>

<template>
  <div class="list-page">
    <div class="recommend-title" :class="setAnimationClass('animate__bounceInLeft')">{{ listTitle }}</div>
    <!-- 歌单列表 -->
    <n-scrollbar class="recommend" :size="100" @scroll="handleScroll">
      <div v-loading="loading" class="recommend-list">
        <div
          v-for="(item, index) in recommendList"
          :key="item.id"
          class="recommend-item"
          :class="setAnimationClass('animate__bounceIn')"
          :style="getItemAnimationDelay(index)"
          @click.stop="selectRecommendItem(item)"
        >
          <div class="recommend-item-img">
            <n-image
              class="recommend-item-img-img"
              :src="getImgUrl(item.picUrl || item.coverImgUrl, '200y200')"
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
          <div class="recommend-item-title">{{ item.name }}</div>
        </div>
      </div>
      <!-- 加载状态 -->
      <div v-if="isLoadingMore" class="loading-more">
        <n-spin size="small" />
        <span class="ml-2">加载中...</span>
      </div>
      <div v-if="!hasMore && recommendList.length > 0" class="no-more">没有更多了</div>
    </n-scrollbar>
    <music-list
      v-model:show="showMusic"
      v-model:loading="listLoading"
      :name="recommendItem?.name || ''"
      :song-list="listDetail?.playlist.tracks || []"
      :list-info="listDetail?.playlist"
    />
  </div>
</template>

<style lang="scss" scoped>
.list-page {
  @apply relative h-full w-full;
}

.recommend {
  @apply w-full h-full bg-none;
  &-title {
    @apply text-lg font-bold text-white pb-2;
  }

  &-list {
    @apply grid gap-x-8 gap-y-6 pb-28 pr-4;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  &-item {
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
        background-color: #00000088;
        opacity: 0;
        i {
          font-size: 50px;
          transition: all 0.5s ease-in-out;
          opacity: 0;
        }
        &:hover {
          @apply opacity-100;
        }
        &:hover i {
          @apply transform scale-150 opacity-100;
        }

        .play-count {
          @apply absolute top-2 left-2 text-sm;
        }
      }
    }
    &-title {
      @apply p-2 text-sm text-white truncate;
    }
  }
}

.loading-more {
  @apply flex items-center justify-center py-4 text-sm text-gray-400;
}

.no-more {
  @apply text-center py-4 text-sm text-gray-500;
}

.mobile {
  .recommend-title {
    @apply text-xl font-bold px-4;
  }

  .recommend-list {
    @apply px-4 gap-4;
  }
}
</style>

<template>
  <n-drawer
    :show="show"
    :height="isMobile ? '100%' : '80%'"
    placement="bottom"
    block-scroll
    mask-closable
    :style="{ backgroundColor: 'transparent' }"
    :to="`#layout-main`"
    :z-index="9998"
    @mask-click="close"
  >
    <div class="music-page">
      <div class="music-header h-12 flex items-center justify-between">
        <n-ellipsis :line-clamp="1">
          <div class="music-title">
            {{ name }}
          </div>
        </n-ellipsis>
        <div class="music-close">
          <i class="icon iconfont ri-close-line" @click="close"></i>
        </div>
      </div>
      <div class="music-content">
        <!-- 左侧歌单信息 -->
        <div class="music-info">
          <div class="music-cover">
            <n-image
              :src="getImgUrl(cover ? listInfo?.coverImgUrl : displayedSongs[0]?.picUrl, '500y500')"
              class="cover-img"
              preview-disabled
              :class="setAnimationClass('animate__fadeIn')"
              object-fit="cover"
            />
          </div>
          <div v-if="listInfo?.creator" class="creator-info">
            <n-avatar round :size="24" :src="getImgUrl(listInfo.creator.avatarUrl, '50y50')" />
            <span class="creator-name">{{ listInfo.creator.nickname }}</span>
          </div>

          <n-scrollbar style="max-height: 200">
            <div v-if="listInfo?.description" class="music-desc">
              {{ listInfo.description }}
            </div>
            <play-bottom />
          </n-scrollbar>
        </div>

        <!-- 右侧歌曲列表 -->
        <div class="music-list-container">
          <div class="music-list">
            <n-scrollbar @scroll="handleScroll">
              <n-spin :show="loadingList || loading">
                <div class="music-list-content">
                  <div
                    v-for="(item, index) in displayedSongs"
                    :key="item.id"
                    class="double-item"
                    :class="setAnimationClass('animate__bounceInUp')"
                    :style="getItemAnimationDelay(index)"
                  >
                    <song-item :item="formatDetail(item)" @play="handlePlay" />
                  </div>
                  <div v-if="isLoadingMore" class="loading-more">加载更多...</div>
                  <play-bottom />
                </div>
              </n-spin>
            </n-scrollbar>
          </div>
          <play-bottom />
        </div>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { useStore } from 'vuex';

import { getMusicDetail } from '@/api/music';
import SongItem from '@/components/common/SongItem.vue';
import { getImgUrl, isMobile, setAnimationClass, setAnimationDelay } from '@/utils';

import PlayBottom from './common/PlayBottom.vue';

const store = useStore();

const props = withDefaults(
  defineProps<{
    show: boolean;
    name: string;
    songList: any[];
    loading?: boolean;
    listInfo?: {
      trackIds: { id: number }[];
      [key: string]: any;
    };
    cover?: boolean;
  }>(),
  {
    loading: false,
    cover: true
  }
);

const emit = defineEmits(['update:show', 'update:loading']);

const page = ref(0);
const pageSize = 20;
const isLoadingMore = ref(false);
const displayedSongs = ref<any[]>([]);
const loadingList = ref(false);

// 计算总数
const total = computed(() => {
  if (props.listInfo?.trackIds) {
    return props.listInfo.trackIds.length;
  }
  return props.songList.length;
});

const formatDetail = computed(() => (detail: any) => {
  const song = {
    artists: detail.ar,
    name: detail.al.name,
    id: detail.al.id
  };

  detail.song = song;
  detail.picUrl = detail.al.picUrl;
  return detail;
});

const handlePlay = () => {
  const tracks = props.songList || [];
  store.commit(
    'setPlayList',
    tracks.map((item) => ({
      ...item,
      picUrl: item.al.picUrl,
      song: {
        artists: item.ar
      }
    }))
  );
};

const close = () => {
  emit('update:show', false);
};

// 优化加载更多歌曲的函数
const loadMoreSongs = async () => {
  if (isLoadingMore.value || displayedSongs.value.length >= total.value) return;

  isLoadingMore.value = true;
  try {
    if (props.listInfo?.trackIds) {
      // 如果有 trackIds，需要分批请求歌曲详情
      const start = page.value * pageSize;
      const end = Math.min((page.value + 1) * pageSize, total.value);
      const trackIds = props.listInfo.trackIds.slice(start, end).map((item) => item.id);

      if (trackIds.length > 0) {
        const { data } = await getMusicDetail(trackIds);
        displayedSongs.value = [...displayedSongs.value, ...data.songs];
        page.value++;
      }
    } else {
      // 如果没有 trackIds，直接使用 songList 分页
      const start = page.value * pageSize;
      const end = Math.min((page.value + 1) * pageSize, props.songList.length);
      const newSongs = props.songList.slice(start, end);
      displayedSongs.value = [...displayedSongs.value, ...newSongs];
      page.value++;
    }
  } catch (error) {
    console.error('加载歌曲失败:', error);
  } finally {
    isLoadingMore.value = false;
    loadingList.value = false;
  }
};

const getItemAnimationDelay = (index: number) => {
  const currentPageIndex = index % pageSize;
  return setAnimationDelay(currentPageIndex, 20);
};

// 修改滚动处理函数
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  if (!target) return;

  const { scrollTop, scrollHeight, clientHeight } = target;
  if (scrollHeight - scrollTop - clientHeight < 100 && !isLoadingMore.value) {
    loadMoreSongs();
  }
};

watch(
  () => props.show,
  (newVal) => {
    loadingList.value = newVal;
    if (!props.cover) {
      loadingList.value = false;
    }
  }
);

// 监听 songList 变化，重置分页状态
watch(
  () => props.songList,
  (newSongs) => {
    page.value = 0;
    displayedSongs.value = newSongs.slice(0, pageSize);
    if (newSongs.length > pageSize) {
      page.value = 1;
    }
    loadingList.value = false;
  },
  { immediate: true }
);
</script>

<style scoped lang="scss">
.music {
  &-title {
    @apply text-xl font-bold text-gray-900 dark:text-white;
  }

  &-page {
    @apply px-8 w-full h-full bg-light dark:bg-black bg-opacity-75 dark:bg-opacity-75 rounded-t-2xl;
    backdrop-filter: blur(20px);
  }

  &-close {
    @apply cursor-pointer text-gray-500 dark:text-white hover:text-gray-900 dark:hover:text-gray-300 flex gap-2 items-center transition;
    .icon {
      @apply text-3xl;
    }
  }

  &-content {
    @apply flex h-[calc(100%-60px)];
  }

  &-info {
    @apply w-[25%] flex-shrink-0 pr-8 flex flex-col;

    .music-cover {
      @apply w-full aspect-square rounded-2xl overflow-hidden mb-4 min-h-[250px];
      .cover-img {
        @apply w-full h-full object-cover;
      }
    }

    .creator-info {
      @apply flex items-center mb-4;
      .creator-name {
        @apply ml-2 text-gray-700 dark:text-gray-300;
      }
    }

    .music-desc {
      @apply text-sm text-gray-600 dark:text-gray-400 leading-relaxed pr-4;
    }
  }

  &-list {
    @apply flex-grow min-h-0;
    &-container {
      @apply flex-grow min-h-0 flex flex-col relative;
    }

    &-content {
      @apply min-h-[calc(80vh-60px)];
    }

    :deep(.n-virtual-list__scroll) {
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
    }
  }
}

.mobile {
  .music-page {
    @apply px-4;
  }

  .music-content {
    @apply flex-col;
  }

  .music-info {
    @apply w-full pr-0 mb-2 flex flex-row;

    .music-cover {
      @apply w-[100px] h-[100px] rounded-lg overflow-hidden mb-4;
    }
    .music-detail {
      @apply flex-1 ml-4;
    }
  }
}

.loading-more {
  @apply text-center py-4 text-gray-500 dark:text-gray-400;
}

.double-item {
  @apply mb-2 bg-light-100 bg-opacity-20 dark:bg-dark-100 dark:bg-opacity-20 rounded-3xl;
}

.mobile {
  .music-info {
    @apply hidden;
  }
  .music-list-content {
    @apply pb-[100px];
  }
}
</style>

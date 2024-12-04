<template>
  <n-drawer
    :show="show"
    :height="isMobile ? '100vh' : '70vh'"
    placement="bottom"
    block-scroll
    mask-closable
    :style="{ backgroundColor: 'transparent' }"
    @mask-click="close"
  >
    <div class="music-page">
      <div class="music-close">
        <i class="icon iconfont icon-icon_error" @click="close"></i>
      </div>
      <div class="music-title text-el">{{ name }}</div>
      <!-- 歌单歌曲列表 -->
      <div v-loading="loading" class="music-list">
        <n-virtual-list
          v-if="displayedSongs.length"
          ref="virtualListRef"
          :items="displayedSongs"
          :item-size="60"
          :keep-alive="true"
          :min-size="5"
          :style="{ height: listHeight }"
          @scroll="handleScroll"
        >
          <template #default="{ item }">
            <song-item :item="formatDetail(item)" @play="handlePlay" />
          </template>
        </n-virtual-list>
        <div v-else-if="loading" class="loading-more">加载中...</div>
        <play-bottom />
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
// 导入 NVirtualListInst 类型
import type { VirtualListInst } from 'naive-ui';
import { useStore } from 'vuex';

import { getMusicDetail } from '@/api/music';
import SongItem from '@/components/common/SongItem.vue';
import { isMobile } from '@/utils';

import PlayBottom from './common/PlayBottom.vue';

const store = useStore();

const props = defineProps<{
  show: boolean;
  name: string;
  songList: any[];
  loading?: boolean;
  listInfo?: {
    trackIds: { id: number }[];
    [key: string]: any;
  };
}>();
const emit = defineEmits(['update:show', 'update:loading']);

const page = ref(0);
const pageSize = 20;
const isLoadingMore = ref(false);
const displayedSongs = ref<any[]>([]);

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
    id: detail.al.id,
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
        artists: item.ar,
      },
    })),
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
  }
};

// 添加虚拟列表的引用
const virtualListRef = ref<VirtualListInst | null>(null);

// 修改滚动处理函数
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  if (!target) return;

  const { scrollTop, scrollHeight, clientHeight } = target;
  if (scrollHeight - scrollTop - clientHeight < 100 && !isLoadingMore.value) {
    loadMoreSongs();
  }
};

// 监听 songList 变化，重置分页状态
watch(
  () => props.songList,
  (newSongs) => {
    page.value = 0;
    displayedSongs.value = newSongs.slice(0, pageSize);
    if (newSongs.length > pageSize) {
      page.value = 1;
    }
  },
  { immediate: true },
);

// 添加计算属性来处理列表高度
const listHeight = computed(() => {
  const baseHeight = '100%'; // 减去标题高度
  return store.state.isPlay ? `calc(100% - 90px)` : baseHeight; // 112px 是 PlayBottom 的高度
});
</script>

<style scoped lang="scss">
.music {
  &-page {
    @apply px-8 w-full h-full bg-black bg-opacity-75 rounded-t-2xl;
    backdrop-filter: blur(20px);
  }

  &-title {
    @apply text-lg font-bold text-white p-4;
  }

  &-close {
    @apply absolute top-4 right-8 cursor-pointer text-white flex gap-2 items-center;
    .icon {
      @apply text-3xl;
    }
  }

  &-list {
    height: calc(100% - 60px);
    position: relative; // 添加相对定位

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
}

.loading-more {
  @apply text-center text-white py-10;
}

.double-list {
  .double-item {
    width: 100%;
  }

  .song-item {
    background-color: #191919;
  }
}

// 确保 PlayBottom 不会影响滚动区域
:deep(.bottom) {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}
</style>

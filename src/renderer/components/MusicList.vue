<template>
  <n-drawer
    :show="show"
    :height="isMobile ? '100%' : '80%'"
    placement="bottom"
    block-scroll
    mask-closable
    :style="{ backgroundColor: 'transparent' }"
    :to="`#layout-main`"
    :z-index="zIndex"
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
          <div v-if="total" class="music-total">{{ t('player.songNum', { num: total }) }}</div>

          <n-scrollbar style="max-height: 200px">
            <div v-if="listInfo?.description" class="music-desc">
              {{ listInfo.description }}
            </div>
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
                    <song-item
                      :item="formatSong(item)"
                      :can-remove="canRemove"
                      @play="handlePlay"
                      @remove-song="(id) => emit('remove-song', id)"
                    />
                  </div>
                  <div v-if="isLoadingMore" class="loading-more">
                    {{ t('common.loadingMore') }}
                  </div>
                  <div v-if="!hasMore" class="loading-more">
                    {{ t('common.noMore') }}
                  </div>
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
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { getMusicDetail } from '@/api/music';
import SongItem from '@/components/common/SongItem.vue';
import { usePlayerStore } from '@/store/modules/player';
import { getImgUrl, isMobile, setAnimationClass, setAnimationDelay } from '@/utils';

import PlayBottom from './common/PlayBottom.vue';

const { t } = useI18n();
const playerStore = usePlayerStore();

const props = withDefaults(
  defineProps<{
    show: boolean;
    name: string;
    zIndex?: number;
    songList: any[];
    loading?: boolean;
    listInfo?: {
      trackIds: { id: number }[];
      [key: string]: any;
    };
    cover?: boolean;
    canRemove?: boolean;
  }>(),
  {
    loading: false,
    cover: true,
    zIndex: 9996,
    canRemove: false
  }
);

const emit = defineEmits(['update:show', 'update:loading', 'remove-song']);

const page = ref(0);
const pageSize = 40;
const isLoadingMore = ref(false);
const displayedSongs = ref<any[]>([]);
const loadingList = ref(false);
const loadedIds = ref(new Set<number>()); // 用于追踪已加载的歌曲ID
const isPlaylistLoading = ref(false); // 标记是否正在加载播放列表
const completePlaylist = ref<any[]>([]); // 存储完整的播放列表
const hasMore = ref(true); // 标记是否还有更多数据可加载

// 计算总数
const total = computed(() => {
  if (props.listInfo?.trackIds) {
    return props.listInfo.trackIds.length;
  }
  return props.songList.length;
});

// 格式化歌曲数据
const formatSong = (item: any) => {
  return {
    ...item,
    picUrl: item.al?.picUrl || item.picUrl,
    song: {
      artists: item.ar || item.artists,
      name: item.al?.name || item.name,
      id: item.al?.id || item.id
    }
  };
};

/**
 * 加载歌曲数据的核心函数
 * @param ids 要加载的歌曲ID数组
 * @param appendToList 是否将加载的歌曲追加到现有列表
 * @param updateComplete 是否更新完整播放列表
 */
const loadSongs = async (ids: number[], appendToList = true, updateComplete = false) => {
  if (ids.length === 0) return [];

  try {
    const { data } = await getMusicDetail(ids);
    if (data?.songs) {
      // 更新已加载ID集合
      const newSongs = data.songs.filter((song: any) => !loadedIds.value.has(song.id));

      newSongs.forEach((song: any) => {
        loadedIds.value.add(song.id);
      });

      if (appendToList) {
        displayedSongs.value.push(...newSongs);
      }

      if (updateComplete) {
        completePlaylist.value.push(...newSongs);
      }

      return newSongs;
    }
  } catch (error) {
    console.error('加载歌曲失败:', error);
  }

  return [];
};

// 加载完整播放列表
const loadFullPlaylist = async () => {
  if (isPlaylistLoading.value) return;
  isPlaylistLoading.value = true;
  completePlaylist.value = [...displayedSongs.value]; // 先用当前已加载的歌曲初始化

  try {
    // 如果没有trackIds，直接使用当前歌曲列表
    if (!props.listInfo?.trackIds) {
      return;
    }

    // 获取所有未加载的歌曲ID
    const allIds = props.listInfo.trackIds.map((item) => item.id);
    const unloadedIds = allIds.filter((id) => !loadedIds.value.has(id));

    // 如果所有歌曲都已加载，直接返回
    if (unloadedIds.length === 0) {
      return;
    }

    // 分批加载未加载的歌曲
    const batchSize = 500; // 每批加载的歌曲数量
    for (let i = 0; i < unloadedIds.length; i += batchSize) {
      const batchIds = unloadedIds.slice(i, i + batchSize);
      if (batchIds.length === 0) continue;

      await loadSongs(batchIds, false, true);

      // 添加小延迟避免请求过于密集
      if (i + batchSize < unloadedIds.length) {
        // 使用 setTimeout 直接延迟，避免 Promise 相关的 linter 错误
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 300);
        });
      }
    }
  } catch (error) {
    console.error('加载完整播放列表失败:', error);
  } finally {
    isPlaylistLoading.value = false;
  }
};

// 处理播放
const handlePlay = async () => {
  // 先使用当前已加载的歌曲开始播放
  playerStore.setPlayList(displayedSongs.value.map(formatSong));

  // 在后台加载完整播放列表
  loadFullPlaylist().then(() => {
    // 加载完成后，更新播放列表为完整列表
    if (completePlaylist.value.length > 0) {
      playerStore.setPlayList(completePlaylist.value.map(formatSong));
    }
  });
};

const close = () => {
  emit('update:show', false);
};

// 加载更多歌曲
const loadMoreSongs = async () => {
  // 检查是否正在加载或已经加载完成
  if (isLoadingMore.value || displayedSongs.value.length >= total.value) {
    hasMore.value = false;
    return;
  }

  isLoadingMore.value = true;
  try {
    const start = displayedSongs.value.length;
    const end = Math.min(start + pageSize, total.value);

    if (props.listInfo?.trackIds) {
      // 获取这一批次需要加载的所有ID
      const trackIdsToLoad = props.listInfo.trackIds
        .slice(start, end)
        .map((item) => item.id)
        .filter((id) => !loadedIds.value.has(id));

      if (trackIdsToLoad.length > 0) {
        await loadSongs(trackIdsToLoad, true, false);
      }
    } else if (start < props.songList.length) {
      // 直接使用 songList 分页
      const newSongs = props.songList.slice(start, end);
      newSongs.forEach((song) => {
        if (!loadedIds.value.has(song.id)) {
          loadedIds.value.add(song.id);
          displayedSongs.value.push(song);
        }
      });
    }

    // 更新是否还有更多数据的状态
    hasMore.value = displayedSongs.value.length < total.value;
  } catch (error) {
    console.error('加载更多歌曲失败:', error);
  } finally {
    isLoadingMore.value = false;
    loadingList.value = false;
  }
};

// 修改滚动处理函数
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  if (!target) return;

  const { scrollTop, scrollHeight, clientHeight } = target;
  const threshold = 200;

  if (
    scrollHeight - scrollTop - clientHeight < threshold &&
    !isLoadingMore.value &&
    hasMore.value
  ) {
    loadMoreSongs();
  }
};

const getItemAnimationDelay = (index: number) => {
  const currentPageIndex = index % pageSize;
  return setAnimationDelay(currentPageIndex, 20);
};

// 重置列表状态
const resetListState = () => {
  page.value = 0;
  loadedIds.value.clear();
  displayedSongs.value = [];
  completePlaylist.value = [];
  hasMore.value = true;
  loadingList.value = false;
};

// 初始化歌曲列表
const initSongList = (songs: any[]) => {
  if (songs.length > 0) {
    displayedSongs.value = [...songs];
    songs.forEach((song) => loadedIds.value.add(song.id));
    page.value = Math.ceil(songs.length / pageSize);
  }

  // 检查是否还有更多数据可加载
  hasMore.value = displayedSongs.value.length < total.value;
};

// 修改 songList 监听器
watch(
  () => props.songList,
  (newSongs) => {
    // 重置所有状态
    resetListState();

    // 初始化歌曲列表
    initSongList(newSongs);

    // 如果还有更多歌曲需要加载，且差距较小，立即加载
    if (hasMore.value && props.listInfo?.trackIds) {
      setTimeout(() => {
        loadMoreSongs();
      }, 300);
    }
  },
  { immediate: true }
);

// 组件卸载时清理状态
onUnmounted(() => {
  isPlaylistLoading.value = false;
});
</script>

<style scoped lang="scss">
.music {
  &-title {
    @apply text-xl font-bold text-gray-900 dark:text-white;
  }

  &-total {
    @apply text-sm font-normal text-gray-500 dark:text-gray-400;
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
    width: 100vw !important;
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

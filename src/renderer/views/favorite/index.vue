<template>
  <div v-if="isComponent ? favoriteSongs.length : true" class="favorite-page">
    <div class="favorite-header" :class="setAnimationClass('animate__fadeInLeft')">
      <div class="favorite-header-left">
        <h2>我的收藏</h2>
        <div class="favorite-count">共 {{ favoriteList.length }} 首</div>
      </div>
      <div v-if="!isComponent && isElectron" class="favorite-header-right">
        <n-button
          v-if="!isSelecting"
          secondary
          type="primary"
          size="small"
          class="select-btn"
          @click="startSelect"
        >
          <template #icon>
            <i class="iconfont ri-checkbox-multiple-line"></i>
          </template>
          批量下载
        </n-button>
        <div v-else class="select-controls">
          <n-checkbox
            class="select-all-checkbox"
            :checked="isAllSelected"
            :indeterminate="isIndeterminate"
            @update:checked="handleSelectAll"
          >
            全选
          </n-checkbox>
          <n-button-group class="operation-btns">
            <n-button
              type="primary"
              size="small"
              :loading="isDownloading"
              :disabled="selectedSongs.length === 0"
              class="download-btn"
              @click="handleBatchDownload"
            >
              <template #icon>
                <i class="iconfont ri-download-line"></i>
              </template>
              下载 ({{ selectedSongs.length }})
            </n-button>
            <n-button size="small" class="cancel-btn" @click="cancelSelect"> 取消 </n-button>
          </n-button-group>
        </div>
      </div>
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
            :selectable="isSelecting"
            :selected="selectedSongs.includes(song.id)"
            @play="handlePlay"
            @select="handleSelect"
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
import { cloneDeep } from 'lodash';
import { useMessage } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';

import { getMusicDetail } from '@/api/music';
import SongItem from '@/components/common/SongItem.vue';
import { getSongUrl } from '@/hooks/MusicListHook';
import type { SongResult } from '@/type/music';
import { isElectron, setAnimationClass, setAnimationDelay } from '@/utils';

const store = useStore();
const message = useMessage();
const favoriteList = computed(() => store.state.favoriteList);
const favoriteSongs = ref<SongResult[]>([]);
const loading = ref(false);
const noMore = ref(false);
const scrollbarRef = ref();

// 多选相关
const isSelecting = ref(false);
const selectedSongs = ref<number[]>([]);
const isDownloading = ref(false);

// 开始多选
const startSelect = () => {
  isSelecting.value = true;
  selectedSongs.value = [];
};

// 取消多选
const cancelSelect = () => {
  isSelecting.value = false;
  selectedSongs.value = [];
};

// 处理选择
const handleSelect = (songId: number, selected: boolean) => {
  if (selected) {
    selectedSongs.value.push(songId);
  } else {
    selectedSongs.value = selectedSongs.value.filter((id) => id !== songId);
  }
};

// 批量下载
const handleBatchDownload = async () => {
  if (isDownloading.value) {
    message.warning('正在下载中，请稍候...');
    return;
  }

  if (selectedSongs.value.length === 0) {
    message.warning('请先选择要下载的歌曲');
    return;
  }

  try {
    isDownloading.value = true;
    message.success('开始下载...');

    // 移除旧的监听器
    window.electron.ipcRenderer.removeAllListeners('music-download-complete');

    let successCount = 0;
    let failCount = 0;

    // 添加新的监听器
    window.electron.ipcRenderer.on('music-download-complete', (_, result) => {
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      // 当所有下载完成时
      if (successCount + failCount === selectedSongs.value.length) {
        isDownloading.value = false;
        message.success(`下载完成`);
        cancelSelect();
      }
    });

    // 获取选中歌曲的信息
    const selectedSongsList = selectedSongs.value
      .map((songId) => favoriteSongs.value.find((s) => s.id === songId))
      .filter((song) => song) as SongResult[];

    // 并行获取所有歌曲的下载链接
    const downloadUrls = await Promise.all(
      selectedSongsList.map(async (song) => {
        try {
          const data = (await getSongUrl(song.id, song, true)) as any;
          return { song, ...data };
        } catch (error) {
          console.error(`获取歌曲 ${song.name} 下载链接失败:`, error);
          return { song, url: null };
        }
      })
    );

    // 开始下载有效的链接
    downloadUrls.forEach(({ song, url, type }) => {
      if (!url) {
        failCount++;
        return;
      }

      window.electron.ipcRenderer.send('download-music', {
        url,
        filename: `${song.name} - ${(song.ar || song.song?.artists)?.map((a) => a.name).join(',')}`,
        songInfo: cloneDeep(song),
        type
      });
    });
  } catch (error) {
    console.error('下载失败:', error);
    isDownloading.value = false;
    message.destroyAll();
    message.error('下载失败');
  }
};

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
  const startIndex = (currentPage.value - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return favoriteList.value.slice(startIndex, endIndex);
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
  store.dispatch('initializeFavoriteList');
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
  router.push('/history');
};

// 全选相关
const isAllSelected = computed(() => {
  return (
    favoriteSongs.value.length > 0 && selectedSongs.value.length === favoriteSongs.value.length
  );
});

const isIndeterminate = computed(() => {
  return selectedSongs.value.length > 0 && selectedSongs.value.length < favoriteSongs.value.length;
});

// 处理全选/取消全选
const handleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedSongs.value = favoriteSongs.value.map((song) => song.id);
  } else {
    selectedSongs.value = [];
  }
};
</script>

<style lang="scss" scoped>
.favorite-page {
  @apply h-full flex flex-col pt-2;
  @apply bg-light dark:bg-black;

  .favorite-header {
    @apply flex items-center justify-between flex-shrink-0 px-4 pb-2;

    &-left {
      @apply flex items-center gap-4;

      h2 {
        @apply text-xl font-bold;
        @apply text-gray-900 dark:text-white;
      }

      .favorite-count {
        @apply text-gray-500 dark:text-gray-400 text-sm;
      }
    }

    &-right {
      @apply flex items-center;

      .select-btn {
        @apply rounded-full px-4 h-8;
        @apply transition-all duration-300 ease-in-out;
        @apply hover:bg-primary hover:text-white;
        @apply dark:border-gray-600;

        .iconfont {
          @apply mr-1 text-lg;
        }
      }

      .select-controls {
        @apply flex items-center gap-3;
        @apply bg-gray-50 dark:bg-gray-800;
        @apply rounded-full px-3 py-1;
        @apply border border-gray-200 dark:border-gray-700;
        @apply transition-all duration-300;

        .select-all-checkbox {
          @apply text-sm text-gray-900 dark:text-gray-200;
        }

        .operation-btns {
          @apply flex items-center gap-2 ml-2;

          .download-btn {
            @apply rounded-full px-4 h-7;
            @apply bg-primary text-white;
            @apply hover:bg-primary-dark;
            @apply disabled:opacity-50 disabled:cursor-not-allowed;

            .iconfont {
              @apply mr-1 text-lg;
            }
          }

          .cancel-btn {
            @apply rounded-full px-4 h-7;
            @apply text-gray-600 dark:text-gray-300;
            @apply hover:bg-gray-100 dark:hover:bg-gray-700;
            @apply border-gray-300 dark:border-gray-600;
          }
        }
      }
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

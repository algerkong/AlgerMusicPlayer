<template>
  <div v-if="isComponent ? favoriteSongs.length : true" class="favorite-page">
    <div class="favorite-header" :class="setAnimationClass('animate__fadeInLeft')">
      <div class="favorite-header-left">
        <h2>{{ t('favorite.title') }}</h2>
        <div class="favorite-count">{{ t('favorite.count', { count: favoriteList.length }) }}</div>
      </div>
      <div v-if="!isComponent && isElectron" class="favorite-header-right">
        <div class="sort-controls" v-if="!isSelecting">
          <div class="sort-buttons">
            <div class="sort-button" :class="{ active: isDescending }" @click="toggleSort(true)">
              <i class="iconfont ri-sort-desc"></i>
              {{ t('favorite.descending') }}
            </div>
            <div class="sort-button" :class="{ active: !isDescending }" @click="toggleSort(false)">
              <i class="iconfont ri-sort-asc"></i>
              {{ t('favorite.ascending') }}
            </div>
          </div>
        </div>
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
          {{ t('favorite.batchDownload') }}
        </n-button>
        <div v-else class="select-controls">
          <n-checkbox
            class="select-all-checkbox"
            :checked="isAllSelected"
            :indeterminate="isIndeterminate"
            @update:checked="handleSelectAll"
          >
            {{ t('common.selectAll') }}
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
              {{ t('favorite.download', { count: selectedSongs.length }) }}
            </n-button>
            <n-button size="small" class="cancel-btn" @click="cancelSelect">
              {{ t('common.cancel') }}
            </n-button>
          </n-button-group>
        </div>
      </div>
    </div>
    <div class="favorite-main" :class="setAnimationClass('animate__bounceInRight')">
      <n-scrollbar ref="scrollbarRef" class="favorite-content" @scroll="handleScroll">
        <div v-if="favoriteList.length === 0" class="empty-tip">
          <n-empty :description="t('favorite.emptyTip')" />
        </div>
        <div v-else class="favorite-list" :class="{ 'max-w-[400px]': isComponent }">
          <song-item
            v-for="(song, index) in favoriteSongs"
            :key="song.id"
            :item="song"
            :favorite="false"
            class="favorite-list-item"
            :class="setAnimationClass('animate__bounceInLeft')"
            :style="getItemAnimationDelay(index)"
            :selectable="isSelecting"
            :selected="selectedSongs.includes(song.id as number)"
            @play="handlePlay"
            @select="handleSelect"
          />
          <div v-if="isComponent" class="favorite-list-more text-center">
            <n-button text type="primary" @click="handleMore">{{ t('common.viewMore') }}</n-button>
          </div>

          <div v-if="loading" class="loading-wrapper">
            <n-spin size="large" />
          </div>

          <div v-if="noMore" class="no-more-tip">{{ t('common.noMore') }}</div>
        </div>
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getBilibiliProxyUrl, getBilibiliVideoDetail } from '@/api/bilibili';
import { getMusicDetail } from '@/api/music';
import SongItem from '@/components/common/SongItem.vue';
import { useDownload } from '@/hooks/useDownload';
import { usePlayerStore } from '@/store';
import type { SongResult } from '@/types/music';
import { isElectron, setAnimationClass, setAnimationDelay } from '@/utils';

const { t } = useI18n();
const playerStore = usePlayerStore();
const favoriteList = computed(() => playerStore.favoriteList);
const favoriteSongs = ref<SongResult[]>([]);
const loading = ref(false);
const noMore = ref(false);
const scrollbarRef = ref();

// 多选相关
const isSelecting = ref(false);
const selectedSongs = ref<number[]>([]);
const { isDownloading, batchDownloadMusic } = useDownload();

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
  // 获取选中歌曲的信息
  const selectedSongsList = selectedSongs.value
    .map((songId) => favoriteSongs.value.find((s) => s.id === songId))
    .filter((song) => song) as SongResult[];

  // 使用hook中的批量下载功能
  await batchDownloadMusic(selectedSongsList);

  // 下载完成后取消选择
  cancelSelect();
};

// 排序相关
const isDescending = ref(true); // 默认倒序显示

// 切换排序方式
const toggleSort = (descending: boolean) => {
  if (isDescending.value === descending) return;
  isDescending.value = descending;
  currentPage.value = 1;
  favoriteSongs.value = [];
  noMore.value = false;
  getFavoriteSongs();
};

// 无限滚动相关
const pageSize = 100;
const currentPage = ref(1);

const props = defineProps({
  isComponent: {
    type: Boolean,
    default: false
  }
});

// 获取当前页的收藏歌曲ID
const getCurrentPageIds = () => {
  let ids = [...favoriteList.value]; // 复制一份以免修改原数组

  // 根据排序方式调整顺序
  if (isDescending.value) {
    ids = ids.reverse(); // 倒序，最新收藏的在前面
  }

  const startIndex = (currentPage.value - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  // 返回原始ID，不进行类型转换
  return ids.slice(startIndex, endIndex);
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

    // 分离网易云音乐ID和B站视频ID
    const musicIds = currentIds.filter((id) => typeof id === 'number') as number[];
    // B站ID可能是字符串格式（包含"--"）或特定数字ID，如113911642789603
    const bilibiliIds = currentIds.filter((id) => typeof id === 'string');

    // 处理网易云音乐数据
    let neteaseSongs: SongResult[] = [];
    if (musicIds.length > 0) {
      const res = await getMusicDetail(musicIds);
      if (res.data.songs) {
        neteaseSongs = res.data.songs.map((song: SongResult) => ({
          ...song,
          picUrl: song.al?.picUrl || '',
          source: 'netease'
        }));
      }
    }

    // 处理B站视频数据
    const bilibiliSongs: SongResult[] = [];
    for (const biliId of bilibiliIds) {
      const strBiliId = String(biliId);
      console.log(`处理B站ID: ${strBiliId}`);

      if (strBiliId.includes('--')) {
        // 从ID中提取B站视频信息 (bvid--pid--cid格式)
        try {
          const [bvid, pid, cid] = strBiliId.split('--');
          if (!bvid || !pid || !cid) {
            console.warn(`B站ID格式错误: ${strBiliId}, 正确格式应为 bvid--pid--cid`);
            continue;
          }

          const res = await getBilibiliVideoDetail(bvid);
          const videoDetail = res.data;

          // 找到对应的分P
          const page = videoDetail.pages.find((p) => p.cid === Number(cid));
          if (!page) {
            console.warn(`未找到对应的分P: cid=${cid}`);
            continue;
          }

          const songData = {
            id: strBiliId,
            name: `${page.part || ''} - ${videoDetail.title}`,
            picUrl: getBilibiliProxyUrl(videoDetail.pic),
            ar: [
              {
                name: videoDetail.owner.name,
                id: videoDetail.owner.mid
              }
            ],
            al: {
              name: videoDetail.title,
              picUrl: getBilibiliProxyUrl(videoDetail.pic)
            },
            source: 'bilibili',
            bilibiliData: {
              bvid,
              cid: Number(cid)
            }
          } as SongResult;

          bilibiliSongs.push(songData);
        } catch (error) {
          console.error(`获取B站视频详情失败 (${strBiliId}):`, error);
        }
      }
    }

    console.log('获取数据统计:', {
      neteaseSongs: neteaseSongs.length,
      bilibiliSongs: bilibiliSongs.length
    });

    // 合并数据，保持原有顺序
    const newSongs = currentIds
      .map((id) => {
        const strId = String(id);

        // 查找B站视频
        if (typeof id === 'string') {
          const found = bilibiliSongs.find((song) => String(song.id) === strId);
          if (found) return found;
        }

        // 查找网易云音乐
        const found = neteaseSongs.find((song) => String(song.id) === strId);
        return found;
      })
      .filter((song): song is SongResult => !!song);

    console.log(`最终歌曲列表: ${newSongs.length}首`);

    // 追加新数据而不是替换
    if (currentPage.value === 1) {
      favoriteSongs.value = newSongs;
    } else {
      favoriteSongs.value = [...favoriteSongs.value, ...newSongs];
    }

    // 判断是否还有更多数据
    noMore.value = favoriteSongs.value.length >= favoriteList.value.length;
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

const hasLoaded = ref(false);

onMounted(async () => {
  if (!hasLoaded.value) {
    await playerStore.initializeFavoriteList();
    await getFavoriteSongs();
    hasLoaded.value = true;
  }
});

// 监听收藏列表变化，变化时重置并重新加载
watch(
  favoriteList,
  async () => {
    hasLoaded.value = false;
    currentPage.value = 1;
    noMore.value = false;
    await getFavoriteSongs();
    hasLoaded.value = true;
  },
  { deep: true }
);

const handlePlay = () => {
  playerStore.setPlayList(favoriteSongs.value);
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
    selectedSongs.value = favoriteSongs.value.map((song) => song.id as number);
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
      @apply flex items-center gap-3;

      .sort-controls {
        @apply flex items-center;

        .sort-buttons {
          @apply flex items-center bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden;
          @apply border border-gray-200 dark:border-gray-700;

          .sort-button {
            @apply flex items-center py-1 px-3 text-sm cursor-pointer;
            @apply text-gray-600 dark:text-gray-400;
            @apply transition-all duration-300;

            &:first-child {
              @apply border-r border-gray-200 dark:border-gray-700;
            }

            .iconfont {
              @apply mr-1 text-base;
            }

            &.active {
              @apply bg-green-500 text-white dark:text-gray-100;
              @apply font-medium;
            }

            &:hover:not(.active) {
              @apply bg-gray-200 dark:bg-gray-700;
            }
          }
        }
      }

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
        &-item {
          @apply bg-light-100 dark:bg-dark-100 hover:bg-light-200 dark:hover:bg-dark-200 transition-all;
        }
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
    @apply p-4 m-0;

    .favorite-header {
      @apply mb-4;

      h2 {
        @apply text-xl;
      }
    }
  }
}
</style>

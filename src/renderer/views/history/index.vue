<template>
  <div class="history-page">
    <div class="title" :class="setAnimationClass('animate__fadeInRight')">
      {{ t('history.title') }}
    </div>
    <n-scrollbar ref="scrollbarRef" :size="100" @scroll="handleScroll">
      <div class="history-list-content" :class="setAnimationClass('animate__bounceInLeft')">
        <div
          v-for="(item, index) in displayList"
          :key="item.id"
          class="history-item"
          :class="setAnimationClass('animate__bounceInRight')"
          :style="setAnimationDelay(index, 30)"
        >
          <song-item class="history-item-content" :item="item" @play="handlePlay" />
          <div class="history-item-count min-w-[60px]">
            {{ t('history.playCount', { count: item.count }) }}
          </div>
          <div class="history-item-delete">
            <i class="iconfont icon-close" @click="handleDelMusic(item)"></i>
          </div>
        </div>

        <div v-if="loading" class="loading-wrapper">
          <n-spin size="large" />
        </div>

        <div v-if="noMore" class="no-more-tip">{{ t('common.noMore') }}</div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { getBilibiliProxyUrl, getBilibiliVideoDetail } from '@/api/bilibili';
import { getMusicDetail } from '@/api/music';
import SongItem from '@/components/common/SongItem.vue';
import { useMusicHistory } from '@/hooks/MusicHistoryHook';
import { usePlayerStore } from '@/store/modules/player';
import type { SongResult } from '@/types/music';
import { setAnimationClass, setAnimationDelay } from '@/utils';
const { t } = useI18n();
const { delMusic, musicList } = useMusicHistory();
const scrollbarRef = ref();
const loading = ref(false);
const noMore = ref(false);
const displayList = ref<SongResult[]>([]);
const playerStore = usePlayerStore();
const hasLoaded = ref(false);

// 无限滚动相关配置
const pageSize = 100;
const currentPage = ref(1);

// 获取当前页的音乐详情
const getHistorySongs = async () => {
  if (musicList.value.length === 0) {
    displayList.value = [];
    return;
  }

  loading.value = true;
  try {
    const startIndex = (currentPage.value - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageItems = musicList.value.slice(startIndex, endIndex);

    // 分离网易云音乐和B站视频
    const neteaseItems = currentPageItems.filter((item) => item.source !== 'bilibili');
    const bilibiliItems = currentPageItems.filter((item) => item.source === 'bilibili');

    // 处理网易云音乐
    let neteaseSongs: SongResult[] = [];
    if (neteaseItems.length > 0) {
      const currentIds = neteaseItems.map((item) => item.id as number);
      const res = await getMusicDetail(currentIds);
      if (res.data.songs) {
        neteaseSongs = res.data.songs.map((song: SongResult) => {
          const historyItem = neteaseItems.find((item) => item.id === song.id);
          return {
            ...song,
            picUrl: song.al?.picUrl || '',
            count: historyItem?.count || 0,
            source: 'netease'
          };
        });
      }
    }

    // 处理B站视频
    const bilibiliSongs: SongResult[] = [];
    for (const item of bilibiliItems) {
      try {
        const bvid = item.bilibiliData?.bvid;
        if (!bvid) continue;

        const res = await getBilibiliVideoDetail(bvid);
        const videoDetail = res.data;

        // 找到对应的分P
        const page = videoDetail.pages.find((p) => p.cid === item.bilibiliData?.cid);
        if (!page) continue;

        bilibiliSongs.push({
          id: `${bvid}--${page.page}--${page.cid}`,
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
          count: item.count || 0,
          bilibiliData: {
            bvid,
            cid: page.cid
          }
        } as SongResult);
      } catch (error) {
        console.error('获取B站视频详情失败:', error);
      }
    }

    // 合并两种来源的数据，并保持原有顺序
    const newSongs = currentPageItems
      .map((item) => {
        if (item.source === 'bilibili') {
          return bilibiliSongs.find(
            (song) =>
              song.bilibiliData?.bvid === item.bilibiliData?.bvid &&
              song.bilibiliData?.cid === item.bilibiliData?.cid
          );
        }
        return neteaseSongs.find((song) => song.id === item.id);
      })
      .filter((song): song is SongResult => !!song);

    if (currentPage.value === 1) {
      displayList.value = newSongs;
    } else {
      displayList.value = [...displayList.value, ...newSongs];
    }

    noMore.value = displayList.value.length >= musicList.value.length;
  } catch (error) {
    console.error(t('history.getHistoryFailed'), error);
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
    getHistorySongs();
  }
};

// 播放全部
const handlePlay = () => {
  playerStore.setPlayList(displayList.value);
};

onMounted(async () => {
  if (!hasLoaded.value) {
    await getHistorySongs();
    hasLoaded.value = true;
  }
});

// 监听历史列表变化，变化时重置并重新加载
watch(
  musicList,
  async () => {
    hasLoaded.value = false;
    currentPage.value = 1;
    noMore.value = false;
    await getHistorySongs();
    hasLoaded.value = true;
  },
  { deep: true }
);

// 重写删除方法，需要同时更新 displayList
const handleDelMusic = async (item: SongResult) => {
  delMusic(item);
  musicList.value = musicList.value.filter((music) => music.id !== item.id);
  displayList.value = displayList.value.filter((music) => music.id !== item.id);
};
</script>

<style scoped lang="scss">
.history-page {
  @apply h-full w-full pt-2;
  @apply bg-light dark:bg-black;

  .title {
    @apply pl-4 text-xl font-bold pb-2 px-4;
    @apply text-gray-900 dark:text-white;
  }

  .history-list-content {
    @apply mt-2 pb-28 px-4;
    .history-item {
      @apply flex items-center justify-between;
      &-content {
        @apply flex-1 bg-light-100 dark:bg-dark-100 hover:bg-light-200 dark:hover:bg-dark-200 transition-all;
      }
      &-count {
        @apply px-4 text-lg text-center;
        @apply text-gray-600 dark:text-gray-400;
      }
      &-delete {
        @apply cursor-pointer rounded-full border-2 w-8 h-8 flex justify-center items-center;
        @apply border-gray-400 dark:border-gray-600;
        @apply text-gray-600 dark:text-gray-400;
        @apply hover:border-red-500 hover:text-red-500;
      }
    }
  }
}

.loading-wrapper {
  @apply flex justify-center items-center py-8;
}

.no-more-tip {
  @apply text-center py-4 text-sm;
  @apply text-gray-500 dark:text-gray-400;
}
</style>

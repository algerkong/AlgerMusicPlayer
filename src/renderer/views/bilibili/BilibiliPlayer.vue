<template>
  <div class="bilibili-player-page">
    <n-scrollbar class="content-scrollbar">
      <div class="content-wrapper">
        <div v-if="isLoading" class="loading-wrapper">
          <n-spin size="large" />
          <p>听书加载中...</p>
        </div>

        <div v-else-if="errorMessage" class="error-wrapper">
          <i class="ri-error-warning-line text-4xl text-red-500"></i>
          <p>{{ errorMessage }}</p>
          <n-button type="primary" @click="loadVideoSource">重试</n-button>
        </div>

        <div v-else-if="videoDetail" class="bilibili-info-wrapper" :class="mainContentAnimation">
          <div class="bilibili-cover">
            <n-image
              :src="getBilibiliProxyUrl(videoDetail.pic)"
              class="cover-image"
              preview-disabled
            />
            <!-- 悬浮的播放按钮 -->
            <div class="play-overlay">
              <div class="play-icon-bg" @click="playCurrentAudio">
                <i class="ri-play-fill"></i>
              </div>
              <!-- 固定在右下角的大型播放按钮 -->
              <n-button
                type="primary"
                size="large"
                class="corner-play-button"
                :loading="partLoading"
                @click="playCurrentAudio"
              >
                <template #icon>
                  <i class="ri-play-fill"></i>
                </template>
                立即播放
              </n-button>
            </div>
          </div>

          <div class="video-info">
            <div class="title">{{ videoDetail?.title || '加载中...' }}</div>

            <div class="author">
              <i class="ri-user-line mr-1"></i>
              <span>{{ videoDetail.owner?.name }}</span>
            </div>
            <div class="stats">
              <span
                ><i class="ri-play-line mr-1"></i>{{ formatNumber(videoDetail.stat?.view) }}</span
              >
              <span
                ><i class="ri-chat-1-line mr-1"></i
                >{{ formatNumber(videoDetail.stat?.danmaku) }}</span
              >
              <span
                ><i class="ri-thumb-up-line mr-1"></i
                >{{ formatNumber(videoDetail.stat?.like) }}</span
              >
            </div>
            <div class="description">
              <p>{{ videoDetail.desc }}</p>
            </div>
            <div class="duration">
              <p>总时长: {{ formatTotalDuration(videoDetail.duration) }}</p>
            </div>
          </div>
        </div>

        <div
          v-if="videoDetail?.pages && videoDetail.pages.length > 1"
          class="video-parts"
          :class="partsListAnimation"
        >
          <div class="parts-title">
            分P列表 (共{{ videoDetail.pages.length }}集)
            <n-spin v-if="partLoading" size="small" class="ml-2" />
          </div>
          <div class="parts-list">
            <n-button
              v-for="page in videoDetail.pages"
              :key="page.cid"
              :type="isCurrentPlayingPage(page) ? 'primary' : 'default'"
              :disabled="partLoading"
              size="small"
              class="part-item"
              @click="switchPage(page)"
            >
              {{ page.part }}
            </n-button>
          </div>
        </div>

        <!-- 底部留白 -->
        <div class="pb-20"></div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getBilibiliPlayUrl, getBilibiliProxyUrl, getBilibiliVideoDetail } from '@/api/bilibili';
import { usePlayerStore } from '@/store/modules/player';
import type { IBilibiliPage, IBilibiliVideoDetail } from '@/types/bilibili';
import type { SongResult } from '@/types/music';
import { setAnimationClass } from '@/utils';

defineOptions({
  name: 'BilibiliPlayer'
});

// 使用路由获取参数
const route = useRoute();
const router = useRouter();
const message = useMessage();
const playerStore = usePlayerStore();

// 从路由参数获取bvid
const bvid = computed(() => route.params.bvid as string);

const isLoading = ref(true); // 初始加载状态
const partLoading = ref(false); // 分P加载状态，仅影响分P选择
const errorMessage = ref('');
const videoDetail = ref<IBilibiliVideoDetail | null>(null);
const currentPage = ref<IBilibiliPage | null>(null);
const audioList = ref<SongResult[]>([]);

// 只在初始加载时应用动画
const initialLoadDone = ref(false);
const mainContentAnimation = computed(() => {
  if (!initialLoadDone.value) {
    return setAnimationClass('animate__fadeInDown');
  }
  return '';
});

const partsListAnimation = computed(() => {
  if (!initialLoadDone.value) {
    return setAnimationClass('animate__fadeInUp');
  }
  return '';
});

// 监听bvid变化
watch(
  () => bvid.value,
  async (newBvid) => {
    if (newBvid) {
      // 新的视频ID，重置初始加载状态
      initialLoadDone.value = false;
      await loadVideoDetail(newBvid);
    }
  }
);

// 组件挂载时加载数据
onMounted(async () => {
  if (bvid.value) {
    await loadVideoDetail(bvid.value);
  } else {
    message.error('视频ID无效');
    router.back();
  }
});

const loadVideoDetail = async (bvid: string) => {
  if (!bvid) return;

  isLoading.value = true;
  errorMessage.value = '';
  audioList.value = [];

  try {
    console.log('加载B站视频详情:', bvid);
    const res = await getBilibiliVideoDetail(bvid);
    console.log('B站视频详情数据:', res.data);

    // 确保响应式数据更新
    videoDetail.value = JSON.parse(JSON.stringify(res.data));

    // 默认加载第一个分P
    if (videoDetail.value?.pages && videoDetail.value.pages.length > 0) {
      console.log('视频有多个分P，共', videoDetail.value.pages.length, '个');
      const [firstPage] = videoDetail.value.pages;
      currentPage.value = firstPage;
      await loadVideoSource();
    } else {
      console.log('视频无分P或分P数据为空');
      errorMessage.value = '无法加载视频分P信息';
    }
  } catch (error) {
    console.error('获取视频详情失败', error);
    errorMessage.value = '获取视频详情失败';
  } finally {
    isLoading.value = false;
    // 标记初始加载完成
    initialLoadDone.value = true;
  }
};

const loadVideoSource = async () => {
  if (!bvid.value || !currentPage.value?.cid) {
    console.error('缺少必要参数:', { bvid: bvid.value, cid: currentPage.value?.cid });
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    console.log('加载音频源:', bvid.value, currentPage.value.cid);

    // 将当前视频转换为音频格式加入播放列表
    const tempAudio = createSongFromBilibiliVideo(); // 创建一个临时对象，还没有URL

    // 加载当前分P的音频URL
    const currentAudio = await loadSongUrl(currentPage.value, tempAudio);

    // 将所有分P添加到播放列表
    if (videoDetail.value?.pages) {
      audioList.value = videoDetail.value.pages.map((page, index) => {
        // 第一个分P直接使用已获取的音频URL
        if (index === 0 && currentPage.value?.cid === page.cid) {
          return currentAudio;
        }

        // 其他分P创建占位对象，稍后按需加载
        return {
          id: `${bvid.value}--${page.page}--${page.cid}`, // 使用bvid--pid--cid作为唯一ID
          name: `${page.part || ''} - ${videoDetail.value!.title}`,
          picUrl: getBilibiliProxyUrl(videoDetail.value!.pic),
          type: 0,
          canDislike: false,
          alg: '',
          source: 'bilibili', // 设置来源为B站
          song: {
            name: `${page.part || ''} - ${videoDetail.value!.title}`,
            id: `${bvid.value}--${page.page}--${page.cid}`,
            ar: [
              {
                name: videoDetail.value!.owner.name,
                id: videoDetail.value!.owner.mid
              }
            ],
            al: {
              picUrl: getBilibiliProxyUrl(videoDetail.value!.pic)
            }
          } as any,
          bilibiliData: {
            bvid: bvid.value,
            cid: page.cid
          }
        } as SongResult;
      });
      console.log('已生成音频列表，共', audioList.value.length, '首');

      // 预加载下一集
      if (audioList.value.length > 1) {
        const nextIndex = 1; // 默认加载第二个分P
        const nextPage = videoDetail.value.pages[nextIndex];
        const nextAudio = audioList.value[nextIndex];
        loadSongUrl(nextPage, nextAudio).catch((e) => console.warn('预加载下一个分P失败:', e));
      }
    }
  } catch (error) {
    console.error('获取音频播放地址失败', error);
    errorMessage.value = '获取音频播放地址失败';
  } finally {
    isLoading.value = false;
  }
};

const createSongFromBilibiliVideo = (): SongResult => {
  if (!videoDetail.value || !currentPage.value) {
    throw new Error('视频详情未加载');
  }

  const pageName = currentPage.value.part || '';
  const title = `${pageName} - ${videoDetail.value.title}`;

  return {
    id: `${bvid.value}--${currentPage.value.page}--${currentPage.value.cid}`, // 使用bvid--pid--cid作为唯一ID
    name: title,
    picUrl: getBilibiliProxyUrl(videoDetail.value.pic),
    type: 0,
    canDislike: false,
    alg: '',
    // 设置来源为B站
    source: 'bilibili',
    // playMusicUrl属性稍后通过loadSongUrl函数添加
    song: {
      name: title,
      id: `${bvid.value}--${currentPage.value.page}--${currentPage.value.cid}`,
      ar: [
        {
          name: videoDetail.value.owner.name,
          id: videoDetail.value.owner.mid
        }
      ],
      al: {
        picUrl: getBilibiliProxyUrl(videoDetail.value.pic)
      }
    } as any,
    bilibiliData: {
      bvid: bvid.value,
      cid: currentPage.value.cid
    }
  } as SongResult;
};

const loadSongUrl = async (
  page: IBilibiliPage,
  songItem: SongResult,
  forceRefresh: boolean = false
) => {
  if (songItem.playMusicUrl && !forceRefresh) return songItem; // 如果已有URL且不强制刷新则直接返回

  try {
    console.log(`加载分P音频URL: ${page.part}, cid: ${page.cid}`);
    const res = await getBilibiliPlayUrl(bvid.value, page.cid);
    const playUrlData = res.data;
    let url = '';

    // 尝试获取音频URL
    if (playUrlData.dash && playUrlData.dash.audio && playUrlData.dash.audio.length > 0) {
      url = playUrlData.dash.audio[0].baseUrl;
      console.log('获取到dash音频URL:', url);
    } else if (playUrlData.durl && playUrlData.durl.length > 0) {
      url = playUrlData.durl[0].url;
      console.log('获取到durl音频URL:', url);
    } else {
      throw new Error('未找到可用的音频地址');
    }

    // 设置代理URL
    songItem.playMusicUrl = getBilibiliProxyUrl(url);
    return songItem;
  } catch (error) {
    console.error(`加载分P音频URL失败: ${page.part}`, error);
    return songItem;
  }
};

const switchPage = async (page: IBilibiliPage) => {
  if (partLoading.value || currentPage.value?.cid === page.cid) return;

  console.log('切换到分P:', page.part);
  // 立即更新UI选中状态
  currentPage.value = page;

  // 查找对应的音频项
  const audioItem = audioList.value.find((item) => item.bilibiliData?.cid === page.cid);

  if (audioItem) {
    // 设置局部加载状态
    try {
      partLoading.value = true;
      // 每次切换分P都强制重新加载音频URL，以解决之前的URL可能失效的问题
      await loadSongUrl(page, audioItem, true);
      // 切换后自动播放
      playCurrentAudio();
    } catch (error) {
      console.error('切换分P时加载音频URL失败:', error);
      message.error('获取音频地址失败，请重试');
    } finally {
      partLoading.value = false;
    }
  } else {
    console.error('未找到对应的音频项');
    message.error('未找到对应的音频，请重试');
  }
};

const playCurrentAudio = async () => {
  if (audioList.value.length === 0) {
    console.error('音频列表为空');
    errorMessage.value = '音频列表为空，请重试';
    return;
  }

  // 获取当前分P的音频
  const currentIndex = audioList.value.findIndex(
    (item) => item.bilibiliData?.cid === currentPage.value?.cid
  );

  if (currentIndex === -1) {
    console.error('未找到当前分P的音频');
    errorMessage.value = '未找到当前分P的音频';
    return;
  }

  const currentAudio = audioList.value[currentIndex];
  console.log('准备播放当前选中的分P:', currentAudio.name);

  try {
    // 每次播放前都强制重新加载当前分P的音频URL（解决可能的URL失效问题）
    partLoading.value = true;
    await loadSongUrl(currentPage.value!, currentAudio, true);

    if (!currentAudio.playMusicUrl) {
      throw new Error('获取音频URL失败');
    }

    // 预加载下一个分P的音频URL（如果有）
    const nextIndex = (currentIndex + 1) % audioList.value.length;
    if (nextIndex !== currentIndex) {
      const nextAudio = audioList.value[nextIndex];
      const nextPage = videoDetail.value!.pages.find((p) => p.cid === nextAudio.bilibiliData?.cid);

      if (nextPage) {
        console.log('预加载下一个分P:', nextPage.part);
        loadSongUrl(nextPage, nextAudio).catch((e) => console.warn('预加载下一个分P失败:', e));
      }
    }

    // 将B站音频列表设置为播放列表
    playerStore.setPlayList(audioList.value);

    // 播放当前选中的分P
    console.log('播放当前选中的分P:', currentAudio.name, '音频URL:', currentAudio.playMusicUrl);
    playerStore.setPlay(currentAudio);

    // 播放后通知用户已开始播放
    message.success('已开始播放');
  } catch (error) {
    console.error('播放音频失败:', error);
    errorMessage.value = error instanceof Error ? error.message : '播放失败，请重试';
  } finally {
    partLoading.value = false;
  }
};

/**
 * 格式化总时长
 */
const formatTotalDuration = (seconds?: number) => {
  if (!seconds) return '00:00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * 格式化数字显示
 */
const formatNumber = (num?: number) => {
  if (!num) return '0';
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`;
  }
  return num.toString();
};

// 判断是否是当前正在播放的分P
const isCurrentPlayingPage = (page: IBilibiliPage) => {
  // 只根据播放器状态判断，不再使用UI选中状态
  const currentPlayingMusic = playerStore.playMusic as any;
  if (
    currentPlayingMusic &&
    typeof currentPlayingMusic === 'object' &&
    currentPlayingMusic.bilibiliData
  ) {
    // 比较当前播放的音频的cid与此分P的cid
    return (
      currentPlayingMusic.bilibiliData.cid === page.cid &&
      currentPlayingMusic.bilibiliData.bvid === bvid.value
    );
  }

  // 如果没有正在播放的音乐，则使用UI选择状态
  return currentPage.value?.cid === page.cid;
};

// 监听播放器状态变化，保持分P列表选中状态同步
watch(
  () => playerStore.playMusic,
  (newMusic: any) => {
    if (
      newMusic &&
      typeof newMusic === 'object' &&
      newMusic.bilibiliData &&
      newMusic.bilibiliData.bvid === bvid.value
    ) {
      // 查找对应的分P
      const playingPage = videoDetail.value?.pages?.find(
        (p) => p.cid === newMusic.bilibiliData.cid
      );

      // 无条件更新UI状态以确保UI状态与播放状态一致
      if (playingPage) {
        currentPage.value = playingPage;
      }
    }
  }
);
</script>

<style scoped lang="scss">
.bilibili-player-page {
  @apply h-full flex flex-col;

  .content-scrollbar {
    @apply flex-1 overflow-hidden;
  }

  .content-wrapper {
    @apply flex flex-col p-4;
  }
}

.bilibili-info-wrapper {
  @apply flex flex-col md:flex-row gap-4 w-full;

  .bilibili-cover {
    @apply relative w-full md:w-1/3 aspect-video rounded-lg overflow-hidden;

    .cover-image {
      @apply w-full h-full object-cover;
    }

    .play-overlay {
      @apply absolute inset-0;

      .play-icon-bg {
        @apply absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity cursor-pointer;

        i {
          @apply text-4xl;
        }
      }

      .corner-play-button {
        @apply absolute right-3 bottom-3 shadow-lg flex items-center gap-1 px-4 py-1 text-sm transition-all duration-200;

        &:hover {
          @apply transform scale-110;
        }

        i {
          @apply text-xl;
        }
      }
    }
  }
}

.loading-wrapper,
.error-wrapper {
  @apply w-full flex flex-col items-center justify-center py-16 rounded-lg bg-gray-100 dark:bg-gray-800;
  aspect-ratio: 16/9;

  p {
    @apply mt-4 text-gray-600 dark:text-gray-400;
  }
}

.error-wrapper {
  button {
    @apply mt-4;
  }
}

.video-info {
  @apply flex-1 p-4 rounded-lg bg-gray-100 dark:bg-gray-800;

  .title {
    @apply text-lg font-medium mb-4 text-gray-900 dark:text-white;
  }

  .author {
    @apply flex items-center text-sm mb-2;
  }

  .stats {
    @apply flex gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3;
  }

  .description {
    @apply text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3;
    max-height: 100px;
    overflow-y: auto;
  }

  .duration {
    @apply text-sm text-gray-600 dark:text-gray-400;
  }
}

.video-parts {
  @apply mt-4;

  .parts-title {
    @apply text-sm font-medium mb-2 flex items-center;
  }

  .parts-list {
    @apply flex flex-wrap gap-2 max-h-60 overflow-y-auto pb-4;

    .part-item {
      @apply text-xs mb-2;
    }
  }
}
</style>

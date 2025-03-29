<template>
  <n-drawer
    v-model:show="showModal"
    class="bilibili-player-modal"
    :mask-closable="true"
    :auto-focus="false"
    :to="`#layout-main`"
    preset="card"
    height="80%"
    placement="bottom"
  >
    <div class="bilibili-player-wrapper">
      <div class="bilibili-player-header">
        <div class="title">{{ videoDetail?.title || '加载中...' }}</div>
        <div class="actions">
          <n-button quaternary circle @click="closePlayer">
            <template #icon>
              <i class="ri-close-line"></i>
            </template>
          </n-button>
        </div>
      </div>

      <div v-if="isLoading" class="loading-wrapper">
        <n-spin size="large" />
        <p>听书加载中...</p>
      </div>

      <div v-else-if="errorMessage" class="error-wrapper">
        <i class="ri-error-warning-line text-4xl text-red-500"></i>
        <p>{{ errorMessage }}</p>
        <n-button type="primary" @click="loadVideoSource">重试</n-button>
      </div>

      <div v-else-if="videoDetail" class="bilibili-info-wrapper">
        <div class="bilibili-cover">
          <n-image
            :src="getBilibiliProxyUrl(videoDetail.pic)"
            class="cover-image"
            preview-disabled
          />
          <div class="play-button" @click="playCurrentAudio">
            <i class="ri-play-fill text-4xl"></i>
          </div>
        </div>

        <div class="video-info">
          <div class="author">
            <i class="ri-user-line mr-1"></i>
            <span>{{ videoDetail.owner?.name }}</span>
          </div>
          <div class="stats">
            <span><i class="ri-play-line mr-1"></i>{{ formatNumber(videoDetail.stat?.view) }}</span>
            <span
              ><i class="ri-chat-1-line mr-1"></i
              >{{ formatNumber(videoDetail.stat?.danmaku) }}</span
            >
            <span
              ><i class="ri-thumb-up-line mr-1"></i>{{ formatNumber(videoDetail.stat?.like) }}</span
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

      <div v-if="videoDetail?.pages && videoDetail.pages.length > 1" class="video-parts">
        <div class="parts-title">分P列表 (共{{ videoDetail.pages.length }}集)</div>
        <div class="parts-list">
          <n-button
            v-for="page in videoDetail.pages"
            :key="page.cid"
            :type="currentPage?.cid === page.cid ? 'primary' : 'default'"
            size="small"
            class="part-item"
            @click="switchPage(page)"
          >
            {{ page.part }}
          </n-button>
        </div>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { getBilibiliPlayUrl, getBilibiliProxyUrl, getBilibiliVideoDetail } from '@/api/bilibili';
import { usePlayerStore } from '@/store/modules/player';
import type { SongResult } from '@/type/music';
import type { IBilibiliPage, IBilibiliVideoDetail } from '@/types/bilibili';

const props = defineProps<{
  show: boolean;
  bvid?: string;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'close'): void;
}>();

const playerStore = usePlayerStore();
const isLoading = ref(true);
const errorMessage = ref('');
const videoDetail = ref<IBilibiliVideoDetail | null>(null);
const currentPage = ref<IBilibiliPage | null>(null);
const audioList = ref<SongResult[]>([]);

const showModal = computed({
  get: () => props.show,
  set: (value) => {
    emit('update:show', value);
    if (!value) {
      emit('close');
    }
  }
});

watch(
  () => props.bvid,
  async (newBvid) => {
    if (newBvid) {
      await loadVideoDetail(newBvid);
    }
  },
  { immediate: true }
);

watch(
  () => props.show,
  (newValue) => {
    console.log('Modal show changed:', newValue);
    if (newValue && props.bvid && !videoDetail.value) {
      loadVideoDetail(props.bvid);
    }
  }
);

const closePlayer = () => {
  showModal.value = false;
};

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
  }
};

const loadVideoSource = async () => {
  if (!props.bvid || !currentPage.value?.cid) {
    console.error('缺少必要参数:', { bvid: props.bvid, cid: currentPage.value?.cid });
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    console.log('加载音频源:', props.bvid, currentPage.value.cid);

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
          id: `${videoDetail.value!.aid}--${page.cid}`, // 使用aid+cid作为唯一ID
          name: `${page.part || ''} - ${videoDetail.value!.title}`,
          picUrl: getBilibiliProxyUrl(videoDetail.value!.pic),
          type: 0,
          canDislike: false,
          alg: '',
          source: 'bilibili', // 设置来源为B站
          song: {
            name: `${page.part || ''} - ${videoDetail.value!.title}`,
            id: `${videoDetail.value!.aid}--${page.cid}`,
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
            bvid: props.bvid,
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
    id: `${videoDetail.value.aid}--${currentPage.value.cid}`, // 使用aid+cid作为唯一ID
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
      id: `${videoDetail.value.aid}--${currentPage.value.cid}`,
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
      bvid: props.bvid,
      cid: currentPage.value.cid
    }
  } as SongResult;
};

const loadSongUrl = async (page: IBilibiliPage, songItem: SongResult) => {
  if (songItem.playMusicUrl) return songItem; // 如果已有URL则直接返回

  try {
    console.log(`加载分P音频URL: ${page.part}, cid: ${page.cid}`);
    const res = await getBilibiliPlayUrl(props.bvid!, page.cid);
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
  console.log('切换到分P:', page.part);
  currentPage.value = page;

  // 查找对应的音频项
  const audioItem = audioList.value.find((item) => item.bilibiliData?.cid === page.cid);

  if (audioItem && !audioItem.playMusicUrl) {
    // 如果该分P没有音频URL，则先加载
    try {
      isLoading.value = true;
      await loadSongUrl(page, audioItem);
    } catch (error) {
      console.error('切换分P时加载音频URL失败:', error);
      errorMessage.value = '获取音频地址失败，请重试';
    } finally {
      isLoading.value = false;
    }
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
    // 加载当前分P的音频URL（如果需要）
    if (!currentAudio.playMusicUrl) {
      isLoading.value = true;
      await loadSongUrl(currentPage.value!, currentAudio);

      if (!currentAudio.playMusicUrl) {
        throw new Error('获取音频URL失败');
      }
    }

    // 预加载下一个分P的音频URL（如果有）
    const nextIndex = (currentIndex + 1) % audioList.value.length;
    if (nextIndex !== currentIndex) {
      const nextAudio = audioList.value[nextIndex];
      const nextPage = videoDetail.value!.pages.find((p) => p.cid === nextAudio.bilibiliData?.cid);

      if (nextPage && !nextAudio.playMusicUrl) {
        console.log('预加载下一个分P:', nextPage.part);
        loadSongUrl(nextPage, nextAudio).catch((e) => console.warn('预加载下一个分P失败:', e));
      }
    }

    // 将B站音频列表设置为播放列表
    playerStore.setPlayList(audioList.value);

    // 播放当前选中的分P
    console.log('播放当前选中的分P:', currentAudio.name, '音频URL:', currentAudio.playMusicUrl);
    playerStore.setPlayMusic(currentAudio);

    // 关闭模态框
    closePlayer();
  } catch (error) {
    console.error('播放音频失败:', error);
    errorMessage.value = error instanceof Error ? error.message : '播放失败，请重试';
  } finally {
    isLoading.value = false;
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
</script>

<style scoped lang="scss">
.bilibili-player-modal {
  width: 90vw;
  max-width: 1000px;
}

.bilibili-player-wrapper {
  @apply flex flex-col p-8 pt-4;
}

.bilibili-player-header {
  @apply flex justify-between items-center mb-4;

  .title {
    @apply text-lg font-medium truncate;
  }

  .actions {
    @apply flex items-center;
  }
}

.bilibili-info-wrapper {
  @apply flex flex-col md:flex-row gap-4 w-full;

  .bilibili-cover {
    @apply relative w-full md:w-1/3 aspect-video rounded-lg overflow-hidden;

    .cover-image {
      @apply w-full h-full object-cover;
    }

    .play-button {
      @apply absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity cursor-pointer;
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
    @apply text-sm font-medium mb-2;
  }

  .parts-list {
    @apply flex flex-wrap gap-2 max-h-60 overflow-y-auto pb-20;

    .part-item {
      @apply text-xs mb-2;
    }
  }
}
</style>

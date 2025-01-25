<template>
  <div class="download-drawer-trigger">
    <n-badge :value="downloadingCount" :max="99" :show="downloadingCount > 0">
      <n-button circle @click="store.commit('setShowDownloadDrawer', true)">
        <template #icon>
          <i class="iconfont ri-download-cloud-2-line"></i>
        </template>
      </n-button>
    </n-badge>
  </div>

  <n-drawer
    v-model:show="showDrawer"
    :height="'80%'"
    placement="bottom"
    @after-leave="handleDrawerClose"
  >
    <n-drawer-content title="下载管理" closable :native-scrollbar="false">
      <div class="drawer-container">
        <n-tabs type="line" animated class="h-full">
          <!-- 下载列表 -->
          <n-tab-pane name="downloading" tab="下载中" class="h-full">
            <div class="download-list">
              <div v-if="downloadList.length === 0" class="empty-tip">
                <n-empty description="暂无下载任务" />
              </div>
              <template v-else>
                <div class="total-progress">
                  <div class="total-progress-text">总进度: {{ totalProgress.toFixed(1) }}%</div>
                  <n-progress
                    type="line"
                    :percentage="Number(totalProgress.toFixed(1))"
                    :height="12"
                    :border-radius="6"
                    :indicator-placement="'inside'"
                  />
                </div>
                <div class="download-content">
                  <div class="download-items">
                    <div v-for="item in downloadList" :key="item.path" class="download-item">
                      <div class="download-item-content">
                        <div class="download-item-cover">
                          <n-image
                            :src="getImgUrl(item.songInfo?.picUrl, '200y200')"
                            preview-disabled
                            :object-fit="'cover'"
                            class="cover-image"
                          />
                        </div>
                        <div class="download-item-info">
                          <div class="download-item-name" :title="item.filename">
                            {{ item.filename }}
                          </div>
                          <div class="download-item-artist">
                            {{ item.songInfo?.ar?.map((a) => a.name).join(', ') || '未知歌手' }}
                          </div>
                          <div class="download-item-progress">
                            <n-progress
                              type="line"
                              :percentage="item.progress"
                              :processing="item.status === 'downloading'"
                              :status="getProgressStatus(item)"
                              :height="8"
                            />
                          </div>
                          <div class="download-item-size">
                            <span
                              >{{ formatSize(item.loaded) }} / {{ formatSize(item.total) }}</span
                            >
                          </div>
                        </div>
                        <div class="download-item-status">
                          <n-tag :type="getStatusType(item)" size="small">
                            {{ getStatusText(item) }}
                          </n-tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </n-tab-pane>

          <!-- 已下载列表 -->
          <n-tab-pane name="downloaded" tab="已下载" class="h-full">
            <div class="downloaded-list">
              <div v-if="downloadedList.length === 0" class="empty-tip">
                <n-empty description="暂无已下载歌曲" />
              </div>
              <div v-else class="downloaded-content">
                <div class="downloaded-items">
                  <div v-for="item in downList" :key="item.path" class="downloaded-item">
                    <div class="downloaded-item-content">
                      <div class="downloaded-item-cover">
                        <n-image
                          :src="getImgUrl(item.picUrl, '200y200')"
                          preview-disabled
                          :object-fit="'cover'"
                          class="cover-image"
                        />
                      </div>
                      <div class="downloaded-item-info">
                        <div class="downloaded-item-name" :title="item.filename">
                          {{ item.filename }}
                        </div>
                        <div class="downloaded-item-artist">
                          {{ item.ar?.map((a) => a.name).join(', ') }}
                        </div>
                        <div class="downloaded-item-size">{{ formatSize(item.size) }}</div>
                      </div>
                      <div class="downloaded-item-actions">
                        <!-- <n-button text type="primary" size="large" @click="handlePlayMusic(item)">
                          <template #icon>
                            <i class="iconfont ri-play-circle-line text-xl"></i>
                          </template>
                        </n-button> -->
                        <n-button
                          text
                          type="primary"
                          size="large"
                          @click="openDirectory(item.path)"
                        >
                          <template #icon>
                            <i class="iconfont ri-folder-open-line text-xl"></i>
                          </template>
                        </n-button>
                        <n-button text type="error" size="large" @click="handleDelete(item)">
                          <template #icon>
                            <i class="iconfont ri-delete-bin-line text-xl"></i>
                          </template>
                        </n-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-drawer-content>
  </n-drawer>

  <!-- 删除确认对话框 -->
  <n-modal v-model:show="showDeleteConfirm" preset="dialog" type="warning" title="删除确认">
    <template #header>
      <div class="flex items-center">
        <i class="iconfont ri-error-warning-line mr-2 text-xl"></i>
        <span>删除确认</span>
      </div>
    </template>
    <div class="delete-confirm-content">
      确定要删除歌曲 "{{ itemToDelete?.filename }}" 吗？此操作不可恢复。
    </div>
    <template #action>
      <n-button size="small" @click="showDeleteConfirm = false">取消</n-button>
      <n-button size="small" type="warning" @click="confirmDelete">确定删除</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import type { ProgressStatus } from 'naive-ui';
import { useMessage } from 'naive-ui';
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';

import { getMusicDetail } from '@/api/music';
// import { audioService } from '@/services/audioService';
import { getImgUrl } from '@/utils';

interface DownloadItem {
  filename: string;
  progress: number;
  loaded: number;
  total: number;
  path: string;
  status: 'downloading' | 'completed' | 'error';
  error?: string;
  songInfo?: any;
}

interface DownloadedItem {
  filename: string;
  path: string;
  size: number;
  id: number;
  picUrl: string;
  ar: { name: string }[];
}

const message = useMessage();
const store = useStore();

const showDrawer = computed({
  get: () => store.state.showDownloadDrawer,
  set: (val) => store.commit('setShowDownloadDrawer', val)
});

const downloadList = ref<DownloadItem[]>([]);
const downloadedList = ref<DownloadedItem[]>(
  JSON.parse(localStorage.getItem('downloadedList') || '[]')
);

const downList = computed(() => {
  return (downloadedList.value as DownloadedItem[]).reverse();
});

// 获取播放状态
// const play = computed(() => store.state.play as boolean);
// const currentMusic = computed(() => store.state.playMusic);

// 计算下载中的任务数量
const downloadingCount = computed(() => {
  return downloadList.value.filter((item) => item.status === 'downloading').length;
});

// 计算总进度
const totalProgress = computed(() => {
  if (downloadList.value.length === 0) return 0;
  const total = downloadList.value.reduce((sum, item) => sum + item.progress, 0);
  return total / downloadList.value.length;
});

watch(totalProgress, (newVal) => {
  if (newVal === 100) {
    refreshDownloadedList();
  }
});

// 获取状态类型
const getStatusType = (item: DownloadItem) => {
  switch (item.status) {
    case 'downloading':
      return 'info';
    case 'completed':
      return 'success';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

// 获取状态文本
const getStatusText = (item: DownloadItem) => {
  switch (item.status) {
    case 'downloading':
      return '下载中';
    case 'completed':
      return '已完成';
    case 'error':
      return '失败';
    default:
      return '未知';
  }
};

// 获取进度条状态
const getProgressStatus = (item: DownloadItem): ProgressStatus => {
  switch (item.status) {
    case 'completed':
      return 'success';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
};

// 格式化文件大小
const formatSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
};

// 打开目录
const openDirectory = (path: string) => {
  window.electron.ipcRenderer.send('open-directory', path);
};

// 删除相关
const showDeleteConfirm = ref(false);
const itemToDelete = ref<DownloadedItem | null>(null);

// 处理删除点击
const handleDelete = (item: DownloadedItem) => {
  itemToDelete.value = item;
  showDeleteConfirm.value = true;
};

// 确认删除
const confirmDelete = async () => {
  if (!itemToDelete.value) return;

  try {
    const success = await window.electron.ipcRenderer.invoke(
      'delete-downloaded-music',
      itemToDelete.value.path
    );
    if (success) {
      localStorage.setItem(
        'downloadedList',
        JSON.stringify(
          downloadedList.value.filter(
            (item) => item.id !== (itemToDelete.value as DownloadedItem).id
          )
        )
      );
      await refreshDownloadedList();
      message.success('删除成功');
    } else {
      message.error('删除失败');
    }
  } catch (error) {
    console.error('Failed to delete music:', error);
    message.error('删除失败');
  } finally {
    showDeleteConfirm.value = false;
    itemToDelete.value = null;
  }
};

// 播放音乐
// const handlePlayMusic = async (item: DownloadedItem) => {
//   // 确保路径正确编码
//   const encodedPath = encodeURIComponent(item.path);
//   const localUrl = `local://${encodedPath}`;

//   const musicInfo = {
//     name: item.filename,
//     id: item.id,
//     url: localUrl,
//     playMusicUrl: localUrl,
//     picUrl: item.picUrl,
//     ar: item.ar || [{ name: '本地音乐' }],
//     song: {
//       artists: item.ar || [{ name: '本地音乐' }]
//     },
//     al: {
//       picUrl: item.picUrl || '/images/default_cover.png'
//     }
//   };

//   // 如果是当前播放的音乐，则切换播放状态
//   if (currentMusic.value?.id === item.id) {
//     if (play.value) {
//       audioService.getCurrentSound()?.pause();
//       store.commit('setPlayMusic', false);
//     } else {
//       audioService.getCurrentSound()?.play();
//       store.commit('setPlayMusic', true);
//     }
//     return;
//   }

//   // 播放新的音乐
//   store.commit('setPlay', musicInfo);
//   store.commit('setPlayMusic', true);
//   store.commit('setIsPlay', true);

//   store.commit(
//     'setPlayList',
//     downloadedList.value.map((item) => ({
//       ...item,
//       playMusicUrl: `local://${encodeURIComponent(item.path)}`
//     }))
//   );
// };

// 获取已下载音乐列表
const refreshDownloadedList = async () => {
  try {
    let saveList: any = [];
    const list = await window.electron.ipcRenderer.invoke('get-downloaded-music');
    if (!Array.isArray(list) || list.length === 0) {
      saveList = [];
      return;
    }

    const songIds = list.filter((item) => item.id).map((item) => item.id);

    // 如果有歌曲ID，获取详细信息
    if (songIds.length > 0) {
      try {
        const detailRes = await getMusicDetail(songIds);
        const songDetails = detailRes.data.songs.reduce((acc, song) => {
          acc[song.id] = song;
          return acc;
        }, {});

        saveList = list.map((item) => {
          const songDetail = songDetails[item.id];
          return {
            ...item,
            picUrl: songDetail?.al?.picUrl || item.picUrl || '/images/default_cover.png',
            ar: songDetail?.ar || item.ar || [{ name: '本地音乐' }]
          };
        });
      } catch (detailError) {
        console.error('Failed to get music details:', detailError);
        saveList = list;
      }
    } else {
      saveList = list;
    }
    setLocalDownloadedList(saveList);
  } catch (error) {
    console.error('Failed to get downloaded music list:', error);
    downloadedList.value = [];
  }
};

const setLocalDownloadedList = (list: DownloadedItem[]) => {
  const localList = localStorage.getItem('downloadedList');
  // 合并 去重
  const saveList = [...(localList ? JSON.parse(localList) : []), ...list];
  const uniqueList = saveList.filter(
    (item, index, self) => index === self.findIndex((t) => t.id === item.id)
  );
  localStorage.setItem('downloadedList', JSON.stringify(uniqueList));
  downloadedList.value = uniqueList;
};

// 监听抽屉显示状态
watch(
  () => showDrawer.value,
  (newVal) => {
    if (newVal) {
      refreshDownloadedList();
    }
  }
);

// 监听下载进度
onMounted(() => {
  refreshDownloadedList();

  // 监听下载进度
  window.electron.ipcRenderer.on('music-download-progress', (_, data) => {
    const existingItem = downloadList.value.find((item) => item.filename === data.filename);
    if (existingItem) {
      Object.assign(existingItem, {
        ...data,
        songInfo: data.songInfo || existingItem.songInfo
      });

      // 如果下载完成，从列表中移除
      if (data.status === 'completed') {
        downloadList.value = downloadList.value.filter((item) => item.filename !== data.filename);
      }
    } else {
      downloadList.value.push({
        ...data,
        songInfo: data.songInfo
      });
    }
  });

  // 监听下载完成
  window.electron.ipcRenderer.on('music-download-complete', (_, data) => {
    if (data.success) {
      // 从下载列表中移除
      downloadList.value = downloadList.value.filter((item) => item.filename !== data.filename);
      // 刷新已下载列表
      refreshDownloadedList();
      message.success(`${data.filename} 下载完成`);
    } else {
      const existingItem = downloadList.value.find((item) => item.filename === data.filename);
      if (existingItem) {
        Object.assign(existingItem, {
          status: 'error',
          error: data.error,
          progress: 0
        });
        setTimeout(() => {
          downloadList.value = downloadList.value.filter((item) => item.filename !== data.filename);
        }, 3000);
      }
      message.error(`${data.filename} 下载失败: ${data.error}`);
    }
  });

  // 监听下载队列
  window.electron.ipcRenderer.on('music-download-queued', (_, data) => {
    const existingItem = downloadList.value.find((item) => item.filename === data.filename);
    if (!existingItem) {
      downloadList.value.push({
        filename: data.filename,
        progress: 0,
        loaded: 0,
        total: 0,
        path: '',
        status: 'downloading',
        songInfo: data.songInfo
      });
    }
  });
});

const handleDrawerClose = () => {
  store.commit('setShowDownloadDrawer', false);
};
</script>

<style lang="scss" scoped>
.download-drawer-trigger {
  @apply fixed left-6 bottom-24 z-[999];

  .n-button {
    @apply bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm;
    @apply hover:bg-light dark:hover:bg-dark-200;
    @apply text-gray-600 dark:text-gray-300;
    @apply transition-all duration-300;
    @apply w-10 h-10;

    .iconfont {
      @apply text-xl;
    }
  }
}

.drawer-container {
  @apply h-full;
}

.download-list,
.downloaded-list {
  @apply flex flex-col h-full;

  .empty-tip {
    @apply flex-1 flex items-center justify-center;
    @apply text-gray-400 dark:text-gray-600;
  }
}

.download-content,
.downloaded-content {
  @apply flex-1 overflow-hidden pb-40;
}

.download-items,
.downloaded-items {
  @apply space-y-3;
}

.total-progress {
  @apply px-4 py-3 bg-light-100 dark:bg-dark-200 backdrop-blur-sm;
  @apply border-b border-gray-100 dark:border-gray-800;
  @apply sticky top-0 z-10;

  &-text {
    @apply mb-2 text-sm font-medium text-gray-600 dark:text-gray-400;
  }
}

.download-item,
.downloaded-item {
  @apply p-3 rounded-lg;
  @apply bg-light-100 dark:bg-dark-200 backdrop-blur-sm;
  @apply border border-gray-100 dark:border-gray-700;
  @apply transition-all duration-300;
  @apply hover:bg-light-300 dark:hover:bg-dark-300;
  @apply hover:shadow-md;

  &-content {
    @apply flex items-center gap-3;
  }

  &-cover {
    @apply w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden;
    @apply shadow-md;

    .cover-image {
      @apply w-full h-full object-cover;
    }
  }

  &-info {
    @apply flex-1 min-w-0;
  }

  &-name {
    @apply text-sm font-medium truncate;
    @apply text-gray-900 dark:text-gray-100;
  }

  &-artist {
    @apply text-xs text-gray-500 dark:text-gray-400 truncate;
  }

  &-progress {
    @apply mt-1;
  }

  &-size {
    @apply text-xs text-gray-500 dark:text-gray-400 mt-1;
  }

  &-status {
    @apply flex-shrink-0;
  }
}

.downloaded-item {
  &-actions {
    @apply flex items-center gap-1;

    .n-button {
      @apply p-2;
      @apply hover:bg-gray-200/80 dark:hover:bg-gray-600/80;
      @apply rounded-lg;
      @apply transition-colors duration-300;

      .iconfont {
        @apply text-xl;
      }
    }
  }
}

.delete-confirm-content {
  @apply py-6 px-4;
  @apply text-base text-gray-600 dark:text-gray-400;
}
</style>

<template>
  <div class="import-playlist-page">
    <div class="import-header" :class="setAnimationClass('animate__fadeInLeft')">
      <div class="import-header-left">
        <h2>{{ t('comp.playlist.import.title') }}</h2>
        <div class="import-desc">{{ t('comp.playlist.import.description') }}</div>
      </div>
    </div>

    <div class="import-content" :class="setAnimationClass('animate__fadeInUp')">
      <n-card class="import-card">
        <n-tabs type="line" animated>
          <!-- 链接导入 -->
          <n-tab-pane name="link" :tab="t('comp.playlist.import.linkTab')">
            <div class="tab-content">
              <div class="link-inputs">
                <div v-for="(link, index) in linkInputs" :key="index" class="link-row">
                  <n-input
                    v-model:value="link.value"
                    :placeholder="t('comp.playlist.import.linkPlaceholder')"
                    class="link-input"
                  />
                  <n-button
                    quaternary
                    circle
                    type="error"
                    @click="removeLinkRow(index)"
                    v-if="linkInputs.length > 1"
                  >
                    <template #icon>
                      <i class="iconfont ri-delete-bin-line"></i>
                    </template>
                  </n-button>
                </div>
                <div class="link-actions">
                  <n-button @click="addLinkRow" secondary size="small">
                    <template #icon>
                      <i class="iconfont ri-add-line"></i>
                    </template>
                    {{ t('comp.playlist.import.addLinkButton') }}
                  </n-button>
                </div>
              </div>
              <div class="link-tips">
                <p>{{ t('comp.playlist.import.linkTips') }}</p>
                <ul>
                  <li>{{ t('comp.playlist.import.linkTip1') }}</li>
                  <li>{{ t('comp.playlist.import.linkTip2') }}</li>
                  <li>{{ t('comp.playlist.import.linkTip3') }}</li>
                </ul>
              </div>
              <div class="action-buttons">
                <n-checkbox v-model:checked="importToStarPlaylist">
                  {{ t('comp.playlist.import.importToStarPlaylist') }}
                </n-checkbox>
                <n-input
                  v-if="!importToStarPlaylist"
                  v-model:value="playlistName"
                  :placeholder="t('comp.playlist.import.playlistNamePlaceholder')"
                  class="playlist-name-input"
                />
                <n-button
                  type="primary"
                  :loading="importing"
                  :disabled="!isLinkInputValid"
                  @click="handleImportByLink"
                >
                  {{ t('comp.playlist.import.importButton') }}
                </n-button>
              </div>
            </div>
          </n-tab-pane>

          <!-- 文字导入 -->
          <n-tab-pane name="text" :tab="t('comp.playlist.import.textTab')">
            <div class="tab-content">
              <n-input
                v-model:value="textInput"
                type="textarea"
                :placeholder="t('comp.playlist.import.textPlaceholder')"
                :rows="6"
              />
              <div class="text-tips">
                <p>{{ t('comp.playlist.import.textTips') }}</p>
                <p class="text-format">{{ t('comp.playlist.import.textFormat') }}</p>
              </div>
              <div class="action-buttons">
                <n-checkbox v-model:checked="importToStarPlaylist">
                  {{ t('comp.playlist.import.importToStarPlaylist') }}
                </n-checkbox>
                <n-input
                  v-if="!importToStarPlaylist"
                  v-model:value="playlistName"
                  :placeholder="t('comp.playlist.import.playlistNamePlaceholder')"
                  class="playlist-name-input"
                />
                <n-button
                  type="primary"
                  :loading="importing"
                  :disabled="!textInput.trim()"
                  @click="handleImportByText"
                >
                  {{ t('comp.playlist.import.importButton') }}
                </n-button>
              </div>
            </div>
          </n-tab-pane>

          <!-- 元数据导入 -->
          <n-tab-pane name="local" :tab="t('comp.playlist.import.localTab')">
            <div class="tab-content">
              <div class="metadata-inputs">
                <div v-for="(item, index) in localMetadata" :key="index" class="metadata-row">
                  <n-input
                    v-model:value="item.name"
                    :placeholder="t('comp.playlist.import.songNamePlaceholder')"
                    class="metadata-input"
                  />
                  <n-input
                    v-model:value="item.artist"
                    :placeholder="t('comp.playlist.import.artistNamePlaceholder')"
                    class="metadata-input"
                  />
                  <n-input
                    v-model:value="item.album"
                    :placeholder="t('comp.playlist.import.albumNamePlaceholder')"
                    class="metadata-input"
                  />
                  <n-button
                    quaternary
                    circle
                    type="error"
                    @click="removeMetadataRow(index)"
                    v-if="localMetadata.length > 1"
                  >
                    <template #icon>
                      <i class="iconfont ri-delete-bin-line"></i>
                    </template>
                  </n-button>
                </div>
                <div class="metadata-actions">
                  <n-button @click="addMetadataRow" secondary size="small">
                    <template #icon>
                      <i class="iconfont ri-add-line"></i>
                    </template>
                    {{ t('comp.playlist.import.addSongButton') }}
                  </n-button>
                </div>
              </div>
              <div class="local-tips">
                <p>{{ t('comp.playlist.import.localTips') }}</p>
              </div>
              <div class="action-buttons">
                <n-checkbox v-model:checked="importToStarPlaylist">
                  {{ t('comp.playlist.import.importToStarPlaylist') }}
                </n-checkbox>
                <n-input
                  v-if="!importToStarPlaylist"
                  v-model:value="playlistName"
                  :placeholder="t('comp.playlist.import.playlistNamePlaceholder')"
                  class="playlist-name-input"
                />
                <n-button
                  type="primary"
                  :loading="importing"
                  :disabled="!isLocalMetadataValid"
                  @click="handleImportByLocal"
                >
                  {{ t('comp.playlist.import.importButton') }}
                </n-button>
              </div>
            </div>
          </n-tab-pane>
        </n-tabs>
      </n-card>

      <!-- 导入状态 -->
      <n-card v-if="taskId" class="import-status-card">
        <div class="status-header">
          <h3>{{ t('comp.playlist.import.importStatus') }}</h3>
          <n-button text @click="refreshStatus">
            <template #icon>
              <i class="iconfont ri-refresh-line"></i>
            </template>
            {{ t('comp.playlist.import.refresh') }}
          </n-button>
        </div>
        <n-spin :show="checkingStatus">
          <div class="status-content">
            <div class="status-item">
              <span class="status-label">{{ t('comp.playlist.import.taskId') }}:</span>
              <span class="status-value">{{ taskId }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">{{ t('comp.playlist.import.status') }}:</span>
              <span class="status-value" :class="`status-${taskStatus}`">
                {{ getStatusText(taskStatus) }}
              </span>
            </div>
            <div v-if="taskStatus === 'success'" class="status-item">
              <span class="status-label">{{ t('comp.playlist.import.successCount') }}:</span>
              <span class="status-value success-count">{{ successCount }}</span>
            </div>
            <div v-if="taskStatus === 'failed'" class="status-item">
              <span class="status-label">{{ t('comp.playlist.import.failReason') }}:</span>
              <span class="status-value fail-reason">{{ failReason }}</span>
            </div>
          </div>
        </n-spin>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getImportTaskStatus, importPlaylist } from '@/api/playlist';
import { setAnimationClass } from '@/utils';

const { t } = useI18n();
const message = useMessage();

// 表单数据
const linkInputs = ref([{ value: '' }]);
const textInput = ref('');
const localMetadata = ref([{ name: '', artist: '', album: '' }]);
const playlistName = ref('');
const importToStarPlaylist = ref(false);

// 链接相关函数
const addLinkRow = () => {
  linkInputs.value.push({ value: '' });
};

const removeLinkRow = (index: number) => {
  linkInputs.value.splice(index, 1);
};

// 验证链接是否有效
const isLinkInputValid = computed(() => {
  return linkInputs.value.some((item) => item.value.trim() !== '');
});

// 元数据相关函数
const addMetadataRow = () => {
  localMetadata.value.push({ name: '', artist: '', album: '' });
};

const removeMetadataRow = (index: number) => {
  localMetadata.value.splice(index, 1);
};

// 验证元数据是否有效
const isLocalMetadataValid = computed(() => {
  return localMetadata.value.some((item) => item.name.trim() !== '');
});

// 导入状态
const importing = ref(false);
const taskId = ref('');
const taskStatus = ref('');
const successCount = ref(0);
const failReason = ref('');
const checkingStatus = ref(false);
const statusCheckInterval = ref<number | null>(null);

// 处理链接导入
const handleImportByLink = async () => {
  if (!isLinkInputValid.value) {
    message.warning(t('comp.playlist.import.emptyLinkWarning'));
    return;
  }

  try {
    importing.value = true;

    // 处理链接格式
    const links = linkInputs.value
      .filter((link) => link.value.trim())
      .map((link) => link.value.trim());

    const encodedLinks = JSON.stringify(links);

    const params: any = {
      link: encodedLinks
    };

    if (importToStarPlaylist.value) {
      params.importStarPlaylist = true;
    } else if (playlistName.value) {
      params.playlistName = playlistName.value;
    }

    const res = await importPlaylist(params);

    if (res.data.code === 200) {
      message.success(t('comp.playlist.import.importSuccess'));
      taskId.value = res.data.data.taskId;
      startStatusCheck();
    } else {
      message.error(res.data.message || t('comp.playlist.import.importFailed'));
    }
  } catch (error) {
    console.error('导入歌单失败:', error);
    message.error(t('comp.playlist.import.importFailed'));
  } finally {
    importing.value = false;
  }
};

// 处理文字导入
const handleImportByText = async () => {
  if (!textInput.value.trim()) {
    message.warning(t('comp.playlist.import.emptyTextWarning'));
    return;
  }

  try {
    importing.value = true;

    const encodedText = encodeURIComponent(textInput.value);

    const params: any = {
      text: encodedText
    };

    if (importToStarPlaylist.value) {
      params.importStarPlaylist = true;
    } else if (playlistName.value) {
      params.playlistName = playlistName.value;
    }

    const res = await importPlaylist(params);

    if (res.data.code === 200) {
      message.success(t('comp.playlist.import.importSuccess'));
      taskId.value = res.data.data.taskId;
      startStatusCheck();
    } else {
      message.error(res.data.message || t('comp.playlist.import.importFailed'));
    }
  } catch (error) {
    console.error('导入歌单失败:', error);
    message.error(t('comp.playlist.import.importFailed'));
  } finally {
    importing.value = false;
  }
};

// 处理元数据导入
const handleImportByLocal = async () => {
  if (!isLocalMetadataValid.value) {
    message.warning(t('comp.playlist.import.emptyLocalWarning'));
    return;
  }

  try {
    importing.value = true;

    // 过滤掉空的行
    const filteredData = localMetadata.value.filter((item) => item.name.trim() !== '');

    const encodedLocal = JSON.stringify(filteredData);

    const params: any = {
      local: encodedLocal
    };

    if (importToStarPlaylist.value) {
      params.importStarPlaylist = true;
    } else if (playlistName.value) {
      params.playlistName = playlistName.value;
    }

    const res = await importPlaylist(params);

    if (res.data.code === 200) {
      message.success(t('comp.playlist.import.importSuccess'));
      taskId.value = res.data.data.taskId;
      startStatusCheck();
    } else {
      message.error(res.data.message || t('comp.playlist.import.importFailed'));
    }
  } catch (error) {
    console.error('导入歌单失败:', error);
    message.error(t('comp.playlist.import.importFailed'));
  } finally {
    importing.value = false;
  }
};

// 开始检查任务状态
const startStatusCheck = () => {
  // 清除之前的定时器
  if (statusCheckInterval.value) {
    clearInterval(statusCheckInterval.value);
  }

  // 立即检查一次
  checkTaskStatus();

  // 设置定时检查
  statusCheckInterval.value = window.setInterval(() => {
    checkTaskStatus();
  }, 3000); // 每3秒检查一次
};

// 检查任务状态
const checkTaskStatus = async () => {
  if (!taskId.value) return;

  try {
    checkingStatus.value = true;
    const res = await getImportTaskStatus(taskId.value);

    if (res.data.code === 200) {
      // 新的API返回格式处理
      if (res.data.data.tasks && res.data.data.tasks.length > 0) {
        const taskData = res.data.data.tasks[0];
        // 将API返回的status映射到组件内部使用的taskStatus
        const statusMap: Record<string, string> = {
          PENDING: 'pending',
          PROCESSING: 'processing',
          COMPLETE: 'success',
          FAILED: 'failed'
        };

        taskStatus.value = statusMap[taskData.status] || 'pending';

        if (taskStatus.value === 'success') {
          successCount.value = taskData.succCount || 0;
          // 成功后停止检查
          if (statusCheckInterval.value) {
            clearInterval(statusCheckInterval.value);
            statusCheckInterval.value = null;
          }
        } else if (taskStatus.value === 'failed') {
          failReason.value = taskData.msg || t('comp.playlist.import.unknownError');
          // 失败后停止检查
          if (statusCheckInterval.value) {
            clearInterval(statusCheckInterval.value);
            statusCheckInterval.value = null;
          }
        }
      }
    }
  } catch (error) {
    console.error('检查任务状态失败:', error);
  } finally {
    checkingStatus.value = false;
  }
};

// 手动刷新状态
const refreshStatus = () => {
  checkTaskStatus();
};

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return t('comp.playlist.import.statusPending');
    case 'processing':
      return t('comp.playlist.import.statusProcessing');
    case 'success':
      return t('comp.playlist.import.statusSuccess');
    case 'failed':
      return t('comp.playlist.import.statusFailed');
    default:
      return t('comp.playlist.import.statusUnknown');
  }
};

onMounted(() => {
  // 如果有任务ID，开始检查状态
  if (taskId.value) {
    startStatusCheck();
  }
});

onUnmounted(() => {
  // 清除定时器
  if (statusCheckInterval.value) {
    clearInterval(statusCheckInterval.value);
    statusCheckInterval.value = null;
  }
});
</script>

<style lang="scss" scoped>
.import-playlist-page {
  @apply h-full overflow-auto pr-4;
}

.import-header {
  @apply flex justify-between items-center mb-6;

  .import-header-left {
    h2 {
      @apply text-2xl font-bold text-gray-900 dark:text-white mb-2;
    }

    .import-desc {
      @apply text-sm text-gray-500 dark:text-gray-400;
    }
  }
}

.import-content {
  @apply space-y-6;
}

.import-card {
  @apply rounded-lg;

  .tab-content {
    @apply mt-4 space-y-4;
  }

  .link-tips,
  .text-tips,
  .local-tips {
    @apply text-sm text-gray-500 dark:text-gray-400;

    ul {
      @apply list-disc pl-5 mt-2;
    }
  }

  .text-format,
  .local-format {
    @apply mt-2 font-medium;
  }

  .code-example {
    @apply mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-auto;
  }

  .link-inputs {
    @apply space-y-3;

    .link-row {
      @apply flex items-center space-x-2;

      .link-input {
        @apply flex-1;
      }
    }

    .link-actions {
      @apply mt-3 flex justify-end;
    }
  }

  .metadata-inputs {
    @apply space-y-3;

    .metadata-row {
      @apply flex items-center space-x-2;

      .metadata-input {
        @apply flex-1;
      }
    }

    .metadata-actions {
      @apply mt-3 flex justify-end;
    }
  }

  .action-buttons {
    @apply flex items-center space-x-4 mt-6;

    .playlist-name-input {
      @apply max-w-xs;
    }
  }
}

.import-status-card {
  @apply rounded-lg;

  .status-header {
    @apply flex justify-between items-center mb-4;

    h3 {
      @apply text-lg font-medium text-gray-900 dark:text-white;
    }
  }

  .status-content {
    @apply space-y-3;
  }

  .status-item {
    @apply flex items-center;

    .status-label {
      @apply text-gray-500 dark:text-gray-400 w-24;
    }

    .status-value {
      @apply font-medium;
    }

    .status-pending,
    .status-processing {
      @apply text-blue-500;
    }

    .status-success {
      @apply text-green-500;
    }

    .status-failed {
      @apply text-red-500;
    }

    .success-count {
      @apply text-green-500;
    }

    .fail-reason {
      @apply text-red-500;
    }
  }
}
</style>

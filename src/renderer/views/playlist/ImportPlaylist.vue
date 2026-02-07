<template>
  <div
    class="h-full w-full bg-gray-50 dark:bg-black transition-colors duration-500 overflow-hidden flex flex-col relative"
  >
    <!-- 背景装饰 -->
    <div
      class="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"
    ></div>

    <!-- 头部区域 -->
    <div class="flex-shrink-0 z-10 page-padding pt-8 pb-4 relative">
      <div class="max-w-5xl mx-auto w-full flex items-end justify-between">
        <div>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
            >
              <i class="ri-import-fill text-xl"></i>
            </div>
            {{ t('comp.playlist.import.title') }}
          </h2>
          <p class="text-base text-gray-500 dark:text-gray-400 ml-13">
            {{ t('comp.playlist.import.description') }}
          </p>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <n-scrollbar class="flex-1">
      <div class="w-full max-w-5xl mx-auto p-6 pb-24">
        <!-- 自定义 Tab 切换 -->
        <div class="flex justify-center mb-8">
          <div
            class="bg-white dark:bg-white/5 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex gap-1 relative"
          >
            <div
              v-for="tab in tabs"
              :key="tab.id"
              class="relative z-10 px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 flex items-center gap-2"
              :class="
                currentTab === tab.id
                  ? 'text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              "
              @click="currentTab = tab.id"
            >
              <i :class="tab.icon"></i>
              {{ tab.label }}
            </div>

            <!-- 滑动背景 -->
            <div
              class="absolute top-1.5 bottom-1.5 bg-primary rounded-xl shadow-md transition-all duration-300 ease-out"
              :style="tabIndicatorStyle"
            ></div>
          </div>
        </div>

        <!-- 主内容卡片 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <!-- 左侧：输入区域 -->
          <div class="lg:col-span-2 space-y-6">
            <div
              class="bg-white dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden p-1 transition-all duration-300"
            >
              <!-- 链接导入内容 -->
              <div v-if="currentTab === 'link'" class="p-6 space-y-6 animate-fade-in">
                <div class="space-y-4">
                  <div v-for="(link, index) in linkInputs" :key="index" class="group relative">
                    <input
                      v-model="link.value"
                      :placeholder="t('comp.playlist.import.linkPlaceholder')"
                      class="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-primary/50 focus:bg-white dark:focus:bg-black rounded-2xl px-5 py-4 outline-none transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                    <button
                      v-if="linkInputs.length > 1"
                      class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                      @click="removeLinkRow(index)"
                    >
                      <i class="ri-delete-bin-line"></i>
                    </button>
                  </div>

                  <button
                    class="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 flex items-center justify-center gap-2 font-medium"
                    @click="addLinkRow"
                  >
                    <i class="ri-add-line text-lg"></i>
                    {{ t('comp.playlist.import.addLinkButton') }}
                  </button>
                </div>
              </div>

              <!-- 文字导入内容 -->
              <div v-if="currentTab === 'text'" class="p-6 space-y-6 animate-fade-in">
                <textarea
                  v-model="textInput"
                  :placeholder="t('comp.playlist.import.textPlaceholder')"
                  rows="12"
                  class="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-primary/50 focus:bg-white dark:focus:bg-black rounded-2xl px-5 py-4 outline-none transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-400 font-mono text-sm resize-none"
                ></textarea>
                <div class="flex items-center gap-2 text-xs text-gray-400 px-2">
                  <i class="ri-information-line"></i>
                  {{ t('comp.playlist.import.textFormat') }}
                </div>
              </div>

              <!-- 元数据导入内容 -->
              <div v-if="currentTab === 'local'" class="p-6 space-y-6 animate-fade-in">
                <div class="space-y-3">
                  <div
                    v-for="(item, index) in localMetadata"
                    :key="index"
                    class="flex gap-3 items-center group"
                  >
                    <div class="w-6 text-center text-xs text-gray-300 font-mono">
                      {{ index + 1 }}
                    </div>
                    <input
                      v-model="item.name"
                      :placeholder="t('comp.playlist.import.songNamePlaceholder')"
                      class="flex-1 bg-gray-50 dark:bg-white/5 border-transparent focus:border-primary/50 rounded-xl px-4 py-2.5 outline-none text-sm transition-all border-2"
                    />
                    <input
                      v-model="item.artist"
                      :placeholder="t('comp.playlist.import.artistNamePlaceholder')"
                      class="flex-1 bg-gray-50 dark:bg-white/5 border-transparent focus:border-primary/50 rounded-xl px-4 py-2.5 outline-none text-sm transition-all border-2"
                    />
                    <input
                      v-model="item.album"
                      :placeholder="t('comp.playlist.import.albumNamePlaceholder')"
                      class="flex-1 bg-gray-50 dark:bg-white/5 border-transparent focus:border-primary/50 rounded-xl px-4 py-2.5 outline-none text-sm transition-all border-2"
                    />
                    <button
                      v-if="localMetadata.length > 1"
                      class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                      @click="removeMetadataRow(index)"
                    >
                      <i class="ri-delete-bin-line"></i>
                    </button>
                  </div>
                  <button
                    class="ml-9 px-4 py-2 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-colors flex items-center gap-1"
                    @click="addMetadataRow"
                  >
                    <i class="ri-add-line"></i>
                    {{ t('comp.playlist.import.addSongButton') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 帮助提示 (根据 Tab 变化) -->
            <div
              class="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/20"
            >
              <div class="flex gap-3">
                <div class="mt-0.5 text-blue-500">
                  <i class="ri-lightbulb-flash-line text-lg"></i>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div class="font-medium text-gray-900 dark:text-gray-200 mb-1">
                    {{ t('comp.playlist.import.linkTips') }}
                  </div>
                  <ul class="list-disc list-inside opacity-80 space-y-1">
                    <li v-if="currentTab === 'link'">{{ t('comp.playlist.import.linkTip1') }}</li>
                    <li v-if="currentTab === 'link'">{{ t('comp.playlist.import.linkTip2') }}</li>
                    <li v-if="currentTab === 'link'">{{ t('comp.playlist.import.linkTip3') }}</li>
                    <li v-if="currentTab === 'text'">{{ t('comp.playlist.import.textTips') }}</li>
                    <li v-if="currentTab === 'local'">{{ t('comp.playlist.import.localTips') }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：选项与操作 -->
          <div class="space-y-6">
            <!-- 选项卡片 -->
            <div
              class="bg-white dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-6"
            >
              <h3 class="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <i class="ri-settings-4-line text-primary"></i>
                {{ t('comp.playlist.import.options') }}
              </h3>

              <div class="space-y-4">
                <!-- 导入到星标歌单开关 -->
                <div
                  class="flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2"
                  :class="
                    importToStarPlaylist
                      ? 'bg-primary/5 border-primary/50'
                      : 'bg-gray-50 dark:bg-white/5 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'
                  "
                  @click="importToStarPlaylist = !importToStarPlaylist"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-lg"
                      :class="importToStarPlaylist ? 'text-primary' : 'text-gray-400'"
                    >
                      <i class="ri-heart-3-fill" v-if="importToStarPlaylist"></i>
                      <i class="ri-heart-3-line" v-else></i>
                    </div>
                    <span class="font-medium text-sm">{{
                      t('comp.playlist.import.importToStarPlaylist')
                    }}</span>
                  </div>
                  <div
                    class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                    :class="
                      importToStarPlaylist
                        ? 'border-primary bg-primary'
                        : 'border-gray-300 dark:border-gray-600'
                    "
                  >
                    <i class="ri-check-line text-white text-xs" v-show="importToStarPlaylist"></i>
                  </div>
                </div>

                <!-- 自定义歌单名 -->
                <div
                  class="relative group"
                  :class="{ 'opacity-50 pointer-events-none': importToStarPlaylist }"
                >
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i class="ri-play-list-line text-gray-400"></i>
                  </div>
                  <input
                    v-model="playlistName"
                    :placeholder="t('comp.playlist.import.playlistNamePlaceholder')"
                    class="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-primary/50 rounded-2xl pl-11 pr-4 py-3.5 outline-none transition-all text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <!-- 主操作按钮 -->
              <button
                class="w-full mt-6 py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300 flex items-center justify-center gap-2"
                :disabled="isImportDisabled"
                @click="handleImport"
              >
                <i class="ri-loader-4-line animate-spin text-xl" v-if="importing"></i>
                <i class="ri-download-cloud-2-line text-xl" v-else></i>
                {{
                  importing
                    ? t('comp.playlist.import.statusProcessing')
                    : t('comp.playlist.import.importButton')
                }}
              </button>
            </div>

            <!-- 状态反馈 -->
            <div v-if="taskId" class="animate-fade-in-up">
              <div
                class="bg-white dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-6"
              >
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {{ t('comp.playlist.import.importStatus') }}
                  </h3>
                  <button class="text-xs text-primary hover:underline" @click="refreshStatus">
                    {{ t('comp.playlist.import.refresh') }}
                  </button>
                </div>

                <div class="relative pt-2">
                  <div class="flex items-center gap-4 mb-4">
                    <div
                      class="w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-colors"
                      :class="{
                        'bg-blue-50 text-blue-500':
                          taskStatus === 'processing' || taskStatus === 'pending',
                        'bg-green-50 text-green-500': taskStatus === 'success',
                        'bg-red-50 text-red-500': taskStatus === 'failed'
                      }"
                    >
                      <i
                        class="ri-loader-4-line animate-spin"
                        v-if="taskStatus === 'processing' || taskStatus === 'pending'"
                      ></i>
                      <i class="ri-check-line" v-else-if="taskStatus === 'success'"></i>
                      <i class="ri-close-line" v-else-if="taskStatus === 'failed'"></i>
                    </div>
                    <div>
                      <div class="font-bold text-lg text-gray-900 dark:text-white">
                        {{ getStatusText(taskStatus) }}
                      </div>
                      <div class="text-xs text-gray-400 font-mono">{{ taskId }}</div>
                    </div>
                  </div>

                  <div
                    v-if="taskStatus === 'success'"
                    class="bg-green-50 dark:bg-green-900/10 rounded-xl p-3 text-green-700 dark:text-green-400 text-sm flex justify-between"
                  >
                    <span>{{ t('comp.playlist.import.successCount') }}</span>
                    <span class="font-bold">{{ successCount }}</span>
                  </div>

                  <div
                    v-if="taskStatus === 'failed'"
                    class="bg-red-50 dark:bg-red-900/10 rounded-xl p-3 text-red-700 dark:text-red-400 text-sm"
                  >
                    {{ failReason }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getImportTaskStatus, importPlaylist } from '@/api/playlist';

const { t } = useI18n();
const message = useMessage();

// Tab 配置
const currentTab = ref('link');
const tabs = computed(() => [
  { id: 'link', label: t('comp.playlist.import.linkTab'), icon: 'ri-link' },
  { id: 'text', label: t('comp.playlist.import.textTab'), icon: 'ri-text' },
  { id: 'local', label: t('comp.playlist.import.localTab'), icon: 'ri-file-list-3-line' }
]);

// 计算 Tab 指示器位置
const tabIndicatorStyle = computed(() => {
  const index = tabs.value.findIndex((tab) => tab.id === currentTab.value);
  // 假设每个 tab 宽度大概一致，这里简单计算百分比
  // 在真实项目中可能需要获取 DOM 元素宽度
  return {
    left: `calc(${(100 / 3) * index}% + 6px)`,
    width: `calc(${100 / 3}% - 12px)`
  };
});

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

// 元数据相关函数
const addMetadataRow = () => {
  localMetadata.value.push({ name: '', artist: '', album: '' });
};

const removeMetadataRow = (index: number) => {
  localMetadata.value.splice(index, 1);
};

// 验证逻辑
const isLinkInputValid = computed(() => linkInputs.value.some((item) => item.value.trim() !== ''));
const isLocalMetadataValid = computed(() =>
  localMetadata.value.some((item) => item.name.trim() !== '')
);

const isImportDisabled = computed(() => {
  if (importing.value) return true;
  if (currentTab.value === 'link') return !isLinkInputValid.value;
  if (currentTab.value === 'text') return !textInput.value.trim();
  if (currentTab.value === 'local') return !isLocalMetadataValid.value;
  return true;
});

// 统一导入处理
const importing = ref(false);
const taskId = ref('');
const taskStatus = ref('');
const successCount = ref(0);
const failReason = ref('');
const checkingStatus = ref(false);
const statusCheckInterval = ref<number | null>(null);

const handleImport = async () => {
  if (isImportDisabled.value) return;

  try {
    importing.value = true;
    let params: any = {};

    if (currentTab.value === 'link') {
      const links = linkInputs.value
        .filter((link) => link.value.trim())
        .map((link) => link.value.trim());
      params.link = JSON.stringify(links);
    } else if (currentTab.value === 'text') {
      params.text = encodeURIComponent(textInput.value);
    } else if (currentTab.value === 'local') {
      const filteredData = localMetadata.value.filter((item) => item.name.trim() !== '');
      params.local = JSON.stringify(filteredData);
    }

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

// 任务状态检查逻辑 (复用之前的逻辑)
const startStatusCheck = () => {
  if (statusCheckInterval.value) clearInterval(statusCheckInterval.value);
  checkTaskStatus();
  statusCheckInterval.value = window.setInterval(checkTaskStatus, 3000);
};

const checkTaskStatus = async () => {
  if (!taskId.value) return;
  try {
    checkingStatus.value = true;
    const res = await getImportTaskStatus(taskId.value);
    if (res.data.code === 200 && res.data.data.tasks?.length > 0) {
      const taskData = res.data.data.tasks[0];
      const statusMap: Record<string, string> = {
        PENDING: 'pending',
        PROCESSING: 'processing',
        COMPLETE: 'success',
        FAILED: 'failed'
      };
      taskStatus.value = statusMap[taskData.status] || 'pending';

      if (taskStatus.value === 'success') {
        successCount.value = taskData.succCount || 0;
        if (statusCheckInterval.value) clearInterval(statusCheckInterval.value);
      } else if (taskStatus.value === 'failed') {
        failReason.value = taskData.msg || t('comp.playlist.import.unknownError');
        if (statusCheckInterval.value) clearInterval(statusCheckInterval.value);
      }
    }
  } catch (error) {
    console.error('检查任务状态失败:', error);
  } finally {
    checkingStatus.value = false;
  }
};

const refreshStatus = () => checkTaskStatus();

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
  if (taskId.value) startStatusCheck();
});

onUnmounted(() => {
  if (statusCheckInterval.value) clearInterval(statusCheckInterval.value);
});
</script>

<style lang="scss" scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}

.animate-fade-in-up {
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<template>
  <n-scrollbar>
    <div class="set-page">
      <div class="set-item">
        <div>
          <div class="set-item-title">主题模式</div>
          <div class="set-item-content">切换日间/夜间主题</div>
        </div>
        <n-switch v-model:value="isDarkTheme">
          <template #checked>
            <i class="ri-moon-line"></i>
          </template>
          <template #unchecked>
            <i class="ri-sun-line"></i>
          </template>
        </n-switch>
      </div>
      <!-- <div v-if="isElectron" class="set-item">
        <div>
          <div class="set-item-title">代理</div>
          <div class="set-item-content">无法听音乐时打开</div>
        </div>
        <n-switch v-model:value="setData.isProxy" />
      </div> -->
      <div class="set-item" v-if="isElectron">
        <div>
          <div class="set-item-title">音乐API端口</div>
          <div class="set-item-content">
            修改后需要重启应用
          </div>
        </div>
        <n-input-number v-model:value="setData.musicApiPort" />
      </div>
      <div class="set-item">
        <div>
          <div class="set-item-title">动画速度</div>
          <div class="set-item-content">调节动画播放速度</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-400">{{ setData.animationSpeed }}x</span>
          <div class="w-40">
            <n-slider
              v-model:value="setData.animationSpeed"
              :min="0.1"
              :max="3"
              :step="0.1"
              :marks="{
                0.1: '极慢',
                1: '正常',
                3: '极快'
              }"
              :disabled="setData.noAnimate"
              class="w-40"
            />
          </div>
        </div>
      </div>
      <div class="set-item" v-if="isElectron">
        <div>
          <div class="set-item-title">下载目录</div>
          <div class="set-item-content">
            {{ setData.downloadPath || '默认下载目录' }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <n-button size="small" @click="openDownloadPath">打开目录</n-button>
          <n-button size="small" @click="selectDownloadPath">修改目录</n-button>
        </div>
      </div>
      <div class="set-item">
        <div>
          <div class="set-item-title">版本</div>
          <div class="set-item-content">
            {{ updateInfo.currentVersion }}
            <template v-if="updateInfo.hasUpdate">
              <n-tag type="success" class="ml-2">发现新版本 {{ updateInfo.latestVersion }}</n-tag>
            </template>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <n-button
            :type="updateInfo.hasUpdate ? 'primary' : 'default'"
            size="small"
            :loading="checking"
            @click="checkForUpdates(true)"
          >
            {{ checking ? '检查中...' : '检查更新' }}
          </n-button>
          <n-button
            v-if="updateInfo.hasUpdate"
            type="success"
            size="small"
            @click="openReleasePage"
          >
            前往更新
          </n-button>
        </div>
      </div>
      <div
        class="set-item cursor-pointer hover:text-green-500 hover:bg-green-950 transition-all"
        @click="openAuthor"
      >
        <div>
         <Coffee>
          <div>
            <div class="set-item-title">作者</div>
            <div class="set-item-content">algerkong 点个star🌟呗</div>
          </div>
         </Coffee>
        </div>
        <div>
          <n-button size="small" type="primary" @click="openAuthor"><i class="ri-github-line"></i>前往github</n-button>
        </div>
      </div>
      <div class="set-item" v-if="isElectron">
        <div>
          <div class="set-item-title">关闭行为</div>
          <div class="set-item-content">
            {{ closeActionLabels[setData.closeAction] || '每次询问' }}
          </div>
        </div>
        <n-select
          v-model:value="setData.closeAction"
          :options="[
            { label: '每次询问', value: 'ask' },
            { label: '最小化到托盘', value: 'minimize' },
            { label: '直接退出', value: 'close' }
          ]"
          style="width: 120px"
        />
      </div>
      <div class="set-item" v-if="isElectron">
        <div>
          <div class="set-item-title">重启</div>
          <div class="set-item-content">重启应用</div>
        </div>
        <n-button type="primary" @click="restartApp">重启</n-button>
      </div>
    </div>
    <PlayBottom/>
  </n-scrollbar>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useMessage } from 'naive-ui';
import { isElectron } from '@/utils';
import { checkUpdate, UpdateResult } from '@/utils/update';
import { selectDirectory, openDirectory } from '@/utils/fileOperation';
import config from '../../../../package.json';
import PlayBottom from '@/components/common/PlayBottom.vue';
import Coffee from '@/components/Coffee.vue';

const store = useStore();
const checking = ref(false);
const updateInfo = ref<UpdateResult>({
  hasUpdate: false,
  latestVersion: '',
  currentVersion: config.version,
  releaseInfo: null
});

const closeActionLabels = {
  ask: '每次询问',
  minimize: '最小化到托盘',
  close: '直接退出'
} as const;

const setData = computed(() => store.state.setData);

watch(() => setData.value, (newVal) => {
  store.commit('setSetData', newVal)
}, { deep: true });

const isDarkTheme = computed({
  get: () => store.state.theme === 'dark',
  set: () => store.commit('toggleTheme')
});

const openAuthor = () => {
  window.open(setData.value.authorUrl);
};

const restartApp = () => {
  window.electron.ipcRenderer.send('restart');
};
const message = useMessage();
const checkForUpdates = async (isClick = false) => {
  checking.value = true;
  try {
    const result = await checkUpdate(config.version);
    if (result) {
      updateInfo.value = result;
      if (!result.hasUpdate && isClick) {
        message.success('当前已是最新版本');
      }
    } else if (isClick) {
      message.success('当前已是最新版本');
    }
  } catch (error) {
    console.error('检查更新失败:', error);
    if (isClick) {
      message.error('检查更新失败，请稍后重试');
    }
  } finally {
    checking.value = false;
  }
};

const openReleasePage = () => {
  window.open(updateInfo.value.releaseInfo?.html_url || 'https://github.com/algerkong/AlgerMusicPlayer/releases/latest', '_blank');
};

const selectDownloadPath = async () => {
  const path = await selectDirectory(message);
  if (path) {
    store.commit('setSetData', {
      ...setData.value,
      downloadPath: path
    });
  }
};

const openDownloadPath = () => {
  openDirectory(setData.value.downloadPath, message);
};

onMounted(() => {
  checkForUpdates();
});
</script>

<style lang="scss" scoped>
.set-page {
  @apply p-4 bg-light dark:bg-dark pb-20;
}

.set-item {
  @apply flex items-center justify-between p-4 rounded-lg mb-4 transition-all;
  @apply bg-light dark:bg-dark text-gray-900 dark:text-white;
  @apply border border-gray-200 dark:border-gray-700;

  &-title {
    @apply text-base font-medium mb-1;
  }

  &-content {
    @apply text-sm text-gray-500 dark:text-gray-400;
  }

  &:hover {
    @apply bg-gray-50 dark:bg-gray-800;
  }

  &.cursor-pointer:hover {
    @apply text-green-500 bg-green-50 dark:bg-green-900;
  }
}
</style>

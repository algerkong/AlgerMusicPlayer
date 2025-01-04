<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    :show-icon="false"
    :mask-closable="true"
    class="update-app-modal"
    style="width: 800px; max-width: 90vw"
  >
    <div class="modal-content">
      <div class="modal-header">
        <div class="app-icon">
          <img src="@/assets/logo.png" alt="App Icon" />
        </div>
        <div class="app-info">
          <h2 class="app-name">发现新版本 {{ updateInfo.latestVersion }}</h2>
          <p class="app-desc mb-2">当前版本 {{ updateInfo.currentVersion }}</p>
          <n-checkbox v-model:checked="noPrompt">不再提示</n-checkbox>
        </div>
      </div>
      <div class="update-info">
        <n-scrollbar style="max-height: 300px">
          <div class="update-body" v-html="parsedReleaseNotes"></div>
        </n-scrollbar>
      </div>
      <div class="modal-actions">
        <n-button class="cancel-btn" @click="closeModal">暂不更新</n-button>
        <n-button type="primary" class="update-btn" @click="handleUpdate">立即更新</n-button>
      </div>
      <div class="modal-desc mt-4 text-center">
        <p class="text-xs text-gray-400">
          下载遇到问题？去
          <a
            class="text-green-500"
            target="_blank"
            href="https://github.com/algerkong/AlgerMusicPlayer/releases"
            >GitHub</a
          >
          下载最新版本
        </p>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { marked } from 'marked';
import { checkUpdate, UpdateResult } from '@/utils/update';
import config from '../../../../package.json';
import { useStore } from 'vuex';

// 配置 marked
marked.setOptions({
  breaks: true, // 支持 GitHub 风格的换行
  gfm: true // 启用 GitHub 风格的 Markdown
});

const showModal = ref(false);
const noPrompt = ref(false);
const updateInfo = ref<UpdateResult>({
  hasUpdate: false,
  latestVersion: '',
  currentVersion: config.version,
  releaseInfo: null
});

const store = useStore()

// 添加计算属性
const showUpdateModalState = computed({
  get: () => store.state.showUpdateModal,
  set: (val) => store.commit('SET_SHOW_UPDATE_MODAL', val)
})

// 替换原来的 watch
watch(showUpdateModalState, (newVal) => {
  if (newVal) {
    showModal.value = true
  }
})

watch(() => showModal.value, (newVal) => {
  showUpdateModalState.value = newVal
})

// 解析 Markdown
const parsedReleaseNotes = computed(() => {
  if (!updateInfo.value.releaseInfo?.body) return '';
  try {
    return marked.parse(updateInfo.value.releaseInfo.body);
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return updateInfo.value.releaseInfo.body;
  }
});

const closeModal = () => {
  showModal.value = false;
  if (noPrompt.value) {
    localStorage.setItem('updatePromptDismissed', 'true');
  }
};

const checkForUpdates = async () => {
  try {
    const result = await checkUpdate(config.version);
    if (result) {
      updateInfo.value = result;
      if (localStorage.getItem('updatePromptDismissed') !== 'true') {
        showModal.value = true;
      }
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
};



const handleUpdate = async () => {
  
  const assets = updateInfo.value.releaseInfo?.assets || [];
  const platform = window.electron.process.platform;
  const arch = window.electron.ipcRenderer.sendSync('get-arch');
  console.log('arch',arch)
  console.log('platform',platform)
  const version =  updateInfo.value.latestVersion
  const downUrls = {
    win32: {
      all: `https://github.com/algerkong/AlgerMusicPlayer/releases/download/v${version}/AlgerMusicPlayer-${version}-win.exe`,
      x64: `https://github.com/algerkong/AlgerMusicPlayer/releases/download/v${version}/AlgerMusicPlayer-${version}-win-x64.exe`,
      ia32: `https://github.com/algerkong/AlgerMusicPlayer/releases/download/v${version}/AlgerMusicPlayer-${version}-win-ia32.exe`,
    },
    darwin: {
      all: `https://github.com/algerkong/AlgerMusicPlayer/releases/download/v${version}AlgerMusicPlayer-${version}-mac-universal.dmg`,
    },
    linux: {
      AppImage: `https://github.com/algerkong/AlgerMusicPlayer/releases/download/v${version}/AlgerMusicPlayer-${version}-linux-x64.AppImage`,
      deb: `https://github.com/algerkong/AlgerMusicPlayer/releases/download/v${version}/AlgerMusicPlayer-${version}-linux-x64.deb`,
    }
  }

  let downloadUrl = '';

  // 根据平台和架构选择对应的安装包
  if (platform === 'darwin') {
    // macOS
    const macAsset = assets.find(asset => 
      asset.name.includes('mac')
    );
    downloadUrl = macAsset?.browser_download_url || downUrls.darwin.all || '';
  } else if (platform === 'win32') {
    // Windows
    const winAsset = assets.find(asset => 
      asset.name.includes('win') && 
      (arch === 'x64' ? asset.name.includes('x64') : asset.name.includes('ia32'))
    );
    downloadUrl = winAsset?.browser_download_url || downUrls.win32[arch] || downUrls.win32.all || ''; 
  } else if (platform === 'linux') {
    // Linux
    const linuxAsset = assets.find(asset => 
      (asset.name.endsWith('.AppImage') || asset.name.endsWith('.deb')) && 
      asset.name.includes('x64')
    );
    downloadUrl = linuxAsset?.browser_download_url || downUrls.linux[arch] || '';
  }

  if (downloadUrl) {
    window.open(`https://www.ghproxy.cn/${downloadUrl}`, '_blank');
  } else {
    // 如果没有找到对应的安装包，跳转到 release 页面
    window.open('https://github.com/algerkong/AlgerMusicPlayer/releases/latest', '_blank');
  }
};

onMounted(() => {
  checkForUpdates();
});
</script>

<style lang="scss" scoped>
.update-app-modal {
  :deep(.n-modal) {
    @apply max-w-4xl;
  }
  .modal-content {
    @apply p-6 pb-4;
    .modal-header {
      @apply flex items-center mb-6;
      .app-icon {
        @apply w-24 h-24 mr-6 rounded-2xl overflow-hidden;
        img {
          @apply w-full h-full object-cover;
        }
      }
      .app-info {
        @apply flex-1;
        .app-name {
          @apply text-2xl font-bold mb-2;
        }
        .app-desc {
          @apply text-base text-gray-400;
        }
      }
    }
    .update-info {
      @apply mb-6 rounded-lg bg-gray-50 dark:bg-gray-800;
      .update-title {
        @apply text-base font-medium p-4 pb-2;
      }
      .update-body {
        @apply p-4 pt-2 text-gray-600 dark:text-gray-300 rounded-lg overflow-hidden;
        
        :deep(h1) {
          @apply text-xl font-bold mb-3;
        }
        :deep(h2) {
          @apply text-lg font-bold mb-3;
        }
        :deep(h3) {
          @apply text-base font-bold mb-2;
        }
        :deep(p) {
          @apply mb-3 leading-relaxed;
        }
        :deep(ul) {
          @apply list-disc list-inside mb-3;
        }
        :deep(ol) {
          @apply list-decimal list-inside mb-3;
        }
        :deep(li) {
          @apply mb-2 leading-relaxed;
        }
        :deep(code) {
          @apply px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200;
        }
        :deep(pre) {
          @apply p-3 rounded bg-gray-100 dark:bg-gray-700 overflow-x-auto mb-3;
          code {
            @apply bg-transparent p-0;
          }
        }
        :deep(blockquote) {
          @apply pl-4 border-l-4 border-gray-200 dark:border-gray-600 mb-3;
        }
        :deep(a) {
          @apply text-green-500 hover:text-green-600 dark:hover:text-green-400;
        }
        :deep(hr) {
          @apply my-4 border-gray-200 dark:border-gray-600;
        }
        :deep(table) {
          @apply w-full mb-3;
          th, td {
            @apply px-3 py-2 border border-gray-200 dark:border-gray-600;
          }
          th {
            @apply bg-gray-100 dark:bg-gray-700;
          }
        }
      }
    }
    .modal-actions {
      @apply flex gap-4 mt-6;
      .n-button {
        @apply flex-1 text-base py-2;
      }
      .cancel-btn {
        @apply bg-gray-800 text-gray-300 border-none;
        &:hover {
          @apply bg-gray-700;
        }
      }
      .update-btn {
        @apply bg-green-600 border-none;
        &:hover {
          @apply bg-green-500;
        }
      }
    }
  }
}
</style> 
<template>
  <div class="fixed left-6 bottom-24 z-[999]">
    <n-badge :value="downloadingCount" :max="99" :show="downloadingCount > 0">
      <n-button
        circle
        class="bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm hover:bg-light dark:hover:bg-dark-200 text-gray-600 dark:text-gray-300 transition-all duration-300 w-10 h-10"
        @click="navigateToDownloads"
      >
        <template #icon>
          <i class="iconfont ri-download-cloud-2-line text-xl"></i>
        </template>
      </n-button>
    </n-badge>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useDownloadStore } from '@/store/modules/download';

const router = useRouter();
const downloadStore = useDownloadStore();

const downloadingCount = computed(() => downloadStore.downloadingCount);

const navigateToDownloads = () => {
  router.push('/downloads');
};

onMounted(() => {
  downloadStore.initListeners();
  downloadStore.loadPersistedQueue();
});
</script>

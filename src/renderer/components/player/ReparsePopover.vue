<template>
  <n-popover
    trigger="click"
    :z-index="99999999"
    placement="top"
    content-class="music-source-popover"
    raw
    :show-arrow="false"
    :delay="200"
  >
    <template #trigger>
      <n-tooltip trigger="hover" :z-index="9999999">
        <template #trigger>
          <i
            class="iconfont ri-refresh-line"
            :class="{ 'text-green-500': isReparse, 'animate-spin': isReparsing }"
          ></i>
        </template>
        {{ t('player.playBar.reparse') }}
      </n-tooltip>
    </template>
    <div class="reparse-popover bg-light-100 dark:bg-dark-100 p-4 rounded-xl max-w-60">
      <div class="text-base font-medium mb-2">{{ t('player.reparse.title') }}</div>
      <div class="text-sm opacity-70 mb-3">{{ t('player.reparse.desc') }}</div>
      <div class="mb-3">
        <div class="flex flex-col space-y-2">
          <div
            v-for="source in musicSourceOptions"
            :key="source.value"
            class="source-button flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200 bg-light-200 dark:bg-dark-200 hover:bg-light-300 dark:hover:bg-dark-300"
            :class="{
              'bg-green-50 dark:bg-green-900/20 text-green-500': isCurrentSource(source.value),
              'opacity-50 cursor-not-allowed': isReparsing
            }"
            @click="directReparseMusic(source.value)"
          >
            <div class="flex items-center justify-center w-6 h-6 mr-3 text-lg">
              <i :class="getSourceIcon(source.value)"></i>
            </div>
            <div class="flex-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis">
              {{ source.label }}
            </div>
            <div
              v-if="isReparsing && currentReparsingSource === source.value"
              class="w-5 h-5 flex items-center justify-center"
            >
              <i class="ri-loader-4-line animate-spin"></i>
            </div>
            <div
              v-else-if="isCurrentSource(source.value)"
              class="w-5 h-5 flex items-center justify-center"
            >
              <i class="ri-check-line"></i>
            </div>
          </div>
        </div>
      </div>
      <!-- 清除自定义音源 -->
      <div
        class="text-red-500 text-sm flex items-center bg-light-200 dark:bg-dark-200 rounded-lg p-2 cursor-pointer"
        @click="clearCustomSource"
      >
        <div class="flex items-center justify-center w-6 h-6 mr-3 text-lg">
          <i class="ri-close-circle-line"></i>
        </div>
        <div>
          {{ t('player.reparse.clear') }}
        </div>
      </div>
    </div>
  </n-popover>
</template>

<script lang="ts" setup>
import { useMessage } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { CacheManager } from '@/api/musicParser';
import { playMusic } from '@/hooks/MusicHook';
import { SongSourceConfigManager } from '@/services/SongSourceConfigManager';
import { usePlayerStore } from '@/store/modules/player';
import type { Platform } from '@/types/music';

const playerStore = usePlayerStore();
const { t } = useI18n();
const message = useMessage();

// 音源重新解析状态
const isReparsing = ref(false);
const currentReparsingSource = ref<Platform | null>(null);

// 实际存储选中音源的值
const selectedSourcesValue = ref<Platform[]>([]);

const isReparse = computed(() => selectedSourcesValue.value.length > 0);

// 可选音源列表
const musicSourceOptions = ref([
  { label: 'MiGu', value: 'migu' as Platform },
  { label: 'KuGou', value: 'kugou' as Platform },
  { label: 'pyncmd', value: 'pyncmd' as Platform },
  { label: 'GdMuisc', value: 'gdmusic' as Platform }
]);

// 检查音源是否被选中
const isCurrentSource = (source: Platform) => {
  return selectedSourcesValue.value.includes(source);
};

// 获取音源图标
const getSourceIcon = (source: Platform) => {
  const iconMap: Record<Platform, string> = {
    migu: 'ri-music-2-fill',
    kugou: 'ri-music-fill',
    qq: 'ri-qq-fill',
    joox: 'ri-disc-fill',
    pyncmd: 'ri-netease-cloud-music-fill',
    gdmusic: 'ri-google-fill',
    kuwo: 'ri-music-fill',
    lxMusic: 'ri-leaf-fill'
  };

  return iconMap[source] || 'ri-music-2-fill';
};

// 初始化选中的音源
const initSelectedSources = () => {
  const songId = playMusic.value.id;
  const config = SongSourceConfigManager.getConfig(songId);

  if (config) {
    selectedSourcesValue.value = config.sources;
  } else {
    selectedSourcesValue.value = [];
  }
};

// 清除自定义音源
const clearCustomSource = () => {
  SongSourceConfigManager.clearConfig(playMusic.value.id);
  selectedSourcesValue.value = [];
};

// 直接重新解析当前歌曲
const directReparseMusic = async (source: Platform) => {
  if (isReparsing.value) {
    return;
  }

  try {
    isReparsing.value = true;
    currentReparsingSource.value = source;

    const songId = Number(playMusic.value.id);

    await CacheManager.clearMusicCache(songId);

    // 更新选中的音源值为当前点击的音源
    selectedSourcesValue.value = [source];

    // 使用 SongSourceConfigManager 保存配置（手动选择）
    SongSourceConfigManager.setConfig(songId, [source], 'manual');

    const success = await playerStore.reparseCurrentSong(source, false);

    if (success) {
      message.success(t('player.reparse.success'));
    } else {
      message.error(t('player.reparse.failed'));
    }
  } catch (error) {
    console.error('解析失败:', error);
    message.error(t('player.reparse.failed'));
  } finally {
    isReparsing.value = false;
    currentReparsingSource.value = null;
  }
};

// 监听歌曲ID变化，初始化音源设置
watch(
  () => playMusic.value.id,
  () => {
    if (playMusic.value.id) {
      initSelectedSources();
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.music-source-popover {
  @apply w-64 rounded-xl overflow-hidden;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.source-button {
  &:hover:not(.opacity-50) {
    @apply transform -translate-y-0.5 shadow-sm;
  }
}

.iconfont {
  @apply text-2xl mx-3;
}
</style>

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
      <div class="mb-3 max-h-80 overflow-y-auto">
        <div class="flex flex-col space-y-2">
          <template v-for="(group, groupIndex) in groupedSources" :key="group.key">
            <!-- 分组分隔线 -->
            <div
              v-if="groupIndex > 0"
              class="border-t border-gray-200 dark:border-gray-700 my-1"
            ></div>
            <div
              v-for="source in group.sources"
              :key="source.id"
              class="source-button flex items-center p-2 rounded-lg transition-all duration-200"
              :class="[
                source.available
                  ? 'cursor-pointer bg-light-200 dark:bg-dark-200 hover:bg-light-300 dark:hover:bg-dark-300'
                  : 'opacity-40 cursor-not-allowed bg-light-200 dark:bg-dark-200',
                {
                  'bg-green-50 dark:bg-green-900/20 text-green-500': isCurrentSource(source.id),
                  'opacity-50 cursor-not-allowed': isReparsing && source.available
                }
              ]"
              @click="source.available && handleSourceClick(source)"
            >
              <div
                class="flex items-center justify-center w-6 h-6 mr-3 text-lg"
                :style="{ color: source.color }"
              >
                <i :class="source.icon"></i>
              </div>
              <div class="flex-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                <span>{{ source.label }}</span>
                <n-tooltip v-if="!source.available && source.configHint" trigger="hover">
                  <template #trigger>
                    <i class="ri-information-line text-xs ml-1 opacity-60"></i>
                  </template>
                  {{ t(source.configHint) }}
                </n-tooltip>
              </div>
              <div
                v-if="isReparsing && currentReparsingId === source.id"
                class="w-5 h-5 flex items-center justify-center"
              >
                <i class="ri-loader-4-line animate-spin"></i>
              </div>
              <div
                v-else-if="isCurrentSource(source.id)"
                class="w-5 h-5 flex items-center justify-center"
              >
                <i class="ri-check-line"></i>
              </div>
            </div>
          </template>
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

import { playMusic } from '@/hooks/MusicHook';
import { MusicResolveCache } from '@/services/musicSource/cache';
import { reparseCurrentSong } from '@/services/playbackController';
import { SongSourceConfigManager } from '@/services/SongSourceConfigManager';
import type { Platform } from '@/types/music';
import { type MusicSourceGroup, useMusicSources } from '@/utils/musicSourceConfig';

type ReparseSourceItem = {
  id: string;
  platform: Platform;
  label: string;
  icon: string;
  color: string;
  group: MusicSourceGroup;
  available: boolean;
  configHint?: string;
};

const { t } = useI18n();
const message = useMessage();
const { allSources } = useMusicSources();

// 音源重新解析状态
const isReparsing = ref(false);
const currentReparsingId = ref<string | null>(null);

// 当前选中的音源条目 id
const selectedSourceId = ref<string | null>(null);

const isReparse = computed(() => selectedSourceId.value !== null);

// 重解析音源列表：注册表平铺（内置与插件同权，LX 脚本迁移后以插件身份出现）
const reparseSourceList = computed<ReparseSourceItem[]>(() =>
  allSources.value.map((source) => ({
    id: source.key,
    platform: source.key,
    label: source.label || source.key,
    icon: source.icon,
    color: source.color,
    group: source.group,
    available: source.available,
    configHint: source.configHint
  }))
);

// 按分组排列音源
const GROUP_ORDER: MusicSourceGroup[] = ['netease', 'builtin', 'unblock', 'plugin'];

const groupedSources = computed(() => {
  return GROUP_ORDER.map((groupKey) => ({
    key: groupKey,
    sources: reparseSourceList.value.filter((s) => s.group === groupKey)
  })).filter((g) => g.sources.length > 0);
});

// 检查音源条目是否被选中
const isCurrentSource = (sourceId: string) => {
  return selectedSourceId.value === sourceId;
};

// 初始化选中的音源
const initSelectedSources = () => {
  const songId = playMusic.value.id;
  const config = SongSourceConfigManager.getConfig(songId);

  if (config && config.sources.length > 0) {
    selectedSourceId.value = config.sources[0];
  } else {
    selectedSourceId.value = null;
  }
};

// 清除自定义音源
const clearCustomSource = () => {
  SongSourceConfigManager.clearConfig(playMusic.value.id);
  selectedSourceId.value = null;
};

// 点击音源条目
const handleSourceClick = async (source: ReparseSourceItem) => {
  await directReparseMusic(source);
};

// 直接重新解析当前歌曲（统一注册表 provider key 作为歌曲级音源覆盖）
const directReparseMusic = async (source: ReparseSourceItem) => {
  if (isReparsing.value) return;

  try {
    isReparsing.value = true;
    currentReparsingId.value = source.id;

    const songId = Number(playMusic.value.id);
    await MusicResolveCache.clearMusicCache(songId);

    selectedSourceId.value = source.id;
    SongSourceConfigManager.setConfig(songId, [source.platform], 'manual');

    const success = await reparseCurrentSong(source.platform, false);

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
    currentReparsingId.value = null;
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
  &:hover:not(.opacity-50):not(.opacity-40) {
    @apply transform -translate-y-0.5 shadow-sm;
  }
}

.iconfont {
  @apply text-2xl mx-3;
}
</style>

<script setup lang="ts">
import { usePodcastHistory } from '@/hooks/PodcastHistoryHook';
import { usePlayerStore } from '@/store';
import type { SongResult } from '@/types/music';
import type { DjProgram } from '@/types/podcast';
import { formatNumber, getImgUrl, secondToMinute } from '@/utils';

defineProps<{
  programs: DjProgram[];
  loading?: boolean;
}>();

const playerStore = usePlayerStore();
const { addPodcast } = usePodcastHistory();

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}分钟前`;
    }
    return `${hours}小时前`;
  }

  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const playProgram = async (program: DjProgram) => {
  try {
    const songData: SongResult = {
      id: program.mainSong.id,
      name: program.mainSong.name || program.name || '播客节目',
      duration: program.mainSong.duration,
      picUrl: program.coverUrl,
      ar: [
        {
          id: program.radio.id,
          name: program.radio.name,
          picId: 0,
          img1v1Id: 0,
          briefDesc: '',
          picUrl: '',
          img1v1Url: '',
          albumSize: 0,
          alias: [],
          trans: '',
          musicSize: 0,
          topicPerson: 0
        }
      ],
      al: {
        id: program.radio.id,
        name: program.radio.name,
        picUrl: program.coverUrl,
        type: '',
        size: 0,
        picId: 0,
        blurPicUrl: '',
        companyId: 0,
        pic: 0,
        picId_str: '',
        publishTime: 0,
        description: '',
        tags: '',
        company: '',
        briefDesc: '',
        artist: {
          id: 0,
          name: '',
          picUrl: '',
          alias: [],
          albumSize: 0,
          picId: 0,
          img1v1Url: '',
          img1v1Id: 0,
          trans: '',
          briefDesc: '',
          musicSize: 0,
          topicPerson: 0
        },
        songs: [],
        alias: [],
        status: 0,
        copyrightId: 0,
        commentThreadId: '',
        artists: [],
        subType: '',
        onSale: false,
        mark: 0
      },
      source: 'netease',
      count: 0
    };

    await playerStore.setPlay(songData);
    addPodcast(program);
  } catch (error) {
    console.error('播放节目失败:', error);
  }
};
</script>

<template>
  <div class="program-list">
    <n-spin :show="loading">
      <div v-if="programs.length === 0" class="text-center py-12 text-gray-400">暂无节目</div>

      <div v-else class="space-y-2">
        <div
          v-for="program in programs"
          :key="program.id"
          class="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group"
          @click="playProgram(program)"
        >
          <div class="relative flex-shrink-0 w-16 h-16">
            <img
              :src="getImgUrl(program.coverUrl, '100y100')"
              :alt="program.mainSong.name"
              class="w-full h-full rounded object-cover"
            />
            <div
              class="absolute inset-0 bg-black/40 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <i class="ri-play-fill text-white text-2xl"></i>
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-medium truncate">
              {{ program.mainSong.name || program.name }}
            </h4>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
              {{ program.description }}
            </p>
            <div class="text-xs text-gray-400 mt-1">
              {{ formatDate(program.createTime) }} ·
              {{ secondToMinute(program.mainSong.duration / 1000) }}
            </div>
          </div>

          <div class="flex-shrink-0 text-xs text-gray-400 text-right">
            <div>{{ formatNumber(program.listenerCount) }} {{ $t('podcast.listeners') }}</div>
            <div class="mt-1">{{ formatNumber(program.commentCount) }} 评论</div>
          </div>
        </div>
      </div>
    </n-spin>
  </div>
</template>

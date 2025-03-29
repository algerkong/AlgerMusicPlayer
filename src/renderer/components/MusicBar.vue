<template>
  <div
    class="music-bar-container"
    :class="{ playing: playerStore.isPlay && playerStore.playMusicUrl }"
  >
    <div class="music-bar-left">
      <div
        class="music-cover"
        :class="{ loading: playerStore.currentSong?.playLoading }"
        @click="openDetailPlayer"
      >
        <n-image
          v-if="playerStore.currentSong && playerStore.currentSong.picUrl"
          class="cover-image"
          :src="getSourcePic(playerStore.currentSong)"
          preview-disabled
          :object-fit="'cover'"
        />
        <n-spin v-if="playerStore.currentSong?.playLoading" size="small" />
      </div>
      <div class="music-info">
        <div class="music-title ellipsis-text">
          {{ playerStore.currentSong ? playerStore.currentSong.name : '' }}
        </div>
        <div class="music-artist ellipsis-text">
          {{ getArtistName(playerStore.currentSong) }}
        </div>
      </div>
    </div>
    <div class="music-bar-center">
      <div class="player-controls">
        <n-button quaternary circle class="control-button prev-button" @click="handlePrevClick">
          <template #icon>
            <i class="ri-skip-back-fill"></i>
          </template>
        </n-button>
        <n-button
          quaternary
          circle
          class="control-button play-button"
          :disabled="!playerStore.currentSong.id"
          @click="handlePlayClick"
        >
          <template #icon>
            <i :class="playerStore.isPlay ? 'ri-pause-fill' : 'ri-play-fill'"></i>
          </template>
        </n-button>
        <n-button quaternary circle class="control-button next-button" @click="handleNextClick">
          <template #icon>
            <i class="ri-skip-forward-fill"></i>
          </template>
        </n-button>
      </div>
      <div class="progress-container">
        <div class="time-text">{{ formatTime(currentTime) }}</div>
        <n-slider
          class="progress-slider"
          :value="playerProgress"
          :step="0.1"
          :max="duration"
          :tooltip="false"
          @update:value="handleProgressUpdate"
        />
        <div class="time-text">{{ formatTime(duration) }}</div>
      </div>
    </div>
    <div class="music-bar-right">
      <n-button quaternary circle class="control-button mode-button" @click="togglePlayMode">
        <template #icon>
          <i v-if="playerStore.playMode === 0" class="ri-repeat-2-line" />
          <i v-else-if="playerStore.playMode === 1" class="ri-repeat-one-line" />
          <i v-else-if="playerStore.playMode === 2" class="ri-shuffle-line" />
        </template>
      </n-button>
      <n-button quaternary circle class="control-button list-button" @click="togglePlayList">
        <template #icon>
          <i class="ri-play-list-line"></i>
        </template>
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { getBilibiliProxyUrl } from '@/api/bilibili';
import { usePlayerStore } from '@/store/modules/player';
import type { SongResult } from '@/type/music';
import { getImgUrl } from '@/utils';

const router = useRouter();
const playerStore = usePlayerStore();

const currentTime = ref(0);
const duration = ref(0);
const playerProgress = ref(0);
const showPlayList = ref(false);

let audioPlayer: HTMLAudioElement | null = null;

// 计算播放进度
const progress = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

// 监听播放状态
watch(
  () => playerStore.isPlay,
  (isPlay) => {
    if (!audioPlayer) return;
    if (isPlay) {
      audioPlayer.play().catch((error) => {
        console.error('播放失败:', error);
        playerStore.setIsPlay(false);
      });
    } else {
      audioPlayer.pause();
    }
  }
);

// 监听播放URL变化
watch(
  () => playerStore.playMusicUrl,
  (newUrl) => {
    if (!audioPlayer) return;
    if (newUrl) {
      audioPlayer.src = newUrl;
      if (playerStore.play) {
        audioPlayer.play().catch((error) => {
          console.error('播放失败:', error);
          playerStore.setIsPlay(false);
        });
      }
    }
  }
);

// 初始化播放器
onMounted(() => {
  audioPlayer = new Audio();

  // 设置初始音频
  if (playerStore.playMusicUrl) {
    audioPlayer.src = playerStore.playMusicUrl;

    // 如果应该自动播放
    if (playerStore.play) {
      audioPlayer.play().catch((error) => {
        console.error('播放失败:', error);
        playerStore.setIsPlay(false);
      });
    }
  }

  // 添加事件监听
  audioPlayer.addEventListener('timeupdate', handleTimeUpdate);
  audioPlayer.addEventListener('loadeddata', handleLoadedData);
  audioPlayer.addEventListener('ended', handleEnded);
  audioPlayer.addEventListener('pause', () => playerStore.setIsPlay(false));
  audioPlayer.addEventListener('play', () => playerStore.setIsPlay(true));
  audioPlayer.addEventListener('error', handleError);
});

// 处理播放时间更新
const handleTimeUpdate = () => {
  if (!audioPlayer) return;
  currentTime.value = audioPlayer.currentTime;
  playerProgress.value = currentTime.value;

  // 保存播放进度到localStorage
  const playProgress = {
    songId: playerStore.currentSong.id,
    progress: currentTime.value
  };
  localStorage.setItem('playProgress', JSON.stringify(playProgress));
};

// 处理音频加载完成
const handleLoadedData = () => {
  if (!audioPlayer) return;
  duration.value = audioPlayer.duration;

  // 如果有保存的播放进度，恢复到对应位置
  if (playerStore.savedPlayProgress !== undefined) {
    audioPlayer.currentTime = playerStore.savedPlayProgress;
    playerStore.savedPlayProgress = undefined;
  }
};

// 处理播放结束
const handleEnded = () => {
  // 根据播放模式决定下一步操作
  if (playerStore.playMode === 1) {
    // 单曲循环
    if (audioPlayer) {
      audioPlayer.currentTime = 0;
      audioPlayer.play().catch((error) => {
        console.error('重新播放失败:', error);
        playerStore.setIsPlay(false);
      });
    }
  } else {
    // 列表循环或随机播放
    playerStore.nextPlay();
  }
};

// 处理播放错误
const handleError = (e: Event) => {
  console.error('音频播放出错:', e);
  if (audioPlayer?.error) {
    console.error('错误码:', audioPlayer.error.code);

    // 如果是B站音频可能链接过期，尝试重新获取
    if (playerStore.currentSong.source === 'bilibili' && playerStore.currentSong.bilibiliData) {
      console.log('B站音频播放错误，可能链接过期');
      // 这里可以添加重新获取B站音频链接的逻辑
    }
  }
};

// 处理播放/暂停按钮点击
const handlePlayClick = () => {
  if (!playerStore.currentSong.id) return;
  playerStore.setPlayMusic(!playerStore.isPlay);
};

// 处理上一曲按钮点击
const handlePrevClick = () => {
  playerStore.prevPlay();
};

// 处理下一曲按钮点击
const handleNextClick = () => {
  playerStore.nextPlay();
};

// 处理进度条更新
const handleProgressUpdate = (value: number) => {
  if (!audioPlayer) return;
  audioPlayer.currentTime = value;
  currentTime.value = value;
};

// 切换播放模式
const togglePlayMode = () => {
  playerStore.togglePlayMode();
};

// 切换播放列表显示
const togglePlayList = () => {
  showPlayList.value = !showPlayList.value;
  // 这里可以添加显示播放列表的逻辑
};

// 打开详情播放页
const openDetailPlayer = () => {
  if (!playerStore.currentSong.id) return;
  playerStore.setMusicFull(true);

  // 根据来源打开不同的详情页
  if (playerStore.currentSong.source === 'bilibili') {
    // 打开B站详情页
    if (playerStore.currentSong.bilibiliData?.bvid) {
      // 这里可以跳转到B站详情页或显示B站播放器组件
    }
  } else {
    // 打开网易云音乐详情页
    router.push({ path: '/lyric' });
  }
};

// 格式化时间
const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// 获取艺术家名称
const getArtistName = (song?: SongResult) => {
  if (!song) return '';

  // B站视频
  if (song.source === 'bilibili' && song.song?.ar?.[0]) {
    return song.song.ar[0].name || 'B站UP主';
  }

  // 网易云音乐
  if (song.song?.artists) {
    return song.song.artists.map((artist: any) => artist.name).join('/');
  }

  if (song.song?.ar) {
    return song.song.ar.map((artist: any) => artist.name).join('/');
  }

  return '';
};

// 根据来源获取封面图
const getSourcePic = (song: SongResult) => {
  if (!song || !song.picUrl) return '';

  // B站视频
  if (song.source === 'bilibili') {
    return song.picUrl; // B站封面已经在创建时使用getBilibiliProxyUrl处理过
  }

  // 网易云音乐
  return getImgUrl(song.picUrl, '150y150');
};
</script>

<style scoped lang="scss">
.music-bar-container {
  @apply flex items-center justify-between px-4 h-20 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700;

  &.playing {
    .music-cover {
      animation: rotate 20s linear infinite;
    }
  }
}

.music-bar-left {
  @apply flex items-center;
  width: 25%;

  .music-cover {
    @apply relative w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer;

    .cover-image {
      @apply w-full h-full object-cover;
    }

    &.loading {
      animation-play-state: paused;
    }
  }

  .music-info {
    @apply ml-2 flex flex-col;
    max-width: calc(100% - 56px);

    .music-title {
      @apply text-sm font-medium;
    }

    .music-artist {
      @apply text-xs text-gray-500 dark:text-gray-400;
    }
  }
}

.music-bar-center {
  @apply flex flex-col items-center;
  width: 50%;

  .player-controls {
    @apply flex items-center justify-center gap-2 mb-2;

    .control-button {
      @apply text-lg;

      &.play-button {
        @apply text-xl;
      }
    }
  }

  .progress-container {
    @apply flex items-center w-full;

    .time-text {
      @apply text-xs px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap;
    }

    .progress-slider {
      @apply flex-1;
    }
  }
}

.music-bar-right {
  @apply flex items-center justify-end;
  width: 25%;

  .control-button {
    @apply text-lg;
  }
}

.ellipsis-text {
  @apply whitespace-nowrap overflow-hidden text-ellipsis;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

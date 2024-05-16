<template>
  <div class="lyric-window" :class="theme">
    <div class="lyric-bar" :class="{ 'lyric-bar-hover': isDrag }">
      <div class="buttons">
        <!-- <div class="music-buttons">
          <div @click="handlePrev">
            <i class="iconfont icon-prev"></i>
          </div>
          <div class="music-buttons-play" @click="playMusicEvent">
            <i class="iconfont icon" :class="play ? 'icon-stop' : 'icon-play'"></i>
          </div>
          <div @click="handleEnded">
            <i class="iconfont icon-next"></i>
          </div>
        </div> -->
        <div class="check-theme" @click="checkTheme">
          <i v-if="theme === 'light'" class="icon ri-sun-line"></i>
          <i v-else class="icon ri-moon-line"></i>
        </div>
        <div class="button-move">
          <i class="icon ri-drag-move-2-line"></i>
        </div>
      </div>
    </div>
    <div v-if="lyricData.lrcArray[lyricData.nowIndex]" class="lyric-box">
      <h2 class="lyric lyric-current">{{ lyricData.lrcArray[lyricData.nowIndex].text }}</h2>
      <p class="lyric-current">{{ lyricData.currentLrc.trText }}</p>
      <template v-if="lyricData.lrcArray[lyricData.nowIndex + 1]">
        <h2 class="lyric lyric-next">
          {{ lyricData.lrcArray[lyricData.nowIndex + 1].text }}
        </h2>
        <p class="lyric-next">{{ lyricData.nextLrc.trText }}</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useIpcRenderer } from '@vueuse/electron';

const windowData = window as any;
const ipcRenderer = useIpcRenderer();

const lyricData = ref({
  currentLrc: {
    text: '',
    trText: '',
  },
  nextLrc: {
    text: '',
    trText: '',
  },
  currentTime: 0,
  nextTime: 0,
  nowTime: 0,
  allTime: 0,
  startCurrentTime: 0,
  lrcArray: [] as any,
  lrcTimeArray: [] as any,
  nowIndex: 0,
});

onMounted(() => {
  ipcRenderer.on('receive-lyric', (event, data) => {
    try {
      lyricData.value = JSON.parse(data);
      console.log('lyricData.value', lyricData.value);
    } catch (error) {
      console.error('error', error);
    }
  });
});
const theme = ref('dark');
const checkTheme = () => {
  if (theme.value === 'light') {
    theme.value = 'dark';
  } else {
    theme.value = 'light';
  }
};
// const drag = (event: MouseEvent) => {
//   windowData.electronAPI.dragStart(event);
// };
</script>

<style>
body {
  background-color: transparent !important;
}
</style>

<style lang="scss" scoped>
.lyric-window {
  width: 100vw;
  height: 100vh;
  @apply overflow-hidden text-gray-600 hover:bg-gray-400 hover:bg-opacity-75;
  &:hover .lyric-bar {
    opacity: 1;
  }
}

.icon {
  @apply text-xl hover:text-white;
}

.lyric-bar {
  background-color: #b1b1b1;
  @apply flex flex-col justify-center items-center;
  width: 100vw;
  height: 100px;
  opacity: 0;
  &:hover {
    opacity: 1;
  }
}
.lyric-bar-hover {
  opacity: 1;
}
.buttons {
  width: 100vw;
  height: 100px;
  @apply flex  justify-center items-center;
}
.button-move {
  -webkit-app-region: drag;
  cursor: move;
}
.music-buttons {
  @apply mx-6;
  -webkit-app-region: no-drag;

  .iconfont {
    @apply text-2xl hover:text-green-500 transition;
  }

  @apply flex items-center;

  > div {
    @apply cursor-pointer;
  }

  &-play {
    @apply flex justify-center items-center w-12 h-12 rounded-full mx-4 hover:bg-green-500 transition;
    background: #383838;
  }
}
.check-theme {
  font-size: 26px;
  cursor: pointer;
  opacity: 1;
}

.lyric {
  text-shadow: 0 0 10px #fff;
  font-size: 4vw;
  @apply font-bold m-0 p-0 whitespace-nowrap select-none pointer-events-none;
}

.lyric-current {
  color: #333;
}

.lyric-next {
  color: #999;
  margin: 10px;
}

.lyric-window.dark {
  .lyric {
    text-shadow: none;
  }
  .lyric-current {
    color: #fff;
  }
  .lyric-next {
    color: #cecece;
  }
}
// .lyric-box {
//   writing-mode: vertical-rl;
// }
</style>

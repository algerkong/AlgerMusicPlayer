<template>
  <div class="lyric-window" :class="[lyricSetting.theme, { lyric_lock: lyricSetting.isLock }]">
    <div class="drag-bar"></div>
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
        <div class="button check-theme" @click="checkTheme">
          <i v-if="lyricSetting.theme === 'light'" class="icon ri-sun-line"></i>
          <i v-else class="icon ri-moon-line"></i>
        </div>
        <div class="button">
          <i class="icon ri-share-2-line" :class="{ checked: lyricSetting.isTop }" @click="handleTop"></i>
        </div>
        <div class="button button-lock" @click="handleLock">
          <i v-if="lyricSetting.isLock" class="icon ri-lock-line"></i>
          <i v-else class="icon ri-lock-unlock-line"></i>
        </div>
        <div class="button">
          <i class="icon ri-close-circle-line" @click="handleClose"></i>
        </div>
      </div>
    </div>
    <div id="clickThroughElement" class="lyric-box">
      <template v-if="lyricData.lrcArray[lyricData.nowIndex]">
        <h2 class="lyric lyric-current">{{ lyricData.lrcArray[lyricData.nowIndex].text }}</h2>
        <p class="lyric-current">{{ lyricData.currentLrc.trText }}</p>
        <template v-if="lyricData.lrcArray[lyricData.nowIndex + 1]">
          <h2 class="lyric lyric-next">
            {{ lyricData.lrcArray[lyricData.nowIndex + 1].text }}
          </h2>
          <p class="lyric-next">{{ lyricData.nextLrc.trText }}</p>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useIpcRenderer } from '@vueuse/electron';

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

const lyricSetting = ref({
  ...(localStorage.getItem('lyricData')
    ? JSON.parse(localStorage.getItem('lyricData') || '')
    : {
        isTop: false,
        theme: 'light',
        isLock: false,
      }),
});

onMounted(() => {
  ipcRenderer.on('receive-lyric', (event, data) => {
    try {
      lyricData.value = JSON.parse(data);
    } catch (error) {
      console.error('error', error);
    }
  });
});

const checkTheme = () => {
  if (lyricSetting.value.theme === 'light') {
    lyricSetting.value.theme = 'dark';
  } else {
    lyricSetting.value.theme = 'light';
  }
};

const handleTop = () => {
  lyricSetting.value.isTop = !lyricSetting.value.isTop;
  ipcRenderer.send('top-lyric', lyricSetting.value.isTop);
};

const handleLock = () => {
  lyricSetting.value.isLock = !lyricSetting.value.isLock;
};

const handleClose = () => {
  ipcRenderer.send('close-lyric');
};

watch(
  () => lyricSetting.value,
  (newValue) => {
    localStorage.setItem('lyricData', JSON.stringify(newValue));
  },
  { deep: true },
);

// onMounted(() => {
//   const el = document.getElementById('clickThroughElement') as HTMLElement;
//   el.addEventListener('mouseenter', () => {
//     if (lyricSetting.value.isLock) ipcRenderer.send('mouseenter-lyric');
//   });
//   el.addEventListener('mouseleave', () => {
//     if (lyricSetting.value.isLock) ipcRenderer.send('mouseleave-lyric');
//   });
// });
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
  @apply overflow-hidden text-gray-600 rounded-xl box-border;
  // border: 4px solid transparent;
  &:hover .lyric-bar {
    opacity: 1;
  }
  &:hover .drag-bar {
    opacity: 1;
  }
  &:hover {
    box-shadow: inset 0 0 10px 0 rgba(255, 255, 255, 0.5);
  }
}

.lyric_lock {
  &:hover {
    box-shadow: none;
  }
  &:hover .lyric-bar {
    background-color: transparent;
    .button {
      opacity: 0;
    }
    .button-lock {
      opacity: 1;
      color: #d6d6d6;
    }
  }
  &:hover .drag-bar {
    opacity: 0;
  }
}

.icon {
  @apply text-xl hover:text-white;
}

.lyric-bar {
  background-color: #b1b1b1;
  @apply flex flex-col justify-center items-center;
  width: 100vw;
  height: 40px;
  opacity: 0;
  &:hover {
    opacity: 1;
  }
}
.lyric-bar-hover {
  opacity: 1;
}

.drag-bar {
  -webkit-app-region: drag;
  height: 20px;
  cursor: move;
  background-color: #383838;
  opacity: 0;
}
.buttons {
  width: 100vw;
  height: 100px;
  @apply flex  justify-center items-center gap-4;
}
.button {
  @apply cursor-pointer text-center;
}
.checked {
  color: #fff !important;
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
  text-shadow: 0 0 1vw #2c2c2c;
  font-size: 4vw;
  @apply font-bold m-0 p-0 select-none pointer-events-none;
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
    text-shadow: 0 0 1vw #000000;
  }
  .lyric-current {
    color: #fff;
  }
  .lyric-next {
    color: #cecece;
  }
}
.lyric-box {
  // writing-mode: vertical-rl;
  padding: 10px;
}
</style>

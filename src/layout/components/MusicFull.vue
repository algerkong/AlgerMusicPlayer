<template>
  <n-drawer :show="musicFull" height="100vh" placement="bottom" :style="{ backgroundColor: 'transparent' }">
    <div id="drawer-target">
      <div class="drawer-back" :style="{ background: background }"></div>
      <div class="music-img">
        <n-image ref="PicImgRef" :src="getImgUrl(playMusic?.picUrl, '300y300')" class="img" lazy preview-disabled />
      </div>
      <div class="music-content">
        <div class="music-content-name">{{ playMusic.name }}</div>
        <div class="music-content-singer">
          <span v-for="(item, index) in playMusic.song.artists" :key="index">
            {{ item.name }}{{ index < playMusic.song.artists.length - 1 ? ' / ' : '' }}
          </span>
        </div>
        <n-layout
          ref="lrcSider"
          class="music-lrc"
          style="height: 55vh"
          :native-scrollbar="false"
          @mouseover="mouseOverLayout"
          @mouseleave="mouseLeaveLayout"
        >
          <template v-for="(item, index) in lrcArray" :key="index">
            <div
              class="music-lrc-text"
              :class="{ 'now-text': isCurrentLrc(index, nowTime) }"
              @click="setAudioTime(index, audio)"
            >
              <div>{{ item.text }}</div>
              <div class="music-lrc-text-tr">{{ item.trText }}</div>
            </div>
          </template>
        </n-layout>
        <!-- 时间矫正 -->
        <div class="music-content-time">
          <n-button @click="reduceCorrectionTime(0.2)">-</n-button>
          <n-button @click="addCorrectionTime(0.2)">+</n-button>
        </div>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { useStore } from 'vuex';

import {
  addCorrectionTime,
  isCurrentLrc,
  lrcArray,
  newLrcIndex,
  nowTime,
  reduceCorrectionTime,
  setAudioTime,
} from '@/hooks/MusicHook';
import type { SongResult } from '@/type/music';
import { getImgUrl } from '@/utils';

const store = useStore();

// 播放的音乐信息
const playMusic = computed(() => store.state.playMusic as SongResult);
// const isPlaying = computed(() => store.state.play as boolean);
// 获取歌词滚动dom
const lrcSider = ref<any>(null);
const isMouse = ref(false);

const props = defineProps({
  musicFull: {
    type: Boolean,
    default: false,
  },
  audio: {
    type: HTMLAudioElement,
    default: null,
  },
  background: {
    type: String,
    default: '',
  },
});

// 歌词滚动方法
const lrcScroll = () => {
  if (props.musicFull && !isMouse.value) {
    const top = newLrcIndex.value * 60 - 225;
    lrcSider.value.scrollTo({ top, behavior: 'smooth' });
  }
};
const mouseOverLayout = () => {
  isMouse.value = true;
};
const mouseLeaveLayout = () => {
  setTimeout(() => {
    isMouse.value = false;
  }, 3000);
};

defineExpose({
  lrcScroll,
});
</script>

<style scoped lang="scss">
@keyframes round {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.drawer-back {
  @apply absolute bg-cover bg-center;
  filter: brightness(80%);
  z-index: -1;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  // animation: round 20s linear infinite;
  // will-change: transform;
  // transform: translateZ(0);
}

.drawer-back.paused {
  animation-play-state: paused;
}

#drawer-target {
  @apply top-0 left-0 absolute w-full h-full overflow-hidden rounded px-24 pt-24 pb-48 flex items-center;
  backdrop-filter: blur(20px);
  background-color: rgba(0, 0, 0, 0.747);
  animation-duration: 300ms;

  .music-img {
    @apply flex-1 flex justify-center mr-24;

    .img {
      width: 350px;
      height: 350px;
      @apply rounded-xl;
    }
  }

  .music-content {
    @apply flex flex-col justify-center items-center;

    &-name {
      @apply font-bold text-3xl py-2;
    }

    &-singer {
      @apply text-base py-2;
    }
  }

  .music-content-time {
    display: none;
    @apply flex justify-center items-center;
  }

  .music-lrc {
    background-color: inherit;
    width: 500px;
    height: 550px;
    .now-text {
      @apply text-green-500;
    }
    &-text {
      @apply text-white text-lg flex flex-col justify-center items-center cursor-pointer font-bold;
      height: 60px;
      transition: all 0.2s ease-out;

      &:hover {
        @apply font-bold text-green-500;
      }

      &-tr {
        @apply text-sm  font-normal;
      }
    }
  }
}

.mobile {
  #drawer-target {
    @apply flex-col p-4 pt-8;
    .music-img {
      display: none;
    }
    .music-lrc {
      height: calc(100vh - 260px) !important;
    }
  }
}
</style>

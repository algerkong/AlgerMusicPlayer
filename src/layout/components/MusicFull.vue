<template>
  <n-drawer
    :show="musicFull"
    height="100vh"
    placement="bottom"
    :drawer-style="{ backgroundColor: 'transparent' }"
  >
    <div id="drawer-target">
      <div class="music-img">
        <n-image
          ref="PicImgRef"
          :src="getImgUrl(playMusic?.picUrl, '300y300')"
          class="img"
          lazy
          preview-disabled
        />
      </div>
      <div class="music-content">
        <div class="music-content-name">{{ playMusic.song.name }}</div>
        <div class="music-content-singer">
          <span v-for="(item, index) in playMusic.song.artists" :key="index">
            {{ item.name
            }}{{ index < playMusic.song.artists.length - 1 ? ' / ' : '' }}
          </span>
        </div>
        <n-layout
          class="music-lrc"
          style="height: 550px"
          ref="lrcSider"
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
              {{ item.text }}
            </div>
          </template>
        </n-layout>
        <!-- 时间矫正 -->
        <div class="music-content-time"></div>
        <n-button @click="reduceCorrectionTime(0.2)">-0.2</n-button>
        <n-button @click="addCorrectionTime(0.2)">+0.2</n-button>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import type { SongResult } from '@/type/music'
import { getImgUrl } from '@/utils'
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import {
  lrcArray,
  newLrcIndex,
  isCurrentLrc,
  addCorrectionTime,
  reduceCorrectionTime,
  setAudioTime,
  nowTime,
} from '@/hooks/MusicHook'

const store = useStore()

const props = defineProps({
  musicFull: {
    type: Boolean,
    default: false,
  },
  audio: {
    type: HTMLAudioElement,
    default: null,
  },
})

const emit = defineEmits(['update:musicFull'])

// 播放的音乐信息
const playMusic = computed(() => store.state.playMusic as SongResult)
// 获取歌词滚动dom
const lrcSider = ref<any>(null)
const isMouse = ref(false)
// 歌词滚动方法
const lrcScroll = () => {
  if (props.musicFull && !isMouse.value) {
    let top = newLrcIndex.value * 50 - 225
    lrcSider.value.scrollTo({ top: top, behavior: 'smooth' })
  }
}
const mouseOverLayout = () => {
  isMouse.value = true
}
const mouseLeaveLayout = () => {
  setTimeout(() => {
    isMouse.value = false
  }, 3000)
}

defineExpose({
  lrcScroll,
})
</script>

<style scoped lang="scss">
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

  .music-lrc {
    background-color: inherit;
    width: 500px;
    height: 550px;

    &-text {
      @apply text-white text-lg flex justify-center items-center cursor-pointer;
      height: 50px;
      transition: all 0.2s ease-out;

      &:hover {
        @apply font-bold text-xl text-red-500;
      }
    }

    .now-text {
      @apply font-bold text-xl text-red-500;
    }
  }
}
</style>

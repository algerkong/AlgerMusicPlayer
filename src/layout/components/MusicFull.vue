
<template>
  <div id="drawer-target" v-show="isFull" :style="{backgroundImage:`url(${getImgUrl( playMusic?.picUrl, '300y300')})`}">
    <div class="music-img">
      <n-image
        :src="getImgUrl( playMusic?.picUrl, '300y300')"
        class="img" 
        lazy
        preview-disabled
      />
    </div>
    <div class="music-content">
      <div class="music-content-name">{{ playMusic?.song.name }}</div>
      <div class="music-content-singer">
        <span
          v-for="(item,index) in playMusic?.song.artists"
          :key="index"
        >{{ item.name }}{{ index < playMusic?.song.artists.length - 1 ? ' / ' : '' }}</span>
      </div>
      <n-layout
        class="music-lrc"
        style="height: 550px;"
        ref="lrcSider"
        :native-scrollbar="false"
        @mouseover="mouseOverLayout"
        @mouseleave="mouseLeaveLayout"
      >
        <template v-for="(item,index) in lrcArray" :key="index">
          <div
            class="music-lrc-text"
            :class="{ 'now-text': isCurrentLrc(index) }"
            @click="setAudioTime(index)"
          >{{ item.text }}</div>
        </template>
      </n-layout>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { SongResult } from "@/type/music";
import type { ILyric } from "@/type/lyric";
import { getMusicLrc } from "@/api/music"
import { useStore } from 'vuex';
import { getImgUrl } from '@/utils'

const store = useStore();
const props = defineProps({
  isFull: {
    type: Boolean
  },
  audio: {
    type: Object,
    default: {}
  }
})


const playMusic = computed(() => store.state.playMusic as SongResult)


const lrcData = ref<ILyric>()

interface ILrcData {
  text: string;
  trText: string;
}
const lrcArray = ref<Array<ILrcData>>()
const lrcTimeArray = ref<Array<Number>>([])
// 加载歌词
const loadLrc = async () => {
  const { data } = await getMusicLrc(playMusic.value.id)
  lrcData.value = data

  try {

    let musicText = data.lrc.lyric
    //歌词时间
    let timeArray = musicText.match(/(\d{2}):(\d{2})(\.(\d*))?/g)
    let timeArrayNum: Array<Number> = []
    timeArray?.forEach(function (item, index) {
      if (item.length < 9) {
        item = item + "0"
      }
      timeArrayNum.push(parseInt(item.split(':')[0]) * 60 + parseFloat(item.split(':')[1]));
    })
    lrcTimeArray.value = timeArrayNum
    //歌词
    let musicTextArray = musicText.replace(/(\[(\d{2}):(\d{2})(\.(\d*))?\])/g, '').split('\n')
    let text = []

    try {
      let trMusicText = data.tlyric.lyric
      let trMusicTextArray = trMusicText.replace(/(\[(\d{2}):(\d{2})(\.(\d*))?\])/g, '').split('\n')
      for (let i = 0; i < musicTextArray.length - 1; i++) {
        text.push({
          text: musicTextArray[i],
          trText: trMusicTextArray[i]
        })
      }
      lrcArray.value = text

    } catch (err) {
      text = []
    }
  } catch (err) {
    console.log(err)
  }
}


const newLrcIndex = ref(0)
const isMouse = ref(false)
// 获取歌词滚动dom
const lrcSider = ref<any>(null)
// 歌词滚动方法
const lrcScroll = () => {
  if (props.isFull && !isMouse.value) {
    let top = newLrcIndex.value * 50 - 225;
    lrcSider.value.scrollTo({ top: top, behavior: 'smooth' })
  }
}

const nowTime = ref(0)
const allTime = ref(0)
// 计算属性  获取当前播放时间的进度
const timeSlider = computed({
  get: () => nowTime.value / allTime.value * 100,
  set: (value) => {
    props.audio.value.currentTime = value * allTime.value / 100
    props.audio.value.play()
    store.commit("setPlayMusic", true);
  }
})

// 是否是当前正在播放的歌词
const isCurrentLrc = (index: any) => {
  let isTrue = !(nowTime.value <= lrcTimeArray.value[index] || nowTime.value >= lrcTimeArray.value[index + 1])
  if (isTrue) {
    newLrcIndex.value = index
  }
  return isTrue
}


const mouseOverLayout = () => {
  isMouse.value = true
}
const mouseLeaveLayout = () => {
  setTimeout(() => {
    isMouse.value = false
  }, 3000);
}
</script>

<style lang="scss" scoped>
#drawer-target {
  @apply top-0 left-0 absolute w-full h-full overflow-hidden rounded px-24 pt-24 pb-48 flex items-center;
  // background-color: #333333;
  backdrop-filter: saturate(180%) blur(20px);
  animation-duration: 300ms;
  .music-img {
    @apply flex-1;
    .img {
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
    background-color: #333333;
    width: 800px;
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
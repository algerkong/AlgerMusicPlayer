<template>
  <div class="recommend-music-list-item">
    <n-image
      :src="getImgUrl( item.picUrl, '40y40')"
      class="recommend-music-list-item-img"
      lazy
      preview-disabled
    />
    <div class="recommend-music-list-item-content">
      <div class="recommend-music-list-item-content-title">
        <n-ellipsis class="text-ellipsis" line-clamp="1">{{
          item.name
        }}</n-ellipsis>
      </div>
      <div class="recommend-music-list-item-content-name">
        <n-ellipsis class="text-ellipsis" line-clamp="1">
          <span
            v-for="(artists, artistsindex) in item.song.artists"
            :key="artistsindex"
            >{{ artists.name
            }}{{
              artistsindex < item.song.artists.length - 1 ? ' / ' : ''
            }}</span
          >
        </n-ellipsis>
      </div>
    </div>
    <div class="recommend-music-list-item-operating">
      <div class="recommend-music-list-item-operating-like">
        <i class="iconfont icon-likefill"></i>
      </div>
      <div
        class="recommend-music-list-item-operating-play bg-black"
        :class="isPlaying ? 'bg-green-600' : ''"
        @click="playMusicEvent(item)"
      >
        <i v-if="isPlaying && play" class="iconfont icon-stop"></i>
        <i v-else class="iconfont icon-playfill"></i>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useStore } from 'vuex'
import type { SongResult } from '@/type/music'
import { computed } from 'vue'
import { getImgUrl } from '@/utils'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const store = useStore()

const play = computed(() => store.state.play as boolean)

const playMusic = computed(() => store.state.playMusic)

// 判断是否为正在播放的音乐
const isPlaying = computed(() => {
  return playMusic.value.id == props.item.id
})

const emits = defineEmits(['play'])

// 播放音乐 设置音乐详情 打开音乐底栏
const playMusicEvent = (item: any) => {
  store.commit('setPlay', item)
  store.commit('setIsPlay', true)
  store.state.playListIndex = 0 
  emits('play', item)
}
</script>

<style lang="scss" scoped>
.text-ellipsis {
  width: 100%;
}
.recommend-music-list-item {
  @apply rounded-3xl p-3 flex items-center hover:bg-gray-800 transition;
  &-img {
    @apply w-12 h-12 rounded-2xl mr-4;
  }
  &-content {
    @apply flex-1;
    &-title {
      @apply text-base text-white;
    }
    &-name {
      @apply text-xs;
      @apply text-gray-400;
    }
  }
  &-operating {
    @apply flex items-center pl-4 rounded-full border border-gray-700;
    background-color: #0d0d0d;
    .iconfont {
      @apply text-xl;
    }
    .icon-likefill {
      color: #868686;
      @apply text-xl hover:text-red-600 transition;
    }
    &-like {
      @apply mr-2 cursor-pointer;
    }
    &-play {
      @apply cursor-pointer border border-gray-500 rounded-full w-10 h-10 flex justify-center items-center hover:bg-green-600 transition;
    }
  }
}
</style>

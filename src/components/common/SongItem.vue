<template>
  <div class="song-item" :class="{ 'song-mini': mini }">
    <n-image
      v-if="item.picUrl"
      ref="songImg"
      :src="getImgUrl(item.picUrl, '40y40')"
      class="song-item-img"
      preview-disabled
      :img-props="{
        crossorigin: 'anonymous',
      }"
      @load="imageLoad"
    />
    <div class="song-item-content">
      <div class="song-item-content-title">
        <n-ellipsis class="text-ellipsis" line-clamp="1">{{ item.name }}</n-ellipsis>
      </div>
      <div class="song-item-content-name">
        <n-ellipsis class="text-ellipsis" line-clamp="1">
          <span v-for="(artists, artistsindex) in item.ar || item.song.artists" :key="artistsindex"
            >{{ artists.name }}{{ artistsindex < (item.ar || item.song.artists).length - 1 ? ' / ' : '' }}</span
          >
        </n-ellipsis>
      </div>
    </div>
    <div class="song-item-operating">
      <div class="song-item-operating-like">
        <i class="iconfont icon-likefill"></i>
      </div>
      <div
        class="song-item-operating-play bg-black animate__animated"
        :class="{ 'bg-green-600': isPlaying, animate__flipInY: playLoading }"
        @click="playMusicEvent(item)"
      >
        <i v-if="isPlaying && play" class="iconfont icon-stop"></i>
        <i v-else class="iconfont icon-playfill"></i>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import { useStore } from 'vuex';

import type { SongResult } from '@/type/music';
import { getImgUrl } from '@/utils';
import { getImageBackground } from '@/utils/linearColor';

const props = withDefaults(
  defineProps<{
    item: SongResult;
    mini?: boolean;
  }>(),
  {
    mini: false,
  },
);

const store = useStore();

const play = computed(() => store.state.play as boolean);

const playMusic = computed(() => store.state.playMusic);

const playLoading = computed(() => playMusic.value.id === props.item.id && playMusic.value.playLoading);

// 判断是否为正在播放的音乐
const isPlaying = computed(() => {
  return playMusic.value.id === props.item.id;
});

const emits = defineEmits(['play']);

const songImageRef = useTemplateRef('songImg');

const imageLoad = async () => {
  if (!songImageRef.value) {
    return;
  }
  const { backgroundColor } = await getImageBackground(
    (songImageRef.value as any).imageRef as unknown as HTMLImageElement,
  );
  // eslint-disable-next-line vue/no-mutating-props
  props.item.backgroundColor = backgroundColor;
};

// 播放音乐 设置音乐详情 打开音乐底栏
const playMusicEvent = async (item: SongResult) => {
  if (playMusic.value.id === item.id) {
    if (play.value) {
      store.commit('setPlayMusic', false);
    } else {
      store.commit('setPlayMusic', true);
    }
    return;
  }
  await store.commit('setPlay', item);
  store.commit('setIsPlay', true);
  emits('play', item);
};
</script>

<style lang="scss" scoped>
// 配置文字不可选中
.text-ellipsis {
  width: 100%;
}
.song-item {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
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
    @apply flex items-center pl-4 rounded-full border border-gray-700 ml-4;
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
      animation-iteration-count: infinite;
    }
  }
}

.song-mini {
  @apply p-2 rounded-2xl;
  .song-item {
    @apply p-0;
    &-img {
      @apply w-10 h-10 mr-2;
    }
    &-content {
      @apply flex-1;
      &-title {
        @apply text-sm;
      }
      &-name {
        @apply text-xs;
      }
    }
    &-operating {
      @apply pl-2;
      .iconfont {
        @apply text-base;
      }
      &-like {
        @apply mr-1;
      }
      &-play {
        @apply w-8 h-8;
      }
    }
  }
}
</style>

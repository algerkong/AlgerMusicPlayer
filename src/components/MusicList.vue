<template>
  <n-drawer
    :show="show"
    :height="isMobile ? '100vh' : '70vh'"
    placement="bottom"
    :drawer-style="{ backgroundColor: 'transparent' }"
  >
    <div class="music-page">
      <i class="iconfont icon-icon_error music-close" @click="close"></i>
      <div class="music-title text-el">{{ name }}</div>
      <!-- 歌单歌曲列表 -->
      <div class="music-list">
        <n-scrollbar>
          <div v-loading="loading || !songList.length" class="music-list-content">
            <div
              v-for="(item, index) in songList"
              :key="item.id"
              :class="setAnimationClass('animate__bounceInLeft')"
              :style="setAnimationDelay(index, 50)"
            >
              <song-item :item="formatDetail(item)" @play="handlePlay" />
            </div>
          </div>
          <play-bottom />
        </n-scrollbar>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { useStore } from 'vuex';

import SongItem from '@/components/common/SongItem.vue';
import { isMobile, setAnimationClass, setAnimationDelay } from '@/utils';

import PlayBottom from './common/PlayBottom.vue';

const store = useStore();

const { songList, loading = false } = defineProps<{
  show: boolean;
  name: string;
  songList: any[];
  loading?: boolean;
}>();
const emit = defineEmits(['update:show', 'update:loading']);

const formatDetail = computed(() => (detail: any) => {
  const song = {
    artists: detail.ar,
    name: detail.al.name,
    id: detail.al.id,
  };

  detail.song = song;
  detail.picUrl = detail.al.picUrl;
  return detail;
});

const handlePlay = () => {
  const tracks = songList || [];
  store.commit('setPlayList', tracks);
};

const close = () => {
  emit('update:show', false);
};
</script>

<style scoped lang="scss">
.music {
  &-page {
    @apply px-8 w-full h-full bg-black bg-opacity-75 rounded-t-2xl;
    backdrop-filter: blur(20px);
  }
  &-title {
    @apply text-lg font-bold text-white p-4;
  }

  &-close {
    @apply absolute top-4 right-8 cursor-pointer text-white text-3xl;
  }

  &-list {
    height: calc(100% - 60px);
    &-content {
      min-height: 400px;
    }
  }
}

.mobile {
  .music-page {
    @apply px-4;
  }
}
</style>

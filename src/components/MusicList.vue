<template>
  <n-drawer
    :show="show"
    :height="isMobile ? '100vh' : '70vh'"
    placement="bottom"
    block-scroll
    mask-closable
    :style="{ backgroundColor: 'transparent' }"
    @mask-click="close"
  >
    <div class="music-page">
      <div class="music-close">
        <i class="icon ri-layout-column-line" @click="doubleDisply = !doubleDisply"></i>
        <i class="icon iconfont icon-icon_error" @click="close"></i>
      </div>
      <div class="music-title text-el">{{ name }}</div>
      <!-- 歌单歌曲列表 -->
      <div class="music-list">
        <n-scrollbar @scroll="handleScroll">
          <div
            v-loading="loading || !songList.length"
            class="music-list-content"
            :class="{ 'double-list': doubleDisply }"
          >
            <div
              v-for="(item, index) in displayedSongs"
              :key="item.id"
              class="double-item"
              :class="setAnimationClass('animate__bounceInUp')"
              :style="setAnimationDelay(index, 5)"
            >
              <song-item :item="formatDetail(item)" @play="handlePlay" />
            </div>
            <div v-if="isLoadingMore" class="loading-more">加载更多...</div>
          </div>
          <play-bottom />
        </n-scrollbar>

        <!-- <n-virtual-list :item-size="42" :items="displayedSongs" item-resizable @scroll="handleScroll">
          <template #default="{ item, index }">
            <div :key="item.id" class="double-item">
              <song-item :item="formatDetail(item)" @play="handlePlay" />
            </div>
          </template>
        </n-virtual-list>
        <play-bottom /> -->
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { useStore } from 'vuex';

import { getMusicDetail } from '@/api/music';
import SongItem from '@/components/common/SongItem.vue';
import { isMobile, setAnimationClass, setAnimationDelay } from '@/utils';

import PlayBottom from './common/PlayBottom.vue';

const store = useStore();

const {
  songList,
  loading = false,
  listInfo,
} = defineProps<{
  show: boolean;
  name: string;
  songList: any[];
  loading?: boolean;
  listInfo?: any;
}>();
const emit = defineEmits(['update:show', 'update:loading']);

const page = ref(0);
const pageSize = 20;
const total = ref(0);
const isLoadingMore = ref(false);
const displayedSongs = ref<any[]>([]);

// 双排显示开关
const doubleDisply = ref(false);

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
  store.commit(
    'setPlayList',
    tracks.map((item) => ({
      ...item,
      picUrl: item.al.picUrl,
      song: {
        artists: item.ar,
      },
    })),
  );
};

const close = () => {
  emit('update:show', false);
};

const loadMoreSongs = async () => {
  if (displayedSongs.value.length >= total.value) return;

  isLoadingMore.value = true;
  try {
    const trackIds = listInfo.trackIds
      .slice(page.value * pageSize, (page.value + 1) * pageSize)
      .map((item: any) => item.id);
    const reslist = await getMusicDetail(trackIds);
    // displayedSongs.value = displayedSongs.value.concat(reslist.data.songs);
    displayedSongs.value = JSON.parse(JSON.stringify([...displayedSongs.value, ...reslist.data.songs]));
    page.value++;
  } catch (error) {
    console.error('error', error);
  } finally {
    isLoadingMore.value = false;
  }
};

const handleScroll = (e: any) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  if (scrollTop + clientHeight >= scrollHeight - 50 && !isLoadingMore.value) {
    loadMoreSongs();
  }
};

watch(
  () => songList,
  (newSongs) => {
    displayedSongs.value = JSON.parse(JSON.stringify(newSongs));
    total.value = listInfo ? listInfo.trackIds.length : displayedSongs.value.length;
  },
  { deep: true, immediate: true },
);
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
    @apply absolute top-4 right-8 cursor-pointer text-white flex gap-2 items-center;
    .icon {
      @apply text-3xl;
    }
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

.loading-more {
  @apply text-center text-white py-10;
}

.double-list {
  @apply flex flex-wrap gap-5;

  .double-item {
    width: calc(50% - 10px);
  }

  .song-item {
    background-color: #191919;
  }
}
</style>

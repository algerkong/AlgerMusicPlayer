<template>
  <div
    class="search-item group cursor-pointer transition-all duration-300"
    :class="[item.type === 'mv' ? 'flex flex-col' : 'flex flex-col']"
    @click="handleClick"
  >
    <!-- Image Container -->
    <div
      class="relative overflow-hidden rounded-2xl shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:-translate-y-1"
      :class="[item.type === 'mv' ? 'aspect-video' : 'aspect-square']"
    >
      <n-image
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        :src="getImgUrl(item.picUrl, item.type === 'mv' ? '400y225' : '400y400')"
        lazy
        preview-disabled
      />

      <!-- Play Overlay (for MV) -->
      <div
        v-if="item.type === 'mv'"
        class="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/30"
      >
        <div
          class="play-icon flex h-12 w-12 items-center justify-center rounded-full bg-white/90 opacity-0 scale-75 transition-all duration-300 shadow-xl group-hover:opacity-100 group-hover:scale-100"
        >
          <i class="ri-play-fill text-2xl text-neutral-900 ml-1" />
        </div>
      </div>

      <!-- Item Size Badge (for Album) -->
      <div
        v-if="item.type === '专辑' && item.size"
        class="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-black/40 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <i class="ri-music-2-line" />
        <span>{{ item.size }}</span>
      </div>
    </div>

    <!-- Info Section -->
    <div class="mt-3 space-y-1 px-1">
      <h3
        class="line-clamp-1 text-sm font-bold text-neutral-800 transition-colors duration-200 group-hover:text-primary dark:text-neutral-200 dark:group-hover:text-white md:text-base"
      >
        {{ item.name }}
      </h3>
      <p class="line-clamp-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {{ item.desc }}
      </p>
    </div>

    <!-- MV Player Component -->
    <mv-player
      v-if="item.type === 'mv'"
      v-model:show="showPop"
      :current-mv="getCurrentMv()"
      no-list
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import MvPlayer from '@/components/MvPlayer.vue';
import { usePlayerStore } from '@/store/modules/player';
import { usePlayHistoryStore } from '@/store/modules/playHistory';
import { IMvItem } from '@/types/mv';
import { getImgUrl } from '@/utils';

const props = defineProps<{
  item: {
    id: number;
    picUrl: string;
    name: string;
    desc: string;
    type: string;
    [key: string]: any;
  };
}>();

const showPop = ref(false);

const playerStore = usePlayerStore();
const router = useRouter();
const playHistoryStore = usePlayHistoryStore();

const getCurrentMv = () => {
  return {
    id: props.item.id,
    name: props.item.name,
    cover: props.item.picUrl,
    artistName: props.item.desc
  } as unknown as IMvItem;
};

const handleClick = async () => {
  if (props.item.type === '专辑') {
    navigateToMusicList(router, {
      id: props.item.id,
      type: 'album',
      name: props.item.name,
      listInfo: {
        ...props.item,
        coverImgUrl: props.item.picUrl
      },
      canRemove: false
    });
  } else if (props.item.type === 'playlist') {
    navigateToMusicList(router, {
      id: props.item.id,
      type: 'playlist',
      name: props.item.name,
      listInfo: { picUrl: props.item.picUrl },
      canRemove: false
    });
  } else if (props.item.type === 'mv') {
    handleShowMv();
  } else if (props.item.type === 'djRadio') {
    playHistoryStore.addPodcastRadio({
      id: props.item.id,
      name: props.item.name,
      picUrl: props.item.picUrl,
      dj: props.item.dj,
      type: 'djRadio'
    });
    router.push({
      name: 'podcastRadio',
      params: { id: props.item.id }
    });
  }
};

const handleShowMv = async () => {
  playerStore.handlePause();
  showPop.value = true;
};
</script>

<style scoped lang="scss">
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

<template>
  <div class="search-item" :class="item.type" @click="handleClick">
    <div class="search-item-img">
      <n-image
        :src="getImgUrl(item.picUrl, item.type === 'mv' ? '320y180' : '100y100')"
        lazy
        preview-disabled
      />
      <div v-if="item.type === 'mv'" class="play">
        <i class="iconfont icon icon-play"></i>
      </div>
    </div>
    <div class="search-item-info">
      <p class="search-item-name">{{ item.name }}</p>
      <p class="search-item-artist">{{ item.desc }}</p>
    </div>

    <music-list
      v-if="['专辑', 'playlist'].includes(item.type)"
      v-model:show="showPop"
      :name="item.name"
      :song-list="songList"
      :list-info="listInfo"
      :cover="false"
    />
    <mv-player
      v-if="item.type === 'mv'"
      v-model:show="showPop"
      :current-mv="getCurrentMv()"
      no-list
    />
  </div>
</template>

<script setup lang="ts">
import { useStore } from 'vuex';

import { getAlbum, getListDetail } from '@/api/list';
import MvPlayer from '@/components/MvPlayer.vue';
import { audioService } from '@/services/audioService';
import { IMvItem } from '@/type/mv';
import { getImgUrl } from '@/utils';

import MusicList from '../MusicList.vue';

const props = defineProps<{
  item: {
    picUrl: string;
    name: string;
    desc: string;
    type: string;
    [key: string]: any;
  };
}>();

const songList = ref<any[]>([]);

const showPop = ref(false);
const listInfo = ref<any>(null);

const getCurrentMv = () => {
  return {
    id: props.item.id,
    name: props.item.name
  } as unknown as IMvItem;
};

const store = useStore();

const handleClick = async () => {
  listInfo.value = null;
  if (props.item.type === '专辑') {
    showPop.value = true;
    const res = await getAlbum(props.item.id);
    songList.value = res.data.songs.map((song: any) => {
      song.al.picUrl = song.al.picUrl || props.item.picUrl;
      return song;
    });
    listInfo.value = {
      ...res.data.album,
      creator: {
        avatarUrl: res.data.album.artist.img1v1Url,
        nickname: `${res.data.album.artist.name} - ${res.data.album.company}`
      },
      description: res.data.album.description
    };
  }

  if (props.item.type === 'playlist') {
    showPop.value = true;
    const res = await getListDetail(props.item.id);
    songList.value = res.data.playlist.tracks;
    listInfo.value = res.data.playlist;
  }

  if (props.item.type === 'mv') {
    store.commit('setIsPlay', false);
    store.commit('setPlayMusic', false);
    audioService.getCurrentSound()?.pause();
    showPop.value = true;
  }
};
</script>

<style scoped lang="scss">
.search-item {
  @apply rounded-3xl p-3 flex items-center hover:bg-light-200 dark:hover:bg-gray-800 transition cursor-pointer;
  margin: 0 10px;
  .search-item-img {
    @apply w-12 h-12 mr-4 rounded-2xl overflow-hidden;
  }
  .search-item-info {
    @apply flex-1 overflow-hidden;
    &-name {
      @apply text-white text-sm text-center;
    }
    &-artist {
      @apply text-gray-400 text-xs text-center;
    }
  }
}

.mv {
  &:hover {
    .play {
      @apply opacity-60;
    }
  }
  .search-item-img {
    width: 160px;
    height: 90px;
    @apply rounded-lg relative;
  }
  .play {
    @apply absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity;
    .icon {
      @apply text-white text-5xl;
    }
  }
}
</style>

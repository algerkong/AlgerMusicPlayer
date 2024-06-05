<template>
  <div class="search-item" :class="item.type" @click="handleClick">
    <div class="search-item-img">
      <n-image :src="getImgUrl(item.picUrl, '320y180')" lazy preview-disabled />
      <div v-if="item.type === 'mv'" class="play">
        <i class="iconfont icon icon-play"></i>
      </div>
    </div>
    <div class="search-item-info">
      <p class="search-item-name">{{ item.name }}</p>
      <p class="search-item-artist">{{ item.desc }}</p>
    </div>

    <MusicList
      v-if="['专辑', 'playlist'].includes(item.type)"
      v-model:show="showPop"
      :name="item.name"
      :song-list="songList"
    />

    <PlayVideo v-if="item.type === 'mv'" v-model:show="showPop" :title="item.name" :url="url" />
  </div>
</template>

<script setup lang="ts">
import { getAlbum, getListDetail } from '@/api/list';
import { getMvUrl } from '@/api/mv';
import { getImgUrl } from '@/utils';

const props = defineProps<{
  item: {
    picUrl: string;
    name: string;
    desc: string;
    type: string;
    [key: string]: any;
  };
}>();

const url = ref('');

const songList = ref<any[]>([]);

const showPop = ref(false);

const handleClick = async () => {
  if (props.item.type === '专辑') {
    showPop.value = true;
    const res = await getAlbum(props.item.id);
    songList.value = res.data.songs.map((song: any) => {
      song.al.picUrl = song.al.picUrl || props.item.picUrl;
      return song;
    });
  }

  if (props.item.type === 'playlist') {
    showPop.value = true;
    const res = await getListDetail(props.item.id);
    songList.value = res.data.playlist.tracks;
  }

  if (props.item.type === 'mv') {
    const res = await getMvUrl(props.item.id);
    url.value = res.data.data.url;
    showPop.value = true;
  }
};
</script>

<style scoped lang="scss">
.search-item {
  @apply rounded-3xl p-3 flex items-center hover:bg-gray-800 transition cursor-pointer;
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

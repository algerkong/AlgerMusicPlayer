<template>
  <div class="search-item" @click="handleClick">
    <div class="search-item-img">
      <n-image :src="getImgUrl(item.picUrl, 'album')" lazy preview-disabled />
    </div>
    <div class="search-item-info">
      <div class="search-item-name">{{ item.name }}</div>
      <div class="search-item-artist">{{ item.desc }}</div>
    </div>

    <MusicList v-model:show="showMusic" :name="item.name" :song-list="songList" />
  </div>
</template>

<script setup lang="ts">
import { getAlbum } from '@/api/list';
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

const songList = ref([]);

const showMusic = ref(false);

const handleClick = async () => {
  showMusic.value = true;
  if (props.item.type === '专辑') {
    const res = await getAlbum(props.item.id);
    songList.value = res.data.songs.map((song: any) => {
      song.al.picUrl = song.al.picUrl || props.item.picUrl;
      return song;
    });
  }
};
</script>

<style scoped lang="scss">
.search-item {
  @apply rounded-3xl p-3 flex items-center hover:bg-gray-800 transition;
  margin: 0 10px;
  .search-item-img {
    @apply w-12 h-12 mr-4 rounded-2xl overflow-hidden;
  }
  .search-item-info {
    &-name {
      @apply text-white text-sm text-center;
    }
    &-artist {
      @apply text-gray-400 text-xs text-center;
    }
  }
}
</style>

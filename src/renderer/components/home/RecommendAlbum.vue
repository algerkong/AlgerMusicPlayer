<template>
  <div class="recommend-album">
    <div class="title" :class="setAnimationClass('animate__fadeInRight')">
      {{ t('comp.recommendAlbum.title') }}
    </div>
    <div class="recommend-album-list">
      <template v-for="(item, index) in albumData?.albums" :key="item.id">
        <div
          v-if="index < 6"
          class="recommend-album-list-item"
          :class="setAnimationClass('animate__backInUp')"
          :style="setAnimationDelay(index, 100)"
          @click="handleClick(item)"
        >
          <n-image
            class="recommend-album-list-item-img"
            :src="getImgUrl(item.blurPicUrl, '200y200')"
            lazy
            preview-disabled
          />
          <div class="recommend-album-list-item-content">{{ item.name }}</div>
        </div>
      </template>
    </div>
    <music-list
      v-model:show="showMusic"
      :name="albumName"
      :song-list="songList"
      :cover="true"
      :loading="loadingList"
      :list-info="albumInfo"
    />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getNewAlbum } from '@/api/home';
import { getAlbum } from '@/api/list';
import MusicList from '@/components/MusicList.vue';
import type { IAlbumNew } from '@/type/album';
import { getImgUrl, setAnimationClass, setAnimationDelay } from '@/utils';

const { t } = useI18n();
const albumData = ref<IAlbumNew>();
const loadAlbumList = async () => {
  const { data } = await getNewAlbum();
  albumData.value = data;
};

const showMusic = ref(false);
const songList = ref([]);
const albumName = ref('');
const loadingList = ref(false);
const albumInfo = ref<any>({});
const handleClick = async (item: any) => {
  songList.value = [];
  albumInfo.value = {};
  albumName.value = item.name;
  loadingList.value = true;
  showMusic.value = true;
  const res = await getAlbum(item.id);
  const { songs, album } = res.data;
  songList.value = songs.map((song: any) => {
    song.al.picUrl = song.al.picUrl || album.picUrl;
    song.picUrl = song.al.picUrl || album.picUrl || song.picUrl;
    return song;
  });
  albumInfo.value = {
    ...album,
    creator: {
      avatarUrl: album.artist.img1v1Url,
      nickname: `${album.artist.name} - ${album.company}`
    },
    description: album.description
  };
  loadingList.value = false;
};

onMounted(() => {
  loadAlbumList();
});
</script>

<style lang="scss" scoped>
.recommend-album {
  @apply flex-1 mx-5;
  .title {
    @apply text-lg font-bold mb-4 text-gray-900 dark:text-white;
  }

  .recommend-album-list {
    @apply grid grid-cols-2 grid-rows-3 gap-2;
    &-item {
      @apply rounded-xl overflow-hidden relative;
      &-img {
        @apply rounded-xl transition w-full h-full;
      }
      &:hover img {
        filter: brightness(50%);
      }
      &-content {
        @apply w-full h-full opacity-0 transition absolute z-10 top-0 left-0 p-4 text-xl text-white bg-opacity-60 bg-black dark:bg-opacity-60 dark:bg-black;
      }
      &-content:hover {
        opacity: 1;
      }
    }
  }
}
</style>

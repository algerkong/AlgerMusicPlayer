<template>
  <div class="recommend-music">
    <div class="title" :class="setAnimationClass('animate__fadeInLeft')">
      {{ t('comp.recommendSonglist.title') }}
    </div>
    <div
      v-show="recommendMusic?.result"
      v-loading="loading"
      class="recommend-music-list"
      :class="setAnimationClass('animate__bounceInUp')"
    >
      <!-- 推荐音乐列表 -->
      <template v-for="(item, index) in recommendMusic?.result" :key="item.id">
        <div
          :class="setAnimationClass('animate__bounceInUp')"
          :style="setAnimationDelay(index, 100)"
        >
          <song-item :item="item" @play="handlePlay" />
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';

import { getRecommendMusic } from '@/api/home';
import SongItem from '@/components/common/SongItem.vue';
import { usePlayerStore } from '@/store/modules/player';
import type { IRecommendMusic } from '@/types/music';
import { setAnimationClass, setAnimationDelay } from '@/utils';

const { t } = useI18n();
const playerStore = usePlayerStore();
// 推荐歌曲
const recommendMusic = ref<IRecommendMusic>();
const loading = ref(false);

// 加载推荐歌曲
const loadRecommendMusic = async () => {
  loading.value = true;
  const { data } = await getRecommendMusic({ limit: 10 });
  recommendMusic.value = data;
  loading.value = false;
};

// 页面初始化
onMounted(() => {
  loadRecommendMusic();
});

const handlePlay = () => {
  if (recommendMusic.value?.result) {
    playerStore.setPlayList(recommendMusic.value.result);
  }
};
</script>

<style lang="scss" scoped>
.title {
  @apply text-lg font-bold mb-4 text-gray-900 dark:text-white;
}
.recommend-music {
  @apply flex-auto;
  .text-ellipsis {
    width: 100%;
  }
  &-list {
    @apply rounded-3xl p-2 w-full border border-gray-200 dark:border-gray-700 bg-light dark:bg-black;
  }
}
</style>

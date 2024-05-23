<template>
  <!-- 歌单分类列表 -->
  <div class="play-list-type">
    <div class="title" :class="setAnimationClass('animate__fadeInLeft')">歌单分类</div>
    <div>
      <template v-for="(item, index) in playlistCategory?.sub" :key="item.name">
        <span
          v-show="isShowAllPlaylistCategory || index <= 19"
          class="play-list-type-item"
          :class="setAnimationClass('animate__bounceIn')"
          :style="setAnimationDelay(index <= 19 ? index : index - 19)"
          @click="handleClickPlaylistType(item.name)"
          >{{ item.name }}</span
        >
      </template>
      <div
        class="play-list-type-showall"
        :class="setAnimationClass('animate__bounceIn')"
        :style="setAnimationDelay(!isShowAllPlaylistCategory ? 25 : playlistCategory?.sub.length || 100 + 30)"
        @click="isShowAllPlaylistCategory = !isShowAllPlaylistCategory"
      >
        {{ !isShowAllPlaylistCategory ? '显示全部' : '隐藏一些' }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { getPlaylistCategory } from '@/api/home';
import type { IPlayListSort } from '@/type/playlist';
import { setAnimationClass, setAnimationDelay } from '@/utils';
// 歌单分类
const playlistCategory = ref<IPlayListSort>();
// 是否显示全部歌单分类
const isShowAllPlaylistCategory = ref<boolean>(false);

// 加载歌单分类
const loadPlaylistCategory = async () => {
  const { data } = await getPlaylistCategory();
  playlistCategory.value = data;
};

const router = useRouter();
const handleClickPlaylistType = (type: string) => {
  router.push({
    path: '/list',
    query: {
      type,
    },
  });
};
// 页面初始化
onMounted(() => {
  loadPlaylistCategory();
});
</script>

<style lang="scss" scoped>
.title {
  @apply text-lg font-bold mb-4;
}
.play-list-type {
  width: 250px;
  @apply mx-6;
  &-item,
  &-showall {
    @apply py-2 px-3 mr-3 mb-3 inline-block border border-gray-700 rounded-xl cursor-pointer hover:bg-green-600 transition;
    background-color: #1a1a1a;
  }
  &-showall {
    @apply block text-center;
  }
}

.mobile {
  .play-list-type {
    @apply mx-0 w-full;
  }
}
</style>

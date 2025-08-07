<template>
  <!-- 歌单分类列表 -->
  <div class="play-list-type">
    <div class="title" :class="setAnimationClass('animate__fadeInLeft')">
      {{ t('comp.playlistType.title') }}
    </div>
    <div>
      <template v-for="(item, index) in playlistCategory?.sub" :key="item.name">
        <span
          v-show="isShowAllPlaylistCategory || index <= 19 || isHiding"
          class="play-list-type-item"
          :class="
            setAnimationClass(
              index <= 19
                ? 'animate__bounceIn'
                : !isShowAllPlaylistCategory
                  ? 'animate__backOutLeft'
                  : 'animate__bounceIn'
            ) +
            ' ' +
            'type-item-' +
            index
          "
          :style="getAnimationDelay(index)"
          @click="handleClickPlaylistType(item.name)"
          >{{ item.name }}</span
        >
      </template>
      <div
        class="play-list-type-showall"
        :class="setAnimationClass('animate__bounceIn')"
        :style="
          setAnimationDelay(
            !isShowAllPlaylistCategory ? 25 : playlistCategory?.sub.length || 100 + 30
          )
        "
        @click="handleToggleShowAllPlaylistCategory"
      >
        {{
          !isShowAllPlaylistCategory ? t('comp.playlistType.showAll') : t('comp.playlistType.hide')
        }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getPlaylistCategory } from '@/api/home';
import type { IPlayListSort } from '@/types/playlist';
import { setAnimationClass, setAnimationDelay } from '@/utils';

const { t } = useI18n();
// 歌单分类
const playlistCategory = ref<IPlayListSort>();
// 是否显示全部歌单分类
const isShowAllPlaylistCategory = ref<boolean>(false);
const DELAY_TIME = 40;
const getAnimationDelay = computed(() => {
  return (index: number) => {
    if (index <= 19) {
      return setAnimationDelay(index, DELAY_TIME);
    }
    if (!isShowAllPlaylistCategory.value) {
      const nowIndex = (playlistCategory.value?.sub.length || 0) - index;
      return setAnimationDelay(nowIndex, DELAY_TIME);
    }
    return setAnimationDelay(index - 19, DELAY_TIME);
  };
});

watch(isShowAllPlaylistCategory, (newVal) => {
  if (!newVal) {
    const elements = playlistCategory.value?.sub.map((_, index) =>
      document.querySelector(`.type-item-${index}`)
    ) as HTMLElement[];
    elements
      .slice(20)
      .reverse()
      .forEach((element, index) => {
        if (element) {
          setTimeout(
            () => {
              (element as HTMLElement).style.position = 'absolute';
            },
            index * DELAY_TIME + 400
          );
        }
      });

    setTimeout(
      () => {
        isHiding.value = false;
        document.querySelectorAll('.play-list-type-item').forEach((element) => {
          if (element) {
            console.log('element', element);
            (element as HTMLElement).style.position = 'none';
          }
        });
      },
      (playlistCategory.value?.sub.length || 0 - 19) * DELAY_TIME
    );
  } else {
    document.querySelectorAll('.play-list-type-item').forEach((element) => {
      if (element) {
        (element as HTMLElement).style.position = 'none';
      }
    });
  }
});

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
      type
    }
  });
};

const isHiding = ref<boolean>(false);
const handleToggleShowAllPlaylistCategory = () => {
  isShowAllPlaylistCategory.value = !isShowAllPlaylistCategory.value;
  if (!isShowAllPlaylistCategory.value) {
    isHiding.value = true;
  }
};
// 页面初始化
onMounted(() => {
  loadPlaylistCategory();
});
</script>

<style lang="scss" scoped>
.title {
  @apply text-lg font-bold mb-4 text-gray-900 dark:text-white;
}
.play-list-type {
  width: 250px;
  @apply mr-4;
  &-item,
  &-showall {
    @apply bg-light dark:bg-black text-gray-900 dark:text-white;
    @apply py-2 px-3 mr-3 mb-3 inline-block border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-green-600 hover:text-white transition;
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

<template>
  <!-- 推荐歌手 -->
  <n-scrollbar :size="100" :x-scrollable="true">
    <div class="recommend-singer">
      <div class="recommend-singer-list">
        <div
          v-if="dayRecommendData"
          class="recommend-singer-item relative"
          :class="setAnimationClass('animate__backInRight')"
          :style="setAnimationDelay(0, 100)"
        >
          <div
            :style="setBackgroundImg(getImgUrl(dayRecommendData?.dailySongs[0].al.picUrl, '300y300'))"
            class="recommend-singer-item-bg"
          ></div>
          <div
            class="recommend-singer-item-count p-2 text-base text-gray-200 z-10 cursor-pointer"
            @click="showMusic = true"
          >
            <div class="font-bold text-xl">每日推荐</div>

            <div class="mt-2">
              <p v-for="item in dayRecommendData?.dailySongs.slice(0, 5)" :key="item.id" class="text-el">
                {{ item.name }}
                <br />
              </p>
            </div>
          </div>
        </div>
        <div
          v-for="(item, index) in hotSingerData?.artists"
          :key="item.id"
          class="recommend-singer-item relative"
          :class="setAnimationClass('animate__backInRight')"
          :style="setAnimationDelay(index + 1, 100)"
        >
          <div :style="setBackgroundImg(getImgUrl(item.picUrl, '300y300'))" class="recommend-singer-item-bg"></div>
          <div class="recommend-singer-item-count p-2 text-base text-gray-200 z-10">{{ item.musicSize }}首</div>
          <div class="recommend-singer-item-info z-10">
            <div class="recommend-singer-item-info-play" @click="toSearchSinger(item.name)">
              <i class="iconfont icon-playfill text-xl"></i>
            </div>
            <div class="ml-4">
              <div class="recommend-singer-item-info-name text-el">{{ item.name }}</div>
              <div class="recommend-singer-item-info-name text-el">{{ item.name }}</div>
            </div>
          </div>
        </div>
      </div>

      <music-list
        v-if="dayRecommendData?.dailySongs.length"
        v-model:show="showMusic"
        name="每日推荐列表"
        :song-list="dayRecommendData?.dailySongs"
        :cover="false"
      />
    </div>
  </n-scrollbar>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useStore } from 'vuex';

import { getDayRecommend, getHotSinger } from '@/api/home';
import router from '@/router';
import { IDayRecommend } from '@/type/day_recommend';
import type { IHotSinger } from '@/type/singer';
import { getImgUrl, setAnimationClass, setAnimationDelay, setBackgroundImg } from '@/utils';

const store = useStore();

// 歌手信息
const hotSingerData = ref<IHotSinger>();
const dayRecommendData = ref<IDayRecommend>();
const showMusic = ref(false);

onMounted(async () => {
  await loadData();
});

const loadData = async () => {
  try {
    // 第一个请求：获取热门歌手
    const { data: singerData } = await getHotSinger({ offset: 0, limit: 5 });

    // 第二个请求：获取每日推荐
    try {
      const {
        data: { data: dayRecommend },
      } = await getDayRecommend();
      // 处理数据
      if (dayRecommend) {
        singerData.artists = singerData.artists.slice(0, 4);
      }
      dayRecommendData.value = dayRecommend;
    } catch (error) {
      console.error('error', error);
    }

    hotSingerData.value = singerData;
  } catch (error) {
    console.error('error', error);
  }
};

const toSearchSinger = (keyword: string) => {
  router.push({
    path: '/search',
    query: {
      keyword,
    },
  });
};

// 监听登录状态
watchEffect(() => {
  if (store.state.user) {
    loadData();
  }
});
</script>

<style lang="scss" scoped>
.recommend-singer {
  &-list {
    @apply flex;
    height: 280px;
  }
  &-item {
    @apply flex-1 h-full rounded-3xl p-5 mr-5 flex flex-col justify-between overflow-hidden;
    &-bg {
      @apply bg-gray-900 bg-no-repeat bg-cover bg-center rounded-3xl absolute w-full h-full top-0 left-0 z-0;
      filter: brightness(60%);
    }
    &-info {
      @apply flex items-center p-2;
      &-play {
        @apply w-12 h-12 bg-green-500 rounded-full flex justify-center items-center hover:bg-green-600 cursor-pointer;
      }
    }
  }
}

.mobile .recommend-singer {
  &-list {
    height: 180px;
    @apply ml-4;
  }
  &-item {
    @apply p-4 rounded-xl;
    &-bg {
      @apply rounded-xl;
    }
  }
}
</style>

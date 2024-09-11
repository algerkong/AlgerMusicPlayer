<script lang="ts" setup>
import { useRoute } from 'vue-router';

import { getListByCat, getListDetail, getRecommendList } from '@/api/list';
import MusicList from '@/components/MusicList.vue';
import type { IRecommendItem } from '@/type/list';
import type { IListDetail } from '@/type/listDetail';
import { formatNumber, getImgUrl, setAnimationClass, setAnimationDelay } from '@/utils';

defineOptions({
  name: 'List',
});

const recommendList = ref();
const showMusic = ref(false);

const recommendItem = ref<IRecommendItem | null>();
const listDetail = ref<IListDetail | null>();
const listLoading = ref(true);
const selectRecommendItem = async (item: IRecommendItem) => {
  listLoading.value = true;
  recommendItem.value = null;
  listDetail.value = null;
  showMusic.value = true;
  recommendItem.value = item;
  const { data } = await getListDetail(item.id);
  listDetail.value = data;
  listLoading.value = false;
};

const route = useRoute();
const listTitle = ref(route.query.type || '歌单列表');

const loading = ref(false);
const loadList = async (type: string) => {
  loading.value = true;
  const params = {
    cat: type || '',
    limit: 30,
    offset: 0,
  };
  const { data } = await getListByCat(params);
  recommendList.value = data.playlists;
  loading.value = false;
};

if (route.query.type) {
  loadList(route.query.type as string);
} else {
  getRecommendList().then((res: { data: { result: any } }) => {
    recommendList.value = res.data.result;
  });
}

watch(
  () => route.query,
  async (newParams) => {
    if (newParams.type) {
      recommendList.value = null;
      listTitle.value = newParams.type || '歌单列表';
      loadList(newParams.type as string);
    }
  },
);
</script>

<template>
  <div class="list-page">
    <div class="recommend-title" :class="setAnimationClass('animate__bounceInLeft')">{{ listTitle }}</div>
    <!-- 歌单列表 -->
    <n-scrollbar class="recommend" :size="100" @click="showMusic = false">
      <div v-loading="loading" class="recommend-list">
        <div
          v-for="(item, index) in recommendList"
          :key="item.id"
          class="recommend-item"
          :class="setAnimationClass('animate__bounceIn')"
          :style="setAnimationDelay(index, 30)"
          @click.stop="selectRecommendItem(item)"
        >
          <div class="recommend-item-img">
            <n-image
              class="recommend-item-img-img"
              :src="getImgUrl(item.picUrl || item.coverImgUrl, '200y200')"
              width="200"
              height="200"
              lazy
              preview-disabled
            />
            <div class="top">
              <div class="play-count">{{ formatNumber(item.playCount) }}</div>
              <i class="iconfont icon-videofill"></i>
            </div>
          </div>
          <div class="recommend-item-title">{{ item.name }}</div>
        </div>
      </div>
    </n-scrollbar>
    <music-list
      v-model:show="showMusic"
      v-model:loading="listLoading"
      :name="recommendItem?.name || ''"
      :song-list="listDetail?.playlist.tracks || []"
      :list-info="listDetail?.playlist"
    />
  </div>
</template>

<style lang="scss" scoped>
.list-page {
  @apply relative h-full w-full px-4;
}

.recommend {
  @apply w-full h-full bg-none;
  &-title {
    @apply text-lg font-bold text-white pb-4;
  }

  &-list {
    @apply grid gap-6 pb-28;
    grid-template-columns: repeat(auto-fill, minmax(13%, 1fr));
  }
  &-item {
    &-img {
      @apply rounded-xl overflow-hidden relative;
      &:hover img {
        @apply hover:scale-110 transition-all duration-300 ease-in-out;
      }
      &-img {
        @apply h-full w-full rounded-xl overflow-hidden;
      }
      .top {
        @apply absolute w-full h-full top-0 left-0 flex justify-center items-center transition-all duration-300 ease-in-out cursor-pointer;
        background-color: #00000088;
        opacity: 0;
        i {
          font-size: 50px;
          transition: all 0.5s ease-in-out;
          opacity: 0;
        }
        &:hover {
          @apply opacity-100;
        }
        &:hover i {
          @apply transform scale-150 opacity-100;
        }

        .play-count {
          position: absolute;
          top: 10px;
          left: 10px;
          font-size: 14px;
        }
      }
    }
    &-title {
      @apply p-2 text-sm text-white truncate;
    }
  }
}

.mobile {
  .recommend-list {
    grid-template-columns: repeat(auto-fill, minmax(25%, 1fr));
  }
}
</style>

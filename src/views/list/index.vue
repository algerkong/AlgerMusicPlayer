<script lang="ts" setup>
import { getRecommendList, getListDetail, getListByCat } from '@/api/list'
import type { IRecommendItem } from "@/type/list";
import type { IListDetail } from "@/type/listDetail";
import { setAnimationClass, setAnimationDelay, getImgUrl } from "@/utils";
import { useRoute } from 'vue-router';
import MusicList from "@/components/MusicList.vue";
import PlayBottom from '@/components/common/PlayBottom.vue';

const recommendList = ref()
const showMusic = ref(false)

const recommendItem = ref<IRecommendItem>()
const listDetail = ref<IListDetail>()
const selectRecommendItem = async (item: IRecommendItem) => {
  showMusic.value = true
  const { data } = await getListDetail(item.id)
  recommendItem.value = item
  listDetail.value = data
}

const route = useRoute();
const listTitle = ref(route.query.type || "歌单列表");

const loadList = async (type: any) => {
  const params = {
    cat: type || '',
    limit: 30,
    offset: 0
  }
  const { data } = await getListByCat(params);
  recommendList.value = data.playlists
}

if (route.query.type) {
  loadList(route.query.type)
} else {
  getRecommendList().then((res: { data: { result: any; }; }) => {
    recommendList.value = res.data.result
  })
}

watch(
  () => route.query,
  async newParams => {
    const params = {
      tag: newParams.type || '',
      limit: 30,
      before: 0
    }
    loadList(newParams.type);
  }
)

// 格式化数字 千,万, 百万, 千万,亿
const formatNumber = (num: any) => {
  num = num * 1
  if (num < 10000) {
    return num
  }
  if (num < 100000000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return (num / 100000000).toFixed(1) + '亿'
}
</script>

<template>
  <div class="list-page">
    <div
        class="recommend-title"
        :class="setAnimationClass('animate__bounceInLeft')"
      >{{ listTitle }}</div>
    <!-- 歌单列表 -->
    <n-scrollbar class="recommend" @click="showMusic = false" :size="100">
      <div class="recommend-list" v-if="recommendList">
        <div
          class="recommend-item"
          v-for="(item,index) in recommendList"
          :class="setAnimationClass('animate__bounceIn')"
          :style="setAnimationDelay(index, 30)"
          @click.stop="selectRecommendItem(item)"
        >
          <div class="recommend-item-img">
            <n-image
              class="recommend-item-img-img"
              :src="getImgUrl( (item.picUrl || item.coverImgUrl), '200y200')"
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
      <PlayBottom/>
    </n-scrollbar>
    <MusicList v-if="listDetail?.playlist" v-model:show="showMusic" :music-list="listDetail?.playlist" />
  </div>
</template>

<style lang="scss" scoped>
.list-page {
  @apply relative h-full w-full pt-4;
}

.recommend {
  @apply w-full h-full bg-none;
  &-title {
    @apply text-lg font-bold text-white pb-4;
  }

  &-list {
    @apply grid gap-6 pb-28 pr-3;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
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

</style>
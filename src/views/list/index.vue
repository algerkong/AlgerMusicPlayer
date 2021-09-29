<script lang="ts" setup>
import { getRecommendList, getListDetail } from '@/api/list'
import { computed, onMounted, ref } from 'vue';
import type { IRecommendList, IRecommendItem } from "@/type/list";
import type { IListDetail } from "@/type/listDetail";
import { setAnimationClass, setAnimationDelay } from "@/utils";
import SongItem from "@/components/common/SongItem.vue";



const recommendList = ref<IRecommendList>()
const showMusic = ref(false)
onMounted(async () => {
  const { data } = await getRecommendList()
  recommendList.value = data
})

const recommendItem = ref<IRecommendItem>()
const listDetail = ref<IListDetail>()
const selectRecommendItem = async (item: IRecommendItem) => {
  const { data } = await getListDetail(item.id)
  showMusic.value = true
  recommendItem.value = item
  listDetail.value = data
  console.log(data);

}
const closeMusic = () => {
  showMusic.value = false
}

const musicFullClass = computed(() => {
  if (recommendItem.value) {
    return setAnimationClass('animate__fadeInUp')
  } else {
    return setAnimationClass('animate__fadeOutDown')
  }
})


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

const formatDetail = computed(() => (detail: any) => {
  let song = {
    artists: detail.ar,
    name: detail.al.name,
    id: detail.al.id,
  }

  detail.song = song
  detail.picUrl = detail.al.picUrl
  return detail
})


</script>

<template>
  <div class="list-page">
    <n-layout class="recommend" :native-scrollbar="false" @click="showMusic = false">
      <div class="recommend-title" :class="setAnimationClass('animate__bounceInLeft')">歌单推荐</div>
      <div class="recommend-list">
        <div
          class="recommend-item"
          v-for="(item,index) in recommendList?.result"
          :class="setAnimationClass('animate__bounceIn')"
          :style="setAnimationDelay(index, 30)"
          @click.stop="selectRecommendItem(item)"
        >
          <div class="recommend-item-img">
            <img :src="item.picUrl + '?param=200y200'" alt />
            <div class="top">
              <div class="play-count">{{ formatNumber(item.playCount) }}</div>
              <i class="iconfont icon-videofill"></i>
            </div>
          </div>
          <div class="recommend-item-title">{{ item.name }}</div>
        </div>
      </div>
    </n-layout>

    <div class="music-page" v-show="showMusic" :class="musicFullClass">
      <i class="iconfont icon-icon_error music-close" @click="closeMusic()"></i>
      <div class="music-title">{{ recommendItem?.name }}</div>
      <n-layout class="music-list" :native-scrollbar="false">
        <div
          v-for="(item, index) in listDetail?.playlist.tracks"
          :key="item.id"
          :class="setAnimationClass('animate__bounceInRight')"
          :style="setAnimationDelay(index, 100)"
        >
          <SongItem :item="formatDetail(item)" />
        </div>
      </n-layout>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.list-page {
  position: relative;
}

.recommend {
  width: 100%;
  height: 800px;
  background-color: #000000;
  &-title {
    @apply text-lg font-bold text-white py-4;
  }

  &-list {
    @apply flex flex-wrap;
  }
  &-item {
    width: 200px;
    @apply mr-6 mb-4;
    &-img {
      @apply rounded-xl overflow-hidden relative;
      &:hover img {
        @apply hover:scale-110 transition-all duration-300 ease-in-out;
      }
      img {
        width: 200px;
        height: 200px;
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

.music {
  &-page {
    width: 100%;
    height: 734px;
    position: absolute;
    background-color: #000000f0;
    top: 100px;
    left: 0;
    border-radius: 30px 30px 0 0;
    animation-duration: 300ms;
  }
  &-title {
    @apply text-lg font-bold text-white p-4;
  }

  &-close {
    @apply absolute top-4 right-4 cursor-pointer text-white text-3xl;
  }

  &-list {
    height: 594px;
    background-color: #00000000;
  }
}
</style>
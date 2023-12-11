<script lang="ts" setup>
import { getRecommendList, getListDetail, getListByTag, getListByCat } from '@/api/list'
import { computed, onMounted, ref, watch } from 'vue';
import type { IRecommendList, IRecommendItem } from "@/type/list";
import type { IListDetail } from "@/type/listDetail";
import { setAnimationClass, setAnimationDelay } from "@/utils";
import SongItem from "@/components/common/SongItem.vue";
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';


const store = useStore();
const recommendList = ref()
const showMusic = ref(false)

const recommendItem = ref<IRecommendItem>()
const listDetail = ref<IListDetail>()
const selectRecommendItem = async (item: IRecommendItem) => {
  const { data } = await getListDetail(item.id)
  showMusic.value = true
  recommendItem.value = item
  listDetail.value = data
}
const closeMusic = () => {
  showMusic.value = false
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


const handlePlay = (item: any) => {
  const list = listDetail.value?.playlist.tracks || []
  console.log('list',list)
  console.log('item',item)
  const musicIndex = (list.findIndex((music: any) => music.id == item.id) || 0)
  store.commit('setPlayList', list.slice(musicIndex))
}

</script>

<template>
  <div class="list-page">
    <!-- 歌单列表 -->
    <n-layout class="recommend" :native-scrollbar="false" @click="showMusic = false">
      <div
        class="recommend-title"
        :class="setAnimationClass('animate__bounceInLeft')"
      >{{ listTitle }}</div>
      <div class="recommend-list" v-if="recommendList">
        <div
          class="recommend-item"
          v-for="(item,index) in recommendList"
          :class="setAnimationClass('animate__bounceIn')"
          :style="setAnimationDelay(index, 30)"
          @click.stop="selectRecommendItem(item)"
        >
          <div class="recommend-item-img">
            <img :src="(item.picUrl || item.coverImgUrl) + '?param=200y200'" />
            <div class="top">
              <div class="play-count">{{ formatNumber(item.playCount) }}</div>
              <i class="iconfont icon-videofill"></i>
            </div>
          </div>
          <div class="recommend-item-title">{{ item.name }}</div>
        </div>
      </div>
    </n-layout>

    <transition name="musicPage">
      <div class="music-page" v-if="showMusic">
        <i class="iconfont icon-icon_error music-close" @click="closeMusic()"></i>
        <div class="music-title">{{ recommendItem?.name }}</div>
        <!-- 歌单歌曲列表 -->
        <n-layout class="music-list" :native-scrollbar="false">
          <div
            v-for="(item, index) in listDetail?.playlist.tracks"
            :key="item.id"
            :class="setAnimationClass('animate__bounceInUp')"
            :style="setAnimationDelay(index, 50)"
          >
            <SongItem :item="formatDetail(item)" @play="handlePlay" />
          </div>
        </n-layout>
      </div>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
.list-page {
  position: relative;
}

.musicPage-enter-active {
  animation: fadeInUp 0.8s ease-in-out;
}

.musicPage-leave-active {
  animation: fadeOutDown 0.8s ease-in-out;
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
    padding-bottom: 100px;
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
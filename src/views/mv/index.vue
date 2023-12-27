<template>
  <div class="mv-list">
    <div class="mv-list-title">
      <h2>推荐MV</h2>
    </div>
    <n-scrollbar :size="100">
      <div class="mv-list-content" :class="setAnimationClass('animate__bounceInLeft')">
        <div class="mv-item" v-for="(item, index) in mvList" :key="item.id"
          :class="setAnimationClass('animate__bounceIn')" :style="setAnimationDelay(index, 30)">
          <div class="mv-item-img" @click="handleShowMv(item)">
            <n-image class="mv-item-img-img" :src="getImgUrl((item.cover), '200y200')" lazy preview-disabled />
            <div class="top">
              <div class="play-count">{{ formatNumber(item.playCount) }}</div>
              <i class="iconfont icon-videofill"></i>
            </div>
          </div>
          <div class="mv-item-title">{{ item.name }}</div>
        </div>
      </div>
    </n-scrollbar>

    <n-drawer :show="showMv" height="100vh" placement="bottom">
      <div class="mv-detail">
        <div class="mv-detail-title">
          <div class="title">{{ playMvItem?.name }}</div>
          <button @click="close">
            <i class="iconfont icon-xiasanjiaoxing"></i>
          </button>
        </div>
        <video :src="playMvUrl" controls autoplay></video>
      </div>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { getTopMv, getMvUrl } from '@/api/mv';
import { IMvItem } from '@/type/mv';
import { setAnimationClass, setAnimationDelay, getImgUrl, formatNumber } from "@/utils";
import { useStore } from 'vuex';

const showMv = ref(false)
const mvList = ref<Array<IMvItem>>([])
const playMvItem = ref<IMvItem>()
const playMvUrl = ref<string>()
const store = useStore()

onMounted(async () => {
  const res = await getTopMv(30)
  mvList.value = res.data.data
  console.log('mvList.value', mvList.value)
})

const handleShowMv = async (item: IMvItem) => {
  store.commit('setIsPlay', false)
  showMv.value = true
  const res = await getMvUrl(item.id)
  playMvItem.value = item;
  playMvUrl.value = res.data.data.url
}

const close = () => {
  showMv.value = false
  if (store.state.playMusicUrl) {
    store.commit('setIsPlay', true)
  }
}

</script>

<style scoped lang="scss">
.mv-list {
  @apply relative h-full w-full pt-4;

  &-content {
    @apply grid gap-6 pb-28 pr-3;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }

  .mv-item {
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

.mv-detail {
  @apply w-full h-full bg-black relative;

  &-title {
    @apply absolute w-full top-12 left-0 flex justify-between z-50 h-10 px-4 py-2 text-lg items-center;
    background: linear-gradient(0, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.8) 100%);

    button .icon-xiasanjiaoxing {
      @apply text-2xl;
    }

    button:hover {
      @apply text-green-400;
    }
  }

  video {
    @apply w-full h-full;
  }
}</style>
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

    <n-drawer :show="showMv" height="100vh" placement="bottom" :z-index="999999999">
      <div class="mv-detail">
        <video :src="playMvUrl" controls autoplay></video>
        <div class="mv-detail-title">
          <div class="title">{{ playMvItem?.name }}</div>
          <button @click="close">
            <i class="iconfont icon-xiasanjiaoxing"></i>
          </button>
        </div>
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
  store.commit('setPlayMusic', false)
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
  @apply relative h-full w-full;

  &-title {
    @apply text-xl font-bold;
  }

  &-content {
    @apply grid gap-6 pb-4 mt-2;
    grid-template-columns: repeat(auto-fill, minmax(14%, 1fr));
  }

  .mv-item {
    @apply p-2 rounded-lg;
    background-color: #454545;
    &-img {
      @apply rounded-lg overflow-hidden relative;

      &:hover img {
        @apply hover:scale-110 transition-all duration-300 ease-in-out object-top;
      }

      &-img {
        @apply h-full w-full rounded-xl overflow-hidden;
      }

      .top {
        @apply absolute w-full h-full top-0 left-0 flex justify-center items-center transition-all duration-300 ease-in-out cursor-pointer;
        background-color: #0000009b;
        opacity: 0;

        i {
          font-size: 40px;
          transition: all 0.5s ease-in-out;
          opacity: 0;
        }

        &:hover {
          @apply opacity-100;
        }

        &:hover i {
          @apply transform scale-150 opacity-80;
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
    @apply absolute w-full left-0 flex justify-between h-16 px-6 py-2 text-xl font-bold items-center z-50 transition-all duration-300 ease-in-out -top-24;
    background: linear-gradient(0, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%);
    button .icon-xiasanjiaoxing {
      @apply text-3xl;
    }

    button:hover {
      @apply text-green-400;
    }
  }

  video {
    @apply w-full h-full;
  }
  video:hover + .mv-detail-title {
    @apply top-0;
  }

  .mv-detail-title:hover {
    @apply top-0;
  }
}</style>
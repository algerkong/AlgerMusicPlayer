<script lang="ts" setup>
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import { getUserDetail, getUserPlaylist } from "@/api/user";
import type { IUserDetail } from "@/type/user";
import { ref } from "vue";
import { setAnimationClass, setAnimationDelay } from "@/utils";

const store = useStore()
const router = useRouter()


const userDetail = ref<IUserDetail>()
const playList = ref<any[]>([])
const user = store.state.user

const loadPage = async () => {
  if (!user) {
    router.push("/login")
    return
  }

  const { data: userData } = await getUserDetail(user.userId)
  userDetail.value = userData

  const { data: playlistData } = await getUserPlaylist(user.userId)
  playList.value = playlistData.playlist

}
loadPage()

</script>

<template>
  <div class="user-page" :class="setAnimationClass('animate__fadeInLeft')">
    <div class="left" v-if="userDetail" :style="{ backgroundImage: `url(${user.backgroundUrl})` }">
      <div class="page">
        <div class="user-name">{{ user.nickname }}</div>
        <div class="user-info">
          <n-avatar round :size="50" :src="user.avatarUrl" />
          <div class="user-info-list">
            <div class="user-info-item">
              <div class="label">{{ userDetail.profile.followeds }}</div>
              <div>粉丝</div>
            </div>
            <div class="user-info-item">
              <div class="label">{{ userDetail.profile.follows }}</div>
              <div>关注</div>
            </div>
            <div class="user-info-item">
              <div class="label">{{ userDetail.level }}</div>
              <div>等级</div>
            </div>
          </div>
        </div>
        <div class="uesr-signature">{{ userDetail.profile.signature }}</div>

        <div class="play-list" :class="setAnimationClass('animate__fadeInLeft')">
          <div class="play-list-title">创建的歌单</div>
          <div class="play-list-item" v-for="(item,index) in playList" :key="index">
            <img class="play-list-item-img" :src="item.coverImgUrl" />
            <div class="play-list-item-info">
              <div class="play-list-item-name">{{ item.name }}</div>
              <div class="play-list-item-count">{{ item.trackCount }}首，播放{{ item.playCount }}次</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.user-page {
  @apply flex;
}

.left {
  max-width: 600px;
  background-color: #0d0d0d;
  background-size: 100%;
  @apply bg-no-repeat;

  @apply flex-1 rounded-2xl mt-4 overflow-hidden relative;
  .page {
    @apply p-4  w-full z-10;
    background-color: #0d0d0d66;
  }

  .user-name {
    @apply text-xl text-white font-bold  opacity-70 mb-4;
  }

  .uesr-signature {
    @apply text-white opacity-70 mt-4;
  }
  .user-info {
    @apply flex items-center;
    &-list {
      @apply flex justify-around  w-2/5 text-center opacity-70;
      .label {
        @apply text-xl text-white font-bold;
      }
    }
  }
}

.play-list {
  @apply mt-4 py-4 px-2 rounded-xl;
  background-color: #000000;
  &-title {
    @apply text-lg text-white opacity-70;
  }
  &-item {
    @apply flex items-center hover:bg-gray-800 transition-all duration-200 px-2 py-1 rounded-xl cursor-pointer;
    &-img {
      width: 60px;
      height: 60px;
      @apply rounded-xl;
    }
    &-info {
      @apply ml-2;
    }
    &-name {
      @apply text-white;
    }
  }
}
</style>
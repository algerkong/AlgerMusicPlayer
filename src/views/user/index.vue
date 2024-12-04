<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';

import { getListDetail } from '@/api/list';
import { getUserDetail, getUserPlaylist, getUserRecord } from '@/api/user';
import PlayBottom from '@/components/common/PlayBottom.vue';
import SongItem from '@/components/common/SongItem.vue';
import MusicList from '@/components/MusicList.vue';
import type { Playlist } from '@/type/listDetail';
import type { IUserDetail } from '@/type/user';
import { getImgUrl, isMobile, setAnimationClass, setAnimationDelay } from '@/utils';

defineOptions({
  name: 'User',
});

const store = useStore();
const router = useRouter();
const userDetail = ref<IUserDetail>();
const playList = ref<any[]>([]);
const recordList = ref();
const infoLoading = ref(false);

const user = computed(() => store.state.user);

const loadPage = async () => {
  if (!user.value) {
    router.push('/login');
    return;
  }
  infoLoading.value = true;

  const { data: userData } = await getUserDetail(user.value.userId);
  userDetail.value = userData;

  const { data: playlistData } = await getUserPlaylist(user.value.userId);
  playList.value = playlistData.playlist;

  const { data: recordData } = await getUserRecord(user.value.userId);
  recordList.value = recordData.allData.map((item: any) => ({
    ...item,
    ...item.song,
    picUrl: item.song.al.picUrl,
  }));
  infoLoading.value = false;
};

onActivated(() => {
  if (!user.value) {
    router.push('/login');
  } else {
    loadPage();
  }
});

const isShowList = ref(false);
const list = ref<Playlist>();
const listLoading = ref(false);
// 展示歌单
const showPlaylist = async (id: number, name: string) => {
  isShowList.value = true;
  listLoading.value = true;

  list.value = {
    name,
  } as Playlist;
  const { data } = await getListDetail(id);
  list.value = data.playlist;
  listLoading.value = false;
};

const handlePlay = () => {
  const tracks = recordList.value || [];
  store.commit('setPlayList', tracks);
};
</script>

<template>
  <div class="user-page">
    <div
      v-if="userDetail"
      class="left"
      :class="setAnimationClass('animate__fadeInLeft')"
      :style="{ backgroundImage: `url(${getImgUrl(user.backgroundUrl)})` }"
    >
      <div class="page">
        <div class="user-name">{{ user.nickname }}</div>
        <div class="user-info">
          <n-avatar round :size="50" :src="getImgUrl(user.avatarUrl, '50y50')" />
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
          <div class="title">创建的歌单</div>
          <n-scrollbar>
            <div
              v-for="(item, index) in playList"
              :key="index"
              class="play-list-item"
              @click="showPlaylist(item.id, item.name)"
            >
              <n-image :src="getImgUrl(item.coverImgUrl, '50y50')" class="play-list-item-img" lazy preview-disabled />
              <div class="play-list-item-info">
                <div class="play-list-item-name">{{ item.name }}</div>
                <div class="play-list-item-count">{{ item.trackCount }}首，播放{{ item.playCount }}次</div>
              </div>
            </div>
            <play-bottom />
          </n-scrollbar>
        </div>
      </div>
    </div>
    <div v-if="!isMobile" v-loading="infoLoading" class="right" :class="setAnimationClass('animate__fadeInRight')">
      <div class="title">听歌排行</div>
      <div class="record-list">
        <n-scrollbar>
          <div
            v-for="(item, index) in recordList"
            :key="item.id"
            class="record-item"
            :class="setAnimationClass('animate__bounceInUp')"
            :style="setAnimationDelay(index, 25)"
          >
            <song-item class="song-item" :item="item" @play="handlePlay" />
            <div class="play-count">{{ item.playCount }}次</div>
          </div>
          <play-bottom />
        </n-scrollbar>
      </div>
    </div>
    <music-list
      v-model:show="isShowList"
      :name="list?.name || ''"
      :song-list="list?.tracks || []"
      :list-info="list"
      :loading="listLoading"
    />
  </div>
</template>

<style lang="scss" scoped>
.user-page {
  @apply flex h-full;
  .left {
    max-width: 600px;
    background-color: #0d0d0d;
    background-size: 100%;
    @apply flex-1 rounded-2xl  overflow-hidden relative bg-no-repeat h-full;
    .page {
      @apply p-4  w-full z-10 flex flex-col h-full;
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

  .right {
    @apply flex-1 ml-4 overflow-hidden h-full;
    .record-list {
      background-color: #0d0d0d;
      @apply rounded-2xl;
      height: calc(100% - 3.75rem);
      .record-item {
        @apply flex items-center px-4;
      }

      .song-item {
        @apply flex-1;
      }

      .play-count {
        @apply text-white opacity-70 ml-4;
      }
    }
    .title {
      @apply text-xl text-white font-bold  opacity-70 m-4;
    }
  }
}

.play-list {
  @apply mt-4 py-4 px-2 rounded-xl flex-1 overflow-hidden;
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

.mobile {
  .user-page {
    @apply px-4;
  }
}
</style>

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
              <div>{{ t('user.profile.followers') }}</div>
            </div>
            <div class="user-info-item">
              <div class="label">{{ userDetail.profile.follows }}</div>
              <div>{{ t('user.profile.following') }}</div>
            </div>
            <div class="user-info-item">
              <div class="label">{{ userDetail.level }}</div>
              <div>{{ t('user.profile.level') }}</div>
            </div>
          </div>
        </div>
        <div class="uesr-signature">{{ userDetail.profile.signature }}</div>

        <div class="play-list" :class="setAnimationClass('animate__fadeInLeft')">
          <div class="title">{{ t('user.playlist.created') }}</div>
          <n-scrollbar>
            <div
              v-for="(item, index) in playList"
              :key="index"
              class="play-list-item"
              @click="showPlaylist(item.id, item.name)"
            >
              <n-image
                :src="getImgUrl(item.coverImgUrl, '50y50')"
                class="play-list-item-img"
                lazy
                preview-disabled
              />
              <div class="play-list-item-info">
                <div class="play-list-item-name">{{ item.name }}</div>
                <div class="play-list-item-count">
                  {{ t('user.playlist.trackCount', { count: item.trackCount }) }}，{{
                    t('user.playlist.playCount', { count: item.playCount })
                  }}
                </div>
              </div>
            </div>
            <div class="pb-20"></div>
            <play-bottom />
          </n-scrollbar>
        </div>
      </div>
    </div>
    <div
      v-if="!isMobile"
      v-loading="infoLoading"
      class="right"
      :class="setAnimationClass('animate__fadeInRight')"
    >
      <div class="title">{{ t('user.ranking.title') }}</div>
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
            <div class="play-count">
              {{ t('user.ranking.playCount', { count: item.playCount }) }}
            </div>
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
      :can-remove="true"
      @remove-song="handleRemoveFromPlaylist"
    />
  </div>
</template>

<script lang="ts" setup>
import { useMessage } from 'naive-ui';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getListDetail } from '@/api/list';
import { updatePlaylistTracks } from '@/api/music';
import { getUserDetail, getUserPlaylist, getUserRecord } from '@/api/user';
import PlayBottom from '@/components/common/PlayBottom.vue';
import SongItem from '@/components/common/SongItem.vue';
import MusicList from '@/components/MusicList.vue';
import { usePlayerStore } from '@/store/modules/player';
import { useUserStore } from '@/store/modules/user';
import type { Playlist } from '@/type/listDetail';
import type { IUserDetail } from '@/type/user';
import { getImgUrl, isMobile, setAnimationClass, setAnimationDelay } from '@/utils';

defineOptions({
  name: 'User'
});

const { t } = useI18n();
const userStore = useUserStore();
const playerStore = usePlayerStore();
const router = useRouter();
const userDetail = ref<IUserDetail>();
const playList = ref<any[]>([]);
const recordList = ref();
const infoLoading = ref(false);
const mounted = ref(true);
const isShowList = ref(false);
const list = ref<Playlist>();
const listLoading = ref(false);
const message = useMessage();

const user = computed(() => userStore.user);

onBeforeUnmount(() => {
  mounted.value = false;
});

// 检查登录状态
const checkLoginStatus = () => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');

  if (!token || !userData) {
    router.push('/login');
    return false;
  }

  // 如果store中没有用户数据，但localStorage中有，则恢复用户数据
  if (!userStore.user && userData) {
    userStore.setUser(JSON.parse(userData));
  }

  return true;
};

const loadPage = async () => {
  if (!mounted.value) return;

  // 检查登录状态
  if (!checkLoginStatus()) return;

  await loadData();
};

const loadData = async () => {
  try {
    infoLoading.value = true;

    const { data: userData } = await getUserDetail(user.value.userId);
    if (!mounted.value) return;
    userDetail.value = userData;

    const { data: playlistData } = await getUserPlaylist(user.value.userId);
    if (!mounted.value) return;
    playList.value = playlistData.playlist;

    const { data: recordData } = await getUserRecord(user.value.userId);
    if (!mounted.value) return;
    recordList.value = recordData.allData.map((item: any) => ({
      ...item,
      ...item.song,
      picUrl: item.song.al.picUrl
    }));
  } catch (error: any) {
    console.error('加载用户页面失败:', error);
    // 如果获取用户数据失败，可能是token过期
    if (error.response?.status === 401) {
      userStore.logout();
      router.push('/login');
    }
  } finally {
    if (mounted.value) {
      infoLoading.value = false;
    }
  }
};

// 监听路由变化
watch(
  () => router.currentRoute.value.path,
  (newPath) => {
    console.log('newPath', newPath);
    if (newPath === '/user') {
      checkLoginStatus();
      loadData();
    }
  }
);

// 监听用户状态变化
watch(
  () => userStore.user,
  (newUser) => {
    if (!mounted.value) return;
    if (newUser) {
      loadUserData();
    }
  }
);

// 页面挂载时检查登录状态
onMounted(() => {
  checkLoginStatus();
});

// 展示歌单
const showPlaylist = async (id: number, name: string) => {
  isShowList.value = true;
  listLoading.value = true;

  list.value = {
    name,
    id
  } as Playlist;
  await loadPlaylistDetail(id);
  listLoading.value = false;
};

// 加载歌单详情
const loadPlaylistDetail = async (id: number) => {
  const { data } = await getListDetail(id);
  list.value = data.playlist;
};

// 从歌单中删除歌曲
const handleRemoveFromPlaylist = async (songId: number) => {
  if (!list.value?.id) return;

  try {
    const res = await updatePlaylistTracks({
      op: 'del',
      pid: list.value.id,
      tracks: songId.toString()
    });

    if (res.status === 200) {
      message.success(t('user.message.deleteSuccess'));
      // 重新加载歌单详情
      await loadPlaylistDetail(list.value.id);
    } else {
      throw new Error(res.data?.msg || t('user.message.deleteFailed'));
    }
  } catch (error: any) {
    console.error('删除歌曲失败:', error);
    message.error(error.message || t('user.message.deleteFailed'));
  }
};

const handlePlay = () => {
  const tracks = recordList.value || [];
  playerStore.setPlayList(tracks);
};
</script>

<style lang="scss" scoped>
.user-page {
  @apply flex h-full;
  .left {
    max-width: 600px;
    @apply flex-1 rounded-2xl overflow-hidden relative bg-no-repeat h-full;
    @apply bg-gray-900 dark:bg-gray-800;

    .page {
      @apply p-4 w-full z-10 flex flex-col h-full;
      @apply bg-black bg-opacity-40;
    }
    .title {
      @apply text-lg font-bold;
      @apply text-gray-900 dark:text-white;
    }

    .user-name {
      @apply text-xl font-bold mb-4;
      @apply text-white text-opacity-70;
    }

    .uesr-signature {
      @apply mt-4;
      @apply text-white text-opacity-70;
    }

    .user-info {
      @apply flex items-center;
      &-list {
        @apply flex justify-around w-2/5 text-center;
        @apply text-white text-opacity-70;

        .label {
          @apply text-xl font-bold text-white;
        }
      }
    }
  }

  .right {
    @apply flex-1 ml-4 overflow-hidden h-full;

    .record-list {
      @apply rounded-2xl;
      @apply bg-light dark:bg-black;
      height: calc(100% - 100px);

      .record-item {
        @apply flex items-center px-4;
      }

      .song-item {
        @apply flex-1;
      }

      .play-count {
        @apply ml-4;
        @apply text-gray-600 dark:text-gray-400;
      }
    }

    .title {
      @apply text-xl font-bold m-4;
      @apply text-gray-900 dark:text-white;
    }
  }
}

.play-list {
  @apply mt-4 py-4 px-2 rounded-xl flex-1 overflow-hidden;
  @apply bg-light dark:bg-black;

  &-title {
    @apply text-lg;
    @apply text-gray-900 dark:text-white;
  }

  &-item {
    @apply flex items-center px-2 py-1 rounded-xl cursor-pointer;
    @apply transition-all duration-200;
    @apply hover:bg-light-200 dark:hover:bg-dark-200;

    &-img {
      width: 60px;
      height: 60px;
      @apply rounded-xl;
    }

    &-info {
      @apply ml-2;
    }

    &-name {
      @apply text-gray-900 dark:text-white text-base;
    }

    &-count {
      @apply text-gray-500 dark:text-gray-400;
    }
  }
}

.mobile {
  .user-page {
    @apply px-4;
  }
}
</style>

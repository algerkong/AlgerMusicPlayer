<template>
  <div class="user-page">
    <template v-if="infoLoading">
      <div
        class="left-skeleton flex-1 max-w-[600px] rounded-2xl overflow-hidden p-4 bg-light-200 dark:bg-dark-100"
      >
        <div class="flex flex-col gap-6">
          <div class="flex justify-between">
            <div class="h-8 w-32 skeleton-shimmer rounded-lg" />
            <div class="h-6 w-20 skeleton-shimmer rounded-lg" />
          </div>
          <div class="flex items-center gap-4">
            <div class="h-[50px] w-[50px] skeleton-shimmer rounded-full" />
            <div class="flex w-2/5 justify-around">
              <div v-for="i in 3" :key="i" class="flex flex-col items-center gap-1">
                <div class="h-5 w-8 skeleton-shimmer rounded-lg" />
                <div class="h-4 w-12 skeleton-shimmer rounded-lg" />
              </div>
            </div>
          </div>
          <div class="h-4 w-3/4 skeleton-shimmer rounded-lg" />
          <div class="mt-4 rounded-xl bg-light p-4 dark:bg-black">
            <div class="mb-4 h-8 w-full skeleton-shimmer rounded-xl" />
            <div class="space-y-4">
              <div v-for="i in 5" :key="i" class="flex gap-3">
                <div class="h-[50px] w-[50px] skeleton-shimmer rounded-xl flex-shrink-0" />
                <div class="flex flex-1 flex-col justify-center gap-2">
                  <div class="h-4 w-1/2 skeleton-shimmer rounded-lg" />
                  <div class="h-3 w-1/3 skeleton-shimmer rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!isMobile" class="right">
        <div class="title"><div class="h-8 w-32 skeleton-shimmer rounded-lg" /></div>
        <div class="rounded-2xl bg-light p-4 dark:bg-black">
          <div class="space-y-2">
            <div
              v-for="i in 10"
              :key="i"
              class="flex items-center gap-4 rounded-2xl bg-light-100 p-2 dark:bg-dark-100"
            >
              <div class="h-10 w-10 skeleton-shimmer rounded-full flex-shrink-0" />
              <div class="h-10 w-10 skeleton-shimmer rounded-xl flex-shrink-0" />
              <div class="flex flex-1 flex-col gap-2">
                <div class="h-4 w-1/3 skeleton-shimmer rounded-lg" />
                <div class="h-3 w-1/4 skeleton-shimmer rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div
        v-if="userDetail && user"
        class="left"
        :class="setAnimationClass('animate__fadeIn')"
        :style="{ backgroundImage: `url(${getImgUrl(user.backgroundUrl)})` }"
      >
        <div class="page">
          <div class="user-name">
            <span>{{ user.nickname }}</span>
            <span v-if="currentLoginType" class="login-type">{{
              t('login.title.' + currentLoginType)
            }}</span>
          </div>
          <div class="user-info">
            <n-avatar round :size="50" :src="getImgUrl(user.avatarUrl, '50y50')" />
            <div class="user-info-list">
              <div class="user-info-item">
                <div class="label">{{ userDetail.profile.followeds }}</div>
                <div>{{ t('user.profile.followers') }}</div>
              </div>
              <div class="user-info-item" @click="showFollowList">
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
          <div class="play-list" :class="setAnimationClass('animate__fadeIn')">
            <div class="tab-container">
              <n-tabs v-model:value="currentTab" type="segment" animated>
                <n-tab v-for="tab in tabs" :key="tab.key" :name="tab.key" :tab="t(tab.label)">
                </n-tab>
              </n-tabs>
            </div>
            <n-scrollbar>
              <div class="mt-4">
                <div
                  v-if="albumLoading && currentTab === 'album'"
                  class="flex h-32 items-center justify-center"
                >
                  <n-spin size="medium" />
                </div>
                <template v-else>
                  <button
                    class="play-list-item"
                    @click="goToImportPlaylist"
                    v-if="isElectron && currentTab === 'created'"
                  >
                    <div class="play-list-item-img"><i class="icon iconfont ri-add-line"></i></div>
                    <div class="play-list-item-info">
                      <div class="play-list-item-name">
                        {{ t('comp.playlist.import.button') }}
                      </div>
                    </div>
                  </button>
                  <div
                    v-for="(item, index) in currentList"
                    :key="index"
                    class="play-list-item"
                    @click="handleItemClick(item)"
                  >
                    <n-image
                      :src="getImgUrl(getCoverUrl(item), '50y50')"
                      class="play-list-item-img"
                      lazy
                      preview-disabled
                    />
                    <div class="play-list-item-info">
                      <div class="play-list-item-name">
                        <n-ellipsis :line-clamp="1">{{ item.name }}</n-ellipsis>
                      </div>
                      <div class="play-list-item-count">
                        {{ getItemDescription(item) }}
                      </div>
                    </div>
                  </div>
                  <div class="pb-20"></div>
                  <play-bottom />
                </template>
              </div>
            </n-scrollbar>
          </div>
        </div>
      </div>
      <div v-if="!isMobile" class="right" :class="setAnimationClass('animate__fadeIn')">
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
              <div class="play-score">
                {{ index + 1 }}
              </div>
              <song-item class="song-item" :item="item" mini @play="handlePlay" />
            </div>
            <play-bottom />
          </n-scrollbar>
        </div>
      </div>
    </template>
    <!-- 未登录时显示登录组件 -->
    <div
      v-if="!isLoggedIn && isMobile"
      class="login-container"
      :class="setAnimationClass('animate__fadeIn')"
    >
      <login-component @login-success="handleLoginSuccess" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useMessage } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getUserAlbumSublist, getUserDetail, getUserPlaylist, getUserRecord } from '@/api/user';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import PlayBottom from '@/components/common/PlayBottom.vue';
import SongItem from '@/components/common/SongItem.vue';
import { usePlayerStore } from '@/store/modules/player';
import { useUserStore } from '@/store/modules/user';
import { getImgUrl, isElectron, isMobile, setAnimationClass, setAnimationDelay } from '@/utils';
import { checkLoginStatus as checkAuthStatus } from '@/utils/auth';
import LoginComponent from '@/views/login/index.vue';

defineOptions({
  name: 'User'
});

const { t } = useI18n();
const userStore = useUserStore();
const playerStore = usePlayerStore();
const router = useRouter();
const { userDetail, recordList } = storeToRefs(userStore);
const infoLoading = ref(false);
const albumLoading = ref(false);
const mounted = ref(true);
const message = useMessage();

// Tab 相关
const tabs = [
  { key: 'created', label: 'user.tabs.created' },
  { key: 'favorite', label: 'user.tabs.favorite' },
  { key: 'album', label: 'user.tabs.album' }
];
const currentTab = ref('created');

const user = computed(() => userStore.user);

// 创建的歌单（当前用户创建的）
const createdPlaylists = computed(() => {
  if (!user.value) return [];
  return userStore.playList.filter((item) => item.creator?.userId === user.value!.userId);
});

// 收藏的歌单（当前用户收藏的）
const favoritePlaylists = computed(() => {
  if (!user.value) return [];
  return userStore.playList.filter((item) => item.creator?.userId !== user.value!.userId);
});

// 当前显示的列表（根据 tab 切换）
const currentList = computed(() => {
  if (currentTab.value === 'album') {
    return userStore.albumList;
  }
  return currentTab.value === 'created' ? createdPlaylists.value : favoritePlaylists.value;
});

// 获取封面图片 URL
const getCoverUrl = (item: any) => {
  return item.coverImgUrl || item.picUrl || '';
};

// 获取列表项描述
const getItemDescription = (item: any) => {
  if (currentTab.value === 'album') {
    // 专辑：显示艺术家和歌曲数量
    const artist = item.artist?.name || '';
    const size = item.size ? ` · ${item.size}首` : '';
    return `${artist}${size}`;
  } else {
    // 歌单：显示曲目数和播放量
    return `${t('user.playlist.trackCount', { count: item.trackCount })}，${t('user.playlist.playCount', { count: item.playCount })}`;
  }
};

// 统一处理列表项点击
const handleItemClick = (item: any) => {
  if (currentTab.value === 'album') {
    openAlbum(item);
  } else {
    openPlaylist(item);
  }
};

const goToImportPlaylist = () => {
  router.push('/playlist/import');
};

onBeforeUnmount(() => {
  mounted.value = false;
});

// 检查登录状态
const checkLoginStatus = () => {
  // userStore 的状态已经在 App.vue 中全局初始化，这里只需要检查
  if (userStore.user && userStore.loginType) {
    return true;
  }

  // 如果还是没有登录信息，跳转到登录页
  const loginInfo = checkAuthStatus();
  if (!loginInfo.isLoggedIn) {
    !isMobile.value && router.push('/login');
    return false;
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
    // 只有在没有数据时才显示加载状态
    if (!userDetail.value || !recordList.value?.length) {
      infoLoading.value = true;
    }

    if (!user.value) {
      console.warn('用户数据不存在，尝试重新获取');
      // 可以尝试重新获取用户数据
      return;
    }

    // 如果 store 中还没有数据，则加载
    const promises = [getUserDetail(user.value.userId), getUserRecord(user.value.userId)];

    if (userStore.playList.length === 0) {
      promises.push(getUserPlaylist(user.value.userId));
    }

    const results = await Promise.all(promises);

    if (!mounted.value) return;

    userDetail.value = results[0].data;
    recordList.value = results[1].data.allData.map((item: any) => ({
      ...item,
      ...item.song,
      picUrl: item.song.al.picUrl
    }));

    // 如果加载了歌单，更新 store
    if (results.length > 2 && results[2].data?.playlist) {
      userStore.playList = results[2].data.playlist;
    }
  } catch (error: any) {
    console.error('加载用户页面失败:', error);
    if (error.response?.status === 401) {
      userStore.handleLogout();
      router.push('/login');
    } else {
      // 添加更多错误处理和重试逻辑
      message.error(t('user.message.loadFailed'));
    }
  } finally {
    if (mounted.value) {
      infoLoading.value = false;
    }
  }
};

// 加载专辑列表
const loadAlbumList = async () => {
  // 如果 store 中已经有数据，直接返回
  if (userStore.albumList.length > 0) {
    return;
  }

  try {
    albumLoading.value = true;
    const res = await getUserAlbumSublist({ limit: 100, offset: 0 });
    if (!mounted.value) return;
    // 更新 store 中的专辑列表
    userStore.albumList = res.data.data || [];
  } catch (error: any) {
    console.error('加载专辑列表失败:', error);
    message.error('加载专辑列表失败');
  } finally {
    if (mounted.value) {
      albumLoading.value = false;
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
      checkLoginStatus();
      loadPage();
    }
  }
);

// 监听 tab 切换
watch(currentTab, async (newTab) => {
  if (newTab === 'album') {
    // 刷新收藏专辑列表到 store
    await userStore.initializeCollectedAlbums();
    // 如果 store 中列表为空，则加载
    if (userStore.albumList.length === 0) {
      loadAlbumList();
    }
  }
});

// 页面挂载时检查登录状态
onMounted(() => {
  checkLoginStatus() && loadData();
});

// 替换显示歌单的方法
const openPlaylist = (item: any) => {
  navigateToMusicList(router, {
    id: item.id,
    type: 'playlist',
    name: item.name,
    listInfo: item,
    canRemove: true // 保留可移除功能
  });
};

// 打开专辑
const openAlbum = async (item: any) => {
  navigateToMusicList(router, {
    id: item.id,
    type: 'album',
    name: item.name,
    listInfo: {
      ...item,
      coverImgUrl: item.picUrl || item.coverImgUrl
    },
    canRemove: false // 专辑不支持移除歌曲
  });
};

const handlePlay = () => {
  const tracks = recordList.value || [];
  playerStore.setPlayList(tracks);
};

// 显示关注列表
const showFollowList = () => {
  if (!user.value) return;
  router.push('/user/follows');
};

// // 显示粉丝列表
// const showFollowerList = () => {
//   if (!user.value) return;
//   router.push('/user/followers');
// };

const handleLoginSuccess = () => {
  // 处理登录成功后的逻辑
  checkLoginStatus();
  loadData();
};

const isLoggedIn = computed(() => userStore.user);
const currentLoginType = computed(() => userStore.loginType);
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
      @apply text-lg font-bold flex items-center justify-between;
      @apply text-gray-900 dark:text-white;
    }
    .user-name {
      @apply text-xl font-bold mb-4 flex justify-between;
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

      &-item {
        @apply cursor-pointer;
      }
    }
  }

  .right {
    @apply flex-1 ml-4 overflow-hidden h-full;

    .record-list {
      @apply rounded-2xl;
      @apply bg-light dark:bg-black;
      height: calc(100% - 60px);

      .record-item {
        @apply flex items-center px-2 mb-2 rounded-2xl bg-light-100 dark:bg-dark-100;
      }

      .song-item {
        @apply flex-1;
      }

      .play-score {
        @apply text-gray-500 dark:text-gray-400 mr-2 text-lg w-10 h-10 rounded-full flex items-center justify-center;
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
    @apply flex items-center px-2 py-2 rounded-xl cursor-pointer w-full;
    @apply transition-all duration-200;
    @apply hover:bg-light-200 dark:hover:bg-dark-200;

    &-img {
      @apply flex items-center justify-center rounded-xl text-[40px] w-[60px] h-[60px] bg-light-300 dark:bg-dark-300;
      .iconfont {
        @apply text-[40px];
      }
    }

    &-info {
      @apply ml-2 flex-1;
    }

    &-name {
      @apply text-gray-900 dark:text-white text-base flex items-center gap-2;

      .playlist-creator-tag {
        @apply inline-flex items-center justify-center px-2 rounded-full text-xs;
        @apply bg-light-300 text-primary dark:bg-dark-300 dark:text-white;
        @apply border border-primary/20 dark:border-primary/30;
        height: 18px;
        font-size: 10px;
        font-weight: 500;
        min-width: 60px;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }
    }

    &-count {
      @apply text-gray-500 dark:text-gray-400;
    }
  }
}

.login-type {
  @apply text-sm text-green-500 dark:text-green-400;
}

.mobile {
  .user-page {
    padding-left: var(--page-pl);
    padding-right: var(--page-pr);
  }

  .login-container {
    @apply flex justify-center items-center h-full w-full;
  }
}

:deep(.n-tabs-rail) {
  @apply rounded-xl overflow-hidden !important;
  .n-tabs-capsule {
    @apply rounded-xl !important;
  }
}
</style>

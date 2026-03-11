<template>
  <div class="h-full w-full bg-white dark:bg-neutral-900 transition-colors duration-500">
    <n-scrollbar class="h-full">
      <div class="w-full pb-32">
        <!-- Loading State -->
        <div v-if="loading">
          <!-- Hero Skeleton -->
          <div class="relative h-[300px] overflow-hidden rounded-tl-2xl">
            <div class="absolute inset-0 skeleton-shimmer" />
            <div class="relative z-10 page-padding-x pt-8 pb-6">
              <div class="flex flex-col items-center gap-6 md:flex-row md:items-end md:gap-10">
                <div
                  class="h-28 w-28 md:h-40 md:w-40 skeleton-shimmer rounded-full flex-shrink-0"
                />
                <div class="flex-1 space-y-4 text-center md:text-left">
                  <div class="h-8 w-40 skeleton-shimmer rounded-xl" />
                  <div class="flex justify-center gap-6 md:justify-start">
                    <div class="h-12 w-16 skeleton-shimmer rounded-xl" />
                    <div class="h-12 w-16 skeleton-shimmer rounded-xl" />
                    <div class="h-12 w-16 skeleton-shimmer rounded-xl" />
                  </div>
                  <div class="h-4 w-2/3 skeleton-shimmer rounded-lg" />
                </div>
              </div>
            </div>
          </div>
          <!-- Content Skeleton -->
          <div class="mt-8 page-padding-x">
            <div class="h-10 w-48 mb-6 skeleton-shimmer rounded-xl" />
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              <div v-for="i in 10" :key="i" class="space-y-2">
                <div class="aspect-square w-full skeleton-shimmer rounded-2xl" />
                <div class="h-4 w-3/4 skeleton-shimmer rounded-lg" />
                <div class="h-3 w-1/2 skeleton-shimmer rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div v-else-if="userDetail">
          <!-- Hero Section -->
          <section class="hero-section relative overflow-hidden rounded-tl-2xl">
            <!-- Background Image with Blur -->
            <div class="absolute inset-0 -top-20">
              <div
                class="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-40 dark:opacity-30"
                :style="{
                  backgroundImage: `url(${getImgUrl(userDetail.profile.backgroundUrl)})`
                }"
              />
              <div
                class="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white dark:via-neutral-900/80 dark:to-neutral-900"
              />
            </div>

            <!-- Hero Content -->
            <div class="relative z-10 page-padding-x pt-4 md:pt-8 pb-6">
              <div class="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end">
                <!-- User Avatar -->
                <div class="relative group">
                  <div
                    class="absolute -inset-2 rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  />
                  <div
                    class="relative w-28 h-28 md:w-40 md:h-40 rounded-full overflow-hidden shadow-2xl ring-4 ring-white/50 dark:ring-neutral-800/50"
                  >
                    <img
                      :src="getImgUrl(userDetail.profile.avatarUrl, '300y300')"
                      :alt="userDetail.profile.nickname"
                      class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </div>

                <!-- User Info -->
                <div class="flex-1 text-center md:text-left">
                  <!-- Badge -->
                  <div class="mb-2 md:mb-3" v-if="isArtist(userDetail.profile)">
                    <span
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider"
                    >
                      <i class="ri-verified-badge-fill text-sm" />
                      {{ t('user.detail.artist') }}
                    </span>
                  </div>

                  <h1
                    class="text-2xl md:text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight"
                  >
                    {{ userDetail.profile.nickname }}
                  </h1>

                  <!-- Stats -->
                  <div
                    class="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 mt-4 md:mt-5"
                  >
                    <div
                      class="flex flex-col items-center gap-0.5 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200"
                      @click="showFollowerList"
                    >
                      <span class="text-lg font-bold text-neutral-900 dark:text-white">
                        {{ formatNumber(userDetail.profile.followeds) }}
                      </span>
                      <span class="text-xs text-neutral-500 dark:text-neutral-400">
                        {{ t('user.profile.followers') }}
                      </span>
                    </div>
                    <div
                      class="flex flex-col items-center gap-0.5 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200"
                      @click="showFollowList"
                    >
                      <span class="text-lg font-bold text-neutral-900 dark:text-white">
                        {{ formatNumber(userDetail.profile.follows) }}
                      </span>
                      <span class="text-xs text-neutral-500 dark:text-neutral-400">
                        {{ t('user.profile.following') }}
                      </span>
                    </div>
                    <div class="flex flex-col items-center gap-0.5 px-3 py-1.5">
                      <span class="text-lg font-bold text-neutral-900 dark:text-white">
                        Lv.{{ userDetail.level }}
                      </span>
                      <span class="text-xs text-neutral-500 dark:text-neutral-400">
                        {{ t('user.profile.level') }}
                      </span>
                    </div>
                  </div>

                  <!-- Signature -->
                  <p
                    v-if="userDetail.profile.signature"
                    class="mt-3 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 max-w-lg"
                  >
                    {{ userDetail.profile.signature }}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- Tab Navigation -->
          <section class="page-padding-x pt-4 md:pt-6">
            <div
              class="relative flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-xl w-fit"
            >
              <button
                v-for="tab in tabs"
                :key="tab.value"
                class="relative px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                :class="
                  activeTab === tab.value
                    ? 'text-neutral-900 dark:text-white'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                "
                @click="activeTab = tab.value"
              >
                <span class="relative z-10">{{ tab.label }}</span>
                <Transition name="tab-indicator">
                  <div
                    v-if="activeTab === tab.value"
                    class="absolute inset-0 bg-white dark:bg-neutral-700 rounded-lg shadow-sm"
                  />
                </Transition>
              </button>
            </div>
          </section>

          <!-- Tab Content -->
          <section class="page-padding-x py-6 md:py-8">
            <!-- Playlists Tab -->
            <div v-show="activeTab === 'playlists'">
              <div
                v-if="playList.length === 0"
                class="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500"
              >
                <i class="ri-play-list-line text-5xl mb-4 opacity-50" />
                <p>{{ t('user.detail.noPlaylists') }}</p>
              </div>
              <div
                v-else
                class="grid grid-cols-2 gap-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              >
                <div
                  v-for="(item, index) in playList"
                  :key="item.id || index"
                  class="group cursor-pointer"
                  :style="{ animationDelay: `${index * 0.03}s` }"
                  @click="openPlaylist(item)"
                >
                  <!-- Cover -->
                  <div class="relative aspect-square overflow-hidden rounded-2xl shadow-lg">
                    <n-image
                      :src="getImgUrl(item.coverImgUrl, '300y300')"
                      lazy
                      preview-disabled
                      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <!-- Play Count Overlay -->
                    <div
                      class="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs bg-black/50 text-white flex items-center gap-1"
                    >
                      <i class="ri-play-fill" />
                      {{ formatNumber(item.playCount) }}
                    </div>
                    <!-- Play Overlay -->
                    <div
                      class="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/20 group-hover:opacity-100 transition-all duration-300"
                    >
                      <div
                        class="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl"
                      >
                        <i class="ri-play-fill text-xl text-neutral-900 ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <!-- Info -->
                  <div class="mt-3">
                    <h3
                      class="line-clamp-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-primary dark:group-hover:text-primary transition-colors"
                    >
                      {{ item.name }}
                    </h3>
                    <p class="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                      {{ t('user.playlist.trackCount', { count: item.trackCount }) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Records Tab -->
            <div v-show="activeTab === 'records'">
              <!-- No Permission -->
              <div
                v-if="!hasRecordPermission"
                class="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500"
              >
                <i class="ri-lock-line text-5xl mb-4 opacity-50" />
                <p>
                  {{
                    t('user.detail.noRecordPermission', {
                      name: userDetail.profile.nickname
                    })
                  }}
                </p>
              </div>
              <!-- Empty -->
              <div
                v-else-if="!recordList || recordList.length === 0"
                class="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500"
              >
                <i class="ri-music-2-line text-5xl mb-4 opacity-50" />
                <p>{{ t('user.detail.noRecords') }}</p>
              </div>
              <!-- Record List -->
              <div v-else class="w-full">
                <div v-for="(item, index) in recordList" :key="item.id" class="song-item-container">
                  <song-item :index="index" :item="item" compact @play="handlePlay" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!loading"
          class="flex flex-col items-center justify-center min-h-[60vh] text-neutral-400 dark:text-neutral-500"
        >
          <i class="ri-user-line text-6xl mb-4 opacity-30" />
          <p>{{ t('user.message.loadFailed') }}</p>
        </div>
      </div>
    </n-scrollbar>

    <play-bottom />
  </div>
</template>

<script lang="ts" setup>
import { useMessage } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { getUserDetail, getUserPlaylist, getUserRecord } from '@/api/user';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import PlayBottom from '@/components/common/PlayBottom.vue';
import SongItem from '@/components/common/SongItem.vue';
import { usePlayerStore } from '@/store/modules/player';
import type { IUserDetail } from '@/types/user';
import { formatNumber, getImgUrl } from '@/utils';

defineOptions({
  name: 'UserDetail'
});

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const message = useMessage();
const playerStore = usePlayerStore();

const userId = ref<number>(Number(route.params.uid));
const userDetail = ref<IUserDetail>();
const playList = ref<any[]>([]);
const recordList = ref<any[]>([]);
const loading = ref(true);
const hasRecordPermission = ref(true);
const activeTab = ref('playlists');

const tabs = computed(() => [
  { value: 'playlists', label: t('user.detail.playlists') },
  { value: 'records', label: t('user.detail.records') }
]);

// 加载用户数据
const loadUserData = async () => {
  if (!userId.value) {
    message.error(t('user.detail.invalidUserId'));
    router.back();
    return;
  }

  try {
    loading.value = true;
    recordList.value = [];
    hasRecordPermission.value = true;

    // 获取用户详情和歌单列表
    try {
      const [userDetailRes, playlistRes] = await Promise.all([
        getUserDetail(userId.value),
        getUserPlaylist(userId.value)
      ]);
      userDetail.value = userDetailRes.data;
      playList.value = playlistRes.data.playlist;
    } catch (error) {
      console.error('加载用户基本信息失败:', error);
      message.error(t('user.message.loadFailed'));
      return;
    }

    // 单独处理听歌记录请求
    try {
      const recordRes = await getUserRecord(userId.value);
      if (recordRes.data?.allData) {
        recordList.value = recordRes.data.allData.map((item: any) => ({
          ...item,
          ...item.song,
          picUrl: item.song.al.picUrl
        }));
      }
    } catch (error: any) {
      console.error('加载听歌记录失败:', error);
      if (error.response?.data?.code === -2 || error.data?.code === -2) {
        hasRecordPermission.value = false;
      }
    }
  } catch (error) {
    console.error('加载用户数据失败:', error);
    message.error(t('user.message.loadFailed'));
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadUserData();
});

watch(
  () => route.params.uid,
  (newUid) => {
    if (newUid && Number(newUid) !== userId.value) {
      userId.value = Number(newUid);
      activeTab.value = 'playlists';
      loadUserData();
    }
  }
);

const openPlaylist = (item: any) => {
  navigateToMusicList(router, {
    id: item.id,
    type: 'playlist',
    name: item.name,
    listInfo: item,
    canRemove: false
  });
};

const handlePlay = () => {
  if (!recordList.value || recordList.value.length === 0) return;
  playerStore.setPlayList(recordList.value);
};

const showFollowList = () => {
  if (!userDetail.value) return;
  router.push({
    path: `/user/follows`,
    query: { uid: userId.value.toString(), name: userDetail.value.profile.nickname }
  });
};

const showFollowerList = () => {
  if (!userDetail.value) return;
  router.push({
    path: `/user/followers`,
    query: { uid: userId.value.toString(), name: userDetail.value.profile.nickname }
  });
};

const isArtist = (profile: any) => {
  return profile.userType === 4 || profile.userType === 2 || profile.accountType === 2;
};
</script>

<style lang="scss" scoped>
.hero-section {
  min-height: 200px;
}

.tab-indicator-enter-active,
.tab-indicator-leave-active {
  transition: all 0.2s ease;
}

.tab-indicator-enter-from,
.tab-indicator-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.song-item-container {
  content-visibility: auto;
  contain-intrinsic-size: 0 52px;
}

button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--primary-color);
}
</style>

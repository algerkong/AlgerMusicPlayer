<template>
  <div class="user-detail-page">
    <n-scrollbar class="content-scrollbar">
      <div v-loading="loading" class="content-wrapper">
        <template v-if="userDetail">
          <!-- 用户信息部分 -->
          <div class="user-info-section" :class="setAnimationClass('animate__fadeInDown')">
            <div
              class="user-info-bg"
              :style="{ backgroundImage: `url(${getImgUrl(userDetail.profile.backgroundUrl)})` }"
            >
              <div class="user-info-content">
                <n-avatar
                  round
                  :size="80"
                  :src="getImgUrl(userDetail.profile.avatarUrl, '80y80')"
                />
                <div class="user-info-detail">
                  <div class="user-info-name">
                    {{ userDetail.profile.nickname }}
                    <n-tooltip v-if="isArtist(userDetail.profile)" trigger="hover">
                      <template #trigger>
                        <i class="ri-verified-badge-fill artist-icon"></i>
                      </template>
                      {{ t('user.detail.artist') }}
                    </n-tooltip>
                  </div>
                  <div class="user-info-stats">
                    <div class="user-info-stat-item" @click="showFollowerList">
                      <div class="label">{{ userDetail.profile.followeds }}</div>
                      <div>{{ t('user.profile.followers') }}</div>
                    </div>
                    <div class="user-info-stat-item" @click="showFollowList">
                      <div class="label">{{ userDetail.profile.follows }}</div>
                      <div>{{ t('user.profile.following') }}</div>
                    </div>
                    <div class="user-info-stat-item">
                      <div class="label">{{ userDetail.level }}</div>
                      <div>{{ t('user.profile.level') }}</div>
                    </div>
                  </div>
                  <div class="user-info-signature">
                    {{ userDetail.profile.signature || t('user.detail.noSignature') }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <n-tabs type="line" animated>
            <!-- 歌单列表 -->
            <n-tab-pane name="playlists" :tab="t('user.detail.playlists')">
              <div v-if="playList.length === 0" class="empty-message">
                {{ t('user.detail.noPlaylists') }}
              </div>
              <div v-else class="playlist-grid" :class="setAnimationClass('animate__fadeInUp')">
                <div
                  v-for="(item, index) in playList"
                  :key="index"
                  class="playlist-item"
                  :class="setAnimationClass('animate__fadeInUp')"
                  :style="setAnimationDelay(index, 50)"
                  @click="openPlaylist(item)"
                >
                  <div class="playlist-cover">
                    <n-image
                      :src="getImgUrl(item.coverImgUrl, '200y200')"
                      lazy
                      preview-disabled
                      class="cover-img"
                    />
                    <div class="play-count">
                      <i class="ri-play-fill"></i>
                      {{ formatNumber(item.playCount) }}
                    </div>
                  </div>
                  <div class="playlist-info">
                    <div class="playlist-name">{{ item.name }}</div>
                    <div class="playlist-stats">
                      {{ t('user.playlist.trackCount', { count: item.trackCount }) }}
                    </div>
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <!-- 听歌排行 -->
            <n-tab-pane name="records" :tab="t('user.detail.records')">
              <div v-if="!hasRecordPermission" class="empty-message">
                <div class="no-permission">
                  <i class="ri-lock-line text-2xl mr-2"></i>
                  {{ t('user.detail.noRecordPermission', { name: userDetail.profile.nickname }) }}
                </div>
              </div>
              <div v-else-if="!recordList || recordList.length === 0" class="empty-message">
                {{ t('user.detail.noRecords') }}
              </div>
              <div v-else class="record-list">
                <div
                  v-for="(item, index) in recordList"
                  :key="item.id"
                  class="record-item"
                  :class="setAnimationClass('animate__bounceInUp')"
                  :style="setAnimationDelay(index, 25)"
                >
                  <song-item
                    class="song-item"
                    :index="index"
                    :item="item"
                    compact
                    @play="handlePlay"
                  />
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </template>
        <div v-else-if="!loading" class="empty-message">
          {{ t('user.message.loadFailed') }}
        </div>

        <!-- 底部留白 -->
        <div class="pb-20"></div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { useMessage } from 'naive-ui';
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { getListDetail } from '@/api/list';
import { getUserDetail, getUserPlaylist, getUserRecord } from '@/api/user';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import SongItem from '@/components/common/SongItem.vue';
import { usePlayerStore } from '@/store/modules/player';
import type { Playlist } from '@/types/listDetail';
import type { IUserDetail } from '@/types/user';
import { formatNumber, getImgUrl, setAnimationClass, setAnimationDelay } from '@/utils';

defineOptions({
  name: 'UserDetail'
});

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const message = useMessage();
const playerStore = usePlayerStore();

// 获取路由参数中的用户ID
const userId = ref<number>(Number(route.params.uid));
// 用户数据
const userDetail = ref<IUserDetail>();
const playList = ref<any[]>([]);
const recordList = ref<any[]>([]);
const loading = ref(true);
const hasRecordPermission = ref(true); // 是否有权限查看听歌记录

// 歌单详情相关
const currentList = ref<Playlist>();
const listLoading = ref(false);

// 加载用户数据
const loadUserData = async () => {
  if (!userId.value) {
    message.error(t('user.detail.invalidUserId'));
    router.back();
    return;
  }

  try {
    loading.value = true;
    recordList.value = []; // 清空之前的记录
    hasRecordPermission.value = true; // 重置权限状态

    // 分开处理请求，处理可能的错误
    // 1. 获取用户详情和歌单列表
    try {
      const [userDetailRes, playlistRes] = await Promise.all([
        getUserDetail(userId.value),
        getUserPlaylist(userId.value)
      ]);

      userDetail.value = userDetailRes.data;
      playList.value = playlistRes.data.playlist;
    } catch (error) {
      console.error('加载用户基本信息失败:', error);
      message.error(t('user.message.loadBasicInfoFailed'));
      return; // 如果基本信息加载失败，直接返回
    }

    // 2. 单独处理听歌记录请求，这个请求可能会无权限
    try {
      const recordRes = await getUserRecord(userId.value);

      if (recordRes.data && recordRes.data.allData) {
        recordList.value = recordRes.data.allData.map((item: any) => ({
          ...item,
          ...item.song,
          picUrl: item.song.al.picUrl
        }));
      }
    } catch (error: any) {
      console.error('加载听歌记录失败:', error);
      // 判断是否是无权限错误
      if (error.response?.data?.code === -2 || error.data?.code === -2) {
        hasRecordPermission.value = false;
      }
      // 不显示错误消息，因为这是预期的情况
    }
  } catch (error) {
    console.error('加载用户数据失败:', error);
    message.error(t('user.message.loadFailed'));
  } finally {
    loading.value = false;
  }
};

// 使用onMounted和watch结合的方式解决路由变化问题
onMounted(() => {
  loadUserData();
});

// 监听路由参数变化
watch(
  () => route.params.uid,
  (newUid) => {
    if (newUid && Number(newUid) !== userId.value) {
      userId.value = Number(newUid);
      loadUserData();
    }
  }
);

// 替换显示歌单的方法
const openPlaylist = (item: any) => {
  listLoading.value = true;

  getListDetail(item.id).then((res) => {
    currentList.value = res.data.playlist;
    listLoading.value = false;

    navigateToMusicList(router, {
      id: item.id,
      type: 'playlist',
      name: item.name,
      songList: res.data.playlist.tracks || [],
      listInfo: res.data.playlist,
      canRemove: false
    });
  });
};

// 播放歌曲
const handlePlay = () => {
  if (!recordList.value || recordList.value.length === 0) return;

  const tracks = recordList.value;
  playerStore.setPlayList(tracks);
};

// 显示关注列表
const showFollowList = () => {
  if (!userDetail.value) return;

  router.push({
    path: `/user/follows`,
    query: {
      uid: userId.value.toString(),
      name: userDetail.value.profile.nickname
    }
  });
};

// 显示粉丝列表
const showFollowerList = () => {
  if (!userDetail.value) return;

  router.push({
    path: `/user/followers`,
    query: {
      uid: userId.value.toString(),
      name: userDetail.value.profile.nickname
    }
  });
};

// 判断是否为歌手
const isArtist = (profile: any) => {
  return profile.userType === 4 || profile.userType === 2 || profile.accountType === 2;
};
</script>

<style lang="scss" scoped>
.user-detail-page {
  @apply h-full flex flex-col;

  .content-scrollbar {
    @apply flex-1 overflow-hidden;
  }

  .content-wrapper {
    @apply flex flex-col;
    @apply pr-4 pb-4;
  }
}

.user-info-section {
  @apply mb-4;

  .user-info-bg {
    @apply rounded-xl overflow-hidden bg-cover bg-center relative;
    height: 200px;

    &:before {
      content: '';
      @apply absolute inset-0 bg-black bg-opacity-40;
    }
  }

  .user-info-content {
    @apply absolute inset-0 flex items-center p-6;
  }

  .user-info-detail {
    @apply ml-4 text-white;

    .user-info-name {
      @apply text-xl font-bold flex items-center;

      .artist-icon {
        @apply ml-2 text-blue-500;
      }
    }

    .user-info-stats {
      @apply flex mt-2;

      .user-info-stat-item {
        @apply mr-6 text-center;

        .label {
          @apply text-lg font-bold;
        }

        &:nth-child(1),
        &:nth-child(2) {
          @apply cursor-pointer transition-all duration-200;
          @apply hover:bg-black hover:bg-opacity-20 rounded-lg px-2;
        }
      }
    }

    .user-info-signature {
      @apply mt-2 text-sm text-gray-200;
      @apply line-clamp-2;
    }
  }
}

.playlist-grid {
  @apply grid gap-4 w-full py-4;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.playlist-item {
  @apply flex flex-col rounded-xl overflow-hidden cursor-pointer;
  @apply transition-all duration-200;
  @apply hover:scale-105;

  .playlist-cover {
    @apply relative;
    aspect-ratio: 1;

    .cover-img {
      @apply w-full h-full object-cover rounded-xl;
    }

    .play-count {
      @apply absolute top-2 right-2 px-2 py-1 rounded-full text-xs;
      @apply bg-black bg-opacity-50 text-white flex items-center;

      i {
        @apply mr-1;
      }
    }
  }

  .playlist-info {
    @apply mt-2 px-1;

    .playlist-name {
      @apply text-gray-900 dark:text-white font-medium;
      @apply line-clamp-2 text-sm;
    }

    .playlist-stats {
      @apply text-gray-500 dark:text-gray-400 text-xs mt-1;
    }
  }
}

.record-list {
  @apply p-4;

  .record-item {
    @apply flex items-center mb-2 rounded-2xl;
    @apply bg-light-100 dark:bg-dark-100;
    @apply transition-all duration-200;
    @apply hover:bg-light-200 dark:hover:bg-dark-200;
  }

  .play-score {
    @apply text-gray-500 dark:text-gray-400 mr-2 text-lg w-10 h-10 rounded-full flex items-center justify-center;
  }

  .song-item {
    @apply flex-1;
  }
}

.loading-container {
  @apply flex justify-center items-center p-8;
}

.empty-message {
  @apply flex justify-center items-center p-8;

  .no-permission {
    @apply flex flex-col items-center justify-center text-gray-500 dark:text-gray-400;
    @apply p-4 rounded-lg;

    i {
      @apply text-3xl mb-2;
    }
  }
}
</style>

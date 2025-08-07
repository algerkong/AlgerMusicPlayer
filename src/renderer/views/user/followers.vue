<template>
  <div class="followers-page">
    <div class="content-wrapper">
      <div class="page-title" v-if="targetUserName">
        {{ targetUserName + t('user.follower.userFollowersTitle') }}
      </div>
      <div class="page-title" v-else>
        {{ t('user.follower.myFollowersTitle') }}
      </div>

      <n-spin v-if="followerListLoading && followerList.length === 0" size="large" />
      <n-scrollbar v-else class="scrollbar-container">
        <div v-if="followerList.length === 0" class="empty-follower">
          {{ t('user.follower.noFollowers') }}
        </div>
        <div class="follower-grid" :class="setAnimationClass('animate__fadeInUp')">
          <div
            v-for="(item, index) in followerList"
            :key="index"
            class="follower-item"
            :class="setAnimationClass('animate__fadeInUp')"
            :style="setAnimationDelay(index, 30)"
            @click="viewUserDetail(item.userId, item.nickname)"
          >
            <div class="follower-item-inner">
              <div class="follower-avatar">
                <n-avatar round :size="70" :src="getImgUrl(item.avatarUrl, '70y70')" />
                <div v-if="isArtist(item)" class="artist-badge">
                  <i class="ri-verified-badge-fill"></i>
                </div>
              </div>
              <div class="follower-info">
                <div class="follower-name" :class="{ 'is-artist': isArtist(item) }">
                  {{ item.nickname }}
                  <n-tooltip v-if="isArtist(item)" trigger="hover">
                    <template #trigger>
                      <i class="ri-verified-badge-fill artist-icon"></i>
                    </template>
                    歌手
                  </n-tooltip>
                </div>
                <div class="follower-signature">
                  {{ item.signature || '这个人很懒，什么都没留下' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <n-space v-if="followerListLoading" justify="center" class="loading-more">
          <n-spin size="small" />
        </n-space>

        <n-button
          v-else-if="hasMoreFollowers"
          class="load-more-btn"
          secondary
          block
          @click="loadMoreFollowers"
        >
          {{ t('user.follower.loadMore') }}
        </n-button>
      </n-scrollbar>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useMessage } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { getUserFollowers } from '@/api/user';
import { useUserStore } from '@/store/modules/user';
import type { IUserFollow } from '@/types/user';
import { getImgUrl, setAnimationClass, setAnimationDelay } from '@/utils';
import { checkLoginStatus as checkAuthStatus } from '@/utils/auth';

defineOptions({
  name: 'UserFollowers'
});

const { t } = useI18n();
const userStore = useUserStore();
const router = useRouter();
const message = useMessage();
const route = useRoute();

// 粉丝列表相关
const followerList = ref<IUserFollow[]>([]);
const followerOffset = ref(0);
const followerLimit = ref(30);
const hasMoreFollowers = ref(false);
const followerListLoading = ref(false);
const targetUserId = ref<number | null>(null);
const targetUserName = ref<string>('');

const user = computed(() => userStore.user);

// 检查是否有指定用户ID
const checkTargetUser = () => {
  const uid = route.query.uid;
  const name = route.query.name;

  if (uid && typeof uid === 'string') {
    targetUserId.value = parseInt(uid);
    targetUserName.value = typeof name === 'string' ? name : '';
    return true;
  }

  // 如果没有指定用户ID，则显示当前登录用户的粉丝列表
  return checkLoginStatus();
};

// 检查登录状态
const checkLoginStatus = () => {
  const loginInfo = checkAuthStatus();

  if (!loginInfo.isLoggedIn) {
    router.push('/login');
    return false;
  }

  // 如果store中没有用户数据，但localStorage中有，则恢复用户数据
  if (!userStore.user && loginInfo.user) {
    userStore.setUser(loginInfo.user);
  }

  return true;
};

// 加载粉丝列表
const loadFollowerList = async () => {
  // 确定要加载哪个用户的粉丝列表
  const userId = targetUserId.value || user.value?.userId;

  if (!userId) return;

  try {
    followerListLoading.value = true;
    const { data } = await getUserFollowers(userId, followerLimit.value, followerOffset.value);

    if (!data || !data.followeds) {
      hasMoreFollowers.value = false;
      return;
    }

    const newFollowers = data.followeds as IUserFollow[];
    followerList.value = [...followerList.value, ...newFollowers];

    // 判断是否还有更多粉丝
    hasMoreFollowers.value = newFollowers.length >= followerLimit.value;
  } catch (error) {
    console.error('加载粉丝列表失败:', error);
    message.error(t('user.follower.loadFailed'));
  } finally {
    followerListLoading.value = false;
  }
};

// 加载更多粉丝
const loadMoreFollowers = async () => {
  followerOffset.value += followerLimit.value;
  await loadFollowerList();
};

// 查看用户详情
const viewUserDetail = (userId: number, nickname: string) => {
  router.push({
    path: `/user/detail/${userId}`,
    query: { name: nickname }
  });
};

// 判断是否为歌手
const isArtist = (user: IUserFollow) => {
  // 根据用户类型判断是否为歌手，userType 为 4 表示是官方认证的音乐人
  return user.userType === 4 || user.userType === 2 || user.accountType === 2;
};

// 页面挂载时加载数据
onMounted(() => {
  if (checkTargetUser()) {
    loadFollowerList();
  }
});

// 监听路由变化重新加载数据
watch(
  () => route.query,
  (newQuery) => {
    if (newQuery.uid && newQuery.uid !== targetUserId.value?.toString()) {
      followerList.value = []; // 清空列表
      followerOffset.value = 0; // 重置偏移量
      checkTargetUser();
      loadFollowerList();
    }
  }
);
</script>

<style lang="scss" scoped>
.followers-page {
  @apply h-full flex flex-col;

  .content-wrapper {
    @apply flex-1 overflow-hidden p-4;
    @apply flex flex-col;
  }

  .scrollbar-container {
    @apply h-full;
  }
}

.follower-grid {
  @apply grid gap-4 w-full;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.follower-item {
  @apply rounded-xl overflow-hidden cursor-pointer;
  @apply transition-all duration-200;
  @apply hover:scale-105;

  &-inner {
    @apply flex flex-col items-center p-4 h-full;
    @apply bg-light-100 dark:bg-dark-100;
    @apply transition-all duration-200;
    @apply hover:bg-light-200 dark:hover:bg-dark-200;
  }

  .follower-avatar {
    @apply relative;

    .artist-badge {
      @apply absolute bottom-0 right-0;
      @apply text-blue-500 text-lg;
    }
  }

  .follower-info {
    @apply mt-3 text-center w-full;

    .follower-name {
      @apply text-gray-900 dark:text-white text-base font-medium;
      @apply flex items-center justify-center;

      &.is-artist {
        @apply text-blue-500;
      }

      .artist-icon {
        @apply ml-1 text-blue-500;
      }
    }

    .follower-signature {
      @apply text-gray-500 dark:text-gray-400 text-xs mt-1;
      @apply line-clamp-2 text-center;
      max-height: 2.4em;
    }
  }
}

.empty-follower {
  @apply text-center py-8 text-gray-500 dark:text-gray-400;
}

.load-more-btn {
  @apply mt-4 mb-8;
}

.loading-more {
  @apply my-4;
}

.page-title {
  @apply text-xl font-bold mb-4;
  @apply text-gray-900 dark:text-white;
}
</style>

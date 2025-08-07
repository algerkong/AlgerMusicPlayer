<template>
  <div class="follows-page">
    <div class="content-wrapper">
      <div class="page-title" v-if="targetUserName">
        {{ targetUserName + t('user.follow.userFollowsTitle') }}
      </div>
      <div class="page-title" v-else>
        {{ t('user.follow.myFollowsTitle') }}
      </div>

      <n-spin v-if="followListLoading && followList.length === 0" size="large" />
      <n-scrollbar v-else class="scrollbar-container">
        <div v-if="followList.length === 0" class="empty-follow">
          {{ t('user.follow.noFollowings') }}
        </div>
        <div class="follow-grid" :class="setAnimationClass('animate__fadeInUp')">
          <div
            v-for="(item, index) in followList"
            :key="index"
            class="follow-item"
            :class="setAnimationClass('animate__fadeInUp')"
            :style="setAnimationDelay(index, 30)"
            @click="viewUserDetail(item.userId, item.nickname)"
          >
            <div class="follow-item-inner">
              <div class="follow-avatar">
                <n-avatar round :size="70" :src="getImgUrl(item.avatarUrl, '70y70')" />
                <div v-if="isArtist(item)" class="artist-badge">
                  <i class="ri-verified-badge-fill"></i>
                </div>
              </div>
              <div class="follow-info">
                <div class="follow-name" :class="{ 'is-artist': isArtist(item) }">
                  {{ item.nickname }}
                  <n-tooltip v-if="isArtist(item)" trigger="hover">
                    <template #trigger>
                      <i class="ri-verified-badge-fill artist-icon"></i>
                    </template>
                    歌手
                  </n-tooltip>
                </div>
                <div class="follow-signature">
                  {{ item.signature || t('user.follow.noSignature') }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <n-space v-if="followListLoading" justify="center" class="loading-more">
          <n-spin size="small" />
        </n-space>

        <n-button
          v-else-if="hasMoreFollows"
          class="load-more-btn"
          secondary
          block
          @click="loadMoreFollows"
        >
          {{ t('user.follow.loadMore') }}
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

import { getUserFollows } from '@/api/user';
import { useUserStore } from '@/store/modules/user';
import type { IUserFollow } from '@/types/user';
import { getImgUrl, setAnimationClass, setAnimationDelay } from '@/utils';
import { checkLoginStatus as checkAuthStatus } from '@/utils/auth';

defineOptions({
  name: 'UserFollows'
});

const { t } = useI18n();
const userStore = useUserStore();
const router = useRouter();
const message = useMessage();
const route = useRoute();

// 关注列表相关
const followList = ref<IUserFollow[]>([]);
const followOffset = ref(0);
const followLimit = ref(30);
const hasMoreFollows = ref(false);
const followListLoading = ref(false);
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

  // 如果没有指定用户ID，则显示当前登录用户的关注列表
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

// 加载关注列表
const loadFollowList = async () => {
  // 确定要加载哪个用户的关注列表
  const userId = targetUserId.value || user.value?.userId;

  if (!userId) return;

  try {
    followListLoading.value = true;
    const { data } = await getUserFollows(userId, followLimit.value, followOffset.value);

    if (!data || !data.follow) {
      hasMoreFollows.value = false;
      return;
    }

    const newFollows = data.follow as IUserFollow[];
    followList.value = [...followList.value, ...newFollows];

    // 判断是否还有更多关注
    hasMoreFollows.value = newFollows.length >= followLimit.value;
  } catch (error) {
    console.error('加载关注列表失败:', error);
    message.error(t('user.follow.loadFailed'));
  } finally {
    followListLoading.value = false;
  }
};

// 加载更多关注
const loadMoreFollows = async () => {
  followOffset.value += followLimit.value;
  await loadFollowList();
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
    loadFollowList();
  }
});

// 监听路由变化重新加载数据
watch(
  () => route.query,
  (newQuery) => {
    if (newQuery.uid && newQuery.uid !== targetUserId.value?.toString()) {
      followList.value = []; // 清空列表
      followOffset.value = 0; // 重置偏移量
      checkTargetUser();
      loadFollowList();
    }
  }
);
</script>

<style lang="scss" scoped>
.follows-page {
  @apply h-full flex flex-col;

  .content-wrapper {
    @apply flex-1 overflow-hidden p-4;
    @apply flex flex-col;
  }

  .scrollbar-container {
    @apply h-full;
  }
}

.follow-grid {
  @apply grid gap-4 w-full;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.follow-item {
  @apply rounded-xl overflow-hidden cursor-pointer;
  @apply transition-all duration-200;
  @apply hover:scale-105;

  &-inner {
    @apply flex flex-col items-center p-4 h-full;
    @apply bg-light-100 dark:bg-dark-100;
    @apply transition-all duration-200;
    @apply hover:bg-light-200 dark:hover:bg-dark-200;
  }

  .follow-avatar {
    @apply relative;

    .artist-badge {
      @apply absolute bottom-0 right-0;
      @apply text-blue-500 text-lg;
    }
  }

  .follow-info {
    @apply mt-3 text-center w-full;

    .follow-name {
      @apply text-gray-900 dark:text-white text-base font-medium;
      @apply flex items-center justify-center;

      &.is-artist {
        @apply text-blue-500;
      }

      .artist-icon {
        @apply ml-1 text-blue-500;
      }
    }

    .follow-signature {
      @apply text-gray-500 dark:text-gray-400 text-xs mt-1;
      @apply line-clamp-2 text-center;
      max-height: 2.4em;
    }
  }
}

.empty-follow {
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

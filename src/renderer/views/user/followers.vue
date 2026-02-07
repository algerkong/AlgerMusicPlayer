<template>
  <div class="h-full w-full bg-white dark:bg-neutral-900 transition-colors duration-500">
    <n-scrollbar class="h-full">
      <div class="w-full pb-32">
        <!-- Loading State -->
        <div v-if="followerListLoading && followerList.length === 0">
          <div class="page-padding-x pt-8">
            <n-skeleton class="h-8 w-48 mb-6" />
            <div
              class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              <div v-for="i in 12" :key="i" class="flex flex-col items-center space-y-3">
                <n-skeleton class="h-20 w-20 rounded-full" />
                <n-skeleton text class="w-16" />
                <n-skeleton text class="w-24" />
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <template v-else>
          <!-- Header Section -->
          <section class="page-padding-x pt-6 md:pt-8 pb-4">
            <h1
              class="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight"
            >
              <template v-if="targetUserName">
                {{ targetUserName + t('user.follower.userFollowersTitle') }}
              </template>
              <template v-else>
                {{ t('user.follower.myFollowersTitle') }}
              </template>
            </h1>
          </section>

          <!-- Empty State -->
          <div
            v-if="followerList.length === 0"
            class="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-500"
          >
            <i class="ri-user-heart-line text-5xl mb-4 opacity-50" />
            <p>{{ t('user.follower.noFollowers') }}</p>
          </div>

          <!-- User Grid -->
          <section v-else class="page-padding-x">
            <div
              class="grid grid-cols-2 gap-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              <div
                v-for="(item, index) in followerList"
                :key="item.userId"
                class="user-card group cursor-pointer"
                :style="{ animationDelay: `${index * 0.03}s` }"
                @click="viewUserDetail(item.userId, item.nickname)"
              >
                <!-- Avatar -->
                <div class="relative mx-auto w-fit">
                  <div
                    class="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-lg ring-2 ring-transparent group-hover:ring-primary/30 transition-all duration-300"
                  >
                    <img
                      :src="getImgUrl(item.avatarUrl, '100y100')"
                      :alt="item.nickname"
                      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                  <!-- Artist Badge -->
                  <div
                    v-if="isArtist(item)"
                    class="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center shadow-md"
                  >
                    <i class="ri-verified-badge-fill text-primary text-sm" />
                  </div>
                </div>

                <!-- Info -->
                <div class="mt-3 text-center">
                  <h3
                    class="text-sm font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-primary transition-colors truncate px-1"
                  >
                    {{ item.nickname }}
                  </h3>
                  <p class="mt-1 text-xs text-neutral-400 dark:text-neutral-500 line-clamp-1 px-1">
                    {{ item.signature || t('user.follow.noSignature') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Loading More -->
            <div v-if="followerListLoading" class="flex items-center justify-center gap-2 py-8">
              <div
                class="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
              />
              <span class="text-sm text-neutral-400 dark:text-neutral-500">
                {{ t('common.loading') }}
              </span>
            </div>

            <!-- Load More Button -->
            <div v-else-if="hasMoreFollowers" class="flex justify-center py-8">
              <button
                class="px-6 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-200 transition-all duration-200 hover:scale-105 active:scale-95"
                @click="loadMoreFollowers"
              >
                {{ t('user.follower.loadMore') }}
              </button>
            </div>

            <!-- No More -->
            <div
              v-else-if="followerList.length > 0"
              class="text-center text-sm text-neutral-400 dark:text-neutral-500 py-8"
            >
              — {{ t('common.noMore') || '没有更多了' }} —
            </div>
          </section>
        </template>
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

import { getUserFollowers } from '@/api/user';
import PlayBottom from '@/components/common/PlayBottom.vue';
import { useUserStore } from '@/store/modules/user';
import type { IUserFollow } from '@/types/user';
import { getImgUrl } from '@/utils';
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

const checkTargetUser = () => {
  const uid = route.query.uid;
  const name = route.query.name;

  if (uid && typeof uid === 'string') {
    targetUserId.value = parseInt(uid);
    targetUserName.value = typeof name === 'string' ? name : '';
    return true;
  }

  return checkLoginStatus();
};

const checkLoginStatus = () => {
  const loginInfo = checkAuthStatus();
  if (!loginInfo.isLoggedIn) {
    router.push('/login');
    return false;
  }
  if (!userStore.user && loginInfo.user) {
    userStore.setUser(loginInfo.user);
  }
  return true;
};

// 加载粉丝列表
const loadFollowerList = async () => {
  const userId = targetUserId.value || user.value?.userId;
  if (!userId) return;

  try {
    followerListLoading.value = true;
    const { data } = await getUserFollowers(userId, followerLimit.value, followerOffset.value);

    if (!data?.followeds) {
      hasMoreFollowers.value = false;
      return;
    }

    const newFollowers = data.followeds as IUserFollow[];
    followerList.value = [...followerList.value, ...newFollowers];
    hasMoreFollowers.value = newFollowers.length >= followerLimit.value;
  } catch (error) {
    console.error('加载粉丝列表失败:', error);
    message.error(t('user.follower.loadFailed'));
  } finally {
    followerListLoading.value = false;
  }
};

const loadMoreFollowers = async () => {
  followerOffset.value += followerLimit.value;
  await loadFollowerList();
};

const viewUserDetail = (userId: number, nickname: string) => {
  router.push({
    path: `/user/detail/${userId}`,
    query: { name: nickname }
  });
};

const isArtist = (user: IUserFollow) => {
  return user.userType === 4 || user.userType === 2 || user.accountType === 2;
};

onMounted(() => {
  if (checkTargetUser()) {
    loadFollowerList();
  }
});

watch(
  () => route.query,
  (newQuery) => {
    if (newQuery.uid && newQuery.uid !== targetUserId.value?.toString()) {
      followerList.value = [];
      followerOffset.value = 0;
      checkTargetUser();
      loadFollowerList();
    }
  }
);
</script>

<style lang="scss" scoped>
.user-card {
  animation: fadeInUp 0.4s ease backwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--primary-color);
}
</style>

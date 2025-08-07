<template>
  <div class="search-box flex">
    <div v-if="showBackButton" class="back-button" @click="goBack">
      <i class="ri-arrow-left-line"></i>
    </div>
    <div class="search-box-input flex-1">
      <n-input
        v-model:value="searchValue"
        size="medium"
        round
        :placeholder="hotSearchKeyword"
        class="border dark:border-gray-600 border-gray-200"
        @keydown.enter="search"
      >
        <template #prefix>
          <i class="iconfont icon-search"></i>
        </template>
        <template #suffix>
          <n-dropdown trigger="hover" :options="searchTypeOptions" @select="selectSearchType">
            <div class="w-20 px-3 flex justify-between items-center">
              <div>
                {{ searchTypeOptions.find((item) => item.key === searchStore.searchType)?.label }}
              </div>
              <i class="iconfont icon-xiasanjiaoxing"></i>
            </div>
          </n-dropdown>
        </template>
      </n-input>
    </div>
    <n-popover trigger="hover" placement="bottom" :show-arrow="false" raw>
      <template #trigger>
        <div class="user-box">
          <n-avatar
            v-if="userStore.user"
            class="cursor-pointer"
            circle
            size="medium"
            :src="getImgUrl(userStore.user.avatarUrl)"
            @click="selectItem('user')"
          />
          <div v-else class="mx-2 rounded-full cursor-pointer text-sm" @click="toLogin">
            {{ t('comp.searchBar.login') }}
          </div>
        </div>
      </template>
      <div class="user-popover">
        <div v-if="userStore.user" class="user-header" @click="selectItem('user')">
          <n-avatar circle size="small" :src="getImgUrl(userStore.user?.avatarUrl)" />
          <div>
            <p class="username">{{ userStore.user?.nickname || 'Theodore' }}</p>
            <p></p>
          </div>
        </div>
        <div class="menu-items">
          <div v-if="!userStore.user" class="menu-item" @click="toLogin">
            <i class="iconfont ri-login-box-line"></i>
            <span>{{ t('comp.searchBar.toLogin') }}</span>
          </div>
          <div v-if="userStore.user" class="menu-item" @click="selectItem('logout')">
            <i class="iconfont ri-logout-box-r-line"></i>
            <span>{{ t('comp.searchBar.logout') }}</span>
          </div>
          <!-- 切换主题 -->
          <div class="menu-item" @click="selectItem('set')">
            <i class="iconfont ri-settings-3-line"></i>
            <span>{{ t('comp.searchBar.set') }}</span>
          </div>
          <div class="menu-item" v-if="isElectron">
            <i class="iconfont ri-zoom-in-line"></i>
            <span>{{ t('comp.searchBar.zoom') }}</span>
            <div class="zoom-controls ml-auto">
              <n-button quaternary circle size="tiny" @click="decreaseZoom">
                <i class="ri-subtract-line"></i>
              </n-button>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <span class="zoom-value" :class="{ 'zoom-100': isZoom100() }" @click="resetZoom"
                    >{{ Math.round(zoomFactor * 100) }}%</span
                  >
                </template>
                {{ isZoom100() ? t('comp.searchBar.zoom100') : t('comp.searchBar.resetZoom') }}
              </n-tooltip>
              <n-button quaternary circle size="tiny" @click="increaseZoom">
                <i class="ri-add-line"></i>
              </n-button>
            </div>
          </div>
          <div class="menu-item">
            <i class="iconfont" :class="isDark ? 'ri-moon-line' : 'ri-sun-line'"></i>
            <span>{{ t('comp.searchBar.theme') }}</span>
            <n-switch v-model:value="isDark" class="ml-auto">
              <template #checked>
                <i class="ri-moon-line"></i>
              </template>
              <template #unchecked>
                <i class="ri-sun-line"></i>
              </template>
            </n-switch>
          </div>
          <div class="menu-item" @click="restartApp">
            <i class="iconfont ri-restart-line"></i>
            <span>{{ t('comp.searchBar.restart') }}</span>
          </div>
          <div class="menu-item" @click="selectItem('refresh')">
            <i class="iconfont ri-refresh-line"></i>
            <span>{{ t('comp.searchBar.refresh') }}</span>
          </div>
          <div class="menu-item" @click="toGithubRelease">
            <i class="iconfont ri-github-fill"></i>
            <span>{{ t('comp.searchBar.currentVersion') }}</span>
            <div class="version-info">
              <span class="version-number">{{ updateInfo.currentVersion }}</span>
              <n-tag v-if="updateInfo.hasUpdate" type="success" size="small" class="ml-1">
                New {{ updateInfo.latestVersion }}
              </n-tag>
            </div>
          </div>
        </div>
      </div>
    </n-popover>

    <coffee :alipay-q-r="alipay" :wechat-q-r="wechat">
      <div class="github" @click="toGithub">
        <i class="ri-github-fill"></i>
      </div>
    </coffee>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getSearchKeyword } from '@/api/home';
import { getUserDetail } from '@/api/login';
import alipay from '@/assets/alipay.png';
import wechat from '@/assets/wechat.png';
import Coffee from '@/components/Coffee.vue';
import { SEARCH_TYPES, USER_SET_OPTIONS } from '@/const/bar-const';
import { useZoom } from '@/hooks/useZoom';
import { useSearchStore } from '@/store/modules/search';
import { useSettingsStore } from '@/store/modules/settings';
import { useUserStore } from '@/store/modules/user';
import { getImgUrl, isElectron } from '@/utils';
import { checkUpdate, UpdateResult } from '@/utils/update';

import config from '../../../../package.json';

const router = useRouter();
const searchStore = useSearchStore();
const settingsStore = useSettingsStore();
const userStore = useUserStore();
const userSetOptions = ref(USER_SET_OPTIONS);
const { t, locale } = useI18n();

// 使用缩放hook
const { zoomFactor, initZoomFactor, increaseZoom, decreaseZoom, resetZoom, isZoom100 } = useZoom();

// 显示返回按钮
const showBackButton = computed(() => {
  return router.currentRoute.value.meta.back === true;
});

// 返回上一页
const goBack = () => {
  router.back();
};

// 推荐热搜词
const hotSearchKeyword = ref(t('comp.searchBar.searchPlaceholder'));
const hotSearchValue = ref('');
const loadHotSearchKeyword = async () => {
  const { data } = await getSearchKeyword();
  hotSearchKeyword.value = data.data.showKeyword;
  hotSearchValue.value = data.data.realkeyword;
};

const loadPage = async () => {
  const token = localStorage.getItem('token');
  if (!token) return;
  const { data } = await getUserDetail();
  console.log('data', data);
  userStore.user =
    data.profile || userStore.user || JSON.parse(localStorage.getItem('user') || '{}');
  localStorage.setItem('user', JSON.stringify(userStore.user));
};

loadPage();

watchEffect(() => {
  if (userStore.user) {
    userSetOptions.value = USER_SET_OPTIONS;
  } else {
    userSetOptions.value = USER_SET_OPTIONS.filter((item) => item.key !== 'logout');
  }
});

const restartApp = () => {
  window.electron.ipcRenderer.send('restart');
};

const toLogin = () => {
  router.push('/user');
};

// 页面初始化
onMounted(() => {
  loadHotSearchKeyword();
  loadPage();
  checkForUpdates();
  isElectron && initZoomFactor();
});

const isDark = computed({
  get: () => settingsStore.theme === 'dark',
  set: () => settingsStore.toggleTheme()
});

// 搜索词
const searchValue = ref('');

// 使用 watch 代替 watchEffect 监听搜索值变化，确保深度监听
watch(
  () => searchStore.searchValue,
  (newValue) => {
    if (newValue) {
      searchValue.value = newValue;
    }
  },
  { immediate: true }
);

const search = () => {
  const { value } = searchValue;
  if (value === '') {
    searchValue.value = hotSearchValue.value;
    return;
  }

  if (router.currentRoute.value.path === '/search') {
    searchStore.searchValue = value;
    return;
  }

  router.push({
    path: '/search',
    query: {
      keyword: value,
      type: searchStore.searchType
    }
  });
};

const selectSearchType = (key: number) => {
  searchStore.searchType = key;
  if (searchValue.value) {
    if (router.currentRoute.value.path === '/search') {
      search();
    } else {
      router.push({
        path: '/search',
        query: {
          keyword: searchValue.value,
          type: key
        }
      });
    }
  }
};

const rawSearchTypes = ref(SEARCH_TYPES);
const searchTypeOptions = computed(() => {
  // 引用 locale 以创建响应式依赖
  locale.value;
  return rawSearchTypes.value.map((type) => ({
    label: t(type.label),
    key: type.key
  }));
});

const selectItem = async (key: string) => {
  // switch 判断
  switch (key) {
    case 'logout':
      userStore.handleLogout();
      break;
    case 'login':
      router.push('/login');
      break;
    case 'set':
      router.push('/set');
      break;
    case 'user':
      router.push('/user');
      break;
    case 'refresh':
      window.location.reload();
      break;
    default:
  }
};

const toGithub = () => {
  window.open('http://donate.alger.fun/download', '_blank');
};

const updateInfo = ref<UpdateResult>({
  hasUpdate: false,
  latestVersion: '',
  currentVersion: config.version,
  releaseInfo: null
});

const checkForUpdates = async () => {
  try {
    const result = await checkUpdate(config.version);
    if (result) {
      updateInfo.value = result;
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
};

const toGithubRelease = () => {
  if (updateInfo.value.hasUpdate) {
    settingsStore.showUpdateModal = true;
  } else {
    window.open('https://github.com/algerkong/AlgerMusicPlayer/releases', '_blank');
  }
};
</script>

<style lang="scss" scoped>
.back-button {
  @apply mr-2 flex items-center justify-center text-xl cursor-pointer;
  @apply w-9 h-9 rounded-full;
  @apply bg-light-100 dark:bg-dark-100 text-gray-900 dark:text-white;
  @apply border dark:border-gray-600 border-gray-200;
  @apply hover:bg-light-200 dark:hover:bg-dark-200;
  @apply transition-all duration-200;
}

.user-box {
  @apply ml-4 flex text-lg justify-center items-center rounded-full transition-colors duration-200;
  @apply border dark:border-gray-600 border-gray-200 hover:border-gray-400 dark:hover:border-gray-400;
  @apply bg-light dark:bg-gray-800;
}

.search-box {
  @apply pb-4 pr-4;
}

.search-box-input {
  @apply relative;

  :deep(.n-input) {
    @apply bg-gray-50 dark:bg-black;

    .n-input__input-el {
      @apply text-gray-900 dark:text-white;
    }

    .n-input__prefix {
      @apply text-gray-500 dark:text-gray-400;
    }
  }
}

.mobile {
  .search-box {
    @apply pl-4;
  }
}

.github {
  @apply cursor-pointer text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400 text-xl ml-4 rounded-full flex justify-center items-center px-2 h-full;
  @apply border dark:border-gray-600 border-gray-200 bg-light dark:bg-black;
}

.user-popover {
  @apply min-w-[220px] p-0 rounded-xl overflow-hidden;
  @apply bg-light dark:bg-black;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .user-header {
    @apply flex items-center gap-2 p-3 cursor-pointer;
    @apply border-b dark:border-gray-700 border-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700;

    .username {
      @apply text-sm font-medium text-gray-900 dark:text-gray-200;
    }
  }

  .menu-items {
    @apply py-1;

    .menu-item {
      @apply flex items-center px-3 py-1 text-sm cursor-pointer;
      @apply text-gray-700 dark:text-gray-300;
      transition: background-color 0.2s;

      &:hover {
        @apply bg-gray-100 dark:bg-gray-700;
      }

      i {
        @apply mr-1 text-lg text-gray-500 dark:text-gray-400;
      }

      .version-info {
        @apply ml-auto flex items-center;

        .version-number {
          @apply text-xs px-2 py-0.5 rounded;
          @apply bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300;
        }
      }

      // 缩放控制样式
      .zoom-controls {
        @apply flex items-center gap-1;

        .zoom-value {
          @apply text-xs px-2 py-0.5 rounded cursor-pointer;
          @apply bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300;
          @apply hover:bg-gray-200 dark:hover:bg-gray-600;
          transition: all 0.2s ease;

          &.zoom-100 {
            @apply bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold;
            @apply hover:bg-green-200 dark:hover:bg-green-800;
          }
        }
      }
    }
  }
}
</style>

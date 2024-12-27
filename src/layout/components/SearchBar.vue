<template>
  <div class="search-box flex">
    <div class="search-box-input flex-1">
      <n-input
        v-model:value="searchValue"
        size="medium"
        round
        :placeholder="hotSearchKeyword"
        class="border border-gray-600"
        @keydown.enter="search"
      >
        <template #prefix>
          <i class="iconfont icon-search"></i>
        </template>
        <template #suffix>
          <n-dropdown trigger="hover" :options="searchTypeOptions" @select="selectSearchType">
            <div class="w-20 px-3 flex justify-between items-center">
              <div>{{ searchTypeOptions.find((item) => item.key === store.state.searchType)?.label }}</div>
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
            v-if="store.state.user"
            class="ml-2 cursor-pointer"
            circle
            size="medium"
            :src="getImgUrl(store.state.user.avatarUrl)"
            @click="selectItem('user')"
          />
          <div v-else class="mx-2 rounded-full cursor-pointer text-sm" @click="toLogin">登录</div>
        </div>
      </template>
      <div class="user-popover">
        <div v-if="store.state.user" class="user-header" @click="selectItem('user')">
          <n-avatar circle size="small" :src="getImgUrl(store.state.user?.avatarUrl)" />
          <span class="username">{{ store.state.user?.nickname || 'Theodore' }}</span>
        </div>
        <div class="menu-items">
          <div v-if="!store.state.user" class="menu-item" @click="toLogin">
            <i class="iconfont ri-login-box-line"></i>
            <span>去登录</span>
          </div>
          <div class="menu-item" @click="selectItem('set')">
            <i class="iconfont ri-settings-3-line"></i>
            <span>设置</span>
          </div>
          <div class="menu-item" @click="toGithubRelease">
            <i class="iconfont ri-refresh-line"></i>
            <span>当前版本</span>
            <span class="download-btn">{{ config.version }}</span>
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
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';

import config from '@/../package.json';
import { getSearchKeyword } from '@/api/home';
import { getUserDetail, logout } from '@/api/login';
import alipay from '@/assets/alipay.png';
import wechat from '@/assets/wechat.png';
import Coffee from '@/components/Coffee.vue';
import { SEARCH_TYPES, USER_SET_OPTIONS } from '@/const/bar-const';
import { getImgUrl } from '@/utils';

const router = useRouter();
const store = useStore();
const userSetOptions = ref(USER_SET_OPTIONS);

// 推荐热搜词
const hotSearchKeyword = ref('搜索点什么吧...');
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
  store.state.user = data.profile;
  localStorage.setItem('user', JSON.stringify(data.profile));
};

loadPage();

watchEffect(() => {
  if (store.state.user) {
    userSetOptions.value = USER_SET_OPTIONS;
  } else {
    userSetOptions.value = USER_SET_OPTIONS.filter((item) => item.key !== 'logout');
  }
});

const toLogin = () => {
  router.push('/login');
};

// 页面初始化
onMounted(() => {
  loadHotSearchKeyword();
  loadPage();
});

// 搜索词
const searchValue = ref('');
const search = () => {
  const { value } = searchValue;
  if (value === '') {
    searchValue.value = hotSearchValue.value;
    return;
  }

  if (router.currentRoute.value.path === '/search') {
    store.state.searchValue = value;
    return;
  }

  router.push({
    path: '/search',
    query: {
      keyword: value,
    },
  });
};

const selectSearchType = (key: number) => {
  store.state.searchType = key;
};

const searchTypeOptions = ref(SEARCH_TYPES);

const selectItem = async (key: string) => {
  // switch 判断
  switch (key) {
    case 'logout':
      logout().then(() => {
        store.state.user = null;
        localStorage.clear();
        router.push('/login');
      });
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
    default:
  }
};

const toGithub = () => {
  window.open('https://github.com/algerkong/AlgerMusicPlayer', '_blank');
};

const toGithubRelease = () => {
  window.open('https://github.com/algerkong/AlgerMusicPlayer/releases', '_blank');
};
</script>

<style lang="scss" scoped>
.user-box {
  @apply ml-4 flex text-lg justify-center items-center rounded-full border border-gray-600 hover:border-gray-400 transition-colors duration-200;
  background: #1a1a1a;
}
.search-box {
  @apply pb-4 pr-4;
}
.search-box-input {
  @apply relative;
}

.mobile {
  .search-box {
    @apply pl-4;
  }
}

.github {
  @apply cursor-pointer text-gray-100 hover:text-gray-400 text-xl ml-4 rounded-full border border-gray-600 flex justify-center items-center px-2 h-full;
}

.user-popover {
  @apply min-w-[280px] p-0 rounded-xl overflow-hidden;
  background: #2c2c2c;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  .user-header {
    @apply flex items-center gap-2 p-3;
    border-bottom: 1px solid #3a3a3a;

    .username {
      @apply text-sm font-medium text-gray-200;
    }
  }

  .menu-items {
    @apply py-1;

    .menu-item {
      @apply flex items-center px-3 py-2 text-sm cursor-pointer;
      @apply text-gray-300;
      transition: background-color 0.2s;

      &:hover {
        background-color: #3a3a3a;
      }

      i {
        @apply mr-1 text-lg text-gray-400;
      }

      .shortcut {
        @apply ml-auto text-xs text-gray-500;
      }

      .download-btn {
        @apply ml-auto px-2 py-0.5 text-xs rounded;
        background: #4a4a4a;
        color: #fff;
      }

      .zoom-controls {
        @apply ml-auto flex items-center gap-2;
        color: #fff;

        .zoom-btn {
          @apply px-2 py-0.5 text-sm rounded cursor-pointer;
          background: #3a3a3a;

          &:hover {
            background: #4a4a4a;
          }
        }

        span:not(.zoom-btn) {
          color: #fff;
        }
      }
    }
  }
}
</style>

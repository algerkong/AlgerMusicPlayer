<template>
  <div class="search-bar-row">
    <!-- 页面滚动标题（有则显示，与搜索同一顶栏） -->
    <span v-if="navTitleStore.isVisible" class="nav-page-title flex-shrink-0">
      {{ navTitleStore.title }}
    </span>

    <!-- 搜索：悬停立即展开，无延迟；聚焦时保持展开 -->
    <div
      class="search-wrap"
      :class="isSearchExpanded ? 'search-wrap--open' : 'search-wrap--idle'"
      @mouseenter="onSearchEnter"
      @mouseleave="onSearchLeave"
    >
      <n-popover
        trigger="manual"
        placement="bottom-end"
        :show="showSuggestions"
        :show-arrow="false"
        style="margin-top: 6px"
        content-style="padding:0;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);"
        raw
      >
        <template #trigger>
          <div class="search-inner" :class="{ 'search-inner--focus': inputFocused }">
            <i class="iconfont icon-search search-icon-glyph" />
            <input
              ref="inputRef"
              v-model="searchValue"
              class="search-input"
              :placeholder="hotSearchKeyword"
              @input="handleInput(searchValue)"
              @keydown="handleKeydown"
              @focus="handleFocus"
              @blur="handleBlur"
            />
            <button
              v-if="searchValue"
              type="button"
              class="search-clear-btn"
              :aria-label="t('common.clear')"
              @mousedown.prevent
              @click="clearSearch"
            >
              <i class="ri-close-line" />
            </button>
          </div>
        </template>
        <div class="suggestions-box">
          <scroll-area class="max-h-[260px]">
            <div v-if="suggestionsLoading" class="suggest-loading">
              <n-spin size="small" />
            </div>
            <div
              v-for="(s, i) in suggestions"
              :key="i"
              class="suggest-row"
              :class="{ 'suggest-row--hi': i === highlightedIndex }"
              @mousedown.prevent="selectSuggestion(s)"
              @mouseenter="highlightedIndex = i"
            >
              <i class="ri-search-line suggest-icon" />
              <span>{{ s }}</span>
            </div>
          </scroll-area>
        </div>
      </n-popover>
    </div>

    <!-- 下载按钮 -->
    <button v-if="showDownloadButton" class="action-btn" @click="navigateToDownloads">
      <n-badge :value="downloadingCount" :max="99" :show="downloadingCount > 0" :offset="[-2, 2]">
        <i class="ri-download-cloud-2-line" />
      </n-badge>
    </button>

    <!-- 用户 / 登录（设置已挪到侧栏底部） -->
    <n-popover v-if="userStore.user" trigger="hover" placement="bottom-end" :show-arrow="false" raw>
      <template #trigger>
        <div class="user-btn">
          <n-avatar
            circle
            :size="26"
            :src="getImgUrl(userStore.user.avatarUrl)"
            class="cursor-pointer"
            @click="selectItem('user')"
          />
        </div>
      </template>
      <div class="user-menu">
        <div class="user-menu-top" @click="selectItem('user')">
          <n-avatar circle :size="28" :src="getImgUrl(userStore.user?.avatarUrl)" />
          <span class="user-name">{{ userStore.user?.nickname }}</span>
        </div>
        <div class="menu-sep" />
        <div class="menu-list">
          <div class="menu-row" @click="selectItem('logout')">
            <i class="ri-logout-box-r-line" /><span>{{ t('comp.searchBar.logout') }}</span>
          </div>
        </div>
      </div>
    </n-popover>
    <span v-else class="login-label" @click="toLogin">{{ t('comp.searchBar.login') }}</span>
  </div>
</template>

<script lang="ts" setup>
import { useDebounceFn } from '@vueuse/core';
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { ScrollArea } from '@/components/ui/scroll-area';
import { SEARCH_TYPE } from '@/const/bar-const';
import { useDownloadStore } from '@/store/modules/download';
import { useNavTitleStore } from '@/store/modules/navTitle';
import { useSearchStore } from '@/store/modules/search';
import { useSettingsStore } from '@/store/modules/settings';
import { useUserStore } from '@/store/modules/user';
import { getImgUrl, isElectron } from '@/utils';

const router = useRouter();
const navTitleStore = useNavTitleStore();
const searchStore = useSearchStore();
const settingsStore = useSettingsStore();
const userStore = useUserStore();
const { t } = useI18n();

const downloadStore = useDownloadStore();
const downloadingCount = computed(() => downloadStore.downloadingCount);
const navigateToDownloads = () => {
  router.push('/downloads');
};
const showDownloadButton = computed(
  () =>
    isElectron && (settingsStore.setData?.alwaysShowDownloadButton || downloadingCount.value > 0)
);

// ── Search expand / collapse（悬停立即展开，无延迟）────
const isSearchExpanded = ref(false);
const inputFocused = ref(false);
const searchHovered = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const syncSearchExpand = () => {
  // 悬停或聚焦任一为真即展开
  isSearchExpanded.value = searchHovered.value || inputFocused.value;
};

const onSearchEnter = () => {
  searchHovered.value = true;
  syncSearchExpand();
};

const onSearchLeave = () => {
  searchHovered.value = false;
  syncSearchExpand();
  if (!inputFocused.value) {
    showSuggestions.value = false;
  }
};

const handleFocus = () => {
  inputFocused.value = true;
  syncSearchExpand();
  if (searchValue.value && suggestions.value.length) showSuggestions.value = true;
};

const handleBlur = () => {
  inputFocused.value = false;
  // 失焦收起建议；展开状态由悬停决定，立即同步，不 setTimeout
  showSuggestions.value = false;
  syncSearchExpand();
};

const clearSearch = () => {
  searchValue.value = '';
  searchStore.searchValue = '';
  suggestions.value = [];
  showSuggestions.value = false;
  highlightedIndex.value = -1;
  // 清完继续打字，别让焦点跑了
  nextTick(() => inputRef.value?.focus());
};

// ── 搜索逻辑 ──────────────────────────────────────
const hotSearchKeyword = ref(t('comp.searchBar.searchPlaceholder'));
const hotSearchValue = ref('');
const searchValue = ref('');

watch(
  () => searchStore.searchValue,
  (v) => {
    if (v) searchValue.value = v;
  },
  { immediate: true }
);

const search = () => {
  const val = searchValue.value;
  if (!val) {
    searchValue.value = hotSearchValue.value;
    return;
  }
  // 搜索框默认搜单曲；专辑 / 歌单在结果页导航切换
  const q = { keyword: val, type: String(SEARCH_TYPE.MUSIC) };
  if (router.currentRoute.value.path === '/search-result') {
    searchStore.searchValue = val;
    router.replace({ path: '/search-result', query: q });
  } else {
    router.push({ path: '/search-result', query: q });
  }
  showSuggestions.value = false;
};

const suggestions = ref<string[]>([]);
const showSuggestions = ref(false);
const suggestionsLoading = ref(false);
const highlightedIndex = ref(-1);

// 在线搜索建议已移除
const debouncedSuggest = useDebounceFn(async (kw: string) => {
  if (!kw.trim()) {
    suggestions.value = [];
    showSuggestions.value = false;
    return;
  }
  suggestionsLoading.value = false;
  suggestions.value = [];
  showSuggestions.value = false;
  highlightedIndex.value = -1;
}, 300);

const handleInput = (v: string) => debouncedSuggest(v);

const selectSuggestion = (s: string) => {
  searchValue.value = s;
  showSuggestions.value = false;
  search();
};

const handleKeydown = (e: KeyboardEvent) => {
  const len = suggestions.value.length;
  if (!showSuggestions.value || !len) {
    if (e.key === 'Enter') search();
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlightedIndex.value = (highlightedIndex.value + 1) % len;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlightedIndex.value = (highlightedIndex.value - 1 + len) % len;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    highlightedIndex.value >= 0
      ? selectSuggestion(suggestions.value[highlightedIndex.value])
      : search();
  }
  if (e.key === 'Escape') {
    showSuggestions.value = false;
  }
};

// ── 用户 / 其它 ───────────────────────────────────
const toLogin = () => router.push('/user');

const selectItem = (key: string) => {
  switch (key) {
    case 'logout':
      userStore.handleLogout();
      break;
    case 'user':
      router.push('/user');
      break;
  }
};
</script>

<style scoped>
/* 嵌在 TitleBar 右端：与缩小/关闭同一行 */
.search-bar-row {
  --bar-h: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  box-sizing: border-box;
  min-width: 0;
  -webkit-app-region: no-drag;
}

/* ── Search wrap：聚焦略变宽（避免被 flex 压死）──────── */
.search-wrap {
  flex: 0 0 auto !important;
  width: 200px;
  max-width: min(200px, 28vw);
  min-width: 140px;
  /* 悬停立即开启动画：无 delay，短时长 ease-out */
  transition:
    width 0.16s cubic-bezier(0.22, 1, 0.36, 1),
    max-width 0.16s cubic-bezier(0.22, 1, 0.36, 1),
    min-width 0.16s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: 0s;
  position: relative;
  z-index: 40;
}
.search-wrap--idle {
  width: 200px;
  max-width: min(200px, 28vw);
  min-width: 140px;
}
.search-wrap--open {
  width: 280px;
  max-width: min(280px, 36vw);
  min-width: 180px;
}

.search-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--bar-h);
  padding: 0 12px;
  border-radius: 9999px;
  border: 1px solid var(--chrome-border);
  background: var(--chrome-surface);
  backdrop-filter: blur(var(--chrome-blur));
  -webkit-backdrop-filter: blur(var(--chrome-blur));
  transition: border-color 0.15s;
  box-sizing: border-box;
  color: var(--chrome-text);
}
/* 点击/聚焦：用封面强调色描边 */
.search-inner--focus {
  border-color: var(--primary-color, #22c55e);
  background: var(--chrome-surface-strong);
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.22);
}

.search-icon-glyph {
  font-size: 16px;
  color: var(--chrome-text-muted, #9ca3af);
  flex-shrink: 0;
  transition: color 0.2s;
}
.search-inner--focus .search-icon-glyph {
  color: var(--primary-color, #22c55e);
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  line-height: 1.2;
  color: var(--chrome-text, #111827);
}
.dark .search-input {
  color: #f3f4f6;
}
.search-input::placeholder {
  color: #9ca3af;
}

.search-clear-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-left: 2px;
  border: none;
  border-radius: 9999px;
  background: rgba(156, 163, 175, 0.28);
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}
.dark .search-clear-btn {
  background: rgba(156, 163, 175, 0.22);
  color: #d1d5db;
}
.search-clear-btn:hover {
  background: rgba(34, 197, 94, 0.2);
  color: var(--primary-color, #22c55e);
}

/* ── 操作按钮 ────────────────────────────────────── */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--bar-h);
  height: var(--bar-h);
  border-radius: 9999px;
  border: 1px solid var(--chrome-border);
  background: var(--chrome-surface);
  backdrop-filter: blur(var(--chrome-blur));
  -webkit-backdrop-filter: blur(var(--chrome-blur));
  color: var(--chrome-text-muted);
  font-size: 17px;
  cursor: pointer;
  transition: all 0.15s;
  box-sizing: border-box;
}
.action-btn:hover {
  color: var(--primary-color, #22c55e);
  border-color: rgba(34, 197, 94, 0.45);
  background: var(--chrome-surface-strong);
}
.action-btn.intelligence-active {
  color: #ec4899;
  border-color: #fbcfe8;
  background: #fdf2f8;
}
.dark .action-btn.intelligence-active {
  color: #ec4899;
  border-color: #831843;
  background: rgba(236, 72, 153, 0.1);
}

/* ── 用户按钮 ────────────────────────────────────── */
.user-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--bar-h);
  height: var(--bar-h);
  padding: 2px;
  border-radius: 9999px;
  border: 1px solid var(--chrome-border);
  background: var(--chrome-surface);
  backdrop-filter: blur(var(--chrome-blur));
  -webkit-backdrop-filter: blur(var(--chrome-blur));
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  box-sizing: border-box;
}
.user-btn:hover {
  border-color: var(--primary-color, #22c55e);
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.22);
}

.login-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--chrome-text-muted, #6b7280);
  padding: 0 10px;
  height: var(--bar-h);
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  border: 1px solid var(--chrome-border);
  background: var(--chrome-surface);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
  box-sizing: border-box;
  white-space: nowrap;
}
.login-label:hover {
  color: var(--primary-color, #22c55e);
  border-color: rgba(34, 197, 94, 0.45);
}

/* ── User menu：附着半透明，不锁死黑/白 ───────────────── */
.user-menu {
  min-width: 200px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--chrome-surface-strong);
  border: 1px solid var(--chrome-border);
  backdrop-filter: blur(var(--chrome-blur));
  -webkit-backdrop-filter: blur(var(--chrome-blur));
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
  color: var(--chrome-text);
}

.user-menu-top {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 14px 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.user-menu-top:hover {
  background: #f9fafb;
}
.dark .user-menu-top:hover {
  background: #1f2937;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dark .user-name {
  color: #f3f4f6;
}

.menu-sep {
  height: 1px;
  background: #f3f4f6;
  margin: 2px 0;
}
.dark .menu-sep {
  background: #1f2937;
}

.menu-list {
  padding: 3px 0 5px;
}

.menu-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: background 0.12s;
}
.dark .menu-row {
  color: #d1d5db;
}
.menu-row:hover {
  background: #f9fafb;
}
.dark .menu-row:hover {
  background: #1f2937;
}

.menu-row i {
  font-size: 15px;
  color: #9ca3af;
  flex-shrink: 0;
  width: 16px;
  text-align: center;
}

/* ── 建议列表 ────────────────────────────────────── */
.suggestions-box {
  background: #fff;
}
.dark .suggestions-box {
  background: #111827;
}

.suggest-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: background 0.1s;
}
.dark .suggest-row {
  color: #d1d5db;
}
.suggest-row:hover,
.suggest-row--hi {
  background: #f0fdf4;
  color: var(--primary-color, #22c55e);
}
.dark .suggest-row:hover,
.dark .suggest-row--hi {
  background: rgba(34, 197, 94, 0.06);
  color: var(--primary-color, #22c55e);
}
.suggest-icon {
  font-size: 13px;
  color: #9ca3af;
  flex-shrink: 0;
}
.suggest-loading {
  display: flex;
  justify-content: center;
  padding: 12px;
}

/* ── Nav page title（顶栏左侧空间有限）──────────────── */
.nav-page-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--chrome-text, #111827);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: min(160px, 18vw);
  letter-spacing: -0.01em;
}
</style>

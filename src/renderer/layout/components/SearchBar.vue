<template>
  <div class="flex items-center gap-2 pb-4 pr-4 pl-1">
    <!-- ── LEFT: Tabs / 返回 ─────────────────────────── -->
    <div v-if="!showBackButton" class="tabs-track flex-shrink-0" ref="tabsTrackRef">
      <div class="tab-slider-bg" :style="sliderStyle" />
      <button
        v-for="(tab, i) in tabs"
        :key="tab.key"
        :ref="(el) => setTabRef(el as HTMLElement, i)"
        class="tab-btn"
        :class="isTabActive(tab.path) ? 'tab-btn--on' : 'tab-btn--off'"
        @click="router.push(tab.path)"
      >
        <i :class="tab.icon" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div v-else class="flex items-center gap-2 flex-shrink-0">
      <button class="back-btn" @click="goBack">
        <i class="ri-arrow-left-line" />
      </button>
      <span v-if="navTitleStore.isVisible" class="nav-page-title">
        {{ navTitleStore.title }}
      </span>
    </div>

    <div class="flex-1" />

    <!-- 搜索：长条、轻微圆角，聚焦时仅略微变宽 -->
    <div class="search-wrap" :class="isSearchExpanded ? 'search-wrap--open' : 'search-wrap--idle'">
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
            <n-dropdown
              v-if="searchTypeOptions.length && isSearchExpanded"
              trigger="hover"
              :options="searchTypeOptions"
              @select="selectSearchType"
              @mousedown.prevent
            >
              <div class="type-chip" @mousedown.prevent>
                <span>{{
                  searchTypeOptions.find((i) => i.key === searchStore.searchType)?.label
                }}</span>
                <i class="iconfont icon-xiasanjiaoxing text-[10px]" />
              </div>
            </n-dropdown>
          </div>
        </template>
        <div class="suggestions-box">
          <n-scrollbar style="max-height: 260px">
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
          </n-scrollbar>
        </div>
      </n-popover>
    </div>

    <!-- 下载按钮 -->
    <button v-if="showDownloadButton" class="action-btn" @click="navigateToDownloads">
      <n-badge :value="downloadingCount" :max="99" :show="downloadingCount > 0" :offset="[-2, 2]">
        <i class="ri-download-cloud-2-line" />
      </n-badge>
    </button>

    <!-- 心动模式按钮 -->
    <n-tooltip v-if="showIntelligenceBtn" trigger="hover">
      <template #trigger>
        <button
          class="action-btn"
          :class="{ 'intelligence-active': isIntelligenceMode }"
          @click="toggleIntelligenceMode"
        >
          <i class="ri-heart-pulse-line" />
        </button>
      </template>
      {{
        isIntelligenceMode
          ? t('comp.searchBar.exitIntelligence')
          : t('comp.searchBar.intelligenceMode')
      }}
    </n-tooltip>

    <!-- 主题（从面板拆出） -->
    <n-tooltip trigger="hover">
      <template #trigger>
        <button class="action-btn" @click="isDark = !isDark">
          <i :class="isDark ? 'ri-moon-line' : 'ri-sun-line'" />
        </button>
      </template>
      {{ t('comp.searchBar.theme') }}
    </n-tooltip>

    <!-- 用户 / 登录（面板内不再重复「去登录」） -->
    <n-popover trigger="hover" placement="bottom-end" :show-arrow="false" raw>
      <template #trigger>
        <div class="user-btn">
          <n-avatar
            v-if="userStore.user"
            circle
            :size="26"
            :src="getImgUrl(userStore.user.avatarUrl)"
            class="cursor-pointer"
            @click="selectItem('user')"
          />
          <span v-else class="login-label" @click="toLogin">{{ t('comp.searchBar.login') }}</span>
        </div>
      </template>
      <div class="user-menu">
        <div v-if="userStore.user" class="user-menu-top" @click="selectItem('user')">
          <n-avatar circle :size="30" :src="getImgUrl(userStore.user?.avatarUrl)" />
          <span class="user-name">{{ userStore.user?.nickname }}</span>
        </div>
        <div v-if="userStore.user" class="menu-sep" />
        <div class="menu-list">
          <div v-if="userStore.user" class="menu-row" @click="selectItem('logout')">
            <i class="ri-logout-box-r-line" /><span>{{ t('comp.searchBar.logout') }}</span>
          </div>
          <div class="menu-row" @click="selectItem('set')">
            <i class="ri-settings-3-line" /><span>{{ t('comp.searchBar.set') }}</span>
          </div>
        </div>
      </div>
    </n-popover>
  </div>
</template>

<script lang="ts" setup>
import { useDebounceFn } from '@vueuse/core';
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { SEARCH_TYPES } from '@/const/bar-const';
import { useDownloadStore } from '@/store/modules/download';
import { useIntelligenceModeStore } from '@/store/modules/intelligenceMode';
import { useNavTitleStore } from '@/store/modules/navTitle';
import { useSearchStore } from '@/store/modules/search';
import { useSettingsStore } from '@/store/modules/settings';
import { useUserStore } from '@/store/modules/user';
import { getImgUrl, isElectron } from '@/utils';

const router = useRouter();
const route = useRoute();
const navTitleStore = useNavTitleStore();
const searchStore = useSearchStore();
const settingsStore = useSettingsStore();
const userStore = useUserStore();
const { t, locale } = useI18n();

const intelligenceModeStore = useIntelligenceModeStore();
const downloadStore = useDownloadStore();
const downloadingCount = computed(() => downloadStore.downloadingCount);
const navigateToDownloads = () => {
  router.push('/downloads');
};
const showDownloadButton = computed(
  () =>
    isElectron && (settingsStore.setData?.alwaysShowDownloadButton || downloadingCount.value > 0)
);

// ── 心动模式 ─────────────────────────────────────────
const isIntelligenceMode = computed(() => intelligenceModeStore.isIntelligenceMode);
const showIntelligenceBtn = computed(() => userStore.user && userStore.loginType === 'cookie');
const toggleIntelligenceMode = async () => {
  if (isIntelligenceMode.value) {
    intelligenceModeStore.clearIntelligenceMode();
  } else {
    await intelligenceModeStore.playIntelligenceMode();
  }
};

// ── Back button ───────────────────────────────────────
const showBackButton = computed(() => {
  const meta = router.currentRoute.value.meta;
  if (!settingsStore.isMobile && meta.isMobile === false) return false;
  return meta.back === true;
});
const goBack = () => router.back();

// ── Tabs ──────────────────────────────────────────────
const tabs = computed(() => {
  const items = [
    { key: 'home', label: t('comp.home'), path: '/', icon: 'ri-home-4-fill' },
    { key: 'playlist', label: t('comp.list'), path: '/list', icon: 'ri-play-list-2-fill' },
    {
      key: 'localMusic',
      label: t('comp.localMusic'),
      path: '/local-music',
      icon: 'ri-folder-music-fill',
      electronOnly: true
    }
  ];
  return items.filter((tab) => !tab.electronOnly || isElectron);
});
const isTabActive = (path: string) => route.path === path;

// Sliding pill
const tabsTrackRef = ref<HTMLElement | null>(null);
const tabElsRef = ref<HTMLElement[]>([]);
const setTabRef = (el: HTMLElement, i: number) => {
  if (el) tabElsRef.value[i] = el;
};
const activeTabIndex = computed(() => tabs.value.findIndex((t) => isTabActive(t.path)));
const sliderStyle = computed(() => {
  const el = tabElsRef.value[activeTabIndex.value];
  if (!el) return { opacity: '0' };
  return {
    transform: `translateX(${el.offsetLeft}px)`,
    width: `${el.offsetWidth}px`,
    opacity: '1'
  };
});

// ── Search expand / collapse ──────────────────────────
const isSearchExpanded = ref(false);
const inputFocused = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const handleFocus = () => {
  inputFocused.value = true;
  isSearchExpanded.value = true;
  if (searchValue.value && suggestions.value.length) showSuggestions.value = true;
};
const handleBlur = () => {
  inputFocused.value = false;
  setTimeout(() => {
    showSuggestions.value = false;
    isSearchExpanded.value = false;
  }, 150);
};

// ── Search logic ──────────────────────────────────────
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
  const q = { keyword: val, type: searchStore.searchType };
  if (router.currentRoute.value.path === '/search-result') {
    searchStore.searchValue = val;
    router.replace({ path: '/search-result', query: q });
  } else {
    router.push({ path: '/search-result', query: q });
  }
  showSuggestions.value = false;
};

const selectSearchType = (key: number) => {
  searchStore.searchType = key;
  if (searchValue.value)
    router.push({ path: '/search-result', query: { keyword: searchValue.value, type: key } });
  nextTick(() => inputRef.value?.focus());
};

const rawSearchTypes = ref(SEARCH_TYPES);
const searchTypeOptions = computed(() => {
  locale.value;
  return rawSearchTypes.value
    .filter(() => isElectron)
    .map((type) => ({ label: t(type.label), key: type.key }));
});

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

// ── User / misc ───────────────────────────────────────
const toLogin = () => router.push('/user');

const isDark = computed({
  get: () => settingsStore.theme === 'dark',
  set: () => settingsStore.toggleTheme()
});

const selectItem = (key: string) => {
  switch (key) {
    case 'logout':
      userStore.handleLogout();
      break;
    case 'set':
      router.push('/set');
      break;
    case 'user':
      router.push('/user');
      break;
  }
};
</script>

<style scoped>
/* ── Tab track ───────────────────────────────────────── */
.tabs-track {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 34px;
  background: #f3f4f6;
  border-radius: 9999px;
  padding: 3px;
  gap: 0;
  box-sizing: border-box;
}
.dark .tabs-track {
  background: #1f2937;
}

.tab-slider-bg {
  position: absolute;
  top: 3px;
  left: 0;
  height: calc(100% - 6px);
  border-radius: 9999px;
  background: #22c55e;
  box-shadow: 0 1px 6px rgba(34, 197, 94, 0.35);
  transition:
    transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1),
    width 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);
  pointer-events: none;
  z-index: 0;
}

.tab-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 13px;
  border-radius: 9999px;
  font-size: 12.5px;
  font-weight: 600;
  border: none;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s;
}
.tab-btn--on {
  color: #fff;
}
.tab-btn--off {
  color: #6b7280;
}
.dark .tab-btn--off {
  color: #9ca3af;
}
.tab-btn--off:hover {
  color: #111827;
}
.dark .tab-btn--off:hover {
  color: #f9fafb;
}

/* ── Back button ─────────────────────────────────────── */
.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  border: 1px solid #e5e7eb;
  background: transparent;
  color: #6b7280;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s;
}
.dark .back-btn {
  border-color: #374151;
  color: #9ca3af;
}
.back-btn:hover {
  color: #22c55e;
  border-color: #22c55e;
}

/* ── Search wrap：长条 + 轻微加宽，不抢布局 ───────────── */
.search-wrap {
  flex: 0 0 auto;
  width: 240px;
  transition: width 0.18s ease;
}
.search-wrap--idle {
  width: 240px;
}
.search-wrap--open {
  width: 300px;
}

.search-inner {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  transition:
    border-color 0.15s,
    width 0.18s ease;
}
.dark .search-inner {
  border-color: #374151;
  background: #171717;
}
.search-inner--focus {
  border-color: #22c55e;
  background: #fff;
  box-shadow: none;
}
.dark .search-inner--focus {
  background: #171717;
  box-shadow: none;
}

.search-icon-glyph {
  font-size: 14px;
  color: #9ca3af;
  flex-shrink: 0;
  transition: color 0.2s;
}
.search-inner--focus .search-icon-glyph {
  color: #22c55e;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #111827;
}
.dark .search-input {
  color: #f3f4f6;
}
.search-input::placeholder {
  color: #9ca3af;
}

.type-chip {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 6px;
  background: #f3f4f6;
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s,
    color 0.15s;
  flex-shrink: 0;
}
.dark .type-chip {
  background: #1f2937;
  color: #9ca3af;
}
.type-chip:hover {
  background: #dcfce7;
  color: #16a34a;
}
.dark .type-chip:hover {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

/* ── Action buttons ──────────────────────────────────── */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  border: 1px solid #e5e7eb;
  background: transparent;
  color: #6b7280;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.15s;
}
.dark .action-btn {
  border-color: #374151;
  color: #9ca3af;
}
.action-btn:hover {
  color: #22c55e;
  border-color: #bbf7d0;
  background: #f0fdf4;
}
.dark .action-btn:hover {
  border-color: #166534;
  background: rgba(34, 197, 94, 0.08);
  color: #22c55e;
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

/* ── User button ─────────────────────────────────────── */
.user-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 2px;
  border-radius: 9999px;
  border: 1px solid #e5e7eb;
  background: transparent;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.dark .user-btn {
  border-color: #374151;
}
.user-btn:hover {
  border-color: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.12);
}

.login-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  padding: 0 8px;
}
.dark .login-label {
  color: #9ca3af;
}

/* ── User menu ───────────────────────────────────────── */
.user-menu {
  min-width: 220px;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #f3f4f6;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.1),
    0 1px 4px rgba(0, 0, 0, 0.05);
}
.dark .user-menu {
  background: #111827;
  border-color: #1f2937;
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

/* ── Suggestions ─────────────────────────────────────── */
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
  color: #16a34a;
}
.dark .suggest-row:hover,
.dark .suggest-row--hi {
  background: rgba(34, 197, 94, 0.06);
  color: #22c55e;
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

/* ── Nav page title ──────────────────────────────────── */
.nav-page-title {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
  letter-spacing: -0.01em;
}
.dark .nav-page-title {
  color: #f9fafb;
}
</style>

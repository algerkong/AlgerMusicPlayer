<template>
  <div
    class="search-page-container h-full w-full bg-white dark:bg-black transition-colors duration-500"
  >
    <n-scrollbar class="h-full">
      <div class="search-content w-full pb-32 pt-6 page-padding">
        <!-- Search Header / Hero -->
        <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1
              class="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2"
            >
              {{ t('search.title.hotSearch') }}
            </h1>
            <p class="text-neutral-500 dark:text-neutral-400">探索当下最热门的搜索趋势</p>
          </div>
        </div>

        <!-- Hot Search Section -->
        <div class="space-y-12">
          <section>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div
                v-for="(item, index) in hotSearchData?.data"
                :key="index"
                class="hot-search-card group flex items-center gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer transition-all duration-300 animate-item"
                :style="{ animationDelay: calculateAnimationDelay(index, 0.03) }"
                @click="handleSearch(item.searchWord)"
              >
                <span
                  class="flex-shrink-0 w-8 text-lg font-bold italic transition-colors duration-300"
                  :class="index < 3 ? 'text-primary' : 'text-neutral-300 dark:text-neutral-700'"
                >
                  {{ String(index + 1).padStart(2, '0') }}
                </span>
                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm font-semibold text-neutral-900 dark:text-white truncate group-hover:text-primary transition-colors"
                  >
                    {{ item.searchWord }}
                  </p>
                  <p v-if="item.content" class="text-xs text-neutral-400 truncate mt-0.5">
                    {{ item.content }}
                  </p>
                </div>
                <div v-if="item.iconUrl" class="flex-shrink-0">
                  <img :src="item.iconUrl" class="h-4 object-contain opacity-80" />
                </div>
              </div>
            </div>
          </section>

          <!-- Search History -->
          <section v-if="searchHistory.length > 0">
            <div class="mb-6 flex items-center justify-between">
              <h2 class="text-xl font-bold text-neutral-900 dark:text-white">
                {{ t('search.title.searchHistory') }}
              </h2>
              <button
                class="text-xs text-neutral-400 hover:text-red-500 transition-colors"
                @click="clearSearchHistory"
              >
                {{ t('search.button.clear') }}
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(item, index) in searchHistory"
                :key="index"
                class="group relative flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                @click="handleSearch(item.keyword, item.type)"
              >
                <span>{{ item.keyword }}</span>
                <i
                  class="ri-close-line text-neutral-400 hover:text-red-500 transition-colors"
                  @click.stop="handleCloseSearchHistory(item)"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getHotSearch } from '@/api/home';
import { useSearchStore } from '@/store/modules/search';
import type { IHotSearch } from '@/types/search';
import { calculateAnimationDelay } from '@/utils';

defineOptions({
  name: 'Search'
});

const { t } = useI18n();
const router = useRouter();
const searchStore = useSearchStore();

const searchHistory = ref<Array<{ keyword: string; type: number }>>([]);

// 从 localStorage 加载搜索历史
const loadSearchHistory = () => {
  const history = localStorage.getItem('searchHistory');
  searchHistory.value = history ? JSON.parse(history) : [];
};

// 保存搜索历史
const saveSearchHistory = (keyword: string, type: number) => {
  if (!keyword) return;
  const history = searchHistory.value;
  const index = history.findIndex((item) => item.keyword === keyword);
  if (index > -1) {
    history.splice(index, 1);
  }
  history.unshift({ keyword, type });
  if (history.length > 20) {
    history.pop();
  }
  searchHistory.value = history;
  localStorage.setItem('searchHistory', JSON.stringify(history));
};

// 清空搜索历史
const clearSearchHistory = () => {
  searchHistory.value = [];
  localStorage.removeItem('searchHistory');
};

// 删除单条历史
const handleCloseSearchHistory = (item: { keyword: string; type: number }) => {
  searchHistory.value = searchHistory.value.filter((h) => h.keyword !== item.keyword);
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value));
};

// 热搜列表
const hotSearchData = ref<IHotSearch>();
const loadHotSearch = async () => {
  const { data } = await getHotSearch();
  hotSearchData.value = data;
};

const handleSearch = (keyword: string, type?: number) => {
  const searchType = type ?? searchStore.searchType;
  saveSearchHistory(keyword, searchType);
  searchStore.searchValue = keyword;
  searchStore.searchType = searchType;

  router.push({
    path: '/search-result',
    query: {
      keyword,
      type: searchType
    }
  });
};

onMounted(() => {
  loadHotSearch();
  loadSearchHistory();
});
</script>

<style lang="scss" scoped>
.search-page-container {
  position: relative;
}

.animate-item {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hot-search-card {
  &:hover {
    .hot-search-item-count {
      @apply text-primary;
    }
  }
}
</style>

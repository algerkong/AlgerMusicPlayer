<template>
  <div class="search-page h-full page-padding">
    <div class="max-w-2xl mx-auto pt-8 space-y-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('comp.search') }}</h1>
      <n-input
        v-model:value="keyword"
        size="large"
        clearable
        :placeholder="t('comp.searchBar.searchPlaceholder')"
        @keyup.enter="doSearch"
      >
        <template #prefix><i class="ri-search-line" /></template>
      </n-input>
      <n-empty description="输入关键词后回车搜索（汽水）" class="pt-16" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NEmpty, NInput } from 'naive-ui';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

defineOptions({ name: 'SearchPage' });

const { t } = useI18n();
const router = useRouter();
const keyword = ref('');

const doSearch = () => {
  const val = keyword.value.trim();
  if (!val) return;
  router.push({ path: '/search-result', query: { keyword: val, type: 1 } });
};
</script>

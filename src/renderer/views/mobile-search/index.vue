<template>
  <div class="mobile-search page-padding pt-4 space-y-4">
    <n-input
      v-model:value="keyword"
      size="large"
      clearable
      placeholder="搜索"
      @keyup.enter="doSearch"
    >
      <template #prefix><i class="ri-search-line" /></template>
    </n-input>
    <n-empty description="在线音源将接入独立库" class="pt-12" />
  </div>
</template>

<script setup lang="ts">
import { NEmpty, NInput } from 'naive-ui';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

defineOptions({ name: 'MobileSearch' });

const router = useRouter();
const keyword = ref('');

const doSearch = () => {
  const val = keyword.value.trim();
  if (!val) return;
  router.push({ path: '/mobile-search-result', query: { keyword: val, type: 1 } });
};
</script>

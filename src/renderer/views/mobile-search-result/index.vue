<template>
  <div class="mobile-search-result page-padding pt-4">
    <h2 class="text-lg font-bold mb-4">{{ keyword }}</h2>
    <n-empty description="在线音源将接入独立库" class="pt-12" />
  </div>
</template>

<script setup lang="ts">
import { NEmpty } from 'naive-ui';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

defineOptions({ name: 'MobileSearchResult' });

const route = useRoute();
const keyword = computed(() => String(route.query.keyword || ''));
</script>

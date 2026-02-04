<template>
  <div
    class="category-page-container h-full w-full bg-white dark:bg-black transition-colors duration-500"
  >
    <n-scrollbar class="h-full">
      <div class="category-page-content w-full pb-32 pt-6 px-4 sm:px-6 lg:px-8 lg:pl-0">
        <!-- Hero Section -->
        <div class="mb-8">
          <h1
            class="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2"
          >
            {{ currentCategory?.name || t('podcast.categoryRadios') }}
          </h1>
          <p class="text-neutral-500 dark:text-neutral-400">
            {{ t('podcast.exploreCategoryRadios') }}
          </p>
        </div>

        <!-- Radios Grid -->
        <section>
          <div class="mb-6 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <h2
                class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white"
              >
                {{ t('podcast.hotRadios') }}
              </h2>
              <div class="h-1.5 w-1.5 rounded-full bg-primary" />
            </div>
          </div>

          <!-- Loading Skeletons -->
          <div v-if="loading" class="grid gap-6" :style="gridStyle">
            <div v-for="i in 15" :key="i" class="space-y-3">
              <div
                class="aspect-square animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
              />
              <div class="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div class="h-3 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </div>

          <!-- Radios Grid -->
          <div v-else-if="radios.length > 0" class="grid gap-6" :style="gridStyle">
            <radio-card
              v-for="(radio, index) in radios"
              :key="radio.id"
              :radio="radio"
              :show-subscribe-button="true"
              :animation-delay="calculateAnimationDelay(index, 0.04)"
            />
          </div>

          <!-- Empty State -->
          <div v-else class="flex flex-col items-center justify-center py-20 text-neutral-400">
            <i class="ri-radio-line mb-4 text-5xl opacity-20" />
            <p class="text-sm font-medium">{{ t('podcast.noCategoryRadios') }}</p>
          </div>
        </section>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { NScrollbar } from 'naive-ui';
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { getDjRadioHot } from '@/api/podcast';
import RadioCard from '@/components/podcast/RadioCard.vue';
import { usePodcastStore } from '@/store';
import type { DjRadio } from '@/types/podcast';
import { calculateAnimationDelay } from '@/utils';

defineOptions({
  name: 'PodcastCategory'
});

const { t } = useI18n();
const route = useRoute();
const podcastStore = usePodcastStore();

const categoryId = computed(() => Number(route.params.id));

const radios = shallowRef<DjRadio[]>([]);
const loading = ref(false);

const gridStyle = computed(() => ({
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))'
}));

const currentCategory = computed(() => {
  return podcastStore.categories.find((c) => c.id === categoryId.value);
});

const fetchRadios = async () => {
  try {
    loading.value = true;
    const res = await getDjRadioHot(categoryId.value);
    radios.value = res.data?.djRadios || [];
  } catch (error) {
    console.error('获取分类电台失败:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchRadios);
</script>

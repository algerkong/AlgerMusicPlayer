<template>
  <div class="toplist-page h-full w-full bg-white dark:bg-black transition-colors duration-500">
    <n-scrollbar class="h-full">
      <div class="toplist-content w-full pb-32 pt-6 px-4 sm:px-6 lg:px-8 lg:pl-0">
        <!-- Hero Section -->
        <div class="mb-10">
          <h1
            class="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2"
          >
            排行榜
          </h1>
          <p class="text-neutral-500 dark:text-neutral-400">
            最具权威的音乐榜单，发现当下最热门的音乐
          </p>
        </div>

        <!-- Toplist Grid -->
        <div class="toplist-grid-container">
          <!-- Loading State -->
          <div v-if="loading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div v-for="i in 15" :key="i" class="space-y-3">
              <div
                class="aspect-square animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
              />
              <div class="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div class="h-3 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </div>

          <!-- Content State -->
          <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div
              v-for="(item, index) in topList"
              :key="item.id"
              class="toplist-card group cursor-pointer animate-item"
              :style="{ animationDelay: calculateAnimationDelay(index, 0.05) }"
              @click.stop="openToplist(item)"
            >
              <!-- Cover Image -->
              <div
                class="relative aspect-square overflow-hidden rounded-2xl shadow-md group-hover:shadow-xl transition-all duration-500"
              >
                <img
                  :src="getImgUrl(item.coverImgUrl, '400y400')"
                  :alt="item.name"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />

                <!-- Play Overlay -->
                <div
                  class="absolute inset-0 bg-transparent group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center"
                >
                  <div
                    class="play-icon w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-xl"
                  >
                    <i class="ri-play-fill text-2xl text-neutral-900 ml-1"></i>
                  </div>
                </div>

                <!-- Update Frequency Badge -->
                <div
                  class="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  v-if="item.updateFrequency"
                >
                  {{ item.updateFrequency }}
                </div>

                <!-- Play Count Badge -->
                <div
                  class="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <i class="ri-play-fill"></i>
                  {{ formatNumber(item.playCount) }}
                </div>
              </div>

              <!-- Info -->
              <div class="mt-3 space-y-1">
                <h3
                  class="text-sm md:text-base font-bold text-neutral-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors"
                >
                  {{ item.name }}
                </h3>
                <p class="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                  {{ item.updateFrequency || '网易云音乐榜单' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { getToplist } from '@/api/list';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import { calculateAnimationDelay, formatNumber, getImgUrl } from '@/utils';

defineOptions({
  name: 'Toplist'
});

const router = useRouter();
const topList = ref<any[]>([]);
const loading = ref(false);

const openToplist = async (item: any) => {
  try {
    navigateToMusicList(router, {
      id: item.id,
      type: 'playlist',
      name: item.name,
      listInfo: item,
      canRemove: false
    });
  } catch (error) {
    console.error('获取榜单详情失败:', error);
  }
};

const loadToplist = async () => {
  loading.value = true;
  try {
    const { data } = await getToplist();
    topList.value = data.list || [];
  } catch (error) {
    console.error('加载排行榜列表失败:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadToplist();
});
</script>

<style lang="scss" scoped>
.toplist-page {
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

.toplist-card {
  &:hover {
    .play-icon {
      @apply opacity-100 scale-100;
    }
  }
}
</style>

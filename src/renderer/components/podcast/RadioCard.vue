<script setup lang="ts">
import { useRouter } from 'vue-router';

import type { DjProgram, DjRadio } from '@/types/podcast';
import { formatNumber, getImgUrl } from '@/utils';

const props = withDefaults(
  defineProps<{
    radio?: DjRadio;
    program?: DjProgram;
    animationDelay?: string;
  }>(),
  {}
);

const router = useRouter();

const goToDetail = () => {
  if (props.radio?.id) {
    router.push(`/podcast/radio/${props.radio.id}`);
  }
};
</script>

<template>
  <div
    class="group cursor-pointer animate-item"
    :style="{ animationDelay }"
    @click="goToDetail"
  >
    <!-- Cover -->
    <div
      class="relative aspect-square overflow-hidden rounded-2xl shadow-md group-hover:shadow-xl transition-all duration-500"
    >
      <img
        :src="getImgUrl(radio?.picUrl || program?.coverUrl || '', '400y400')"
        :alt="radio?.name || ''"
        class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        loading="lazy"
      />
      <!-- Hover overlay -->
      <div
        class="absolute inset-0 bg-transparent group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center"
      >
        <div
          class="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-xl"
        >
          <i class="ri-play-fill text-2xl text-neutral-900 ml-0.5"></i>
        </div>
      </div>
      <!-- Recent played badge -->
      <div
        v-if="program"
        class="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent text-white text-xs truncate"
      >
        {{ program.mainSong?.name || program.name }}
      </div>
      <!-- Episode count badge -->
      <div
        v-if="radio?.programCount && !program"
        class="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <i class="ri-mic-fill"></i>
        {{ radio.programCount }}
      </div>
    </div>

    <!-- Info -->
    <div class="mt-3 space-y-1">
      <h3
        class="text-sm md:text-base font-bold text-neutral-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors"
        :title="radio?.name || ''"
      >
        {{ radio?.name || program?.name || '' }}
      </h3>
      <p
        v-if="radio?.subCount !== undefined"
        class="text-xs text-neutral-500 dark:text-neutral-400"
      >
        {{ formatNumber(radio?.subCount || 0) }} subscribers
      </p>
    </div>
  </div>
</template>

<style scoped>
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
</style>

<template>
  <div
    class="home-list-card group cursor-pointer"
    :style="{ animationDelay }"
    @click="$emit('click')"
  >
    <!-- Cover -->
    <div
      class="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100 shadow-sm transition-all duration-300 ease-out group-hover:shadow-xl dark:bg-neutral-800"
    >
      <img
        ref="coverRef"
        :src="getImgUrl(cover, '512y512')"
        class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        loading="lazy"
        :alt="title"
        crossorigin="anonymous"
        @load="extractColor"
      />

      <!-- Hover Overlay with Song Preview -->
      <div
        v-if="showHoverTracks"
        class="absolute inset-0 flex items-end opacity-0 transition-all duration-500 ease-out group-hover:opacity-100"
        :style="overlayStyle"
      >
        <!-- Song Preview + Play Button Container -->
        <div class="flex w-full items-end justify-between gap-3 p-4">
          <!-- Song List -->
          <div
            class="min-w-0 flex-1 translate-y-3 space-y-1.5 transition-all duration-500 ease-out group-hover:translate-y-0"
          >
            <div
              v-for="(track, idx) in displayTracks"
              :key="idx"
              class="flex items-center gap-2.5 text-white/95"
            >
              <span class="w-5 flex-shrink-0 text-center text-xs font-bold text-white/40">{{
                idx + 1
              }}</span>
              <span class="truncate text-sm font-semibold tracking-wide">{{ track.name }}</span>
            </div>
            <div v-if="tracks.length === 0" class="py-4 text-center text-xs text-white/50">
              {{ t('comp.homeListItem.loading') }}
            </div>
          </div>

          <!-- Play Button -->
          <button
            class="flex h-12 w-12 flex-shrink-0 translate-y-2 items-center justify-center rounded-full bg-white text-neutral-900 shadow-2xl transition-all duration-500 ease-out hover:scale-110 group-hover:translate-y-0 active:scale-95"
            @click.stop="$emit('play')"
          >
            <i class="ri-play-fill ml-0.5 text-lg" />
          </button>
        </div>
      </div>

      <!-- Badge -->
      <div
        v-if="badge"
        class="absolute left-3 top-3 rounded-lg px-2.5 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm"
        :class="badgeClass"
      >
        {{ badge }}
      </div>

      <!-- Play Count (for playlists) -->
      <div
        v-if="playCount"
        class="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md"
      >
        <i class="ri-play-fill text-[10px]" />
        <span>{{ formatNumber(playCount) }}</span>
      </div>
    </div>

    <!-- Info -->
    <div class="mt-3 px-0.5">
      <h3
        class="truncate text-base font-bold tracking-tight text-neutral-900 transition-colors duration-200 group-hover:text-primary dark:text-neutral-50 dark:group-hover:text-white"
      >
        {{ title }}
      </h3>
      <p
        v-if="subtitle"
        class="mt-1.5 truncate text-sm font-medium text-neutral-500 transition-colors duration-200 group-hover:text-neutral-600 dark:text-neutral-400 dark:group-hover:text-neutral-300"
      >
        {{ subtitle }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatNumber, getImgUrl } from '@/utils';
import { getImageBackground } from '@/utils/linearColor';

interface Track {
  id: number;
  name: string;
}

const props = withDefaults(
  defineProps<{
    cover: string;
    title: string;
    subtitle?: string;
    tracks?: Track[];
    badge?: string;
    badgeType?: 'new' | 'hot' | 'recommend';
    playCount?: number;
    animationDelay?: string;
    showHoverTracks?: boolean;
  }>(),
  {
    tracks: () => [],
    animationDelay: '0s',
    showHoverTracks: true
  }
);

defineEmits<{
  (e: 'click'): void;
  (e: 'play'): void;
}>();

const { t } = useI18n();
const coverRef = ref<HTMLImageElement | null>(null);
const backgroundGradient = ref(
  'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)'
);

const displayTracks = computed(() => props.tracks.slice(0, 3));

const badgeClass = computed(() => {
  switch (props.badgeType) {
    case 'new':
      return 'bg-gradient-to-r from-orange-500 to-rose-500';
    case 'hot':
      return 'bg-gradient-to-r from-rose-500 to-pink-500';
    case 'recommend':
      return 'bg-gradient-to-r from-primary to-blue-500';
    default:
      return 'bg-gradient-to-r from-primary to-blue-500';
  }
});

const overlayStyle = computed(() => ({
  background: backgroundGradient.value
}));

const extractColor = async () => {
  const img = coverRef.value;
  if (!img) return;

  try {
    const { primaryColor } = await getImageBackground(img);
    if (primaryColor) {
      // 使用 tinycolor 来创建更自然的渐变效果
      const tinycolor = (await import('tinycolor2')).default;
      const baseColor = tinycolor(primaryColor);
      const hsl = baseColor.toHsl();

      // 创建深色渐变，确保文字可读性
      const darkColor = tinycolor({
        h: hsl.h,
        s: Math.min(hsl.s * 1.3, 1),
        l: Math.max(hsl.l * 0.15, 0.05)
      }).setAlpha(0.95);

      const midColor = tinycolor({
        h: hsl.h,
        s: Math.min(hsl.s * 1.1, 1),
        l: Math.max(hsl.l * 0.4, 0.1)
      }).setAlpha(0.85);

      const topColor = tinycolor({
        h: hsl.h,
        s: hsl.s * 0.8,
        l: Math.min(hsl.l * 0.6, 0.2)
      }).setAlpha(0.3);

      backgroundGradient.value = `linear-gradient(to top, ${darkColor.toRgbString()} 0%, ${midColor.toRgbString()} 60%, ${topColor.toRgbString()} 100%)`;
    }
  } catch (error) {
    console.debug('Color extraction failed:', error);
    // 使用深色fallback
    backgroundGradient.value =
      'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 60%, rgba(0,0,0,0.3) 100%)';
  }
};
</script>

<style scoped>
.home-list-card {
  animation: itemFadeIn 0.5s ease-out backwards;
}

@keyframes itemFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import type { DjProgram, DjRadio } from '@/types/podcast';
import { formatNumber, getImgUrl } from '@/utils';

const props = withDefaults(
  defineProps<{
    radio: DjRadio;
    program?: DjProgram;
    showSubscribeButton?: boolean;
    isSubscribed?: boolean;
    animationDelay?: string;
  }>(),
  {
    showSubscribeButton: false,
    isSubscribed: false
  }
);

const emit = defineEmits<{
  subscribe: [radio: DjRadio];
}>();

const router = useRouter();
const { t } = useI18n();

const isSubscribed = computed(() => props.isSubscribed);

const handleSubscribe = (e: Event) => {
  e.stopPropagation();
  emit('subscribe', props.radio);
};

const goToDetail = () => {
  router.push(`/podcast/radio/${props.radio.id}`);
};
</script>

<template>
  <div
    class="radio-card animate-item group flex flex-col rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 p-4 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-all duration-300"
    :style="{ animationDelay }"
    @click="goToDetail"
  >
    <div class="relative overflow-hidden rounded-xl">
      <img
        :src="getImgUrl(radio.picUrl || program?.coverUrl || '', '200y200')"
        :alt="radio.name"
        class="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div
        v-if="showSubscribeButton && radio.subCount !== undefined"
        class="absolute top-2 right-2 z-10"
      >
        <n-button
          :type="isSubscribed ? 'default' : 'primary'"
          size="small"
          round
          @click="handleSubscribe"
        >
          {{ isSubscribed ? t('podcast.subscribed') : t('podcast.subscribe') }}
        </n-button>
      </div>
      <div
        v-if="program"
        class="absolute bottom-0 left-0 right-0 p-2 bg-black/40 backdrop-blur-sm text-white text-[10px] truncate"
      >
        {{ t('podcast.recentPlayed') }}: {{ program.mainSong?.name || program.name }}
      </div>
    </div>

    <h3
      class="mt-3 text-sm md:text-base font-semibold text-neutral-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors"
      :title="radio.name"
    >
      {{ radio.name }}
    </h3>

    <p
      v-if="radio.desc"
      class="mt-1 text-xs md:text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2"
    >
      {{ radio.desc }}
    </p>

    <div
      v-if="radio.subCount !== undefined"
      class="mt-2 flex items-center justify-between text-xs text-neutral-400"
    >
      <span>{{ formatNumber(radio.subCount) }} {{ t('podcast.subscribeCount') }}</span>
      <span>{{ radio.programCount }} {{ t('podcast.programCount') }}</span>
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

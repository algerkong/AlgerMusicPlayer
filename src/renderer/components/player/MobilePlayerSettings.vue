<template>
  <Teleport to="body">
    <Transition name="settings-drawer">
      <div
        v-if="visible"
        class="fixed inset-0 z-[99999] flex items-end justify-center"
        @click.self="close"
      >
        <div class="absolute inset-0 bg-black/50" @click="close"></div>

        <div
          class="relative w-full max-w-lg bg-gray-900/70 backdrop-blur-2xl rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col border-t border-white/10 shadow-2xl"
        >
          <div class="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div class="w-10 h-1 rounded-full bg-white/30"></div>
          </div>

          <div class="flex items-center justify-between px-5 pb-4 flex-shrink-0">
            <h2 class="text-lg font-semibold text-white">
              {{ t('player.settings.title') }}
            </h2>
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10"
              @click="close"
            >
              <i class="ri-close-line text-xl"></i>
            </button>
          </div>

          <scroll-area
            class="flex-1 min-h-0"
            :style="{ paddingBottom: `calc(24px + var(--safe-area-inset-bottom, 0px))` }"
          >
            <div class="mb-6 px-5 pb-6">
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-medium text-white/80">
                  {{ t('player.settings.playbackSpeed') }}
                </span>
                <span class="text-sm text-primary font-medium">{{ playbackRate }}x</span>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in speedOptions"
                  :key="option"
                  class="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  :class="
                    playbackRate === option
                      ? 'bg-primary text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  "
                  @click="setSpeed(option)"
                >
                  {{ option }}x
                </button>
              </div>
            </div>
          </scroll-area>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlayerStore } from '@/store/modules/player';

const { t } = useI18n();
const playerStore = usePlayerStore();
const { playbackRate } = storeToRefs(playerStore);

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

const close = () => emit('update:visible', false);

const setSpeed = (rate: number) => {
  playerStore.setPlaybackRate(rate);
};
</script>

<style scoped>
.settings-drawer-enter-active,
.settings-drawer-leave-active {
  transition: opacity 0.25s ease;
}
.settings-drawer-enter-active > div:last-child,
.settings-drawer-leave-active > div:last-child {
  transition: transform 0.25s ease;
}
.settings-drawer-enter-from,
.settings-drawer-leave-to {
  opacity: 0;
}
.settings-drawer-enter-from > div:last-child,
.settings-drawer-leave-to > div:last-child {
  transform: translateY(100%);
}
</style>

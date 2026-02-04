import { useLocalStorage } from '@vueuse/core';
import { ref, watch } from 'vue';

import type { DjProgram } from '@/types/podcast';

export const usePodcastHistory = () => {
  const podcastHistory = useLocalStorage<DjProgram[]>('podcastHistory', []);

  const addPodcast = (program: DjProgram) => {
    const index = podcastHistory.value.findIndex((item) => item.id === program.id);
    if (index !== -1) {
      podcastHistory.value.unshift(podcastHistory.value.splice(index, 1)[0]);
    } else {
      podcastHistory.value.unshift(program);
    }

    if (podcastHistory.value.length > 100) {
      podcastHistory.value.pop();
    }
  };

  const delPodcast = (program: DjProgram) => {
    const index = podcastHistory.value.findIndex((item) => item.id === program.id);
    if (index !== -1) {
      podcastHistory.value.splice(index, 1);
    }
  };

  const clearPodcastHistory = () => {
    podcastHistory.value = [];
  };

  const podcastList = ref(podcastHistory.value);

  watch(
    () => podcastHistory.value,
    () => {
      podcastList.value = podcastHistory.value;
    },
    { deep: true }
  );

  return {
    podcastHistory,
    podcastList,
    addPodcast,
    delPodcast,
    clearPodcastHistory
  };
};

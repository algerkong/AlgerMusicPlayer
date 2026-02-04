import { useLocalStorage } from '@vueuse/core';
import { ref, watch } from 'vue';

export type PodcastRadioHistoryItem = {
  id: number;
  name: string;
  picUrl: string;
  desc?: string;
  dj?: {
    nickname: string;
    userId: number;
  };
  count?: number;
  lastPlayTime?: number;
  type?: string;
};

export const usePodcastRadioHistory = () => {
  const podcastRadioHistory = useLocalStorage<PodcastRadioHistoryItem[]>('podcastRadioHistory', []);

  const addPodcastRadio = (radio: PodcastRadioHistoryItem) => {
    const index = podcastRadioHistory.value.findIndex((item) => item.id === radio.id);
    const now = Date.now();

    if (index !== -1) {
      const existing = podcastRadioHistory.value.splice(index, 1)[0];
      existing.count = (existing.count || 0) + 1;
      existing.lastPlayTime = now;
      podcastRadioHistory.value.unshift(existing);
    } else {
      podcastRadioHistory.value.unshift({
        ...radio,
        count: 1,
        lastPlayTime: now
      });
    }

    if (podcastRadioHistory.value.length > 100) {
      podcastRadioHistory.value.pop();
    }
  };

  const delPodcastRadio = (radio: PodcastRadioHistoryItem) => {
    const index = podcastRadioHistory.value.findIndex((item) => item.id === radio.id);
    if (index !== -1) {
      podcastRadioHistory.value.splice(index, 1);
    }
  };

  const podcastRadioList = ref(podcastRadioHistory.value);

  watch(
    () => podcastRadioHistory.value,
    () => {
      podcastRadioList.value = podcastRadioHistory.value;
    },
    { deep: true }
  );

  return {
    podcastRadioHistory,
    podcastRadioList,
    addPodcastRadio,
    delPodcastRadio
  };
};

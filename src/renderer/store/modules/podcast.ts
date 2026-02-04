import { createDiscreteApi } from 'naive-ui';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import * as podcastApi from '@/api/podcast';
import type { DjCategory, DjProgram, DjRadio } from '@/types/podcast';

const { message } = createDiscreteApi(['message']);

export const usePodcastStore = defineStore(
  'podcast',
  () => {
    const subscribedRadios = shallowRef<DjRadio[]>([]);
    const categories = shallowRef<DjCategory[]>([]);
    const currentRadio = shallowRef<DjRadio | null>(null);
    const currentPrograms = shallowRef<DjProgram[]>([]);
    const recommendRadios = shallowRef<DjRadio[]>([]);
    const todayPerfered = shallowRef<DjProgram[]>([]);
    const recentPrograms = shallowRef<DjProgram[]>([]);
    const isLoading = ref(false);

    const subscribedCount = computed(() => subscribedRadios.value.length);

    const isRadioSubscribed = computed(() => {
      return (rid: number) => subscribedRadios.value.some((r) => r.id === rid);
    });

    const fetchSubscribedRadios = async () => {
      try {
        isLoading.value = true;
        const res = await podcastApi.getDjSublist();
        subscribedRadios.value = res.data?.djRadios || [];
      } catch (error) {
        console.error('获取订阅列表失败:', error);
        message.error('获取订阅列表失败');
      } finally {
        isLoading.value = false;
      }
    };

    const toggleSubscribe = async (radio: DjRadio) => {
      const isSubed = isRadioSubscribed.value(radio.id);
      try {
        await podcastApi.subscribeDj(radio.id, isSubed ? 0 : 1);

        if (isSubed) {
          message.success('已取消订阅');
        } else {
          message.success('订阅成功');
        }

        await fetchSubscribedRadios();

        if (currentRadio.value?.id === radio.id) {
          currentRadio.value = { ...currentRadio.value, subed: !isSubed };
        }
      } catch (error) {
        console.error('订阅操作失败:', error);
        message.error(isSubed ? '取消订阅失败' : '订阅失败');
      }
    };

    const fetchRadioDetail = async (rid: number) => {
      try {
        isLoading.value = true;
        const res = await podcastApi.getDjDetail(rid);
        currentRadio.value = res.data?.data;
        if (currentRadio.value) {
          currentRadio.value.subed = isRadioSubscribed.value(rid);
        }
      } catch (error) {
        console.error('获取电台详情失败:', error);
        message.error('获取电台详情失败');
      } finally {
        isLoading.value = false;
      }
    };

    const fetchRadioPrograms = async (rid: number, offset = 0) => {
      try {
        isLoading.value = true;
        const res = await podcastApi.getDjProgram(rid, 30, offset);
        if (offset === 0) {
          currentPrograms.value = res.data?.programs || [];
        } else {
          currentPrograms.value.push(...(res.data?.programs || []));
        }
      } catch (error) {
        console.error('获取节目列表失败:', error);
        message.error('获取节目列表失败');
      } finally {
        isLoading.value = false;
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await podcastApi.getDjCategoryList();
        categories.value = res.data?.categories || [];
      } catch (error) {
        console.error('获取分类列表失败:', error);
      }
    };

    const fetchRecommendRadios = async () => {
      try {
        const res = await podcastApi.getDjRecommend();
        recommendRadios.value = res.data?.djRadios || [];
      } catch (error) {
        console.error('获取推荐电台失败:', error);
      }
    };

    const fetchTodayPerfered = async () => {
      try {
        const res = await podcastApi.getDjTodayPerfered();
        todayPerfered.value = res.data?.data || [];
      } catch (error) {
        console.error('获取今日优选失败:', error);
      }
    };

    const fetchRecentPrograms = async () => {
      try {
        const res = await podcastApi.getRecentDj();
        recentPrograms.value = res.data?.data?.list || [];
      } catch (error) {
        console.error('获取最近播放失败:', error);
      }
    };

    const clearCurrentRadio = () => {
      currentRadio.value = null;
      currentPrograms.value = [];
    };

    return {
      subscribedRadios,
      categories,
      currentRadio,
      currentPrograms,
      recommendRadios,
      todayPerfered,
      recentPrograms,
      isLoading,
      subscribedCount,
      isRadioSubscribed,
      fetchSubscribedRadios,
      toggleSubscribe,
      fetchRadioDetail,
      fetchRadioPrograms,
      fetchCategories,
      fetchRecommendRadios,
      fetchTodayPerfered,
      fetchRecentPrograms,
      clearCurrentRadio
    };
  },
  {
    persist: {
      key: 'podcast-store',
      storage: localStorage,
      pick: ['subscribedRadios', 'categories']
    }
  }
);

<template>
  <div class="donation-section">
    <!-- 头部引导区 -->
    <div class="my-8 text-center">
      <p class="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
        {{ t('donation.description') }}
      </p>
      <div class="mt-4 flex justify-center">
        <n-button type="primary" secondary round @click="toDonateList">
          <template #icon>
            <i class="ri-heart-3-line"></i>
          </template>
          {{ t('donation.toDonateList') }}
        </n-button>
      </div>
    </div>

    <!-- 支付方式卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 max-w-3xl mx-auto">
      <!-- 支付宝 -->
      <div
        class="pay-card group relative overflow-hidden rounded-2xl bg-[#00A0E9]/5 border border-[#00A0E9]/20 p-6 flex flex-col items-center transition-all hover:bg-[#00A0E9]/10 hover:shadow-lg hover:shadow-[#00A0E9]/10"
      >
        <div
          class="absolute -right-4 -top-4 w-24 h-24 bg-[#00A0E9]/10 rounded-full blur-2xl group-hover:bg-[#00A0E9]/20 transition-colors"
        ></div>
        <img
          :src="alipay"
          alt="Alipay"
          class="w-52 h-52 rounded-xl shadow-sm mb-4 group-hover:scale-105 transition-transform duration-300"
        />
        <div class="flex items-center gap-2 text-[#00A0E9] font-bold text-lg">
          <i class="ri-alipay-fill text-2xl"></i>
          {{ t('common.alipay') }}
        </div>
      </div>

      <!-- 微信支付 -->
      <div
        class="pay-card group relative overflow-hidden rounded-2xl bg-[#09BB07]/5 border border-[#09BB07]/20 p-6 flex flex-col items-center transition-all hover:bg-[#09BB07]/10 hover:shadow-lg hover:shadow-[#09BB07]/10"
      >
        <div
          class="absolute -right-4 -top-4 w-24 h-24 bg-[#09BB07]/10 rounded-full blur-2xl group-hover:bg-[#09BB07]/20 transition-colors"
        ></div>
        <img
          :src="wechat"
          alt="WeChat"
          class="w-52 h-52 rounded-xl shadow-sm mb-4 group-hover:scale-105 transition-transform duration-300"
        />
        <div class="flex items-center gap-2 text-[#09BB07] font-bold text-lg">
          <i class="ri-wechat-pay-fill text-2xl"></i>
          {{ t('common.wechat') }}
        </div>
      </div>
    </div>

    <!-- 捐赠者列表 -->
    <div class="donors-list">
      <div class="flex items-center justify-between mb-4 px-1">
        <h4 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <i class="ri-user-heart-line text-primary"></i>
          {{ t('donation.title') }}
        </h4>
        <n-button quaternary size="small" :loading="isLoading" @click="fetchDonors">
          <template #icon><i class="ri-refresh-line"></i></template>
          {{ t('donation.refresh') }}
        </n-button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="(donor, index) in donors"
          :key="donor.id"
          class="donor-card group animate-fade-in-up"
          :style="{ animationDelay: `${index * 10}ms` }"
        >
          <div
            class="h-full bg-white dark:bg-neutral-800/50 border border-gray-100 dark:border-gray-800 rounded-xl p-3 flex gap-3 hover:border-primary/30 hover:shadow-md hover:bg-white dark:hover:bg-neutral-800 transition-all duration-300"
          >
            <!-- 头像 -->
            <div class="relative flex-shrink-0">
              <n-avatar
                :src="donor.avatar"
                :fallback-src="defaultAvatar"
                round
                :size="40"
                class="border border-gray-100 dark:border-gray-700"
              />
              <div
                v-if="index < 3"
                class="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white border border-white dark:border-gray-800"
                :class="[
                  index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                ]"
              >
                <i class="ri-trophy-fill"></i>
              </div>
            </div>

            <!-- 信息 -->
            <div class="flex-1 min-w-0 flex flex-col justify-center">
              <div class="flex justify-between items-center">
                <span class="font-bold text-gray-900 dark:text-gray-100 truncate text-sm">
                  {{ donor.name }}
                </span>
                <span class="text-xs font-mono text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">
                  ¥{{ donor.amount }}
                </span>
              </div>

              <!-- 留言或日期 -->
              <div class="mt-1">
                <n-popover v-if="donor.message" trigger="hover" placement="top">
                  <template #trigger>
                    <div
                      class="text-xs text-gray-500 dark:text-gray-400 truncate cursor-help border-b border-dashed border-gray-300 dark:border-gray-600 inline-block max-w-full"
                    >
                      "{{ donor.message }}"
                    </div>
                  </template>
                  <div class="max-w-[200px] text-xs">{{ donor.message }}</div>
                </n-popover>
                <div v-else class="text-xs text-gray-400 dark:text-gray-600">
                  {{ donor.date }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Donor } from '@/api/donation';
import { getDonationList } from '@/api/donation';
import alipay from '@/assets/alipay.png';
import wechat from '@/assets/wechat.png';

const { t } = useI18n();

const defaultAvatar = 'https://avatars.githubusercontent.com/u/0?v=4';
const donors = ref<Donor[]>([]);
const isLoading = ref(false);

const fetchDonors = async () => {
  isLoading.value = true;
  try {
    const data = await getDonationList();
    // Sort by amount desc
    donors.value = data
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .map((donor) => ({
        ...donor,
        avatar: `https://api.dicebear.com/7.x/micah/svg?seed=${donor.name}`
      }));
  } catch (error) {
    console.error('Failed to fetch donors:', error);
  } finally {
    isLoading.value = false;
  }
};

const toDonateList = () => {
  window.open('http://donate.alger.fun/download', '_blank');
};

onMounted(() => fetchDonors());
onActivated(() => fetchDonors());
</script>

<style lang="scss" scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

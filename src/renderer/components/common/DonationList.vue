<template>
  <div class="donation-container">
    <div class="refresh-container">
      <n-button secondary round size="small" :loading="isLoading" @click="fetchDonors">
        <template #icon>
          <i class="ri-refresh-line"></i>
        </template>
        刷新列表
      </n-button>
    </div>
    <div class="donation-grid" :class="{ 'grid-expanded': isExpanded }">
      <div
        v-for="(donor, index) in displayDonors"
        :key="donor.id"
        class="donation-card animate__animated"
        :class="getAnimationClass(index)"
        :style="{ animationDelay: `${index * 0.1}s` }"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      >
        <div class="card-content">
          <div class="donor-avatar">
            <n-avatar
              :src="donor.avatar"
              :fallback-src="defaultAvatar"
              round
              size="large"
              class="animate__animated animate__pulse animate__infinite avatar-img"
            />
            <div class="donor-badge" :class="getBadgeClass(donor.badge)">
              {{ donor.badge }}
            </div>
          </div>
          <div class="donor-info">
            <div class="donor-name">{{ donor.name }}</div>
            <div class="donation-meta">
              <n-tag
                :type="getAmountTagType(donor.amount)"
                size="small"
                class="donation-amount animate__animated"
                round
                bordered
              >
                ￥{{ donor.amount }}
              </n-tag>
              <span class="donation-date">{{ donor.date }}</span>
            </div>
          </div>
        </div>
        <div v-if="donor.message" class="donation-message">
          <n-popover trigger="hover" placement="bottom">
            <template #trigger>
              <div class="message-content">
                <i class="ri-double-quotes-l quote-icon"></i>
                <div class="message-text">{{ donor.message }}</div>
                <i class="ri-double-quotes-r quote-icon"></i>
              </div>
            </template>
            <div class="message-popup">
              <i class="ri-double-quotes-l quote-icon"></i>
              {{ donor.message }}
              <i class="ri-double-quotes-r quote-icon"></i>
            </div>
          </n-popover>
        </div>
        <div class="card-sparkles"></div>
      </div>
    </div>

    <div v-if="sortedDonors.length > 8" class="expand-button">
      <n-button text @click="toggleExpand">
        <template #icon>
          <i :class="isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'"></i>
        </template>
        {{ isExpanded ? '收起' : '展开更多' }}
      </n-button>
    </div>

    <div class="p-6 rounded-lg shadow-lg bg-light dark:bg-gray-800">
      <div class="flex justify-between">
        <div class="flex flex-col items-center gap-2">
          <n-image
            :src="alipay"
            alt="支付宝收款码"
            class="w-60 h-60 rounded-lg cursor-none"
            preview-disabled
          />
          <span class="text-sm text-gray-700 dark:text-gray-200">支付宝</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <n-image
            :src="wechat"
            alt="微信收款码"
            class="w-60 h-60 rounded-lg cursor-none"
            preview-disabled
          />
          <span class="text-sm text-gray-700 dark:text-gray-200">微信支付</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import 'animate.css';

import axios from 'axios';
import { computed, onActivated, onMounted, ref } from 'vue';

import alipay from '@/assets/alipay.png';
import wechat from '@/assets/wechat.png';

// 默认头像
const defaultAvatar = 'https://avatars.githubusercontent.com/u/0?v=4';

// 捐赠者数据
interface Donor {
  id: number;
  name: string;
  amount: number;
  date: string;
  message?: string;
  avatar?: string;
  badge: string;
  badgeColor: string;
}

const donors = ref<Donor[]>([]);

const isLoading = ref(false);

const fetchDonors = async () => {
  isLoading.value = true;
  try {
    const response = await axios.get(
      'https://www.ghproxy.cn/https://raw.githubusercontent.com/algerkong/data/main/donors.json'
    );
    donors.value = response.data.map((donor: Donor, index: number) => ({
      ...donor,
      avatar: `https://api.dicebear.com/7.x/micah/svg?seed=${index}`
    }));
  } catch (error) {
    console.error('Failed to fetch donors:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchDonors();
});

onActivated(() => {
  fetchDonors();
});

// 动画类名列表
const animationClasses = [
  'animate__fadeInUp',
  'animate__fadeInLeft',
  'animate__fadeInRight',
  'animate__zoomIn'
];

// 获取随机动画类名
const getAnimationClass = (index: number) => {
  return animationClasses[index % animationClasses.length];
};

// 根据金额获取标签类型
const getAmountTagType = (amount: number): 'success' | 'warning' | 'error' | 'info' => {
  if (amount >= 5) return 'warning';
  if (amount >= 2) return 'success';
  return 'info';
};

// 获取徽章样式类名
const getBadgeClass = (badge: string): string => {
  if (badge.includes('金牌')) return 'badge-gold';
  if (badge.includes('银牌')) return 'badge-silver';
  return 'badge-bronze';
};

// 鼠标悬停效果
const handleMouseEnter = (event: MouseEvent) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = 'translateY(-2px)';
  card.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)';

  // 添加金额标签动画
  const amountTag = card.querySelector('.donation-amount');
  if (amountTag) {
    amountTag.classList.add('animate__tada');
  }
};

const handleMouseLeave = (event: MouseEvent) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = 'translateY(0)';
  card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.08)';

  // 移除金额标签动画
  const amountTag = card.querySelector('.donation-amount');
  if (amountTag) {
    amountTag.classList.remove('animate__tada');
  }
};

// 按金额和留言排序的捐赠列表
const sortedDonors = computed(() => {
  return [...donors.value].sort((a, b) => {
    // 如果一个有留言一个没有，有留言的排在前面
    if (a.message && !b.message) return -1;
    if (!a.message && b.message) return 1;

    // 都有留言或都没有留言时，按金额从大到小排序
    const amountDiff = b.amount - a.amount;
    if (amountDiff !== 0) return amountDiff;

    // 金额相同时，按日期从新到旧排序
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
});

const isExpanded = ref(false);

const displayDonors = computed(() => {
  if (isExpanded.value) {
    return sortedDonors.value;
  }
  return sortedDonors.value.slice(0, 8);
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};
</script>

<style lang="scss" scoped>
.donation-container {
  @apply w-full overflow-hidden;
}

.donation-grid {
  @apply grid gap-3 px-2 py-3 transition-all duration-300 overflow-hidden;
  grid-template-columns: repeat(2, 1fr);
  max-height: 280px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }

  &.grid-expanded {
    @apply max-h-none;
  }
}

.donation-card {
  @apply relative rounded-lg p-3 min-w-0 w-full transition-all duration-500 shadow-md backdrop-blur-md;
  @apply bg-gradient-to-br from-white/[0.03] to-white/[0.08] border border-white/[0.08];
  @apply hover:shadow-lg;

  .card-content {
    @apply relative z-10 flex items-start gap-3;
  }

  .donor-avatar {
    @apply relative flex-shrink-0 w-10 h-9 transition-transform duration-300;

    .avatar-img {
      @apply border border-white/20 dark:border-gray-800/50 shadow-sm;
      @apply w-10 h-9;
    }
  }

  .donor-badge {
    @apply absolute -bottom-2 -right-1 px-1.5 py-0.5 text-xs font-medium text-white/90 rounded-full whitespace-nowrap;
    @apply bg-gradient-to-r from-pink-400 to-pink-500 shadow-sm opacity-90 scale-90;
    @apply transition-all duration-300;
  }

  .donor-info {
    @apply flex-1 min-w-0;

    .donor-name {
      @apply text-sm font-medium mb-0.5 truncate;
    }

    .donation-meta {
      @apply flex items-center gap-2 mb-1;

      .donation-date {
        @apply text-xs text-gray-400/80 dark:text-gray-500/80;
      }
    }
  }

  .donation-message {
    @apply text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-3 w-full;

    .message-content {
      @apply relative p-2 rounded-lg transition-all duration-300 cursor-pointer;
      @apply bg-white/[0.02] hover:bg-[var(--n-color)];

      .message-text {
        @apply px-6 italic line-clamp-2;
      }

      .quote-icon {
        @apply absolute text-gray-400/60 dark:text-gray-500/60 text-sm;

        &:first-child {
          @apply left-0.5 top-2;
        }

        &:last-child {
          @apply right-0.5 bottom-2;
        }
      }
    }
  }

  &:hover {
    .donor-avatar {
      @apply scale-105 rotate-3;
    }

    .donor-badge {
      @apply scale-95 -translate-y-0.5;
    }

    .card-sparkles {
      @apply opacity-60 scale-110;
    }
  }
}

.card-sparkles {
  @apply absolute inset-0 pointer-events-none opacity-0 transition-all duration-500;
  background-image: radial-gradient(2px 2px at 20px 30px, rgba(255, 255, 255, 0.95), transparent),
    radial-gradient(2px 2px at 40px 70px, rgba(255, 255, 255, 0.95), transparent),
    radial-gradient(2.5px 2.5px at 50px 160px, rgba(255, 255, 255, 0.95), transparent),
    radial-gradient(2px 2px at 90px 40px, rgba(255, 255, 255, 0.95), transparent),
    radial-gradient(2.5px 2.5px at 130px 80px, rgba(255, 255, 255, 0.95), transparent);
  background-size: 200% 200%;
  animation: sparkle 8s ease infinite;
}

@keyframes sparkle {
  0%,
  100% {
    @apply bg-[0%_0%] opacity-40 scale-100;
  }
  50% {
    @apply bg-[100%_100%] opacity-80 scale-110;
  }
}

.refresh-container {
  @apply flex justify-end px-2 py-2;
}

.expand-button {
  @apply flex justify-center items-center py-2;

  :deep(.n-button) {
    @apply transition-all duration-300 hover:-translate-y-0.5;
  }
}

.message-popup {
  @apply relative px-4 py-2 text-sm;
  max-width: 300px;
  line-height: 1.6;
  font-style: italic;

  .quote-icon {
    @apply text-gray-400/60 dark:text-gray-500/60;
    font-size: 0.9rem;
  }
}
</style>

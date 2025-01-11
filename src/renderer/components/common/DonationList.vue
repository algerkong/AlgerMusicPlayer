<template>
  <div class="donation-container">
    <div class="donation-grid">
      <div
        v-for="(donor, index) in sortedDonors"
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
            <div v-if="donor.message" class="donation-message">
              <i class="ri-double-quotes-l quote-icon"></i>
              {{ donor.message }}
              <i class="ri-double-quotes-r quote-icon"></i>
            </div>
          </div>
        </div>
        <div class="card-sparkles"></div>
      </div>
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
import { computed, ref } from 'vue';

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

const donors = ref<Donor[]>([
  {
    id: 6,
    name: '*桤',
    amount: 5,
    date: '2025-01-01',
    badge: '开源赞助',
    badgeColor: '#FF69B4'
  },
  {
    id: 5,
    name: '*木',
    amount: 1,
    date: '2024-12-26',
    badge: '开源赞助',
    badgeColor: '#FF69B4'
  },
  {
    id: 4,
    name: '**兴',
    amount: 5,
    date: '2024-12-25',
    badge: '开源赞助',
    badgeColor: '#FF69B4'
  },
  {
    id: 3,
    name: 's*r',
    amount: 1.68,
    date: '2024-12-25',
    badge: '开源赞助',
    badgeColor: '#FF69B4'
  },
  {
    id: 2,
    name: 'G*Y',
    amount: 1.99,
    date: '2024-12-18',
    badge: '开源赞助',
    badgeColor: '#FF69B4'
  },
  {
    id: 1,
    name: '*辉',
    amount: 1,
    date: '2024-12-15',
    badge: '开源赞助',
    badgeColor: '#FF69B4'
  }
]);

onMounted(async () => {
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
  }
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
  card.style.transform = 'translateY(-5px) scale(1.02)';
  card.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.12)';

  // 添加金额标签动画
  const amountTag = card.querySelector('.donation-amount');
  if (amountTag) {
    amountTag.classList.add('animate__tada');
  }
};

const handleMouseLeave = (event: MouseEvent) => {
  const card = event.currentTarget as HTMLElement;
  card.style.transform = 'translateY(0) scale(1)';
  card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

  // 移除金额标签动画
  const amountTag = card.querySelector('.donation-amount');
  if (amountTag) {
    amountTag.classList.remove('animate__tada');
  }
};

// 按金额排序的捐赠列表
const sortedDonors = computed(() => {
  return [...donors.value].sort((a, b) => {
    // 首先按金额从大到小排序
    const amountDiff = b.amount - a.amount;
    if (amountDiff !== 0) return amountDiff;

    // 金额相同时，按日期从新到旧排序
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
});
</script>

<style lang="scss" scoped>
.donation-container {
  @apply w-full overflow-hidden;
}

.donation-grid {
  @apply grid gap-3 px-2 py-3;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.donation-card {
  @apply relative overflow-hidden rounded-lg p-3;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.08));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation-duration: 0.8s;

  &:hover {
    .card-sparkles {
      opacity: 0.4;
    }

    .donor-avatar {
      transform: scale(1.05);
    }
  }
}

.card-content {
  @apply relative z-10 flex items-start gap-3;
}

.donor-avatar {
  @apply relative flex-shrink-0;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  .avatar-img {
    @apply border border-white/20 dark:border-gray-800/50;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    width: 40px !important;
    height: 36px !important;
  }
}

.donor-badge {
  @apply absolute -bottom-0.5 -right-0.5 px-1 py-0.5 text-xs font-medium text-white/90 rounded-full;
  font-size: 0.5rem;
  transform: scale(0.8);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  line-height: 1;
  background: linear-gradient(45deg, #ff69b4, #ff1493);
  opacity: 0.85;
}

.donor-info {
  @apply flex-1 min-w-0;
}

.donor-name {
  @apply text-sm font-medium mb-0.5 truncate;
  color: var(--color-text);
}

.donation-meta {
  @apply flex items-center gap-2 mb-1;
}

.donation-amount {
  @apply text-xs font-medium;
}

.donation-date {
  @apply text-xs text-gray-400/80 dark:text-gray-500/80;
}

.donation-message {
  @apply text-sm text-gray-600 dark:text-gray-300 leading-relaxed;
  @apply relative pl-4 pr-4;
  font-style: italic;

  .quote-icon {
    @apply text-gray-400 dark:text-gray-500 absolute;
    font-size: 0.8rem;

    &:first-child {
      left: 0;
      top: 0;
    }

    &:last-child {
      right: 0;
      bottom: 0;
    }
  }
}

.card-sparkles {
  @apply absolute inset-0 pointer-events-none opacity-0;
  background-image: radial-gradient(
      1.5px 1.5px at 20px 30px,
      rgba(255, 255, 255, 0.95),
      rgba(0, 0, 0, 0)
    ),
    radial-gradient(1.5px 1.5px at 40px 70px, rgba(255, 255, 255, 0.95), rgba(0, 0, 0, 0)),
    radial-gradient(2px 2px at 50px 160px, rgba(255, 255, 255, 0.95), rgba(0, 0, 0, 0)),
    radial-gradient(1.5px 1.5px at 90px 40px, rgba(255, 255, 255, 0.95), rgba(0, 0, 0, 0)),
    radial-gradient(2px 2px at 130px 80px, rgba(255, 255, 255, 0.95), rgba(0, 0, 0, 0));
  background-size: 200% 200%;
  animation: sparkle 5s ease infinite;
  transition: opacity 0.5s ease;
}

@keyframes sparkle {
  0%,
  100% {
    background-position: 0% 0%;
    opacity: 0.4;
  }
  50% {
    background-position: 100% 100%;
    opacity: 0.8;
  }
}
</style>

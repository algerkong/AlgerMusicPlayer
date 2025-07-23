<template>
  <div class="donation-container">
    <div class="qrcode-container">
      <div class="description">
        <p>{{ t('donation.description') }}</p>
        <p>{{ t('donation.message') }}</p>
        <n-button type="primary" @click="toDonateList">
          <template #icon>
            <i class="ri-cup-line"></i>
          </template>
          {{ t('donation.toDonateList') }}
        </n-button>
      </div>
      <div class="qrcode-grid">
        <div class="qrcode-item">
          <n-image :src="alipay" :alt="t('common.alipay')" class="qrcode-image" preview-disabled />
          <span class="qrcode-label">{{ t('common.alipay') }}</span>
        </div>

        <div class="qrcode-item">
          <n-image :src="wechat" :alt="t('common.wechat')" class="qrcode-image" preview-disabled />
          <span class="qrcode-label">{{ t('common.wechat') }}</span>
        </div>
      </div>
    </div>

    <div class="header-container">
      <h3 class="section-title">{{ t('donation.title') }}</h3>
      <n-button secondary round size="small" :loading="isLoading" @click="fetchDonors">
        <template #icon>
          <i class="ri-refresh-line"></i>
        </template>
        {{ t('donation.refresh') }}
      </n-button>
    </div>

    <div class="donation-grid" :class="{ 'grid-expanded': isExpanded }">
      <div
        v-for="donor in displayDonors"
        :key="donor.id"
        class="donation-card"
        :class="{ 'no-message': !donor.message }"
      >
        <div class="card-content">
          <div class="donor-avatar">
            <n-avatar :src="donor.avatar" :fallback-src="defaultAvatar" round class="avatar-img" />
          </div>
          <div class="donor-info">
            <div class="donor-meta">
              <div class="donor-name">{{ donor.name }}</div>
              <!-- <div class="price-tag">￥{{ donor.amount }}</div> -->
            </div>
            <div class="donation-date">{{ donor.date }}</div>
          </div>
        </div>

        <!-- 有留言的情况 -->
        <n-popover
          v-if="donor.message"
          trigger="hover"
          placement="bottom"
          :show-arrow="true"
          :width="240"
        >
          <template #trigger>
            <div class="donation-message">
              <i class="ri-double-quotes-l quote-icon"></i>
              <span class="message-text">{{ donor.message }}</span>
              <i class="ri-double-quotes-r quote-icon"></i>
            </div>
          </template>
          <div class="message-popover">
            <i class="ri-double-quotes-l quote-icon"></i>
            <span>{{ donor.message }}</span>
            <i class="ri-double-quotes-r quote-icon"></i>
          </div>
        </n-popover>

        <!-- 没有留言的情况显示占位符 -->
        <div v-else class="donation-message-placeholder">
          <i class="ri-emotion-line"></i>
          <span>{{ t('donation.noMessage') }}</span>
        </div>
      </div>
    </div>

    <div v-if="donors.length > 8" class="expand-button">
      <n-button text @click="toggleExpand">
        <template #icon>
          <i :class="isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'"></i>
        </template>
        {{ isExpanded ? t('common.collapse') : t('common.expand') }}
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Donor } from '@/api/donation';
import { getDonationList } from '@/api/donation';
import alipay from '@/assets/alipay.png';
import wechat from '@/assets/wechat.png';

const { t } = useI18n();

// 默认头像
const defaultAvatar = 'https://avatars.githubusercontent.com/u/0?v=4';

const donors = ref<Donor[]>([]);
const isLoading = ref(false);

const fetchDonors = async () => {
  isLoading.value = true;
  try {
    const data = await getDonationList();
    donors.value = data.map((donor, index) => ({
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

const isExpanded = ref(false);

const displayDonors = computed(() => {
  if (isExpanded.value) {
    return donors.value;
  }
  return donors.value.slice(0, 8);
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

const toDonateList = () => {
  window.open('http://donate.alger.fun/download', '_blank');
};
</script>

<style lang="scss" scoped>
.donation-container {
  @apply w-full overflow-hidden flex flex-col gap-4;
}

.header-container {
  @apply flex justify-between items-center px-4 py-2;

  .section-title {
    @apply text-lg font-medium text-gray-700 dark:text-gray-200;
  }
}

.donation-grid {
  @apply grid gap-3 transition-all duration-300 overflow-hidden;
  grid-template-columns: repeat(2, 1fr);
  max-height: 320px;

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
  @apply rounded-lg p-2.5 transition-all duration-200 hover:shadow-md;
  @apply bg-light-100 dark:bg-gray-800/5 backdrop-blur-sm;
  @apply border border-gray-200 dark:border-gray-700/10;
  @apply flex flex-col;
  min-height: 100px;

  .card-content {
    @apply flex items-start gap-2 mb-2;
  }
}

.donor-avatar {
  @apply relative flex-shrink-0;

  .avatar-img {
    @apply border border-gray-200 dark:border-gray-700/10 shadow-sm;
    @apply w-9 h-9;
  }
}

.donor-info {
  @apply flex-1 min-w-0 flex flex-col justify-center;

  .donor-meta {
    @apply flex justify-between items-center mb-0.5;

    .donor-name {
      @apply text-sm font-medium truncate flex-1 mr-1;
    }

    .price-tag {
      @apply text-xs text-gray-400/80 dark:text-gray-500/80 whitespace-nowrap;
    }
  }

  .donation-date {
    @apply text-xs text-gray-400/60 dark:text-gray-500/60;
  }
}

.donation-message {
  @apply text-xs text-gray-500 dark:text-gray-400 italic mt-1 px-2 py-1.5;
  @apply bg-gray-100/10 dark:bg-dark-300 rounded;
  @apply flex items-start;
  @apply cursor-pointer transition-all duration-200;

  .quote-icon {
    @apply text-gray-300 dark:text-gray-600 flex-shrink-0 opacity-60;

    &:first-child {
      @apply mr-1 self-start;
    }

    &:last-child {
      @apply ml-1 self-end;
    }
  }

  .message-text {
    @apply flex-1 line-clamp-2;
  }

  &:hover {
    @apply bg-gray-100/40 dark:bg-dark-200;
  }
}

.donation-message-placeholder {
  @apply text-xs text-gray-400 dark:text-gray-500 mt-1 px-2 py-1.5;
  @apply bg-gray-100/5 dark:bg-dark-300 rounded;
  @apply flex items-center justify-center gap-1 italic;
  @apply border border-transparent;

  i {
    @apply text-gray-300 dark:text-gray-600;
  }
}

.message-popover {
  @apply text-sm text-gray-700 dark:text-gray-200 italic p-2;
  @apply flex items-start;

  .quote-icon {
    @apply text-gray-400 dark:text-gray-500 flex-shrink-0;

    &:first-child {
      @apply mr-1.5 self-start;
    }

    &:last-child {
      @apply ml-1.5 self-end;
    }
  }
}

.expand-button {
  @apply flex justify-center items-center py-2;

  :deep(.n-button) {
    @apply transition-all duration-200 hover:-translate-y-0.5;
  }
}

.qrcode-container {
  @apply p-5 rounded-lg shadow-sm bg-light-100 dark:bg-gray-800/5 backdrop-blur-sm border border-gray-200 dark:border-gray-700/10;

  .description {
    @apply text-center text-sm text-gray-600 dark:text-gray-300 mb-4;

    p {
      @apply mb-2;
    }
  }

  .qrcode-grid {
    @apply flex justify-between items-center gap-4 flex-wrap;

    .qrcode-item {
      @apply flex flex-col items-center gap-2;

      .qrcode-image {
        @apply w-36 h-36 rounded-lg border border-gray-200 dark:border-gray-700/10 shadow-sm transition-transform duration-200 hover:scale-105;
      }

      .qrcode-label {
        @apply text-sm text-gray-600 dark:text-gray-300;
      }
    }

    .donate-button {
      @apply flex flex-col items-center justify-center;
    }
  }
}
</style>

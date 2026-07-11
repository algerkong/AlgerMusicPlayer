<template>
  <div class="mobile-header" :class="{ 'safe-area-top': hasSafeArea }">
    <!-- 左侧区域 -->
    <div class="header-left">
      <div v-if="showBack" class="header-btn" @click="goBack">
        <i class="ri-arrow-left-s-line"></i>
      </div>
      <div v-else class="header-logo">
        <span class="logo-text">LYMusic</span>
      </div>
    </div>

    <!-- 中间标题 -->
    <div class="header-title">
      <span v-if="title">{{ t(title) }}</span>
    </div>

    <!-- 右侧区域 -->
    <div class="header-right">
      <div class="header-btn" @click="openSearch">
        <i class="ri-search-line"></i>
      </div>
      <div class="header-btn" @click="openSettings">
        <i class="ri-settings-3-line"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

// 注入是否有安全区域
const hasSafeArea = inject('hasSafeArea', false);

// 是否显示返回按钮
const showBack = computed(() => {
  return route.meta.back === true;
});

// 页面标题
const title = computed(() => {
  return (route.meta.title as string) || '';
});

// 返回上一页
const goBack = () => {
  router.back();
};

// 打开搜索
const openSearch = () => {
  router.push('/mobile-search');
};

const openSettings = () => {
  router.push('/set');
};
</script>

<style lang="scss" scoped>
.mobile-header {
  @apply flex items-center justify-between px-4 py-3;
  @apply bg-light dark:bg-black;
  @apply border-b border-gray-100 dark:border-gray-800;
  min-height: 56px;

  &.safe-area-top {
    padding-top: calc(var(--safe-area-inset-top, 0px) + 16px);
  }
}

.header-left {
  @apply flex items-center;
  min-width: 80px;
}

.header-logo {
  @apply flex items-center;

  .logo-text {
    @apply text-lg font-bold text-green-500;
  }
}

.header-title {
  @apply flex-1 text-center;

  span {
    @apply text-base font-medium text-gray-900 dark:text-white;
  }
}

.header-right {
  @apply flex items-center gap-2;
  min-width: 80px;
  justify-content: flex-end;
}

.header-btn {
  @apply flex items-center justify-center;
  @apply w-10 h-10 rounded-full;
  @apply text-xl text-gray-600 dark:text-gray-300;
  @apply active:bg-gray-100 dark:active:bg-gray-800;
  @apply transition-colors duration-150;
}
</style>

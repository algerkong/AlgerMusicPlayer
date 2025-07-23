<template>
  <div>
    <!-- 定时关闭倒计时显示区域 -->
    <div v-if="hasActiveSleepTimer" class="sleep-timer-countdown" @click="handleShowTimer">
      <i class="iconfont ri-time-line mr-1"></i>
      <span>{{ formattedRemainingTime }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { usePlayerStore } from '@/store/modules/player';

const { t } = useI18n();
// 定时器状态
const playerStore = usePlayerStore();
const { sleepTimer } = storeToRefs(playerStore);
const hasActiveSleepTimer = computed(() => playerStore.hasSleepTimerActive);
const refreshTrigger = ref(0);

// 检查定时器是否已结束
const checkTimerExpired = () => {
  if (sleepTimer.value.type === 'time' && sleepTimer.value.endTime) {
    const now = Date.now();
    if (now >= sleepTimer.value.endTime) {
      playerStore.clearSleepTimer();
    }
  }
};

// 在组件挂载时检查定时器状态
onMounted(() => {
  checkTimerExpired();
});

// 倒计时显示
const formattedRemainingTime = computed(() => {
  // 依赖刷新触发器强制更新
  void refreshTrigger.value;

  if (sleepTimer.value.type !== 'time' || !sleepTimer.value.endTime) {
    if (sleepTimer.value.type === 'songs' && sleepTimer.value.remainingSongs) {
      return t('player.sleepTimer.songsRemaining', { count: sleepTimer.value.remainingSongs });
    }
    if (sleepTimer.value.type === 'end') {
      return t('player.sleepTimer.activeUntilEnd');
    }
    return '';
  }

  const remaining = Math.max(0, sleepTimer.value.endTime - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
});

// 监听剩余时间变化
let timerUpdateInterval: number | null = null;

watch(
  () => hasActiveSleepTimer.value,
  (newHasTimer) => {
    if (newHasTimer && sleepTimer.value.type === 'time') {
      startTimerUpdate();
    } else if (!newHasTimer) {
      stopTimerUpdate();
    }
  },
  { immediate: true }
);

// 启动定时器更新UI
function startTimerUpdate() {
  stopTimerUpdate(); // 先停止之前的计时器

  // 每秒更新UI
  timerUpdateInterval = window.setInterval(() => {
    // 更新刷新触发器，强制重新计算
    refreshTrigger.value = Date.now();
  }, 1000) as unknown as number;
}

// 停止定时器更新UI
function stopTimerUpdate() {
  if (timerUpdateInterval) {
    clearInterval(timerUpdateInterval);
    timerUpdateInterval = null;
  }
}

const handleShowTimer = () => {
  playerStore.showSleepTimer = !playerStore.showSleepTimer;
};

// 播放器卸载时清除定时器
onUnmounted(() => {
  stopTimerUpdate();
});
</script>

<style lang="scss" scoped>
.sleep-timer-countdown {
  @apply fixed top-[28px] left-1/2 transform -translate-x-1/2 -translate-y-full py-1 px-3 rounded-b-lg bg-green-500 text-white text-sm flex items-center hover:scale-110 transition-all cursor-pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  z-index: 9998;
  min-width: 80px;
  text-align: center;
  animation: fadeInDown 0.3s ease-out;
  -webkit-app-region: no-drag;

  @keyframes fadeInDown {
    from {
      transform: translate(-50%, -150%);
      opacity: 0;
    }
    to {
      transform: translate(-50%, -100%);
      opacity: 1;
    }
  }

  span {
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.5px;
    font-weight: 500;
  }
}
</style>

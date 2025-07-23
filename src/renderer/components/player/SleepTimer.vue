<template>
  <div class="sleep-timer-content">
    <h3 class="timer-title">{{ t('player.sleepTimer.title') }}</h3>

    <div v-if="hasTimerActive" class="sleep-timer-active">
      <div class="timer-status">
        <template v-if="timerType === 'time'">
          <div class="timer-value countdown-timer">{{ formattedRemainingTime }}</div>
        </template>
        <template v-else-if="timerType === 'songs'">
          <div class="timer-value">{{ remainingSongs }}</div>
          <div class="timer-label">
            {{ t('player.sleepTimer.songsRemaining', { count: remainingSongs }) }}
          </div>
        </template>
        <template v-else-if="timerType === 'end'">
          <div class="timer-value">{{ t('player.sleepTimer.activeUntilEnd') }}</div>
          <div class="timer-label">{{ t('player.sleepTimer.afterPlaylist') }}</div>
        </template>
      </div>

      <n-button type="error" class="cancel-timer-btn" @click="handleCancelTimer" round>
        {{ t('player.sleepTimer.cancel') }}
      </n-button>
    </div>

    <div v-else class="sleep-timer-options">
      <!-- 按时间定时 -->
      <div class="option-section">
        <h4 class="option-title">{{ t('player.sleepTimer.timeMode') }}</h4>
        <div class="time-options">
          <n-button
            v-for="minutes in [15, 30, 60, 90]"
            :key="minutes"
            size="small"
            class="time-option-btn"
            @click="handleSetTimeTimer(minutes)"
            round
          >
            {{ minutes }}{{ t('player.sleepTimer.minutes') }}
          </n-button>
          <div class="custom-time">
            <n-input-number
              v-model:value="customMinutes"
              :min="1"
              :max="300"
              size="small"
              class="custom-time-input"
              round
            />
            <n-button
              size="small"
              type="primary"
              class="custom-time-btn"
              :disabled="!customMinutes"
              @click="handleSetTimeTimer(customMinutes)"
              round
            >
              {{ t('player.sleepTimer.set') }}
            </n-button>
          </div>
        </div>
      </div>

      <!-- 按歌曲数定时 -->
      <div class="option-section">
        <h4 class="option-title">{{ t('player.sleepTimer.songsMode') }}</h4>
        <div class="songs-options">
          <n-button
            v-for="songs in [1, 3, 5, 10]"
            :key="songs"
            size="small"
            class="songs-option-btn"
            @click="handleSetSongsTimer(songs)"
            round
          >
            {{ songs }}{{ t('player.sleepTimer.songs') }}
          </n-button>
          <div class="custom-songs">
            <n-input-number
              v-model:value="customSongs"
              :min="1"
              :max="50"
              size="small"
              class="custom-songs-input"
              round
            />
            <n-button
              size="small"
              type="primary"
              class="custom-songs-btn"
              :disabled="!customSongs"
              @click="handleSetSongsTimer(customSongs)"
              round
            >
              {{ t('player.sleepTimer.set') }}
            </n-button>
          </div>
        </div>
      </div>

      <!-- 播放完列表后关闭 -->
      <div class="option-section playlist-end-section">
        <n-button block class="playlist-end-btn" @click="handleSetPlaylistEndTimer" round>
          {{ t('player.sleepTimer.playlistEnd') }}
        </n-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { usePlayerStore } from '@/store/modules/player';

const { t } = useI18n();
const playerStore = usePlayerStore();

// 从store获取所有相关状态
const { sleepTimer } = storeToRefs(playerStore);

// 本地状态，用于UI展示
const customMinutes = ref(30);
const customSongs = ref(5);
// 添加一个刷新触发变量，用于强制更新倒计时
const refreshTrigger = ref(0);

// 计算属性，判断定时器状态
const hasTimerActive = computed(() => {
  return playerStore.hasSleepTimerActive;
});

const timerType = computed(() => {
  return sleepTimer.value.type;
});

// 剩余歌曲数
const remainingSongs = computed(() => {
  return playerStore.sleepTimerRemainingSongs;
});

// 处理设置时间定时器
function handleSetTimeTimer(minutes: number) {
  playerStore.setSleepTimerByTime(minutes);
}

// 处理设置歌曲数定时器
function handleSetSongsTimer(songs: number) {
  playerStore.setSleepTimerBySongs(songs);
}

// 处理设置播放列表结束定时器
function handleSetPlaylistEndTimer() {
  playerStore.setSleepTimerAtPlaylistEnd();
}

// 处理取消定时器
function handleCancelTimer() {
  playerStore.clearSleepTimer();
}

// 格式化剩余时间为 HH:MM:SS
const formattedRemainingTime = computed(() => {
  // 依赖刷新触发器强制更新
  void refreshTrigger.value;

  if (timerType.value !== 'time' || !sleepTimer.value.endTime) {
    return '00:00:00';
  }

  const remaining = Math.max(0, sleepTimer.value.endTime - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
});

// 监听剩余时间变化
let timerInterval: number | null = null;

onMounted(() => {
  // 如果当前有定时器，开始更新UI
  if (hasTimerActive.value && timerType.value === 'time') {
    startTimerUpdate();
  }

  // 监听定时器状态变化
  watch(
    () => [hasTimerActive.value, timerType.value],
    ([newHasTimer, newType]) => {
      if (newHasTimer && newType === 'time') {
        startTimerUpdate();
      } else {
        stopTimerUpdate();
      }
    }
  );
});

// 启动定时器更新UI
function startTimerUpdate() {
  stopTimerUpdate(); // 先停止之前的计时器

  // 每秒更新UI
  timerInterval = window.setInterval(() => {
    // 更新刷新触发器，强制重新计算
    refreshTrigger.value = Date.now();
  }, 500) as unknown as number;
}

// 停止定时器更新UI
function stopTimerUpdate() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

onUnmounted(() => {
  stopTimerUpdate();
});
</script>

<style lang="scss" scoped>
.sleep-timer-content {
  @apply w-full p-4;

  .timer-title {
    @apply text-lg font-medium mb-4 text-center;
  }

  // 激活状态显示
  .sleep-timer-active {
    @apply flex flex-col items-center;

    // 定时状态卡片
    .timer-status {
      @apply flex flex-col items-center justify-center p-8 mb-5 w-full rounded-2xl dark:bg-gray-800 dark:bg-opacity-40 dark:shadow-gray-900/20;
      background-color: rgba(255, 255, 255, 0.5);
      box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.05),
        0 0 0 1px rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;

      // 定时值显示
      .timer-value {
        @apply text-4xl font-semibold mb-2 text-green-500;

        &.countdown-timer {
          font-variant-numeric: tabular-nums;
          letter-spacing: 2px;
        }
      }

      // 标签文本
      .timer-label {
        @apply text-base text-gray-600 dark:text-gray-300;
      }
    }

    // 取消按钮
    .cancel-timer-btn {
      @apply w-full py-3 text-base rounded-full transition-all duration-200;

      &:hover {
        @apply transform scale-105 shadow-md;
      }

      &:active {
        @apply transform scale-95;
      }
    }
  }

  // 定时器选项区域
  .sleep-timer-options {
    @apply flex flex-col;

    // 选项部分
    .option-section {
      @apply mb-7;

      // 选项标题
      .option-title {
        @apply text-base font-medium mb-4 text-gray-700 dark:text-gray-200;
        letter-spacing: 0.3px;
      }

      // 时间/歌曲选项容器
      .time-options,
      .songs-options {
        @apply flex flex-wrap gap-2;

        // 选项按钮共享样式
        .time-option-btn,
        .songs-option-btn {
          @apply px-4 py-2 rounded-full text-gray-800 dark:text-gray-200 transition-all duration-200;
          background-color: rgba(255, 255, 255, 0.5);
          @apply dark:bg-gray-800 dark:bg-opacity-40 hover:bg-white dark:hover:bg-gray-700;
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.05),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          @apply dark:shadow-gray-900/20;

          &:hover {
            @apply transform scale-105 shadow-md;
          }

          &:active {
            @apply transform scale-95;
          }
        }

        // 自定义输入区域
        .custom-time,
        .custom-songs {
          @apply flex items-center space-x-2 mt-4 w-full;

          // 输入框
          .custom-time-input,
          .custom-songs-input {
            @apply flex-1;
          }

          // 设置按钮
          .custom-time-btn,
          .custom-songs-btn {
            @apply py-2 px-4 rounded-full transition-all duration-200;
          }
        }
      }
    }

    // 播放列表结束选项
    .playlist-end-section {
      @apply mt-2;

      .playlist-end-btn {
        @apply py-3 text-base rounded-full transition-all duration-200;
      }
    }
  }
}
</style>

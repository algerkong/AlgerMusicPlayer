<template>
  <!-- 透明遮罩层，点击任意位置关闭 -->
  <div v-if="internalVisible" class="fixed-overlay" @click="closePanel"></div>

  <!-- 使用animate.css进行动画效果 -->
  <div
    v-if="internalVisible"
    class="playlist-panel"
    :class="[
      'animate__animated',
      closing
        ? isMobile
          ? 'animate__slideOutDown'
          : 'animate__slideOutRight'
        : isMobile
          ? 'animate__slideInUp'
          : 'animate__slideInRight'
    ]"
  >
    <div class="playlist-panel-header">
      <div class="title">{{ t('player.playBar.playList') }}</div>
      <div class="header-actions">
        <n-tooltip trigger="hover">
          <template #trigger>
            <div class="action-btn" @click="handleClearPlaylist">
              <i class="iconfont ri-delete-bin-line"></i>
            </div>
          </template>
          {{ t('player.playList.clearAll') }}
        </n-tooltip>
        <div class="close-btn" @click="closePanel">
          <i class="iconfont ri-close-line"></i>
        </div>
      </div>
    </div>
    <div class="playlist-panel-content">
      <div v-if="playList.length === 0" class="empty-playlist">
        <i class="iconfont ri-music-2-line"></i>
        <p>{{ t('player.playList.empty') }}</p>
      </div>
      <n-virtual-list v-else ref="playListRef" :item-size="62" item-resizable :items="playList">
        <template #default="{ item }">
          <div class="music-play-list-content">
            <div class="flex items-center justify-between">
              <song-item :key="item.id" class="flex-1" :item="item" mini></song-item>
              <div class="delete-btn" @click.stop="handleDeleteSong(item)">
                <i
                  class="iconfont ri-delete-bin-line text-gray-400 hover:text-red-500 transition-colors"
                ></i>
              </div>
            </div>
          </div>
        </template>
      </n-virtual-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDialog, useMessage } from 'naive-ui';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import SongItem from '@/components/common/SongItem.vue';
import { usePlayerStore } from '@/store/modules/player';
import type { SongResult } from '@/types/music';
import { isMobile } from '@/utils';

const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();
const playerStore = usePlayerStore();

// 内部状态控制组件的可见性
const internalVisible = ref(false);
const closing = ref(false);

// 当前是否显示播放列表面板
const show = computed({
  get: () => playerStore.playListDrawerVisible,
  set: (value) => {
    playerStore.setPlayListDrawerVisible(value);
  }
});

// 监听外部可见性变化
watch(
  show,
  (newValue) => {
    if (newValue) {
      // 打开面板
      internalVisible.value = true;
      closing.value = false;
      // 在下一个渲染周期后滚动到当前歌曲
      nextTick(() => {
        scrollToCurrentSong();
      });
    } else {
      // 如果已经是关闭状态，不需要处理
      if (!internalVisible.value) return;

      // 开始关闭动画
      closing.value = true;
      // 等待动画完成后再隐藏组件
      setTimeout(() => {
        internalVisible.value = false;
      }, 400); // 动画持续时间
    }
  },
  { immediate: true }
);

// 播放列表
const playList = computed(() => playerStore.playList as SongResult[]);

// 播放列表引用
const playListRef = ref<any>(null);

// 关闭面板
const closePanel = () => {
  show.value = false;
};

// 清空播放列表
const handleClearPlaylist = () => {
  if (playList.value.length === 0) {
    message.info(t('player.playList.alreadyEmpty'));
    return;
  }

  if (isMobile.value) {
    closePanel();
  }

  dialog.warning({
    title: t('player.playList.clearConfirmTitle'),
    content: t('player.playList.clearConfirmContent'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    style: { zIndex: 999999999 }, // 确保对话框显示在遮罩之上
    onPositiveClick: () => {
      // 清空播放列表
      playerStore.clearPlayAll();
      message.success(t('player.playList.cleared'));
    }
  });
};

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && internalVisible.value) {
    closePanel();
  }
};

// 添加和移除键盘事件监听
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

// 滚动到当前播放歌曲
const scrollToCurrentSong = () => {
  // 延长等待时间，确保列表已渲染完成
  setTimeout(() => {
    if (playListRef.value && playList.value.length > 0) {
      const index = playerStore.playListIndex;
      console.log('滚动到歌曲索引:', index);
      playListRef.value.scrollTo({
        top: (index > 3 ? index - 3 : 0) * 62
      });
    }
  }, 100);
};

// 删除歌曲
const handleDeleteSong = (song: SongResult) => {
  playerStore.removeFromPlayList(song.id as number);
};
</script>

<style lang="scss" scoped>
.fixed-overlay {
  @apply fixed inset-0 z-[999999];
  pointer-events: auto; // 允许点击关闭
  cursor: default;
}

.playlist-panel {
  @apply fixed right-0 z-[9999999] rounded-l-xl overflow-hidden;
  width: 350px;
  height: 70vh;
  top: 15vh; // 距离顶部15%
  animation-duration: 0.4s !important; // 动画持续时间

  @apply bg-light dark:bg-dark shadow-2xl dark:border dark:border-gray-700;

  &-header {
    @apply flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-900;
    backdrop-filter: blur(10px);
    background-color: rgba(255, 255, 255, 0.7);

    .dark & {
      background-color: rgba(18, 18, 18, 0.7);
    }

    .title {
      @apply text-base font-medium text-gray-800 dark:text-gray-200;
    }

    .header-actions {
      @apply flex items-center;
    }

    .action-btn,
    .close-btn {
      @apply w-8 h-8 flex items-center justify-center rounded-full cursor-pointer mx-1 text-gray-800 dark:text-gray-200;
      @apply hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors;

      .iconfont {
        @apply text-xl;
      }
    }

    .action-btn {
      @apply text-gray-500 dark:text-gray-400;
      &:hover {
        @apply text-red-500 dark:text-red-400;
      }
    }
  }

  &-content {
    @apply h-[calc(70vh-60px)] overflow-hidden;
  }
}

.empty-playlist {
  @apply flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500;

  .iconfont {
    @apply text-5xl mb-4;
  }

  p {
    @apply text-sm;
  }
}

.music-play-list-content {
  @apply pr-2 hover:bg-light-100 dark:hover:bg-dark-100;
  &:hover {
    .delete-btn {
      @apply visible;
    }
  }
  .delete-btn {
    @apply pr-2 cursor-pointer invisible;
    .iconfont {
      @apply text-lg;
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .playlist-panel {
    position: fixed;
    width: 100%;
    height: 80vh;
    top: auto;
    bottom: 0; // 移动端底部留出导航栏高度
    border-radius: 30px 30px 0 0;
    border-left: none;
    border-top: 1px solid theme('colors.gray.200');
    box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.1);

    &-header {
      @apply text-center relative px-4;

      &::before {
        content: '';
        position: absolute;
        top: -15px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 5px;
        border-radius: 5px;
        background-color: rgba(150, 150, 150, 0.3);
      }
    }

    &-content {
      height: calc(80vh - 60px);
      @apply px-4;
      .delete-btn {
        @apply visible;
      }
    }
  }
}
</style>

<template>
  <n-drawer
    v-model:show="showDrawer"
    :width="isMobile ? '100%' : '800px'"
    :height="isMobile ? '100%' : '100%'"
    :placement="isMobile ? 'bottom' : 'right'"
    @after-leave="handleDrawerClose"
    :z-index="999999999"
    :mask-closable="false"
  >
    <n-drawer-content
      title="欢迎使用 LYMusic"
      closable
      :native-scrollbar="false"
      class="mac-style-drawer"
    >
      <div class="drawer-container">
        <div class="warning-content">
          <div class="warning-message">
            <h3>获取完整体验</h3>
            <p class="platform-support">
              <span> <i class="ri-window-line mr-1"></i>Windows 10+ </span>
              <span> <i class="ri-apple-line mr-1"></i>macOS </span>
              <span> <i class="ri-ubuntu-line mr-1"></i>Linux </span>
              <span> <i class="ri-android-line mr-1"></i>Android </span>
            </p>
            <p class="description">
              下载桌面应用以获得最佳音乐体验，包含完整功能与更高音质。
              目前无iOS版本，请使用安卓应用或网页版。
            </p>
          </div>

          <div class="action-links">
            <a
              href="https://github.com/LuoYe17/AlgerMusicPlayer/releases"
              target="_blank"
              class="download-link"
            >
              <i class="ri-download-2-line mr-1"></i> 立即下载
            </a>
          </div>

          <div class="drawer-actions">
            <n-button secondary class="action-button" @click="dismissForever">不再提示</n-button>
            <n-button type="primary" class="action-button primary" @click="remindLater"
              >稍后提醒</n-button
            >
          </div>
        </div>
      </div>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { isMobile } from '@/utils';

const showDrawer = ref(false);

const handleDrawerClose = () => {
  // 抽屉关闭后的逻辑
};

const remindLater = () => {
  const now = new Date();
  localStorage.setItem('trafficDownloadRemindLater', now.toISOString());
  showDrawer.value = false;
};

const dismissForever = () => {
  localStorage.setItem('trafficDownloadNever', '1');
  showDrawer.value = false;
};

onMounted(() => {
  if (localStorage.getItem('trafficDownloadNever')) return;

  const remindLaterTime = localStorage.getItem('trafficDownloadRemindLater');
  if (remindLaterTime) {
    const lastRemind = new Date(remindLaterTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastRemind.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 24) return;
  }

  setTimeout(() => {
    showDrawer.value = true;
  }, 20000);
});
</script>

<style scoped lang="scss">
.mac-style-drawer {
  border-radius: 10px 0 0 10px;
  overflow: hidden;
  position: relative;
}

.drawer-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.warning-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.warning-message {
  text-align: center;
  max-width: 520px;

  h3 {
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 18px;
    color: #333;
  }

  .platform-support {
    display: flex;
    justify-content: center;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 16px;

    span {
      display: flex;
      align-items: center;
      font-size: 16px;
      color: #444;
    }
  }

  .description {
    font-size: 16px;
    line-height: 1.6;
    color: #444;
    margin: 0 auto;
  }
}

.action-links {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 6px 0;

  a {
    display: inline-flex;
    align-items: center;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 16px;
    text-decoration: none;
    transition: all 0.2s ease;

    &.download-link {
      color: #fff;
      background-color: #007aff;

      &:hover {
        background-color: #0062cc;
      }
    }
  }
}

.drawer-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 30px;
  width: 100%;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px;
  background-color: #fff;
  z-index: 999999999;

  .action-button {
    min-width: 110px;
    border-radius: 8px;
    font-size: 16px;
    padding: 8px 16px;

    &.primary {
      background-color: #007aff;
      color: white;

      &:hover {
        background-color: #0062cc;
      }
    }
  }
}

@media (max-width: 768px) {
  .warning-message {
    h3 {
      font-size: 20px;
    }

    .platform-support {
      gap: 12px;
    }

    .description {
      font-size: 13px;
    }
  }

  .drawer-actions {
    flex-wrap: wrap;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px;
    background-color: #fff;
    z-index: 999999999;

    .action-button {
      flex: 1 0 auto;
    }
  }
}
</style>

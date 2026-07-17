<template>
  <div class="user-page h-full page-padding flex items-center justify-center">
    <div class="text-center space-y-4 max-w-sm">
      <template v-if="userStore.user">
        <div class="profile-avatar-wrap">
          <n-avatar round :size="88" :src="userStore.user.avatarUrl || undefined" />
          <vip-badge
            v-if="userStore.vipLevel === 'vip' || userStore.vipLevel === 'svip'"
            :level="userStore.vipLevel"
            corner
          />
        </div>
        <div class="profile-meta">
          <p class="profile-name">{{ userStore.user.nickname || '已登录' }}</p>
          <div
            v-if="userStore.vipLevel === 'vip' || userStore.vipLevel === 'svip'"
            class="profile-vip-row"
          >
            <vip-badge :level="userStore.vipLevel" />
          </div>
          <p class="profile-sub">
            {{ userStore.loginType === 'qr' ? '扫码登录' : '在线账号' }}
          </p>
        </div>
        <n-button @click="void userStore.handleLogout()">退出登录</n-button>
      </template>
      <template v-else>
        <n-empty description="未登录 · 请点击右上角「登录」扫码" />
        <n-button @click="router.push('/')">返回首页</n-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NAvatar, NButton, NEmpty } from 'naive-ui';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { msGetProfile, msResolveVipLevel } from '@/api/musicSource';
import VipBadge from '@/components/common/VipBadge.vue';
import { useUserStore } from '@/store/modules/user';
import { isElectron } from '@/utils';

defineOptions({ name: 'User' });

const userStore = useUserStore();
const router = useRouter();

/** 已登录时刷新 SVIP/VIP 档位（旧缓存可能只有 isVip） */
onMounted(async () => {
  if (!isElectron || !userStore.user) return;
  try {
    const profile = await msGetProfile();
    const vipLevel = await msResolveVipLevel(profile.vipLevel);
    const vipType = vipLevel === 'svip' ? 2 : vipLevel === 'vip' ? 1 : 0;
    userStore.setUser({
      ...userStore.user,
      nickname: profile.nickname || userStore.user.nickname,
      avatarUrl: profile.avatarUrl || userStore.user.avatarUrl,
      vipType,
      vipLevel
    });
  } catch {
    /* 忽略：未联网或会话失效 */
  }
});
</script>

<style scoped>
.profile-avatar-wrap {
  position: relative;
  width: 88px;
  height: 88px;
  margin: 0 auto 4px;
}
.profile-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.profile-name {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
}
.profile-vip-row {
  display: flex;
  justify-content: center;
}
.profile-sub {
  font-size: 0.875rem;
  color: #6b7280;
}
.dark .profile-sub {
  color: #9ca3af;
}
</style>

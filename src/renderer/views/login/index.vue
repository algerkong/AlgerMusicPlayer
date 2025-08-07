<template>
  <div class="login-page">
    <div class="phone-login" :class="setAnimationClass('animate__fadeInDown')">
      <div class="bg"></div>
      <div class="content">
        <!-- Tab导航 -->
        <div class="login-tabs" :class="setAnimationClass('animate__fadeInUp')">
          <div
            v-for="tab in loginTabs"
            :key="tab.key"
            class="tab-item"
            :class="{ active: activeMode === tab.key }"
            @click="switchToMode(tab.key)"
          >
            {{ tab.label }}
          </div>
        </div>

        <!-- 登录内容区域 -->
        <div class="login-content">
          <!-- 过渡动画包装器 -->
          <transition
            name="login-content"
            mode="out-in"
            enter-active-class="animate__animated animate__fadeIn"
            leave-active-class="animate__animated animate__fadeOut"
          >
            <!-- 二维码登录组件 -->
            <div v-if="activeMode === LoginMode.QR && !isTransitioning" key="qr" class="phone">
              <qr-login @login-success="handleLoginSuccess" @login-error="handleLoginError" />
            </div>

            <!-- 手机号登录 -->
            <div
              v-else-if="activeMode === LoginMode.PHONE && !isTransitioning"
              key="phone"
              class="phone"
            >
              <div class="login-title">{{ t('login.title.phone') }}</div>
              <div class="phone-page">
                <input
                  v-model="phone"
                  class="phone-input"
                  type="text"
                  :placeholder="t('login.placeholder.phone')"
                />
                <input
                  v-model="password"
                  class="phone-input"
                  type="password"
                  :placeholder="t('login.placeholder.password')"
                />
              </div>
              <div class="text">{{ t('login.phoneTip') }}</div>
              <n-button class="btn-login" @click="loginPhone()">{{
                t('login.button.login')
              }}</n-button>
            </div>

            <!-- UID登录组件 -->
            <div
              v-else-if="activeMode === LoginMode.UID && !isTransitioning"
              key="uid"
              class="phone"
            >
              <uid-login @login-success="handleLoginSuccess" @login-error="handleLoginError" />
            </div>

            <!-- Cookie登录组件 -->
            <div
              v-else-if="activeMode === LoginMode.COOKIE && !isTransitioning"
              key="token"
              class="phone"
            >
              <cookie-login @login-success="handleLoginSuccess" @login-error="handleLoginError" />
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { loginByCellphone } from '@/api/login';
import CookieLogin from '@/components/login/CookieLogin.vue';
import QrLogin from '@/components/login/QrLogin.vue';
import UidLogin from '@/components/login/UidLogin.vue';
import { useUserStore } from '@/store/modules/user';
import { setAnimationClass } from '@/utils';

defineOptions({
  name: 'Login'
});

// 登录模式枚举
enum LoginMode {
  QR = 'qr',
  PHONE = 'phone',
  UID = 'uid',
  COOKIE = 'cookie'
}

const { t } = useI18n();
const message = useMessage();
const router = useRouter();
const userStore = useUserStore();

// 当前激活的登录模式
const activeMode = ref<LoginMode>(LoginMode.COOKIE);
// 用于控制内容切换动画
const isTransitioning = ref(false);

// 登录选项配置
const loginTabs = computed(() => [
  { key: LoginMode.COOKIE, label: t('login.title.cookie') },
  { key: LoginMode.UID, label: t('login.title.uid') },
  { key: LoginMode.QR, label: t('login.title.qr') }
]);

// 手机号登录
const phone = ref('');
const password = ref('');
const loginPhone = async () => {
  try {
    if (!phone.value.trim()) {
      message.error(t('login.message.phoneRequired'));
      return;
    }
    if (!password.value.trim()) {
      message.error(t('login.message.passwordRequired'));
      return;
    }

    const { data } = await loginByCellphone(phone.value, password.value);
    if (data.code === 200) {
      message.success(t('login.message.loginSuccess'));
      userStore.setUser(data.profile);
      localStorage.setItem('token', data.cookie);
      setTimeout(() => {
        router.push('/user');
      }, 1000);
    } else {
      message.error(t('login.message.phoneLoginFailed'));
    }
  } catch (error) {
    message.error(t('login.message.phoneLoginFailed'));
    console.error(t('login.message.loginFailed') + ':', error);
  }
};

// 切换登录模式（带动画效果）
const switchToMode = (mode: LoginMode) => {
  if (mode === activeMode.value) return;

  isTransitioning.value = true;
  setTimeout(() => {
    activeMode.value = mode;
    setTimeout(() => {
      isTransitioning.value = false;
    }, 50);
  }, 150);
};

// 通用登录成功处理
const handleLoginSuccess = (userProfile: any, loginType: string) => {
  // 更新 userStore（这会同时更新 store 状态和 localStorage 中的用户数据）
  userStore.setUser(userProfile);

  // 设置登录类型到 userStore 和 localStorage
  userStore.setLoginType(loginType as any);

  // 设置其他相关状态
  const token = loginType !== 'uid' ? localStorage.getItem('token') : undefined;

  if (token) {
    localStorage.setItem('token', token);
  }

  if (loginType === 'uid') {
    localStorage.setItem('uidLogin', 'true');
  }

  setTimeout(() => {
    router.push('/user');
  }, 1000);
};

// 通用登录错误处理
const handleLoginError = (error: string) => {
  console.error(t('login.message.loginFailed') + ':', error);
};
</script>

<style lang="scss" scoped>
.login-page {
  @apply flex flex-col items-center justify-center;
  @apply bg-light dark:bg-black;
}

.login-title {
  @apply text-2xl font-bold mb-6 text-white;
}

.text {
  @apply mt-4 text-white text-xs;
}

.phone-login {
  width: 350px;
  height: 550px; /* 恢复原来的高度 */
  @apply rounded-2xl rounded-b-none bg-cover bg-no-repeat relative overflow-hidden;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' version='1.1' xmlns:xlink='http://www.w3.org/1999/xlink' xmlns:svgjs='http://svgjs.dev/svgjs' width='400' height='560' preserveAspectRatio='none' viewBox='0 0 400 560'%3e%3cg mask='url(%26quot%3b%23SvgjsMask1066%26quot%3b)' fill='none'%3e%3crect width='400' height='560' x='0' y='0' fill='rgba(24%2c 106%2c 59%2c 1)'%3e%3c/rect%3e%3cpath d='M0%2c234.738C43.535%2c236.921%2c80.103%2c205.252%2c116.272%2c180.923C151.738%2c157.067%2c188.295%2c132.929%2c207.855%2c94.924C227.898%2c55.979%2c233.386%2c10.682%2c226.119%2c-32.511C218.952%2c-75.107%2c199.189%2c-115.793%2c167.469%2c-145.113C137.399%2c-172.909%2c92.499%2c-171.842%2c55.779%2c-189.967C8.719%2c-213.196%2c-28.344%2c-282.721%2c-78.217%2c-266.382C-128.725%2c-249.834%2c-111.35%2c-166.696%2c-143.781%2c-124.587C-173.232%2c-86.348%2c-244.72%2c-83.812%2c-255.129%2c-36.682C-265.368%2c9.678%2c-217.952%2c48.26%2c-190.512%2c87.004C-167.691%2c119.226%2c-140.216%2c145.431%2c-109.013%2c169.627C-74.874%2c196.1%2c-43.147%2c232.575%2c0%2c234.738' fill='%23114b2a'%3e%3c/path%3e%3cpath d='M400 800.9010000000001C443.973 795.023 480.102 765.6 513.011 735.848 541.923 709.71 561.585 676.6320000000001 577.037 640.85 592.211 605.712 606.958 568.912 601.458 531.035 595.962 493.182 568.394 464.36400000000003 546.825 432.775 522.317 396.88300000000004 507.656 347.475 466.528 333.426 425.366 319.366 384.338 352.414 342.111 362.847 297.497 373.869 242.385 362.645 211.294 396.486 180.212 430.318 192.333 483.83299999999997 188.872 529.644 185.656 572.218 178.696 614.453 191.757 655.101 205.885 699.068 227.92 742.4110000000001 265.75 768.898 304.214 795.829 353.459 807.1220000000001 400 800.9010000000001' fill='%231f894c'%3e%3c/path%3e%3c/g%3e%3cdefs%3e%3cmask id='SvgjsMask1066'%3e%3crect width='400' height='560' fill='white'%3e%3c/rect%3e%3c/mask%3e%3c/defs%3e%3c/svg%3e");
  box-shadow: inset 0px 0px 20px 5px rgba(0, 0, 0, 0.37);
  animation-duration: 0.8s;

  .bg {
    @apply absolute w-full h-full bg-light-100 dark:bg-dark-100 opacity-20;
  }

  .content {
    @apply absolute w-full h-full p-4 flex flex-col items-center justify-center text-center;

    .login-tabs {
      @apply flex mb-6 bg-black bg-opacity-20 rounded-xl p-1;
      width: 320px;
      animation-duration: 0.6s;
      animation-delay: 0.2s;

      .tab-item {
        @apply flex-1 py-2 px-3 text-sm text-white text-center cursor-pointer rounded-lg transition-all duration-300;
        @apply hover:bg-white hover:bg-opacity-10;
        transform: translateY(0);

        &:hover {
          transform: translateY(-2px);
        }

        &.active {
          @apply bg-green-600 text-white font-medium;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
      }
    }

    .login-content {
      @apply flex-1 flex items-center justify-center;
      min-height: 300px;
    }

    .phone {
      animation-duration: 0.5s;
      width: 100%;
      max-width: 300px;

      &-page {
        @apply bg-light dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90;
        width: 250px;
        @apply rounded-2xl overflow-hidden;
        margin: 0 auto;
      }

      &-input {
        height: 40px;
        @apply w-full px-4 outline-none;
        @apply text-gray-900 dark:text-white bg-transparent;
        @apply border-b border-gray-200 dark:border-gray-700;
        @apply placeholder-gray-500 dark:placeholder-gray-400;
        transition: all 0.3s ease;

        &:focus {
          @apply border-green-500;
          transform: translateY(-1px);
        }
      }
    }

    .btn-login {
      width: 250px;
      height: 40px;
      @apply mt-10 text-white rounded-xl;
      @apply bg-green-600 hover:bg-green-700 transition-all duration-300;
      transform: translateY(0);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(34, 197, 94, 0.3);
      }
    }
  }
}

/* 登录内容切换动画 */
.login-content-enter-active,
.login-content-leave-active {
  animation-duration: 0.3s;
}

.login-content-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.login-content-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.mobile {
  .login-page {
    @apply pt-0;
  }

  .phone-login {
    width: 90vw;
    max-width: 350px;
    height: 500px;
  }
}
</style>

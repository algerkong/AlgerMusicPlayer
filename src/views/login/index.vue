<script lang="ts" setup>
import { getQrKey, createQr, checkQr, getLoginStatus } from '@/api/login'
import { onMounted } from '@vue/runtime-core';
import { ref } from 'vue';
import { getUserDetail, loginByCellphone } from '@/api/login';
import { useStore } from 'vuex';
import { useMessage } from 'naive-ui'
import { setAnimationClass, setAnimationDelay } from "@/utils";
import { useRouter } from 'vue-router';


const message = useMessage()
const store = useStore();
const router = useRouter()

const qrUrl = ref<string>()
onMounted(() => {
  loadLogin()
})

const loadLogin = async () => {
  const qrKey = await getQrKey()
  const key = qrKey.data.data.unikey
  const { data } = await createQr(key)
  qrUrl.value = data.data.qrimg
  timerIsQr(key)
}



const timerIsQr = (key: string) => {
  const timer = setInterval(async () => {
    const { data } = await checkQr(key)

    if (data.code === 800) {
      clearInterval(timer)
    }
    if (data.code === 803) {
      // 将token存入localStorage
      localStorage.setItem('token', data.cookie)
      const user = await getUserDetail()
      store.state.user = user.data.profile
      message.success('登录成功')

      await getLoginStatus().then(res => {
        console.log(res);
      })
      clearInterval(timer)
    }
  }, 5000);
}


// 是否扫码登陆
const isQr = ref(true)
const chooseQr = () => {
  isQr.value = !isQr.value
}

// 手机号登录
const phone = ref('')
const password = ref('')
const loginPhone = async () => {
  const { data } = await loginByCellphone(phone.value, password.value)
  if (data.code === 200) {
    message.success('登录成功')
    store.state.user = data.profile
    localStorage.setItem('token', data.cookie)
    setTimeout(() => {
      router.push('/')
    }, 1000);
  }
}

</script>

<template>
  <div class="login-page">
    <div class="phone-login">
      <div class="bg"></div>
      <div class="content">
        <div class="phone" v-if="isQr" :class="setAnimationClass('animate__fadeInUp')">
          <div class="login-title">扫码登陆</div>
          <img class="qr-img" :src="qrUrl" />
          <div class="text">使用网易云APP扫码登录</div>
        </div>
        <div class="phone" v-else :class="setAnimationClass('animate__fadeInUp')">
          <div class="login-title">手机号登录</div>
          <div class="phone-page">
            <input v-model="phone" class="phone-input" type="text" placeholder="手机号" />
            <input v-model="password" class="phone-input" type="password" placeholder="密码" />
          </div>
          <n-button class="btn-login" @click="loginPhone()">登录</n-button>
        </div>
      </div>
      <div class="bottom">
        <div class="title" @click="chooseQr()">{{ isQr ? '手机号登录' : '扫码登录' }}</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  @apply p-4 flex flex-col items-center justify-center p-20;
}

.login-title {
  @apply text-2xl font-bold mb-6;
}

.text {
  @apply mt-4 text-green-500 text-xs;
}

.phone-login {
  width: 350px;
  height: 550px;
  @apply rounded-2xl rounded-b-none bg-cover bg-no-repeat relative overflow-hidden;
  background-image: url(https://z3.ax1x.com/2021/09/30/4IMyUx.jpg);
  background-color: #000;
  box-shadow: inset 0px 0px 20px 5px #0000005e;

  .bg {
    @apply absolute w-full h-full bg-black opacity-30;
  }

  .bottom {
    width: 200%;
    height: 250px;
    bottom: -180px;
    border-radius: 50%;
    left: 50%;
    padding: 10px;
    transform: translateX(-50%);
    color: #ffffff99;
    @apply absolute bg-black flex justify-center  text-lg font-bold cursor-pointer;
    box-shadow: 10px 0px 20px #000000a9;
  }

  .content {
    @apply absolute w-full h-full p-4 flex flex-col items-center justify-center pb-20 text-center;
    .qr-img {
      @apply opacity-80 rounded-2xl cursor-pointer;
    }

    .phone {
      animation-duration: 0.5s;
      &-page {
        background-color: #ffffffdd;
        width: 250px;
        @apply rounded-2xl overflow-hidden;
      }

      &-input {
        height: 40px;
        border-bottom: 1px solid #e5e5e5;
        @apply w-full text-black px-4 outline-none;
      }
    }
    .btn-login {
      width: 250px;
      height: 40px;
      @apply mt-10 text-white rounded-xl bg-black opacity-60;
    }
  }
}
</style>
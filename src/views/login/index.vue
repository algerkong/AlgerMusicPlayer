<script lang="ts" setup>
import { getQrKey, createQr, checkQr, getLoginStatus } from '@/api/login'
import { onMounted } from '@vue/runtime-core';
import { ref } from 'vue';
import { getUserDetail } from '@/api/login';
import { useStore } from 'vuex';
import { useMessage } from 'naive-ui'

const message = useMessage()

const store = useStore();

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

    console.log(data);

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

</script>

<template>
  <div class="login-page">
    <div class="login-title">扫码登陆</div>
    <div class="qr">
      <img class="qr-img" :src="qrUrl" />
    </div>
    <div class="text">使用网易云APP扫码登录</div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  @apply p-4 flex flex-col items-center justify-center p-20;
}

.login-title {
  @apply text-3xl font-bold mb-6;
}

.text {
  @apply mt-4 text-green-500 text-xs;
}

.qr {
}
</style>
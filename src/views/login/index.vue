<script lang="ts" setup>
import { getQrKey, createQr, checkQr, getLoginStatus } from '@/api/login'
import { onMounted } from '@vue/runtime-core';
import { ref } from 'vue';

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
    <div>登录</div>
    <div>
      <img :src="qrUrl" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  @apply p-4;
}
</style>
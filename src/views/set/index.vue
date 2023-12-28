<template>
  <div class="set-page">
    <div class="set-item">
      <div>
        <div class="set-item-title">代理</div>
        <div class="set-item-content">无法听音乐时打开</div>
      </div>
      <n-switch v-model:value="setData.isProxy"/>
    </div>
    <div class="set-item">
      <div>
        <div class="set-item-title">版本</div>
        <div class="set-item-content">当前已是最新版本</div>
      </div>
      <div>{{ setData.version }}</div>
    </div>
    <div class="set-item">
      <div>
        <div class="set-item-title">作者</div>
        <div class="set-item-content"></div>
      </div>
      <div>{{ setData.author }}</div>
    </div>

    <div class="set-action">
      <n-button @click="handelCancel">取消</n-button>
      <n-button type="primary" @click="handleSave">保存并重启</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import store from '@/store'
import { useRouter } from 'vue-router';

const setData = ref(store.state.setData)
const router = useRouter()

const handelCancel = () => {
  router.back()
}

const windowData = window as any

const handleSave = () => {
  store.commit('setSetData', setData.value)
  windowData.electronAPI.restart()
}
</script>

<style scoped lang="scss">
.set-page{
  @apply flex flex-col justify-center items-center pt-8;
}
.set-item{
  @apply w-3/5  flex justify-between items-center mb-4;
  .set-item-title{
    @apply text-gray-200 text-base;
  }
  .set-item-content{
    @apply text-gray-400 text-sm;
  }
}
</style>
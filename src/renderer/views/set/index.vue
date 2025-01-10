<template>
  <n-scrollbar>
    <div class="set-page">
      <div class="set-item">
        <div>
          <div class="set-item-title">主题模式</div>
          <div class="set-item-content">切换日间/夜间主题</div>
        </div>
        <n-switch v-model:value="isDarkTheme">
          <template #checked>
            <i class="ri-moon-line"></i>
          </template>
          <template #unchecked>
            <i class="ri-sun-line"></i>
          </template>
        </n-switch>
      </div>
      <!-- <div v-if="isElectron" class="set-item">
        <div>
          <div class="set-item-title">代理</div>
          <div class="set-item-content">无法听音乐时打开</div>
        </div>
        <n-switch v-model:value="setData.isProxy" />
      </div> -->
      <div v-if="isElectron" class="set-item">
        <div>
          <div class="set-item-title">音乐API端口</div>
          <div class="set-item-content">修改后需要重启应用</div>
        </div>
        <n-input-number v-model:value="setData.musicApiPort" />
      </div>
      <div class="set-item">
        <div>
          <div class="set-item-title">动画速度</div>
          <div class="set-item-content">调节动画播放速度</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-400">{{ setData.animationSpeed }}x</span>
          <div class="w-40">
            <n-slider
              v-model:value="setData.animationSpeed"
              :min="0.1"
              :max="3"
              :step="0.1"
              :marks="{
                0.1: '极慢',
                1: '正常',
                3: '极快'
              }"
              :disabled="setData.noAnimate"
              class="w-40"
            />
          </div>
        </div>
      </div>
      <div v-if="isElectron" class="set-item">
        <div>
          <div class="set-item-title">下载目录</div>
          <div class="set-item-content">
            {{ setData.downloadPath || '默认下载目录' }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <n-button size="small" @click="openDownloadPath">打开目录</n-button>
          <n-button size="small" @click="selectDownloadPath">修改目录</n-button>
        </div>
      </div>
      <div class="set-item">
        <div>
          <div class="set-item-title">版本</div>
          <div class="set-item-content">
            {{ updateInfo.currentVersion }}
            <template v-if="updateInfo.hasUpdate">
              <n-tag type="success" class="ml-2">发现新版本 {{ updateInfo.latestVersion }}</n-tag>
            </template>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <n-button
            :type="updateInfo.hasUpdate ? 'primary' : 'default'"
            size="small"
            :loading="checking"
            @click="checkForUpdates(true)"
          >
            {{ checking ? '检查中...' : '检查更新' }}
          </n-button>
          <n-button
            v-if="updateInfo.hasUpdate"
            type="success"
            size="small"
            @click="openReleasePage"
          >
            前往更新
          </n-button>
        </div>
      </div>
      <div
        class="set-item cursor-pointer hover:text-green-500 hover:bg-green-950 transition-all"
        @click="openAuthor"
      >
        <div>
          <coffee>
            <div>
              <div class="set-item-title">作者</div>
              <div class="set-item-content">algerkong 点个star🌟呗</div>
            </div>
          </coffee>
        </div>
        <div>
          <n-button size="small" type="primary" @click="openAuthor"
            ><i class="ri-github-line"></i>前往github</n-button
          >
        </div>
      </div>
      <div class="set-item">
        <div>
          <div class="set-item-title">音质设置</div>
          <div class="set-item-content">选择音乐播放音质（VIP）</div>
        </div>
        <n-select
          v-model:value="setData.musicQuality"
          :options="[
            { label: '标准', value: 'standard' },
            { label: '较高', value: 'higher' },
            { label: '极高', value: 'exhigh' },
            { label: '无损', value: 'lossless' },
            { label: 'Hi-Res', value: 'hires' },
            { label: '高清环绕声', value: 'jyeffect' },
            { label: '沉浸环绕声', value: 'sky' },
            { label: '杜比全景声', value: 'dolby' },
            { label: '超清母带', value: 'jymaster' }
          ]"
          style="width: 160px"
        />
      </div>
      <div v-if="isElectron" class="set-item">
        <div>
          <div class="set-item-title">关闭行为</div>
          <div class="set-item-content">
            {{ closeActionLabels[setData.closeAction] || '每次询问' }}
          </div>
        </div>
        <n-select
          v-model:value="setData.closeAction"
          :options="[
            { label: '每次询问', value: 'ask' },
            { label: '最小化到托盘', value: 'minimize' },
            { label: '直接退出', value: 'close' }
          ]"
          style="width: 160px"
        />
      </div>

      <div v-if="isElectron" class="set-item">
        <div>
          <div class="set-item-title">重启</div>
          <div class="set-item-content">重启应用</div>
        </div>
        <n-button type="primary" @click="restartApp">重启</n-button>
      </div>
      <div v-if="isElectron" class="set-item">
        <div>
          <div class="set-item-title">代理设置</div>
          <div class="set-item-content">无法访问音乐时可以开启代理</div>
        </div>
        <div class="flex items-center gap-2">
          <n-switch v-model:value="setData.proxyConfig.enable">
            <template #checked>开启</template>
            <template #unchecked>关闭</template>
          </n-switch>
          <n-button size="small" @click="showProxyModal = true">配置</n-button>
        </div>
      </div>
      <div v-if="isElectron" class="set-item">
        <div>
          <div class="set-item-title">realIP</div>
          <div class="set-item-content">
            由于限制,此项目在国外使用会受到限制可使用realIP参数,传进国内IP解决,如:116.25.146.177
            即可解决
          </div>
        </div>
        <div class="flex items-center gap-2">
          <n-switch v-model:value="setData.enableRealIP">
            <template #checked>开启</template>
            <template #unchecked>关闭</template>
          </n-switch>
          <n-input
            v-if="setData.enableRealIP"
            v-model:value="setData.realIP"
            placeholder="realIP"
            style="width: 200px"
            @blur="validateAndSaveRealIP"
          />
        </div>
      </div>
    </div>
    <play-bottom />
    <n-modal
      v-model:show="showProxyModal"
      preset="dialog"
      title="代理设置"
      positive-text="确认"
      negative-text="取消"
      :show-icon="false"
      @positive-click="handleProxyConfirm"
      @negative-click="showProxyModal = false"
    >
      <n-form
        ref="formRef"
        :model="proxyForm"
        :rules="proxyRules"
        label-placement="left"
        label-width="80"
        require-mark-placement="right-hanging"
      >
        <n-form-item label="代理协议" path="protocol">
          <n-select
            v-model:value="proxyForm.protocol"
            :options="[
              { label: 'HTTP', value: 'http' },
              { label: 'HTTPS', value: 'https' },
              { label: 'SOCKS5', value: 'socks5' }
            ]"
          />
        </n-form-item>
        <n-form-item label="代理地址" path="host">
          <n-input v-model:value="proxyForm.host" placeholder="请输入代理地址" />
        </n-form-item>
        <n-form-item label="代理端口" path="port">
          <n-input-number
            v-model:value="proxyForm.port"
            placeholder="请输入代理端口"
            :min="1"
            :max="65535"
          />
        </n-form-item>
      </n-form>
    </n-modal>
  </n-scrollbar>
</template>

<script setup lang="ts">
import type { FormRules } from 'naive-ui';
import { useMessage } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';

import Coffee from '@/components/Coffee.vue';
import PlayBottom from '@/components/common/PlayBottom.vue';
import { isElectron } from '@/utils';
import { openDirectory, selectDirectory } from '@/utils/fileOperation';
import { checkUpdate, UpdateResult } from '@/utils/update';

import config from '../../../../package.json';

const store = useStore();
const checking = ref(false);
const updateInfo = ref<UpdateResult>({
  hasUpdate: false,
  latestVersion: '',
  currentVersion: config.version,
  releaseInfo: null
});

const closeActionLabels = {
  ask: '每次询问',
  minimize: '最小化到托盘',
  close: '直接退出'
} as const;

const setData = computed(() => {
  const data = store.state.setData;
  // 确保代理配置存在
  if (!data.proxyConfig) {
    data.proxyConfig = {
      enable: false,
      protocol: 'http',
      host: '127.0.0.1',
      port: 7890
    };
  }
  // 确保音质设置存在
  if (!data.musicQuality) {
    data.musicQuality = 'higher';
  }
  return data;
});

watch(
  () => setData.value,
  (newVal) => {
    store.commit('setSetData', newVal);
  },
  { deep: true }
);

const isDarkTheme = computed({
  get: () => store.state.theme === 'dark',
  set: () => store.commit('toggleTheme')
});

const openAuthor = () => {
  window.open(setData.value.authorUrl);
};

const restartApp = () => {
  window.electron.ipcRenderer.send('restart');
};
const message = useMessage();
const checkForUpdates = async (isClick = false) => {
  checking.value = true;
  try {
    const result = await checkUpdate(config.version);
    if (result) {
      updateInfo.value = result;
      if (!result.hasUpdate && isClick) {
        message.success('当前已是最新版本');
      }
    } else if (isClick) {
      message.success('当前已是最新版本');
    }
  } catch (error) {
    console.error('检查更新失败:', error);
    if (isClick) {
      message.error('检查更新失败，请稍后重试');
    }
  } finally {
    checking.value = false;
  }
};

const openReleasePage = () => {
  store.commit('setShowUpdateModal', true);
};

const selectDownloadPath = async () => {
  const path = await selectDirectory(message);
  if (path) {
    store.commit('setSetData', {
      ...setData.value,
      downloadPath: path
    });
  }
};

const openDownloadPath = () => {
  openDirectory(setData.value.downloadPath, message);
};

const showProxyModal = ref(false);
const formRef = ref();
const proxyForm = ref({
  protocol: 'http',
  host: '127.0.0.1',
  port: 7890
});

const proxyRules: FormRules = {
  protocol: {
    required: true,
    message: '请选择代理协议',
    trigger: ['blur', 'change']
  },
  host: {
    required: true,
    message: '请输入代理地址',
    trigger: ['blur', 'change'],
    validator: (_rule, value) => {
      if (!value) return false;
      // 简单的IP或域名验证
      const ipRegex =
        /^(\d{1,3}\.){3}\d{1,3}$|^localhost$|^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$/;
      return ipRegex.test(value);
    }
  },
  port: {
    required: true,
    message: '请输入有效的端口号(1-65535)',
    trigger: ['blur', 'change'],
    validator: (_rule, value) => {
      return value >= 1 && value <= 65535;
    }
  }
};

// 初始化时从store获取代理配置
onMounted(() => {
  checkForUpdates();
  if (setData.value.proxyConfig) {
    proxyForm.value = { ...setData.value.proxyConfig };
  }
  // 确保enableRealIP有默认值
  if (setData.value.enableRealIP === undefined) {
    store.commit('setSetData', {
      ...setData.value,
      enableRealIP: false
    });
  }
});

// 监听代理配置变化
watch(
  () => setData.value.proxyConfig,
  (newVal) => {
    if (newVal) {
      proxyForm.value = {
        protocol: newVal.protocol || 'http',
        host: newVal.host || '127.0.0.1',
        port: newVal.port || 7890
      };
    }
  },
  { immediate: true, deep: true }
);

const handleProxyConfirm = async () => {
  try {
    await formRef.value?.validate();
    // 保存代理配置时保留enable状态
    store.commit('setSetData', {
      ...setData.value,
      proxyConfig: {
        enable: setData.value.proxyConfig?.enable || false,
        protocol: proxyForm.value.protocol,
        host: proxyForm.value.host,
        port: proxyForm.value.port
      }
    });
    showProxyModal.value = false;
    message.success('代理设置已保存，重启应用后生效');
  } catch (err) {
    message.error('请检查输入是否正确');
  }
};

const validateAndSaveRealIP = () => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!setData.value.realIP || ipRegex.test(setData.value.realIP)) {
    store.commit('setSetData', {
      ...setData.value,
      realIP: setData.value.realIP,
      enableRealIP: true
    });
    if (setData.value.realIP) {
      message.success('真实IP设置已保存');
    }
  } else {
    message.error('请输入有效的IP地址');
    store.commit('setSetData', {
      ...setData.value,
      realIP: ''
    });
  }
};

// 监听enableRealIP变化，当关闭时清空realIP
watch(
  () => setData.value.enableRealIP,
  (newVal) => {
    if (!newVal) {
      store.commit('setSetData', {
        ...setData.value,
        realIP: '',
        enableRealIP: false
      });
    }
  }
);
</script>

<style lang="scss" scoped>
.set-page {
  @apply p-4 bg-light dark:bg-dark pb-20;
}

.set-item {
  @apply flex items-center justify-between p-4 rounded-lg mb-4 transition-all;
  @apply bg-light dark:bg-dark text-gray-900 dark:text-white;
  @apply border border-gray-200 dark:border-gray-700;

  &-title {
    @apply text-base font-medium mb-1;
  }

  &-content {
    @apply text-sm text-gray-500 dark:text-gray-400;
  }

  &:hover {
    @apply bg-gray-50 dark:bg-gray-800;
  }

  &.cursor-pointer:hover {
    @apply text-green-500 bg-green-50 dark:bg-green-900;
  }
}
</style>

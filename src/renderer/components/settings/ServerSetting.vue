<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    :title="t('settings.remoteControl.title')"
    class="remote-control-modal"
    style="max-width: 650px; width: 100%"
  >
    <n-scrollbar>
      <div class="remote-control-setting">
        <n-form label-placement="left" label-width="auto" :style="{ maxWidth: '640px' }">
          <n-form-item :label="t('settings.remoteControl.enable')">
            <n-switch v-model:value="remoteControlConfig.enabled" />
          </n-form-item>

          <n-form-item :label="t('settings.remoteControl.port')">
            <n-input-number
              v-model:value="remoteControlConfig.port"
              :min="1024"
              :max="65535"
              :disabled="!remoteControlConfig.enabled"
            />
          </n-form-item>

          <n-form-item :label="t('settings.remoteControl.allowedIps')">
            <div class="allowed-ips-container">
              <div
                v-for="(_, index) in remoteControlConfig.allowedIps"
                :key="index"
                class="ip-item"
              >
                <n-input
                  v-model:value="remoteControlConfig.allowedIps[index]"
                  :disabled="!remoteControlConfig.enabled"
                />
                <n-button
                  quaternary
                  circle
                  type="error"
                  :disabled="!remoteControlConfig.enabled"
                  @click="removeIp(index)"
                >
                  <template #icon>
                    <n-icon><i class="ri-delete-bin-line"></i></n-icon>
                  </template>
                </n-button>
              </div>
              <n-button
                secondary
                size="small"
                :disabled="!remoteControlConfig.enabled"
                @click="addIp"
              >
                <template #icon>
                  <n-icon><i class="ri-add-line"></i></n-icon>
                </template>
                {{ t('settings.remoteControl.addIp') }}
              </n-button>
              <n-text depth="3" size="small" class="allow-all-hint">
                {{ t('settings.remoteControl.emptyListHint') }}
              </n-text>
            </div>
          </n-form-item>

          <n-form-item>
            <n-space>
              <n-button type="primary" :disabled="!remoteControlConfig.enabled" @click="saveConfig">
                {{ t('common.save') }}
              </n-button>
              <n-button @click="resetConfig">
                {{ t('common.reset') }}
              </n-button>
            </n-space>
          </n-form-item>

          <n-collapse-transition :show="remoteControlConfig.enabled">
            <div class="remote-info">
              <n-alert type="info">
                <template #icon>
                  <n-icon><i class="ri-information-line"></i></n-icon>
                </template>
                <p>{{ t('settings.remoteControl.accessInfo') }}</p>
                <div class="access-url">
                  <n-tag type="success"> http://localhost:{{ remoteControlConfig.port }}/ </n-tag>
                </div>
                <div v-if="localIpAddresses.length" class="local-ips">
                  <div v-for="ip in localIpAddresses" :key="ip" class="ip-address">
                    <n-tag type="info"> http://{{ ip }}:{{ remoteControlConfig.port }}/ </n-tag>
                  </div>
                </div>
              </n-alert>
            </div>
          </n-collapse-transition>
        </n-form>
      </div>
    </n-scrollbar>
  </n-modal>
</template>

<script setup lang="ts">
import { cloneDeep } from 'lodash';
import { useMessage } from 'naive-ui';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const message = useMessage();

// 控制弹窗显示的属性
const visible = defineModel('visible', { default: false });

// 默认配置
const defaultConfig: {
  enabled: boolean;
  port: number;
  allowedIps: string[];
} = {
  enabled: false,
  port: 31888,
  allowedIps: []
};

// 远程控制配置
const remoteControlConfig = ref({ ...defaultConfig });

// 本地IP地址列表
const localIpAddresses = ref<string[]>([]);

// 获取本地IP地址
const getLocalIpAddresses = () => {
  if (window.electron) {
    window.electron.ipcRenderer.invoke('get-local-ip-addresses').then((ips: string[]) => {
      localIpAddresses.value = ips;
    });
  }
};

// 添加IP地址
const addIp = () => {
  remoteControlConfig.value.allowedIps.push('');
};

// 删除IP地址
const removeIp = (index: number) => {
  remoteControlConfig.value.allowedIps.splice(index, 1);
};

// 保存配置
const saveConfig = () => {
  // 过滤空IP
  remoteControlConfig.value.allowedIps = remoteControlConfig.value.allowedIps.filter(
    (ip) => ip.trim() !== ''
  );

  if (window.electron) {
    window.electron.ipcRenderer.send(
      'update-remote-control-config',
      cloneDeep(remoteControlConfig.value)
    );
    message.success(t('settings.remoteControl.saveSuccess'));
  }
};

// 重置配置
const resetConfig = () => {
  if (window.electron) {
    window.electron.ipcRenderer.invoke('get-remote-control-config').then((config) => {
      if (config) {
        remoteControlConfig.value = config;
      } else {
        remoteControlConfig.value = { ...defaultConfig };
      }
    });
  }
};

// 组件挂载时，获取当前配置
onMounted(async () => {
  if (window.electron) {
    try {
      const config = await window.electron.ipcRenderer.invoke('get-remote-control-config');
      if (config) {
        remoteControlConfig.value = config;
      }
      // 获取本地IP地址
      getLocalIpAddresses();
    } catch (error) {
      console.error('获取远程控制配置失败:', error);
    }
  }
});
</script>

<style lang="scss" scoped>
.remote-control-setting {
  padding: 0 20px;
}

.allowed-ips-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;

  .ip-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .allow-all-hint {
    margin-top: 5px;
  }
}

.remote-info {
  margin-top: 16px;

  .access-url {
    margin-top: 10px;
  }

  .local-ips {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
}
</style>

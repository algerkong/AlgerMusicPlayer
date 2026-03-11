<template>
  <setting-section :title="t('settings.sections.basic')">
    <setting-item
      :title="t('settings.basic.themeMode')"
      :description="t('settings.basic.themeModeDesc')"
    >
      <template #action>
        <div class="flex items-center gap-3 max-md:flex-wrap">
          <div class="flex items-center gap-2">
            <n-switch v-model:value="setData.autoTheme" @update:value="handleAutoThemeChange">
              <template #checked><i class="ri-smartphone-line"></i></template>
              <template #unchecked><i class="ri-settings-line"></i></template>
            </n-switch>
            <span class="text-sm text-gray-500 max-md:hidden">
              {{
                setData.autoTheme ? t('settings.basic.autoTheme') : t('settings.basic.manualTheme')
              }}
            </span>
          </div>
          <n-switch
            v-model:value="isDarkTheme"
            :disabled="setData.autoTheme"
            :class="{ 'opacity-50': setData.autoTheme }"
          >
            <template #checked><i class="ri-moon-line"></i></template>
            <template #unchecked><i class="ri-sun-line"></i></template>
          </n-switch>
        </div>
      </template>
    </setting-item>

    <setting-item
      :title="t('settings.basic.language')"
      :description="t('settings.basic.languageDesc')"
    >
      <language-switcher />
    </setting-item>

    <setting-item
      v-if="!isElectron"
      :title="t('settings.basic.tabletMode')"
      :description="t('settings.basic.tabletModeDesc')"
    >
      <n-switch v-model:value="setData.tabletMode">
        <template #checked><i class="ri-tablet-line"></i></template>
        <template #unchecked><i class="ri-smartphone-line"></i></template>
      </n-switch>
    </setting-item>

    <setting-item
      :title="t('settings.translationEngine')"
      :description="t('settings.translationEngine')"
    >
      <s-select
        v-model="setData.lyricTranslationEngine"
        :options="translationEngineOptions"
        width="w-40 max-md:w-full"
      />
    </setting-item>

    <setting-item
      v-if="isElectron"
      :title="t('settings.basic.font')"
      :description="t('settings.basic.fontDesc')"
    >
      <template #action>
        <div class="flex gap-2 max-md:flex-col max-md:w-full">
          <n-radio-group v-model:value="setData.fontScope" class="mt-2">
            <n-radio key="global" value="global">{{
              t('settings.basic.fontScope.global')
            }}</n-radio>
            <n-radio key="lyric" value="lyric">{{ t('settings.basic.fontScope.lyric') }}</n-radio>
          </n-radio-group>
          <n-select
            v-model:value="selectedFonts"
            :options="systemFonts"
            filterable
            multiple
            placeholder="选择字体"
            class="w-[300px] max-md:w-full"
            :render-label="renderFontLabel"
          />
        </div>
      </template>
    </setting-item>

    <div
      v-if="isElectron && selectedFonts.length > 0"
      class="p-4 border-b border-gray-100 dark:border-gray-800"
    >
      <div class="text-base font-bold mb-4 text-gray-900 dark:text-white">
        {{ t('settings.basic.fontPreview.title') }}
      </div>
      <div class="space-y-4" :style="{ fontFamily: setData.fontFamily }">
        <div v-for="preview in fontPreviews" :key="preview.key" class="flex flex-col gap-2">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            {{ t(`settings.basic.fontPreview.${preview.key}`) }}
          </div>
          <div
            class="text-lg text-gray-900 dark:text-gray-100 p-3 rounded-xl bg-gray-50 dark:bg-black/20"
          >
            {{ t(`settings.basic.fontPreview.${preview.key}Text`) }}
          </div>
        </div>
      </div>
    </div>

    <setting-item :title="t('settings.basic.tokenManagement')">
      <template #description>
        <div class="text-sm text-gray-500 mb-2">
          {{ t('settings.basic.tokenStatus') }}:
          {{ currentToken ? t('settings.basic.tokenSet') : t('settings.basic.tokenNotSet') }}
        </div>
        <div v-if="currentToken" class="text-xs text-gray-400 mb-2 font-mono break-all">
          {{ currentToken.substring(0, 50) }}...
        </div>
      </template>
      <template #action>
        <div class="flex gap-2">
          <s-btn @click="showTokenModal = true">
            {{ currentToken ? t('settings.basic.modifyToken') : t('settings.basic.setToken') }}
          </s-btn>
          <s-btn v-if="currentToken" variant="danger" @click="clearToken">
            {{ t('settings.basic.clearToken') }}
          </s-btn>
        </div>
      </template>
    </setting-item>

    <setting-item :title="t('settings.basic.animation')">
      <template #description>
        <div class="flex items-center gap-2">
          <n-switch v-model:value="setData.noAnimate">
            <template #checked>{{ t('common.off') }}</template>
            <template #unchecked>{{ t('common.on') }}</template>
          </n-switch>
          <span>{{ t('settings.basic.animationDesc') }}</span>
        </div>
      </template>
      <template #action>
        <div class="flex items-center gap-2">
          <span v-if="!isMobile" class="text-sm text-gray-400">{{ setData.animationSpeed }}x</span>
          <div class="w-40 max-md:w-auto flex justify-end">
            <n-slider
              v-if="!isMobile"
              v-model:value="setData.animationSpeed"
              :min="0.1"
              :max="3"
              :step="0.1"
              :marks="animationSpeedMarks"
              :disabled="setData.noAnimate"
            />
            <s-input
              v-else
              v-model="setData.animationSpeed"
              type="number"
              :min="0.1"
              :max="3"
              :step="0.1"
              :disabled="setData.noAnimate"
              width="w-[120px]"
            />
          </div>
        </div>
      </template>
    </setting-item>

    <setting-item v-if="isElectron" :title="t('settings.basic.gpuAcceleration')">
      <template #description>
        <div class="text-sm text-gray-500 mb-2">
          {{ t('settings.basic.gpuAccelerationDesc') }}
        </div>
        <div v-if="gpuAccelerationChanged" class="text-xs text-amber-500">
          <i class="ri-information-line mr-1"></i>
          {{ t('settings.basic.gpuAccelerationRestart') }}
        </div>
      </template>
      <n-switch
        v-model:value="setData.enableGpuAcceleration"
        @update:value="handleGpuAccelerationChange"
      >
        <template #checked><i class="ri-cpu-line"></i></template>
        <template #unchecked><i class="ri-cpu-line"></i></template>
      </n-switch>
    </setting-item>

    <cookie-settings-modal
      v-model:show="showTokenModal"
      :initial-value="currentToken"
      @save="handleTokenSave"
    />
  </setting-section>
</template>

<script setup lang="ts">
import { computed, h, inject, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { getUserDetail } from '@/api/login';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import CookieSettingsModal from '@/components/settings/CookieSettingsModal.vue';
import { useSettingsStore } from '@/store/modules/settings';
import { useUserStore } from '@/store/modules/user';
import { isElectron, isMobile } from '@/utils';

import { SETTINGS_DATA_KEY, SETTINGS_MESSAGE_KEY } from '../keys';
import SBtn from '../SBtn.vue';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';
import SInput from '../SInput.vue';
import SSelect from '../SSelect.vue';

const fontPreviews = [
  { key: 'chinese' },
  { key: 'english' },
  { key: 'japanese' },
  { key: 'korean' }
];

const { t } = useI18n();
const settingsStore = useSettingsStore();
const userStore = useUserStore();
const setData = inject(SETTINGS_DATA_KEY)!;
const message = inject(SETTINGS_MESSAGE_KEY)!;

const isDarkTheme = computed({
  get: () => settingsStore.theme === 'dark',
  set: () => settingsStore.toggleTheme()
});

const handleAutoThemeChange = (value: boolean) => {
  settingsStore.setAutoTheme(value);
};

const gpuAccelerationChanged = ref(false);

const handleGpuAccelerationChange = (enabled: boolean) => {
  try {
    if (window.electron) {
      window.electron.ipcRenderer.send('update-gpu-acceleration', enabled);
      gpuAccelerationChanged.value = true;
      message.info(t('settings.basic.gpuAccelerationChangeSuccess'));
    }
  } catch (error) {
    console.error('GPU加速设置更新失败:', error);
    message.error(t('settings.basic.gpuAccelerationChangeError'));
  }
};

const translationEngineOptions = computed(() => [
  { label: t('settings.translationEngineOptions.none'), value: 'none' },
  { label: t('settings.translationEngineOptions.opencc'), value: 'opencc' }
]);

const animationSpeedMarks = computed(() => ({
  0.1: t('settings.basic.animationSpeed.slow'),
  1: t('settings.basic.animationSpeed.normal'),
  3: t('settings.basic.animationSpeed.fast')
}));

const systemFonts = computed(() => settingsStore.systemFonts);
const selectedFonts = ref<string[]>([]);

const renderFontLabel = (option: { label: string; value: string }) => {
  return h('span', { style: { fontFamily: option.value } }, option.label);
};

watch(
  selectedFonts,
  (newFonts) => {
    setData.value = {
      ...setData.value,
      fontFamily: newFonts.length === 0 ? 'system-ui' : newFonts.join(',')
    };
  },
  { deep: true }
);

watch(
  () => setData.value.fontFamily,
  (newFont) => {
    if (newFont) {
      selectedFonts.value = newFont === 'system-ui' ? [] : newFont.split(',');
    }
  },
  { immediate: true }
);

const showTokenModal = ref(false);
const currentToken = ref(localStorage.getItem('token') || '');

const handleTokenSave = async (token: string) => {
  try {
    const originalToken = localStorage.getItem('token');
    localStorage.setItem('token', token);

    const user = await getUserDetail();
    if (user.data && user.data.profile) {
      userStore.setUser(user.data.profile);
      currentToken.value = token;
      message.success(t('settings.cookie.message.saveSuccess'));
      setTimeout(() => window.location.reload(), 1000);
    } else {
      if (originalToken) localStorage.setItem('token', originalToken);
      else localStorage.removeItem('token');
      message.error(t('settings.cookie.message.saveError'));
    }
  } catch {
    const originalToken = localStorage.getItem('token');
    if (originalToken) localStorage.setItem('token', originalToken);
    else localStorage.removeItem('token');
    message.error(t('settings.cookie.message.saveError'));
  }
};

const clearToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentToken.value = '';
  userStore.user = null;
  message.success(t('settings.basic.clearToken') + '成功');
  setTimeout(() => window.location.reload(), 1000);
};

watch(
  () => localStorage.getItem('token'),
  (newToken) => {
    currentToken.value = newToken || '';
  },
  { immediate: true }
);

onMounted(() => {
  if (window.electron) {
    window.electron.ipcRenderer.on('gpu-acceleration-updated', (_, enabled: boolean) => {
      console.log('GPU加速设置已更新:', enabled);
      gpuAccelerationChanged.value = true;
    });

    window.electron.ipcRenderer.on('gpu-acceleration-update-error', (_, errorMessage: string) => {
      console.error('GPU加速设置更新错误:', errorMessage);
      gpuAccelerationChanged.value = false;
    });
  }
});

onUnmounted(() => {
  if (window.electron) {
    window.electron.ipcRenderer.removeAllListeners?.('gpu-acceleration-updated');
    window.electron.ipcRenderer.removeAllListeners?.('gpu-acceleration-update-error');
  }
});
</script>

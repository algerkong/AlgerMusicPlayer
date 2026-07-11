<template>
  <div>
    <setting-section :title="t('settings.sections.playback')">
      <setting-item
        :title="t('settings.playback.quality')"
        :description="t('settings.playback.qualityDesc')"
      >
        <s-select
          v-model="setData.musicQuality"
          :options="qualityOptions"
          width="w-40 max-md:w-full"
        />
      </setting-item>

      <setting-item
        v-if="platform === 'darwin'"
        :title="t('settings.playback.showStatusBar')"
        :description="t('settings.playback.showStatusBarContent')"
      >
        <n-switch v-model:value="setData.showTopAction">
          <template #checked>{{ t('common.on') }}</template>
          <template #unchecked>{{ t('common.off') }}</template>
        </n-switch>
      </setting-item>

      <setting-item
        :title="t('settings.playback.autoPlay')"
        :description="t('settings.playback.autoPlayDesc')"
      >
        <n-switch v-model:value="setData.autoPlay">
          <template #checked>{{ t('common.on') }}</template>
          <template #unchecked>{{ t('common.off') }}</template>
        </n-switch>
      </setting-item>

      <setting-item
        v-if="isElectron"
        :title="t('settings.playback.audioDevice')"
        :description="t('settings.playback.audioDeviceDesc')"
      >
        <audio-device-settings />
      </setting-item>
    </setting-section>

    <div
      class="mt-6 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-gray-800"
    >
      <div class="text-sm font-medium text-gray-500 mb-3">支持正版</div>
      <div class="text-base text-gray-900 dark:text-white mb-4">
        大家还是需要支持正版，本软件只做开源探讨。各大音乐会员购买链接：
      </div>
      <div class="flex gap-3 flex-wrap">
        <a
          v-for="link in memberLinks"
          :key="link.url"
          class="px-4 py-2 rounded-xl bg-gray-50 dark:bg-black/20 text-primary hover:text-green-500 transition-colors"
          :href="link.url"
          target="_blank"
        >
          {{ link.name }} <i class="ri-external-link-line ml-1"></i>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';

import AudioDeviceSettings from '@/components/settings/AudioDeviceSettings.vue';
import { isElectron } from '@/utils';

import { SETTINGS_DATA_KEY } from '../keys';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';
import SSelect from '../SSelect.vue';

const memberLinks = [
  { name: '网易云音乐会员', url: 'https://music.163.com/store/vip' },
  { name: 'QQ音乐会员', url: 'https://y.qq.com/portal/vipportal/' },
  { name: '酷狗音乐会员', url: 'https://vip.kugou.com/' }
];

const { t } = useI18n();
const setData = inject(SETTINGS_DATA_KEY)!;
const platform = window.electron ? window.electron.ipcRenderer.sendSync('get-platform') : 'web';

const qualityOptions = computed(() => [
  { label: t('settings.playback.qualityOptions.standard'), value: 'standard' },
  { label: t('settings.playback.qualityOptions.higher'), value: 'higher' },
  { label: t('settings.playback.qualityOptions.exhigh'), value: 'exhigh' },
  { label: t('settings.playback.qualityOptions.lossless'), value: 'lossless' },
  { label: t('settings.playback.qualityOptions.hires'), value: 'hires' },
  { label: t('settings.playback.qualityOptions.jyeffect'), value: 'jyeffect' },
  { label: t('settings.playback.qualityOptions.sky'), value: 'sky' },
  { label: t('settings.playback.qualityOptions.dolby'), value: 'dolby' },
  { label: t('settings.playback.qualityOptions.jymaster'), value: 'jymaster' }
]);
</script>

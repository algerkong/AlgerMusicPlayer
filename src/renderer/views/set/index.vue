<template>
  <div class="settings-container">
    <!-- 左侧导航栏 -->
    <div v-if="!isMobile" class="settings-nav">
      <div
        v-for="section in settingSections"
        :key="section.id"
        class="nav-item"
        :class="{ active: currentSection === section.id }"
        @click="scrollToSection(section.id)"
      >
        {{ t(`settings.sections.${section.id}`) }}
      </div>
    </div>

    <!-- 右侧内容区 -->
    <n-scrollbar ref="scrollbarRef" class="settings-content" @scroll="handleScroll">
      <div class="set-page">
        <!-- 基础设置 -->
        <div id="basic" ref="basicRef" class="settings-section">
          <div class="settings-section-title">{{ t('settings.sections.basic') }}</div>
          <div class="settings-section-content">
            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.basic.themeMode') }}</div>
                <div class="set-item-content">{{ t('settings.basic.themeModeDesc') }}</div>
              </div>
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <n-switch v-model:value="setData.autoTheme" @update:value="handleAutoThemeChange">
                    <template #checked><i class="ri-smartphone-line"></i></template>
                    <template #unchecked><i class="ri-settings-line"></i></template>
                  </n-switch>
                  <span class="text-sm text-gray-500">
                    {{
                      setData.autoTheme
                        ? t('settings.basic.autoTheme')
                        : t('settings.basic.manualTheme')
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
            </div>

            <!-- 语言设置 -->
            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.basic.language') }}</div>
                <div class="set-item-content">{{ t('settings.basic.languageDesc') }}</div>
              </div>
              <language-switcher />
            </div>

            <div class="set-item" v-if="isElectron">
              <div>
                <div class="set-item-title">{{ t('settings.basic.font') }}</div>
                <div class="set-item-content">{{ t('settings.basic.fontDesc') }}</div>
              </div>
              <div class="flex gap-2">
                <n-radio-group v-model:value="setData.fontScope" class="mt-2">
                  <n-radio key="global" value="global">{{
                    t('settings.basic.fontScope.global')
                  }}</n-radio>
                  <n-radio key="lyric" value="lyric">{{
                    t('settings.basic.fontScope.lyric')
                  }}</n-radio>
                </n-radio-group>
                <n-select
                  v-model:value="selectedFonts"
                  :options="systemFonts"
                  filterable
                  multiple
                  placeholder="选择字体"
                  style="width: 300px"
                  :render-label="renderFontLabel"
                >
                </n-select>
              </div>
            </div>

            <div v-if="selectedFonts.length > 0" class="font-preview-container">
              <div class="font-preview-title">{{ t('settings.basic.fontPreview.title') }}</div>
              <div class="font-preview" :style="{ fontFamily: setData.fontFamily }">
                <div class="preview-item">
                  <div class="preview-label">{{ t('settings.basic.fontPreview.chinese') }}</div>
                  <div class="preview-text">{{ t('settings.basic.fontPreview.chineseText') }}</div>
                </div>
                <div class="preview-item">
                  <div class="preview-label">{{ t('settings.basic.fontPreview.english') }}</div>
                  <div class="preview-text">{{ t('settings.basic.fontPreview.englishText') }}</div>
                </div>
                <div class="preview-item">
                  <div class="preview-label">{{ t('settings.basic.fontPreview.japanese') }}</div>
                  <div class="preview-text">{{ t('settings.basic.fontPreview.japaneseText') }}</div>
                </div>
                <div class="preview-item">
                  <div class="preview-label">{{ t('settings.basic.fontPreview.korean') }}</div>
                  <div class="preview-text">{{ t('settings.basic.fontPreview.koreanText') }}</div>
                </div>
              </div>
            </div>

            <!-- Token管理 -->
            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.basic.tokenManagement') }}</div>
                <div class="set-item-content">
                  <div class="text-sm text-gray-500 mb-2">
                    {{ t('settings.basic.tokenStatus') }}:
                    {{
                      currentToken ? t('settings.basic.tokenSet') : t('settings.basic.tokenNotSet')
                    }}
                  </div>
                  <div v-if="currentToken" class="text-xs text-gray-400 mb-2 font-mono break-all">
                    {{ currentToken.substring(0, 50) }}...
                  </div>
                </div>
              </div>
              <div class="flex gap-2">
                <n-button size="small" @click="showTokenModal = true">
                  {{
                    currentToken ? t('settings.basic.modifyToken') : t('settings.basic.setToken')
                  }}
                </n-button>
                <n-button v-if="currentToken" size="small" type="error" @click="clearToken">
                  {{ t('settings.basic.clearToken') }}
                </n-button>
              </div>
            </div>

            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.basic.animation') }}</div>
                <div class="set-item-content">
                  <div class="flex items-center gap-2">
                    <n-switch v-model:value="setData.noAnimate">
                      <template #checked>{{ t('common.off') }}</template>
                      <template #unchecked>{{ t('common.on') }}</template>
                    </n-switch>
                    <span>{{ t('settings.basic.animationDesc') }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-400" v-if="!isMobile"
                  >{{ setData.animationSpeed }}x</span
                >
                <div class="w-40 flex justify-end">
                  <template v-if="!isMobile"
                    ><n-slider
                      v-model:value="setData.animationSpeed"
                      :min="0.1"
                      :max="3"
                      :step="0.1"
                      :marks="{
                        0.1: t('settings.basic.animationSpeed.slow'),
                        1: t('settings.basic.animationSpeed.normal'),
                        3: t('settings.basic.animationSpeed.fast')
                      }"
                      :disabled="setData.noAnimate"
                  /></template>
                  <template v-else>
                    <n-input-number
                      v-model:value="setData.animationSpeed"
                      :min="0.1"
                      :max="3"
                      :step="0.1"
                      :placeholder="t('settings.basic.animationSpeedPlaceholder')"
                      :disabled="setData.noAnimate"
                      button-placement="both"
                      style="width: 100px"
                    />
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 播放设置 -->
        <div id="playback" ref="playbackRef" class="settings-section">
          <div class="settings-section-title">{{ t('settings.sections.playback') }}</div>
          <div class="settings-section-content">
            <div>
              <div class="set-item">
                <div>
                  <div class="set-item-title">{{ t('settings.playback.quality') }}</div>
                  <div class="set-item-content">
                    {{ t('settings.playback.qualityDesc') }}
                  </div>
                </div>
                <n-select
                  v-model:value="setData.musicQuality"
                  :options="[
                    { label: t('settings.playback.qualityOptions.standard'), value: 'standard' },
                    { label: t('settings.playback.qualityOptions.higher'), value: 'higher' },
                    { label: t('settings.playback.qualityOptions.exhigh'), value: 'exhigh' },
                    { label: t('settings.playback.qualityOptions.lossless'), value: 'lossless' },
                    { label: t('settings.playback.qualityOptions.hires'), value: 'hires' },
                    { label: t('settings.playback.qualityOptions.jyeffect'), value: 'jyeffect' },
                    { label: t('settings.playback.qualityOptions.sky'), value: 'sky' },
                    { label: t('settings.playback.qualityOptions.dolby'), value: 'dolby' },
                    { label: t('settings.playback.qualityOptions.jymaster'), value: 'jymaster' }
                  ]"
                  style="width: 160px"
                />
              </div>
              <!-- 网易云 QQ 音乐 酷我 酷狗 会员购买链接 -->
              <div class="p-2 bg-light-100 dark:bg-dark-100 rounded-lg mt-2">
                <div>大家还是需要支持正版，本软件只做开源探讨</div>
                <div class="mt-2">各大音乐会员购买链接</div>
                <div class="flex gap-5 flex-wrap">
                  <a
                    class="text-green-400 hover:text-green-500"
                    href="https://music.163.com/store/vip"
                    target="_blank"
                    >网易云音乐会员</a
                  >
                  <a
                    class="text-green-400 hover:text-green-500"
                    href="https://y.qq.com/portal/vipportal/"
                    target="_blank"
                    >QQ音乐会员</a
                  >
                  <a
                    class="text-green-400 hover:text-green-500"
                    href="https://vip.kugou.com/"
                    target="_blank"
                    >酷狗音乐会员</a
                  >
                </div>
              </div>
            </div>
            <div class="set-item" v-if="isElectron">
              <div>
                <div class="set-item-title">{{ t('settings.playback.musicSources') }}</div>
                <div class="set-item-content">
                  <div class="flex items-center gap-2">
                    <n-switch v-model:value="setData.enableMusicUnblock">
                      <template #checked>{{ t('common.on') }}</template>
                      <template #unchecked>{{ t('common.off') }}</template>
                    </n-switch>
                    <span>{{ t('settings.playback.musicUnblockEnableDesc') }}</span>
                  </div>
                  <div v-if="setData.enableMusicUnblock" class="mt-2">
                    <div class="text-sm">
                      <span class="text-gray-500">{{
                        t('settings.playback.selectedMusicSources')
                      }}</span>
                      <span v-if="musicSources.length > 0" class="text-gray-400">
                        {{ musicSources.join(', ') }}
                      </span>
                      <span v-else class="text-red-500 text-xs">
                        {{ t('settings.playback.noMusicSources') }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <n-button
                size="small"
                :disabled="!setData.enableMusicUnblock"
                @click="showMusicSourcesModal = true"
              >
                {{ t('settings.playback.configureMusicSources') }}
              </n-button>
            </div>

            <div class="set-item" v-if="platform === 'darwin'">
              <div>
                <div class="set-item-title">{{ t('settings.playback.showStatusBar') }}</div>
                <div class="set-item-content">
                  {{ t('settings.playback.showStatusBarContent') }}
                </div>
              </div>
              <n-switch v-model:value="setData.showTopAction">
                <template #checked>{{ t('common.on') }}</template>
                <template #unchecked>{{ t('common.off') }}</template>
              </n-switch>
            </div>

            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.playback.autoPlay') }}</div>
                <div class="set-item-content">{{ t('settings.playback.autoPlayDesc') }}</div>
              </div>
              <n-switch v-model:value="setData.autoPlay">
                <template #checked>{{ t('common.on') }}</template>
                <template #unchecked>{{ t('common.off') }}</template>
              </n-switch>
            </div>
          </div>
        </div>

        <!-- 应用设置 -->
        <div v-if="isElectron" id="application" ref="applicationRef" class="settings-section">
          <div class="settings-section-title">{{ t('settings.sections.application') }}</div>
          <div class="settings-section-content">
            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.application.closeAction') }}</div>
                <div class="set-item-content">{{ t('settings.application.closeActionDesc') }}</div>
              </div>
              <n-select
                v-model:value="setData.closeAction"
                :options="[
                  { label: t('settings.application.closeOptions.ask'), value: 'ask' },
                  { label: t('settings.application.closeOptions.minimize'), value: 'minimize' },
                  { label: t('settings.application.closeOptions.close'), value: 'close' }
                ]"
                style="width: 160px"
              />
            </div>

            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.application.shortcut') }}</div>
                <div class="set-item-content">{{ t('settings.application.shortcutDesc') }}</div>
              </div>
              <n-button size="small" @click="showShortcutModal = true">{{
                t('common.configure')
              }}</n-button>
            </div>

            <div v-if="isElectron" class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.application.download') }}</div>
                <div class="set-item-content">
                  <n-switch v-model:value="setData.alwaysShowDownloadButton" class="mr-2">
                    <template #checked>{{ t('common.show') }}</template>
                    <template #unchecked>{{ t('common.hide') }}</template>
                  </n-switch>
                  {{ t('settings.application.downloadDesc') }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <n-button size="small" @click="settingsStore.showDownloadDrawer = true">
                  {{ t('settings.application.download') }}
                </n-button>
              </div>
            </div>

            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.application.unlimitedDownload') }}</div>
                <div class="set-item-content">
                  <n-switch v-model:value="setData.unlimitedDownload" class="mr-2">
                    <template #checked>{{ t('common.on') }}</template>
                    <template #unchecked>{{ t('common.off') }}</template>
                  </n-switch>
                  {{ t('settings.application.unlimitedDownloadDesc') }}
                </div>
              </div>
            </div>

            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.application.downloadPath') }}</div>
                <div class="set-item-content">
                  {{ setData.downloadPath || t('settings.application.downloadPathDesc') }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <n-button size="small" @click="openDownloadPath">{{ t('common.open') }}</n-button>
                <n-button size="small" @click="selectDownloadPath">{{
                  t('common.modify')
                }}</n-button>
              </div>
            </div>

            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.application.remoteControl') }}</div>
                <div class="set-item-content">
                  {{ t('settings.application.remoteControlDesc') }}
                </div>
              </div>
              <n-button size="small" @click="showRemoteControlModal = true">{{
                t('common.configure')
              }}</n-button>
            </div>
          </div>
        </div>

        <!-- 网络设置 -->
        <div v-if="isElectron" id="network" ref="networkRef" class="settings-section">
          <div class="settings-section-title">{{ t('settings.sections.network') }}</div>
          <div class="settings-section-content">
            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.network.apiPort') }}</div>
                <div class="set-item-content">{{ t('settings.network.apiPortDesc') }}</div>
              </div>
              <n-input-number v-model:value="setData.musicApiPort" />
            </div>

            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.network.proxy') }}</div>
                <div class="set-item-content">{{ t('settings.network.proxyDesc') }}</div>
              </div>
              <div class="flex items-center gap-2">
                <n-switch v-model:value="setData.proxyConfig.enable">
                  <template #checked>{{ t('common.on') }}</template>
                  <template #unchecked>{{ t('common.off') }}</template>
                </n-switch>
                <n-button size="small" @click="showProxyModal = true">{{
                  t('common.configure')
                }}</n-button>
              </div>
            </div>

            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.network.realIP') }}</div>
                <div class="set-item-content">{{ t('settings.network.realIPDesc') }}</div>
              </div>
              <div class="flex items-center gap-2">
                <n-switch v-model:value="setData.enableRealIP">
                  <template #checked>{{ t('common.on') }}</template>
                  <template #unchecked>{{ t('common.off') }}</template>
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
        </div>

        <!-- 系统管理 -->
        <div v-if="isElectron" id="system" ref="systemRef" class="settings-section">
          <div class="settings-section-title">{{ t('settings.sections.system') }}</div>
          <div class="settings-section-content">
            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.system.cache') }}</div>
                <div class="set-item-content">{{ t('settings.system.cacheDesc') }}</div>
              </div>
              <n-button size="small" @click="showClearCacheModal = true">
                {{ t('settings.system.cacheDesc') }}
              </n-button>
            </div>

            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.system.restart') }}</div>
                <div class="set-item-content">{{ t('settings.system.restartDesc') }}</div>
              </div>
              <n-button size="small" @click="restartApp">{{
                t('settings.system.restart')
              }}</n-button>
            </div>
          </div>
        </div>

        <!-- 关于 -->
        <div id="about" ref="aboutRef" class="settings-section">
          <div class="settings-section-title">{{ t('settings.regard') }}</div>
          <div class="settings-section-content">
            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.about.version') }}</div>
                <div class="set-item-content">
                  {{ updateInfo.currentVersion }}
                  <template v-if="updateInfo.hasUpdate">
                    <n-tag type="success" class="ml-2">
                      {{ t('settings.about.hasUpdate') }} {{ updateInfo.latestVersion }}
                    </n-tag>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <n-button size="small" :loading="checking" @click="checkForUpdates(true)">
                  {{ checking ? t('settings.about.checking') : t('settings.about.checkUpdate') }}
                </n-button>
                <n-button v-if="updateInfo.hasUpdate" size="small" @click="openReleasePage">
                  {{ t('settings.about.gotoUpdate') }}
                </n-button>
              </div>
            </div>

            <div
              class="set-item cursor-pointer hover:text-green-500 hover:bg-green-950 transition-all"
              @click="openAuthor"
            >
              <coffee>
                <div>
                  <div class="set-item-title">{{ t('settings.about.author') }}</div>
                  <div class="set-item-content">{{ t('settings.about.authorDesc') }}</div>
                </div>
              </coffee>
              <div>
                <n-button size="small" @click="openAuthor">
                  <i class="ri-github-line"></i>{{ t('settings.about.gotoGithub') }}
                </n-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 捐赠支持 -->
        <div id="donation" ref="donationRef" class="settings-section">
          <div class="settings-section-title">{{ t('settings.sections.donation') }}</div>
          <div class="settings-section-content">
            <div class="set-item">
              <div>
                <div class="set-item-title">{{ t('settings.sections.donation') }}</div>
                <div class="set-item-content">{{ t('donation.message') }}</div>
              </div>
              <n-button text @click="toggleDonationList">
                <template #icon>
                  <i :class="isDonationListVisible ? 'ri-eye-line' : 'ri-eye-off-line'" />
                </template>
                {{ isDonationListVisible ? t('common.hide') : t('common.show') }}
              </n-button>
            </div>
            <donation-list v-if="isDonationListVisible" />
          </div>
        </div>
      </div>
      <play-bottom />
    </n-scrollbar>

    <template v-if="isElectron">
      <!-- 快捷键设置弹窗 -->
      <shortcut-settings v-model:show="showShortcutModal" @change="handleShortcutsChange" />

      <!-- 代理设置弹窗 -->
      <proxy-settings
        v-model:show="showProxyModal"
        :config="proxyForm"
        @confirm="handleProxyConfirm"
      />

      <!-- 音源设置弹窗 -->
      <music-source-settings v-model:show="showMusicSourcesModal" v-model:sources="musicSources" />

      <!-- 远程控制设置弹窗 -->
      <remote-control-setting v-model:visible="showRemoteControlModal" />
    </template>

    <!-- Cookie设置弹窗 -->
    <cookie-settings-modal
      v-model:show="showTokenModal"
      :initial-value="currentToken"
      @save="handleTokenSave"
    />

    <!-- 清除缓存弹窗 -->
    <clear-cache-settings v-model:show="showClearCacheModal" @confirm="clearCache" />
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { useMessage } from 'naive-ui';
import { computed, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import localData from '@/../main/set.json';
import { getUserDetail } from '@/api/login';
import Coffee from '@/components/Coffee.vue';
import DonationList from '@/components/common/DonationList.vue';
import PlayBottom from '@/components/common/PlayBottom.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import ClearCacheSettings from '@/components/settings/ClearCacheSettings.vue';
import CookieSettingsModal from '@/components/settings/CookieSettingsModal.vue';
import MusicSourceSettings from '@/components/settings/MusicSourceSettings.vue';
import ProxySettings from '@/components/settings/ProxySettings.vue';
import RemoteControlSetting from '@/components/settings/ServerSetting.vue';
import ShortcutSettings from '@/components/settings/ShortcutSettings.vue';
import { useSettingsStore } from '@/store/modules/settings';
import { useUserStore } from '@/store/modules/user';
import { type Platform } from '@/types/music';
import { isElectron, isMobile } from '@/utils';
import { openDirectory, selectDirectory } from '@/utils/fileOperation';
import { checkUpdate, UpdateResult } from '@/utils/update';

import config from '../../../../package.json';

// 所有平台默认值
const ALL_PLATFORMS: Platform[] = ['migu', 'kugou', 'pyncmd', 'bilibili'];

const platform = window.electron ? window.electron.ipcRenderer.sendSync('get-platform') : 'web';

const settingsStore = useSettingsStore();
const userStore = useUserStore();

// 创建一个本地缓存的setData，避免频繁更新
const localSetData = ref({ ...settingsStore.setData });

// 在组件卸载时保存设置
onUnmounted(() => {
  // 确保最终设置被保存
  settingsStore.setSetData(localSetData.value);
});

const checking = ref(false);
const updateInfo = ref<UpdateResult>({
  hasUpdate: false,
  latestVersion: '',
  currentVersion: config.version,
  releaseInfo: null
});

const { t } = useI18n();

// 创建一个防抖的保存函数
// const debouncedSaveSettings = debounce((newData) => {
//   settingsStore.setSetData(newData);
// }, 500);

const saveSettings = useDebounceFn((data) => {
  settingsStore.setSetData(data);
}, 500);

// 使用计算属性来管理设置数据
const setData = computed({
  get: () => localSetData.value,
  set: (newData) => {
    localSetData.value = newData;
  }
});

// 监听localSetData变化，保存设置
watch(
  () => localSetData.value,
  (newValue) => {
    saveSettings(newValue);
  },
  { deep: true }
);

// 监听store中setData的变化，同步到本地
watch(
  () => settingsStore.setData,
  (newValue) => {
    // 只在初始加载时更新本地数据，避免循环更新
    if (JSON.stringify(localSetData.value) !== JSON.stringify(newValue)) {
      localSetData.value = { ...newValue };
    }
  },
  { deep: true, immediate: true }
);

const isDarkTheme = computed({
  get: () => settingsStore.theme === 'dark',
  set: () => settingsStore.toggleTheme()
});

const handleAutoThemeChange = (value: boolean) => {
  settingsStore.setAutoTheme(value);
};

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
        message.success(t('settings.about.latest'));
      }
    } else if (isClick) {
      message.success(t('settings.about.latest'));
    }
  } catch (error) {
    console.error('检查更新失败:', error);
    if (isClick) {
      message.error(t('settings.about.messages.checkError'));
    }
  } finally {
    checking.value = false;
  }
};

const openReleasePage = () => {
  settingsStore.showUpdateModal = true;
};

const selectDownloadPath = async () => {
  const path = await selectDirectory(message);
  if (path) {
    setData.value = {
      ...setData.value,
      downloadPath: path
    };
  }
};

const openDownloadPath = () => {
  openDirectory(setData.value.downloadPath, message);
};

const showProxyModal = ref(false);
const proxyForm = ref({
  protocol: 'http',
  host: '127.0.0.1',
  port: 7890
});

// 使用 store 中的字体列表
const systemFonts = computed(() => settingsStore.systemFonts);

// 已选择的字体列表
const selectedFonts = ref<string[]>([]);

// 自定义渲染函数
const renderFontLabel = (option: { label: string; value: string }) => {
  return h('span', { style: { fontFamily: option.value } }, option.label);
};

// 监听字体选择变化
watch(
  selectedFonts,
  (newFonts) => {
    // 如果没有选择任何字体，使用系统默认字体
    if (newFonts.length === 0) {
      setData.value = {
        ...setData.value,
        fontFamily: 'system-ui'
      };
      return;
    }
    // 将选择的字体组合成字体列表
    setData.value = {
      ...setData.value,
      fontFamily: newFonts.join(',')
    };
  },
  { deep: true }
);

// 初始化已选择的字体
watch(
  () => setData.value.fontFamily,
  (newFont) => {
    if (newFont) {
      if (newFont === 'system-ui') {
        selectedFonts.value = [];
      } else {
        selectedFonts.value = newFont.split(',');
      }
    }
  },
  { immediate: true }
);

// 初始化时从store获取配置
onMounted(async () => {
  checkForUpdates();
  if (setData.value.proxyConfig) {
    proxyForm.value = { ...setData.value.proxyConfig };
  }
  // 确保enableRealIP有默认值
  if (setData.value.enableRealIP === undefined) {
    setData.value = {
      ...setData.value,
      enableRealIP: false
    };
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

const handleProxyConfirm = async (proxyConfig) => {
  // 保存代理配置时保留enable状态
  setData.value = {
    ...setData.value,
    proxyConfig: {
      enable: setData.value.proxyConfig?.enable || false,
      ...proxyConfig
    }
  };
  message.success(t('settings.network.messages.proxySuccess'));
};

const validateAndSaveRealIP = () => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!setData.value.realIP || ipRegex.test(setData.value.realIP)) {
    setData.value = {
      ...setData.value,
      realIP: setData.value.realIP,
      enableRealIP: true
    };
    if (setData.value.realIP) {
      message.success(t('settings.network.messages.realIPSuccess'));
    }
  } else {
    message.error(t('settings.network.messages.realIPError'));
    setData.value = {
      ...setData.value,
      realIP: ''
    };
  }
};

// 监听enableRealIP变化，当关闭时清空realIP
watch(
  () => setData.value.enableRealIP,
  (newVal) => {
    if (!newVal) {
      setData.value = {
        ...setData.value,
        realIP: '',
        enableRealIP: false
      };
    }
  }
);

const isDonationListVisible = ref(localStorage.getItem('donationListVisible') !== 'false');

const toggleDonationList = () => {
  isDonationListVisible.value = !isDonationListVisible.value;
  localStorage.setItem('donationListVisible', isDonationListVisible.value.toString());
};

// 清除缓存相关
const showClearCacheModal = ref(false);

const clearCache = async (selectedCacheTypes) => {
  const clearTasks = selectedCacheTypes.map(async (type) => {
    switch (type) {
      case 'history':
        localStorage.removeItem('musicHistory');
        break;
      case 'favorite':
        localStorage.removeItem('favoriteList');
        break;
      case 'user':
        userStore.handleLogout();
        break;
      case 'settings':
        if (window.electron) {
          window.electron.ipcRenderer.send('set-store-value', 'set', localData);
        }
        localStorage.removeItem('appSettings');
        localStorage.removeItem('theme');
        localStorage.removeItem('lyricData');
        localStorage.removeItem('lyricFontSize');
        localStorage.removeItem('playMode');
        break;
      case 'downloads':
        if (window.electron) {
          window.electron.ipcRenderer.send('clear-downloads-history');
        }
        break;
      case 'resources':
        // 清除音频资源缓存
        if (window.electron) {
          window.electron.ipcRenderer.send('clear-audio-cache');
        }
        // 清除歌词缓存
        localStorage.removeItem('lyricCache');
        // 清除音乐URL缓存
        localStorage.removeItem('musicUrlCache');
        // 清除图片缓存
        if (window.caches) {
          try {
            const cache = await window.caches.open('music-images');
            await cache.keys().then((keys) => {
              keys.forEach((key) => {
                cache.delete(key);
              });
            });
          } catch (error) {
            console.error('清除图片缓存失败:', error);
          }
        }
        break;
      case 'lyrics':
        window.api.invoke('clear-lyrics-cache');
        break;
      default:
        break;
    }
  });

  await Promise.all(clearTasks);
  message.success(t('settings.system.messages.clearSuccess'));
};

const showShortcutModal = ref(false);

const handleShortcutsChange = (shortcuts: any) => {
  console.log('快捷键已更新:', shortcuts);
};

// 定义设置分类
const settingSections = [
  { id: 'basic', title: t('settings.sections.basic') },
  { id: 'playback', title: t('settings.sections.playback') },
  { id: 'application', title: t('settings.sections.application'), electron: true },
  { id: 'network', title: t('settings.sections.network'), electron: true },
  { id: 'system', title: t('settings.sections.system'), electron: true },
  { id: 'regard', title: t('settings.sections.regard') },
  { id: 'donation', title: t('settings.sections.donation') }
];

// 当前激活的分类
const currentSection = ref('basic');
const scrollbarRef = ref();

// 各个分类的ref
const basicRef = ref();
const playbackRef = ref();
const applicationRef = ref();
const networkRef = ref();
const systemRef = ref();
const aboutRef = ref();
const donationRef = ref();

// 滚动到指定分类
const scrollToSection = async (sectionId: string) => {
  currentSection.value = sectionId;
  const sectionRef = {
    basic: basicRef,
    playback: playbackRef,
    application: applicationRef,
    network: networkRef,
    system: systemRef,
    about: aboutRef,
    donation: donationRef
  }[sectionId];

  if (sectionRef?.value) {
    await nextTick();
    scrollbarRef.value?.scrollTo({
      top: sectionRef.value.offsetTop - 20,
      behavior: 'smooth'
    });
  }
};

// 处理滚动，更新当前激活的分类
const handleScroll = (e: any) => {
  const { scrollTop } = e.target;

  const sections = [
    { id: 'basic', ref: basicRef },
    { id: 'playback', ref: playbackRef },
    { id: 'application', ref: applicationRef },
    { id: 'network', ref: networkRef },
    { id: 'system', ref: systemRef },
    { id: 'about', ref: aboutRef },
    { id: 'donation', ref: donationRef }
  ];

  const activeSection = sections[0].id;
  let lastValidSection = activeSection;

  for (const section of sections) {
    if (section.ref?.value) {
      const { offsetTop } = section.ref.value;
      if (scrollTop >= offsetTop - 100) {
        lastValidSection = section.id;
      }
    }
  }

  if (lastValidSection !== currentSection.value) {
    currentSection.value = lastValidSection;
  }
};

// 初始化时设置当前激活的分类
onMounted(() => {
  // 延迟一帧等待 DOM 完全渲染
  nextTick(() => {
    handleScroll({ target: { scrollTop: 0 } });
  });
});

// 音源设置相关
const musicSources = computed({
  get: () => {
    if (!setData.value.enabledMusicSources) {
      return ALL_PLATFORMS;
    }
    return setData.value.enabledMusicSources as Platform[];
  },
  set: (newValue: Platform[]) => {
    // 确保至少选择一个音源
    const valuesToSet = newValue.length > 0 ? [...new Set(newValue)] : ALL_PLATFORMS;
    setData.value = {
      ...setData.value,
      enabledMusicSources: valuesToSet
    };
  }
});

const showMusicSourcesModal = ref(false);

// 远程控制设置弹窗
const showRemoteControlModal = ref(false);

// Token管理相关
const showTokenModal = ref(false);
const currentToken = ref(localStorage.getItem('token') || '');

// 处理Token保存
const handleTokenSave = async (token: string) => {
  try {
    // 临时保存原有token
    const originalToken = localStorage.getItem('token');

    // 设置新token
    localStorage.setItem('token', token);

    // 验证token有效性
    const user = await getUserDetail();
    if (user.data && user.data.profile) {
      // token有效，更新用户信息
      userStore.setUser(user.data.profile);
      currentToken.value = token;
      message.success(t('settings.cookie.message.saveSuccess'));

      // 刷新当前页面
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      // token无效，恢复原有token
      if (originalToken) {
        localStorage.setItem('token', originalToken);
      } else {
        localStorage.removeItem('token');
      }
      message.error(t('settings.cookie.message.saveError'));
    }
  } catch (error) {
    // token无效，恢复原有token
    const originalToken = localStorage.getItem('token');
    if (originalToken) {
      localStorage.setItem('token', originalToken);
    } else {
      localStorage.removeItem('token');
    }
    message.error(t('settings.cookie.message.saveError'));
    console.error('Token验证失败:', error);
  }
};

// 清除Token
const clearToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentToken.value = '';
  userStore.user = null;
  message.success(t('settings.basic.clearToken') + '成功');

  // 刷新页面
  setTimeout(() => {
    window.location.reload();
  }, 1000);
};

// 监听localStorage中token的变化
watch(
  () => localStorage.getItem('token'),
  (newToken) => {
    currentToken.value = newToken || '';
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.settings-container {
  @apply flex h-full;
}

.settings-nav {
  @apply w-32 h-full flex-shrink-0 border-r border-gray-200 dark:border-gray-700;
  @apply bg-light dark:bg-dark;

  .nav-item {
    @apply px-4 py-2.5 cursor-pointer text-sm;
    @apply text-gray-600 dark:text-gray-400;
    @apply transition-colors duration-200;
    @apply border-l-2 border-transparent;

    &:hover {
      @apply text-primary dark:text-white bg-gray-50 dark:bg-dark-100;
      @apply border-l-2 border-gray-200 dark:border-gray-200;
    }

    &.active {
      @apply text-primary dark:text-white bg-gray-50 dark:bg-dark-100;
      @apply border-l-2 border-gray-200 dark:border-gray-200;
      @apply font-medium;
    }
  }
}

.settings-content {
  @apply flex-1 h-full;
}

.set-page {
  @apply p-4 pb-20;
}

.settings-section {
  @apply mb-6 scroll-mt-4;

  &-title {
    @apply text-base font-medium mb-4;
    @apply text-gray-600 dark:text-white;
  }

  &-content {
    @apply space-y-4;
  }
}

.set-item {
  @apply flex items-center justify-between p-4 rounded-lg transition-all;
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

.font-preview-container {
  @apply mt-4 p-4 rounded-lg;
  @apply bg-gray-50 dark:bg-dark-100;
  @apply border border-gray-200 dark:border-gray-700;

  .font-preview-title {
    @apply text-sm font-medium mb-3;
    @apply text-gray-600 dark:text-gray-300;
  }

  .font-preview {
    @apply space-y-3;

    .preview-item {
      @apply flex flex-col gap-1;

      .preview-label {
        @apply text-xs text-gray-500 dark:text-gray-400;
      }

      .preview-text {
        @apply text-base text-gray-900 dark:text-gray-100;
        @apply p-2 rounded;
        @apply bg-white dark:bg-dark;
        @apply border border-gray-200 dark:border-gray-700;
      }
    }
  }
}

:deep(.n-select) {
  width: 200px;
}
</style>

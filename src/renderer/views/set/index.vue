<template>
  <div class="settings-container">
    <!-- 左侧导航栏 -->
    <div class="settings-nav">
      <div
        v-for="section in settingSections"
        :key="section.id"
        class="nav-item"
        :class="{ active: currentSection === section.id }"
        @click="scrollToSection(section.id)"
      >
        {{ section.title }}
      </div>
    </div>

    <!-- 右侧内容区 -->
    <n-scrollbar ref="scrollbarRef" class="settings-content" @scroll="handleScroll">
      <div class="set-page">
        <!-- 基础设置 -->
        <div id="basic" ref="basicRef" class="settings-section">
          <div class="settings-section-title">基础设置</div>
          <div class="settings-section-content">
            <div class="set-item">
              <div>
                <div class="set-item-title">主题模式</div>
                <div class="set-item-content">切换日间/夜间主题</div>
              </div>
              <n-switch v-model:value="isDarkTheme">
                <template #checked><i class="ri-moon-line"></i></template>
                <template #unchecked><i class="ri-sun-line"></i></template>
              </n-switch>
            </div>

            <div class="set-item">
              <div>
                <div class="set-item-title">字体设置</div>
                <div class="set-item-content">选择字体，优先使用排在前面的字体</div>
              </div>
              <div class="flex gap-2">
                <n-radio-group v-model:value="setData.fontScope" class="mt-2">
                  <n-radio key="global" value="global">全局</n-radio>
                  <n-radio key="lyric" value="lyric">仅歌词</n-radio>
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
              <div class="font-preview-title">字体预览</div>
              <div class="font-preview" :style="{ fontFamily: setData.fontFamily }">
                <div class="preview-item">
                  <div class="preview-label">中文</div>
                  <div class="preview-text">静夜思 床前明月光 疑是地上霜</div>
                </div>
                <div class="preview-item">
                  <div class="preview-label">English</div>
                  <div class="preview-text">The quick brown fox jumps over the lazy dog</div>
                </div>
                <div class="preview-item">
                  <div class="preview-label">日本語</div>
                  <div class="preview-text">あいうえお かきくけこ さしすせそ</div>
                </div>
                <div class="preview-item">
                  <div class="preview-label">한국어</div>
                  <div class="preview-text">가나다라마 바사아자차 카타파하</div>
                </div>
              </div>
            </div>

            <div class="set-item">
              <div>
                <div class="set-item-title">动画速度</div>
                <div class="set-item-content">
                  <div class="flex items-center gap-2">
                    <n-switch v-model:value="setData.noAnimate">
                      <template #checked>关闭</template>
                      <template #unchecked>开启</template>
                    </n-switch>
                    <span>是否开启动画</span>
                  </div>
                </div>
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
          </div>
        </div>

        <!-- 播放设置 -->
        <div id="playback" ref="playbackRef" class="settings-section">
          <div class="settings-section-title">播放设置</div>
          <div class="settings-section-content">
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

            <div class="set-item">
              <div>
                <div class="set-item-title">自动播放</div>
                <div class="set-item-content">重新打开应用时是否自动继续播放</div>
              </div>
              <n-switch v-model:value="setData.autoPlay">
                <template #checked>开启</template>
                <template #unchecked>关闭</template>
              </n-switch>
            </div>
          </div>
        </div>

        <!-- 应用设置 -->
        <div v-if="isElectron" id="application" ref="applicationRef" class="settings-section">
          <div class="settings-section-title">应用设置</div>
          <div class="settings-section-content">
            <div class="set-item">
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

            <div class="set-item">
              <div>
                <div class="set-item-title">快捷键设置</div>
                <div class="set-item-content">自定义全局快捷键</div>
              </div>
              <n-button size="small" @click="showShortcutModal = true">配置</n-button>
            </div>

            <div class="set-item">
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
          </div>
        </div>

        <!-- 网络设置 -->
        <div v-if="isElectron" id="network" ref="networkRef" class="settings-section">
          <div class="settings-section-title">网络设置</div>
          <div class="settings-section-content">
            <div class="set-item">
              <div>
                <div class="set-item-title">音乐API端口</div>
                <div class="set-item-content">修改后需要重启应用</div>
              </div>
              <n-input-number v-model:value="setData.musicApiPort" />
            </div>

            <div class="set-item">
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

            <div class="set-item">
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
        </div>

        <!-- 系统管理 -->
        <div v-if="isElectron" id="system" ref="systemRef" class="settings-section">
          <div class="settings-section-title">系统管理</div>
          <div class="settings-section-content">
            <div class="set-item">
              <div>
                <div class="set-item-title">缓存管理</div>
                <div class="set-item-content">清除缓存</div>
              </div>
              <n-button size="small" @click="showClearCacheModal = true"> 清除缓存 </n-button>
            </div>

            <div class="set-item">
              <div>
                <div class="set-item-title">重启</div>
                <div class="set-item-content">重启应用</div>
              </div>
              <n-button size="small" @click="restartApp">重启</n-button>
            </div>
          </div>
        </div>

        <!-- 关于 -->
        <div id="about" ref="aboutRef" class="settings-section">
          <div class="settings-section-title">关于</div>
          <div class="settings-section-content">
            <div class="set-item">
              <div>
                <div class="set-item-title">版本</div>
                <div class="set-item-content">
                  {{ updateInfo.currentVersion }}
                  <template v-if="updateInfo.hasUpdate">
                    <n-tag type="success" class="ml-2"
                      >发现新版本 {{ updateInfo.latestVersion }}</n-tag
                    >
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <n-button size="small" :loading="checking" @click="checkForUpdates(true)">
                  {{ checking ? '检查中...' : '检查更新' }}
                </n-button>
                <n-button v-if="updateInfo.hasUpdate" size="small" @click="openReleasePage">
                  前往更新
                </n-button>
              </div>
            </div>

            <div
              class="set-item cursor-pointer hover:text-green-500 hover:bg-green-950 transition-all"
              @click="openAuthor"
            >
              <coffee>
                <div>
                  <div class="set-item-title">作者</div>
                  <div class="set-item-content">algerkong 点个star🌟呗</div>
                </div>
              </coffee>
              <div>
                <n-button size="small" @click="openAuthor">
                  <i class="ri-github-line"></i>前往github
                </n-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 捐赠支持 -->
        <div id="donation" ref="donationRef" class="settings-section">
          <div class="settings-section-title">捐赠支持</div>
          <div class="settings-section-content">
            <div class="set-item">
              <div>
                <div class="set-item-title">捐赠支持</div>
                <div class="set-item-content">感谢您的支持，让我有动力能够持续改进</div>
              </div>
              <n-button text @click="toggleDonationList">
                <template #icon>
                  <i :class="isDonationListVisible ? 'ri-eye-line' : 'ri-eye-off-line'" />
                </template>
                {{ isDonationListVisible ? '隐藏列表' : '显示列表' }}
              </n-button>
            </div>
            <donation-list v-if="isDonationListVisible" />
          </div>
        </div>
      </div>
      <play-bottom />
    </n-scrollbar>

    <!-- 快捷键设置弹窗 -->
    <shortcut-settings v-model:show="showShortcutModal" @change="handleShortcutsChange" />

    <!-- 代理设置弹窗 -->
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
    <!-- 清除缓存弹窗 -->
    <n-modal
      v-model:show="showClearCacheModal"
      preset="dialog"
      title="清除缓存"
      positive-text="确认"
      negative-text="取消"
      @positive-click="clearCache"
      @negative-click="
        () => {
          selectedCacheTypes = [];
        }
      "
    >
      <n-space vertical>
        <p>请选择要清除的缓存类型：</p>
        <n-checkbox-group v-model:value="selectedCacheTypes">
          <n-space vertical>
            <n-checkbox
              v-for="option in clearCacheOptions"
              :key="option.key"
              :value="option.key"
              :label="option.label"
            >
              <template #default>
                <div>
                  <div>{{ option.label }}</div>
                  <div class="text-gray-400 text-sm">{{ option.description }}</div>
                </div>
              </template>
            </n-checkbox>
          </n-space>
        </n-checkbox-group>
      </n-space>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import type { FormRules } from 'naive-ui';
import { useMessage } from 'naive-ui';
import { computed, h, nextTick, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';

import localData from '@/../main/set.json';
import Coffee from '@/components/Coffee.vue';
import DonationList from '@/components/common/DonationList.vue';
import PlayBottom from '@/components/common/PlayBottom.vue';
import ShortcutSettings from '@/components/settings/ShortcutSettings.vue';
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

// 使用 store 中的字体列表
const systemFonts = computed(() => store.state.systemFonts);

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
      store.commit('setSetData', {
        ...setData.value,
        fontFamily: 'system-ui'
      });
      return;
    }
    // 将选择的字体组合成字体列表
    store.commit('setSetData', {
      ...setData.value,
      fontFamily: newFonts.join(',')
    });
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

const isDonationListVisible = ref(localStorage.getItem('donationListVisible') !== 'false');

const toggleDonationList = () => {
  isDonationListVisible.value = !isDonationListVisible.value;
  localStorage.setItem('donationListVisible', isDonationListVisible.value.toString());
};

// 清除缓存相关
const showClearCacheModal = ref(false);
const clearCacheOptions = ref([
  { label: '播放历史', key: 'history', description: '清除播放过的歌曲记录' },
  { label: '收藏记录', key: 'favorite', description: '清除本地收藏的歌曲记录(不会影响云端收藏)' },
  { label: '用户数据', key: 'user', description: '清除登录信息和用户相关数据' },
  { label: '应用设置', key: 'settings', description: '清除应用的所有自定义设置' },
  { label: '下载记录', key: 'downloads', description: '清除下载历史记录(不会删除已下载的文件)' },
  { label: '音乐资源', key: 'resources', description: '清除已加载的音乐文件、歌词等资源缓存' },
  { label: '歌词资源', key: 'lyrics', description: '清除已加载的歌词资源缓存' }
]);

const selectedCacheTypes = ref<string[]>([]);

const clearCache = async () => {
  const clearTasks = selectedCacheTypes.value.map(async (type) => {
    switch (type) {
      case 'history':
        localStorage.removeItem('musicHistory');
        break;
      case 'favorite':
        localStorage.removeItem('favoriteList');
        break;
      case 'user':
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        store.commit('logout');
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
  message.success('清除成功，部分设置在重启后生效');
  showClearCacheModal.value = false;
  selectedCacheTypes.value = [];
};

const showShortcutModal = ref(false);

const handleShortcutsChange = (shortcuts: any) => {
  console.log('快捷键已更新:', shortcuts);
};

// 定义设置分类
const settingSections = [
  { id: 'basic', title: '基础设置' },
  { id: 'playback', title: '播放设置' },
  { id: 'application', title: '应用设置', electron: true },
  { id: 'network', title: '网络设置', electron: true },
  { id: 'system', title: '系统管理', electron: true },
  { id: 'about', title: '关于' },
  { id: 'donation', title: '捐赠支持' }
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
</style>

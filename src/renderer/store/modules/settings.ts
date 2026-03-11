import { cloneDeep, isArray, mergeWith } from 'lodash';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

import setDataDefault from '@/../main/set.json';
import homeRouter from '@/router/home';
import { useMenuStore } from '@/store/modules/menu';
import { isElectron } from '@/utils';
import {
  applyTheme,
  getCurrentTheme,
  getSystemTheme,
  ThemeType,
  watchSystemTheme
} from '@/utils/theme';

import { type AppUpdateState,createDefaultAppUpdateState } from '../../../shared/appUpdate';

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<ThemeType>(getCurrentTheme());
  const isMobile = ref(false);
  const isMiniMode = ref(false);
  const showUpdateModal = ref(false);
  const appUpdateState = ref<AppUpdateState>(createDefaultAppUpdateState());
  const showArtistDrawer = ref(false);
  const currentArtistId = ref<number | null>(null);
  const systemFonts = ref<{ label: string; value: string }[]>([
    { label: '系统默认', value: 'system-ui' }
  ]);
  const showDownloadDrawer = ref(false);

  // 系统主题监听器清理函数
  let systemThemeCleanup: (() => void) | null = null;

  // 先声明 setData ref 但不初始化
  const setData = ref<any>({});

  // 先定义 setSetData 函数
  const setSetData = (data: any) => {
    // 合并现有设置和新设置
    const mergedData = {
      ...setData.value,
      ...data
    };

    if (isElectron) {
      window.electron.ipcRenderer.send('set-store-value', 'set', cloneDeep(mergedData));
    } else {
      localStorage.setItem('appSettings', JSON.stringify(cloneDeep(mergedData)));
    }
    setData.value = cloneDeep(mergedData);
  };

  // 初始化时先从存储中读取设置
  const getInitialSettings = () => {
    // 从存储中获取保存的设置
    const savedSettings = isElectron
      ? window.electron.ipcRenderer.sendSync('get-store-value', 'set')
      : JSON.parse(localStorage.getItem('appSettings') || '{}');

    // 自定义合并策略：如果是数组，直接使用源数组（覆盖默认值）
    const customizer = (_objValue: any, srcValue: any) => {
      if (isArray(srcValue)) {
        return srcValue;
      }
      return undefined;
    };

    // 合并默认设置和保存的设置
    const mergedSettings = mergeWith({}, setDataDefault, savedSettings, customizer);

    // 更新设置并返回
    setSetData(mergedSettings);
    return mergedSettings;
  };

  // 初始化 setData
  setData.value = getInitialSettings();

  /**
   * 保存导入的自定义API插件
   * @param plugin 包含name和content的对象
   */
  const setCustomApiPlugin = (plugin: { name: string; content: string }) => {
    setSetData({
      customApiPlugin: plugin.content,
      customApiPluginName: plugin.name
    });
  };

  const toggleTheme = () => {
    if (setData.value.autoTheme) {
      // 如果是自动模式，切换到手动模式并设置相反的主题
      const newTheme = theme.value === 'dark' ? 'light' : 'dark';
      setSetData({
        autoTheme: false,
        manualTheme: newTheme
      });
      theme.value = newTheme;
      applyTheme(newTheme);
      // 停止监听系统主题
      if (systemThemeCleanup) {
        systemThemeCleanup();
        systemThemeCleanup = null;
      }
    } else {
      // 手动模式下正常切换
      const newTheme = theme.value === 'dark' ? 'light' : 'dark';
      theme.value = newTheme;
      setSetData({ manualTheme: newTheme });
      applyTheme(newTheme);
    }
  };

  const setAutoTheme = (auto: boolean) => {
    setSetData({ autoTheme: auto });

    if (auto) {
      // 启用自动模式
      const systemTheme = getSystemTheme();
      theme.value = systemTheme;
      applyTheme(systemTheme);

      // 开始监听系统主题变化
      systemThemeCleanup = watchSystemTheme((newTheme) => {
        if (setData.value.autoTheme) {
          theme.value = newTheme;
          applyTheme(newTheme);
        }
      });
    } else {
      // 切换到手动模式
      const manualTheme = setData.value.manualTheme || 'light';
      theme.value = manualTheme;
      applyTheme(manualTheme);

      // 停止监听系统主题
      if (systemThemeCleanup) {
        systemThemeCleanup();
        systemThemeCleanup = null;
      }
    }
  };

  const setMiniMode = (value: boolean) => {
    isMiniMode.value = value;
  };

  const setShowUpdateModal = (value: boolean) => {
    showUpdateModal.value = value;
  };

  const setAppUpdateState = (value: AppUpdateState) => {
    appUpdateState.value = value;
  };

  const setShowArtistDrawer = (show: boolean) => {
    showArtistDrawer.value = show;
    if (!show) {
      currentArtistId.value = null;
    }
  };

  const setCurrentArtistId = (id: number) => {
    currentArtistId.value = id;
  };

  const setSystemFonts = (fonts: string[]) => {
    systemFonts.value = [
      { label: '系统默认', value: 'system-ui' },
      ...fonts.map((font) => ({
        label: font,
        value: font
      }))
    ];
  };

  const setShowDownloadDrawer = (show: boolean) => {
    showDownloadDrawer.value = show;
  };

  const setLanguage = (language: string) => {
    setSetData({ language });
    if (isElectron) {
      window.electron.ipcRenderer.send('change-language', language);
    }
  };

  const initializeSettings = () => {
    // const savedSettings = getInitialSettings();
    // setData.value = savedSettings;
  };

  const initializeTheme = () => {
    // 根据设置初始化主题
    if (setData.value.autoTheme) {
      setAutoTheme(true);
    } else {
      const manualTheme = setData.value.manualTheme || getCurrentTheme();
      theme.value = manualTheme;
      applyTheme(manualTheme);
    }
  };

  const initializeSystemFonts = async () => {
    if (!isElectron) return;
    if (systemFonts.value.length > 1) return;

    try {
      const fonts = await window.api.invoke('get-system-fonts');
      setSystemFonts(fonts);
    } catch (error) {
      console.error('获取系统字体失败:', error);
    }
  };

  // 计算移动端状态的函数
  const calculateMobileStatus = () => {
    const userAgentFlag = navigator.userAgent.match(
      /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i
    );
    const isMobileWidth = window.innerWidth < 500;
    const isMobileDevice = !!userAgentFlag || isMobileWidth;
    const tabletMode = setData.value?.tabletMode;

    return isMobileDevice && !tabletMode;
  };

  // 更新移动端状态和DOM类
  const updateMobileStatus = () => {
    const menuStore = useMenuStore();
    const shouldUseMobileStyle = calculateMobileStatus();

    // 更新store状态
    if (shouldUseMobileStyle) {
      menuStore.setMenus(homeRouter.filter((item) => item.meta.isMobile));
    } else {
      menuStore.setMenus(homeRouter);
    }

    // 更新DOM类
    if (shouldUseMobileStyle) {
      document.documentElement.classList.add('mobile');
      document.documentElement.classList.remove('pc');
    } else {
      document.documentElement.classList.add('pc');
      document.documentElement.classList.remove('mobile');
    }

    isMobile.value = shouldUseMobileStyle;
  };

  // 监听平板模式变化
  watch(
    () => setData.value?.tabletMode,
    () => {
      updateMobileStatus();
    },
    { immediate: true }
  );

  // 监听窗口大小变化
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateMobileStatus);
  }

  return {
    setData,
    theme,
    isMobile,
    isMiniMode,
    showUpdateModal,
    appUpdateState,
    showArtistDrawer,
    currentArtistId,
    systemFonts,
    showDownloadDrawer,
    setSetData,
    toggleTheme,
    setAutoTheme,
    setMiniMode,
    setShowUpdateModal,
    setAppUpdateState,
    setShowArtistDrawer,
    setCurrentArtistId,
    setSystemFonts,
    setShowDownloadDrawer,
    setLanguage,
    initializeSettings,
    initializeTheme,
    initializeSystemFonts,
    setCustomApiPlugin
  };
});

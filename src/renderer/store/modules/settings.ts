import { cloneDeep, merge } from 'lodash';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import setDataDefault from '@/../main/set.json';
import { isElectron } from '@/utils';
import {
  applyTheme,
  getCurrentTheme,
  getSystemTheme,
  ThemeType,
  watchSystemTheme
} from '@/utils/theme';

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<ThemeType>(getCurrentTheme());
  const isMobile = ref(false);
  const isMiniMode = ref(false);
  const showUpdateModal = ref(false);
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

    // 合并默认设置和保存的设置
    const mergedSettings = merge({}, setDataDefault, savedSettings);

    // 更新设置并返回
    setSetData(mergedSettings);
    return mergedSettings;
  };

  // 初始化 setData
  setData.value = getInitialSettings();

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

  return {
    setData,
    theme,
    isMobile,
    isMiniMode,
    showUpdateModal,
    showArtistDrawer,
    currentArtistId,
    systemFonts,
    showDownloadDrawer,
    setSetData,
    toggleTheme,
    setAutoTheme,
    setMiniMode,
    setShowUpdateModal,
    setShowArtistDrawer,
    setCurrentArtistId,
    setSystemFonts,
    setShowDownloadDrawer,
    setLanguage,
    initializeSettings,
    initializeTheme,
    initializeSystemFonts
  };
});

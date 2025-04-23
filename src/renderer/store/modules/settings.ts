import { cloneDeep, merge } from 'lodash';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import setDataDefault from '@/../main/set.json';
import { isElectron } from '@/utils';
import { applyTheme, getCurrentTheme, ThemeType } from '@/utils/theme';

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
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    applyTheme(theme.value);
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
    applyTheme(theme.value);
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

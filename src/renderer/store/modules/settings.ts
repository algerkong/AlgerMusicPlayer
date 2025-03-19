import { cloneDeep } from 'lodash';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import setDataDefault from '@/../main/set.json';
import { isElectron } from '@/utils';
import { applyTheme, getCurrentTheme, ThemeType } from '@/utils/theme';

export const useSettingsStore = defineStore('settings', () => {
  // 初始化时先从存储中读取设置
  const getInitialSettings = () => {
    if (isElectron) {
      const savedSettings = window.electron.ipcRenderer.sendSync('get-store-value', 'set');
      return savedSettings || setDataDefault;
    }
    const savedSettings = localStorage.getItem('appSettings');
    return savedSettings ? JSON.parse(savedSettings) : setDataDefault;
  };

  const setData = ref(getInitialSettings());
  const theme = ref<ThemeType>(getCurrentTheme());
  const isMobile = ref(false);
  const showUpdateModal = ref(false);
  const showArtistDrawer = ref(false);
  const currentArtistId = ref<number | null>(null);
  const systemFonts = ref<{ label: string; value: string }[]>([
    { label: '系统默认', value: 'system-ui' }
  ]);
  const showDownloadDrawer = ref(false);

  const setSetData = (data: any) => {
    if (isElectron) {
      console.log('data', data);
      window.electron.ipcRenderer.send('set-store-value', 'set', cloneDeep(data));
      setData.value = cloneDeep(data);
    } else {
      localStorage.setItem('appSettings', JSON.stringify(cloneDeep(data)));
    }
  };

  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    applyTheme(theme.value);
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
    setSetData({
      ...setData.value,
      language
    });
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
    showUpdateModal,
    showArtistDrawer,
    currentArtistId,
    systemFonts,
    showDownloadDrawer,
    setSetData,
    toggleTheme,
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

import { cloneDeep, isArray, mergeWith } from 'lodash';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

import setDataDefault from '@/../main/set.json';
import homeRouter from '@/router/home';
import { useMenuStore } from '@/store/modules/menu';
import { isElectron } from '@/utils';
import { applyTheme, ThemeType } from '@/utils/theme';

import { type AppUpdateState, createDefaultAppUpdateState } from '../../../shared/appUpdate';

export const useSettingsStore = defineStore('settings', () => {
  /** 固定深色，不再提供浅色/跟随系统 */
  const theme = ref<ThemeType>('dark');
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
      window.api.setStoreValue('set', cloneDeep(mergedData));
    } else {
      localStorage.setItem('appSettings', JSON.stringify(cloneDeep(mergedData)));
    }
    setData.value = cloneDeep(mergedData);
  };

  // 初始化时先从存储中读取设置
  const getInitialSettings = () => {
    // 从存储中获取保存的设置
    const savedSettings = isElectron
      ? window.api.getStoreValue('set')
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

  /** 兼容旧调用：主题已锁深色，切换无效 */
  const toggleTheme = () => {
    theme.value = 'dark';
    applyTheme('dark');
    setSetData({ autoTheme: false, manualTheme: 'dark' });
  };

  const setAutoTheme = (_auto: boolean) => {
    setSetData({ autoTheme: false, manualTheme: 'dark' });
    theme.value = 'dark';
    applyTheme('dark');
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
      window.api.changeLanguage(language);
    }
  };

  const initializeSettings = () => {
    // const savedSettings = getInitialSettings();
    // setData.value = savedSettings;
  };

  const initializeTheme = () => {
    theme.value = 'dark';
    applyTheme('dark');
    // 清掉历史浅色/跟随系统配置，避免下次又被读出来
    if (setData.value.autoTheme || setData.value.manualTheme !== 'dark') {
      setSetData({ autoTheme: false, manualTheme: 'dark' });
    }
  };

  const initializeSystemFonts = async () => {
    if (!isElectron) return;
    if (systemFonts.value.length > 1) return;

    try {
      const fonts = await window.api.getSystemFonts();
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
    initializeSystemFonts
  };
});

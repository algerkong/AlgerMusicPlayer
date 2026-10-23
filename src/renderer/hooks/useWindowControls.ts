import { type Ref, ref } from 'vue';

import { useSettingsStore } from '@/store/modules/settings';
import { isElectron } from '@/utils';

type CloseAction = 'minimize' | 'close';

type WindowControls = {
  showCloseModal: Ref<boolean>;
  rememberChoice: Ref<boolean>;
  minimizeWindow: () => void;
  toggleMaximizeWindow: () => void;
  toggleFullScreen: () => void;
  miniWindow: () => void;
  requestClose: () => void;
  confirmCloseAction: (action: CloseAction) => void;
};

/**
 * 窗口控制逻辑（标题栏与展开歌词视图共用，#492）
 * 抽出共用实现，保证从任意入口点「关闭」时行为与结果一致。
 */
export const useWindowControls = (): WindowControls => {
  const settingsStore = useSettingsStore();
  const showCloseModal = ref(false);
  const rememberChoice = ref(false);

  const minimizeWindow = () => {
    if (!isElectron) return;
    window.api.minimize();
  };

  const toggleMaximizeWindow = () => {
    if (!isElectron) return;
    window.api.maximize();
  };

  const toggleFullScreen = () => {
    if (!isElectron) return;
    window.api.toggleFullScreen();
  };

  const miniWindow = () => {
    if (!isElectron) return;
    window.api.miniWindow();
  };

  /**
   * 关闭窗口：跟随用户的关闭偏好
   * - minimize：最小化到托盘
   * - close：关闭窗口（macOS 隐藏窗口，其他平台退出）
   * - 未设置（ask）：先弹确认框，由 confirmCloseAction 执行实际动作
   */
  const requestClose = () => {
    if (!isElectron) return;

    const { closeAction } = settingsStore.setData;
    if (closeAction === 'minimize') {
      window.api.miniTray();
      return;
    }
    if (closeAction === 'close') {
      window.api.close();
      return;
    }
    showCloseModal.value = true;
  };

  // 确认框内的选择：需要时记住偏好，再执行对应动作
  const confirmCloseAction = (action: CloseAction) => {
    if (rememberChoice.value) {
      settingsStore.setSetData({
        ...settingsStore.setData,
        closeAction: action
      });
    }

    showCloseModal.value = false;
    if (action === 'minimize') {
      setTimeout(() => {
        window.api.miniTray();
      }, 200);
    } else {
      // Fix: 使用 quitApp 而不是 close，确保 macOS 上能真正退出
      window.api.quitApp();
    }
  };

  return {
    showCloseModal,
    rememberChoice,
    minimizeWindow,
    toggleMaximizeWindow,
    toggleFullScreen,
    miniWindow,
    requestClose,
    confirmCloseAction
  };
};

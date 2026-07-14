/**
 * 屏幕休眠 / 系统挂起后 Electron 偶发白屏：
 * - 强制 DOM 重绘（打醒 backdrop-filter / 合成层）
 * - 时间跳跃检测（Linux 仅 DPMS 黑屏时 powerMonitor 不一定发事件）
 */

export type WakeRecoverHandler = () => void | Promise<void>;

function forceDomRepaint() {
  const root = document.documentElement;
  const body = document.body;
  if (!root || !body) return;

  root.classList.add('wake-repaint');
  // 强制同步布局
  void root.offsetHeight;
  void body.offsetHeight;

  // 轻抖 opacity，逼 compositor 重建 layer
  const prev = body.style.opacity;
  body.style.opacity = '0.999';
  requestAnimationFrame(() => {
    body.style.opacity = prev || '';
    root.classList.remove('wake-repaint');
  });
}

/**
 * 安装唤醒自愈。返回卸载函数。
 * @param onRecover 业务层：重刷封面 chrome、恢复 AudioContext 等
 */
export function installWakeRecovery(onRecover?: WakeRecoverHandler): () => void {
  let lastTick = Date.now();
  let recovering = false;
  let rafId = 0;

  const runRecover = async (reason: string) => {
    if (recovering) return;
    recovering = true;
    try {
      console.log('[wake-recovery]', reason);
      forceDomRepaint();
      await onRecover?.();
      // 第二拍：GPU 晚半拍回来时再刷一次
      setTimeout(() => {
        forceDomRepaint();
        void onRecover?.();
      }, 400);
    } catch (error) {
      console.warn('[wake-recovery] failed', error);
    } finally {
      setTimeout(() => {
        recovering = false;
      }, 1200);
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      void runRecover('visibilitychange:visible');
    }
  };

  const onFocus = () => {
    // 仅在有明显时间空洞时（更像休眠回来），避免每次切窗都抖
    if (Date.now() - lastTick > 2500) {
      void runRecover('window-focus-after-gap');
    }
  };

  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      void runRecover('pageshow:bfcache');
    }
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onFocus);
  window.addEventListener('pageshow', onPageShow);

  // rAF 时间跳跃：纯黑屏休眠时 JS 可能仍跑，但帧间隔会跳很大
  const tick = () => {
    const now = Date.now();
    if (now - lastTick > 4000) {
      void runRecover('raf-time-jump');
    }
    lastTick = now;
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  let offIpc: (() => void) | undefined;
  if (typeof window !== 'undefined' && window.api?.onSystemPowerResume) {
    offIpc = window.api.onSystemPowerResume(() => {
      void runRecover('ipc:system-power-resume');
    });
  }

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('pageshow', onPageShow);
    cancelAnimationFrame(rafId);
    offIpc?.();
  };
}

import { ref } from 'vue';

/**
 * 页面缩放功能的组合式API
 * 提供页面缩放相关的状态和方法
 */
export function useZoom() {
  // 缩放相关常量
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 1.5;
  const ZOOM_STEP = 0.05; // 5%的步长

  // 当前缩放因子
  const zoomFactor = ref(1);

  // 初始化获取当前缩放比例
  const initZoomFactor = async () => {
    try {
      const currentZoom = await window.ipcRenderer.invoke('get-content-zoom');
      zoomFactor.value = currentZoom;
    } catch (error) {
      console.error('获取缩放比例失败:', error);
    }
  };

  // 增加缩放比例，保证100%为节点
  const increaseZoom = () => {
    let newZoom;

    // 如果当前缩放低于100%并且增加后会超过100%，则直接设为100%
    if (zoomFactor.value < 1.0 && zoomFactor.value + ZOOM_STEP > 1.0) {
      newZoom = 1.0; // 精确设置为100%
    } else {
      newZoom = Math.min(MAX_ZOOM, Math.round((zoomFactor.value + ZOOM_STEP) * 20) / 20);
    }

    setZoomFactor(newZoom);
  };

  // 减少缩放比例，保证100%为节点
  const decreaseZoom = () => {
    let newZoom;

    // 如果当前缩放大于100%并且减少后会低于100%，则直接设为100%
    if (zoomFactor.value > 1.0 && zoomFactor.value - ZOOM_STEP < 1.0) {
      newZoom = 1.0; // 精确设置为100%
    } else {
      newZoom = Math.max(MIN_ZOOM, Math.round((zoomFactor.value - ZOOM_STEP) * 20) / 20);
    }

    setZoomFactor(newZoom);
  };

  // 重置缩放比例到系统建议值
  const resetZoom = async () => {
    try {
      setZoomFactor(1);
    } catch (error) {
      console.error('重置缩放比例失败:', error);
    }
  };

  // 设置为100%标准缩放
  const setZoom100 = () => {
    setZoomFactor(1.0);
  };

  // 设置缩放比例
  const setZoomFactor = (zoom: number) => {
    window.ipcRenderer.send('set-content-zoom', zoom);
    zoomFactor.value = zoom;
  };

  // 检查是否为100%缩放
  const isZoom100 = () => {
    return Math.abs(zoomFactor.value - 1.0) < 0.001;
  };

  return {
    zoomFactor,
    initZoomFactor,
    increaseZoom,
    decreaseZoom,
    resetZoom,
    setZoom100,
    setZoomFactor,
    isZoom100,
    MIN_ZOOM,
    MAX_ZOOM,
    ZOOM_STEP
  };
}

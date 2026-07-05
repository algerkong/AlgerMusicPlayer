// 防抖 localStorage 包装：高频状态变更（volume 拖动、播放/暂停切换）
// 在 2s 内只落盘一次，正常关闭时通过 beforeunload 刷新未写入数据。
// pinia-plugin-persistedstate 默认每次 mutation 都同步写入；换成这个包装即可
// 降低 I/O 与 JSON.stringify/minify 的总开销。
//
// 多 store 共用同一实例：debounce 的回调不带 key 参数，触发时 flush 整个
// pendingWrites map。这样多个 key 在防抖窗口内交替写入也不会互相吞参数
// （lodash debounce 只用最后一次的参数触发）。

import { debounce } from 'lodash';

const pendingWrites = new Map<string, string>();

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // 配额超限是预期失败：上层 store 已通过 minifySong 兜底，这里仅记录方便定位
    console.error(`[debouncedStorage] localStorage 写入失败 key=${key}（可能超出配额）:`, error);
  }
};

/** 把 pendingWrites 里所有未落盘的 key 一次性写入并清空 */
const flushPendingWrites = () => {
  pendingWrites.forEach((value, key) => {
    safeSetItem(key, value);
  });
  pendingWrites.clear();
};

const debouncedFlush = debounce(flushPendingWrites, 2000);

/**
 * 与 localStorage 接口兼容的防抖写入实例
 * 多个 Pinia store 共用同一个，避免重复创建定时器/监听器
 *
 * 注意：极端非正常退出（kill -9 / 系统断电 / 主进程崩溃）下 beforeunload
 * 不一定触发，最近 2s 的写入可能丢失。对 volume / isPlay / playMusic 等
 * 「丢一次也无大碍」的状态可以接受；如果新增了不能容忍丢写的关键状态，
 * 应直接用 localStorage 而非 debouncedLocalStorage。
 */
export const debouncedLocalStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    pendingWrites.set(key, value);
    debouncedFlush();
  },
  removeItem: (key: string) => {
    // 同步清掉 pendingWrites，防止已排队的 flush 把旧值又写回去
    pendingWrites.delete(key);
    localStorage.removeItem(key);
  }
};

/**
 * 立即落盘所有 pending 写入并取消排队的 debounce
 * 用于一次性的关键操作（如数据迁移完成后写 flag）：先 flush 再写 flag，
 * 避免「flag 已写入、store 还在防抖窗口里」的不一致
 */
export const flushDebouncedStorage = () => {
  debouncedFlush.cancel();
  flushPendingWrites();
};

// 模块级注册一次：beforeunload 时立即 flush 所有未写入数据，并取消排队的 debounce
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushDebouncedStorage);
}

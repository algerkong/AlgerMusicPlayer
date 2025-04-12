import { isElectron } from '@/utils';

import { useUserStore } from '../store/modules/user';

/**
 * 获取用户ID
 * @returns 用户ID或null
 */
function getUserId(): string | null {
  const userStore = useUserStore();
  return userStore.user?.userId?.toString() || null;
}

/**
 * 记录页面访问
 * @param page 页面名称或路径
 */
export async function recordVisit(page: string): Promise<void> {
  if (!isElectron) return;
  try {
    const userId = getUserId();
    await window.api.invoke('record-visit', page, userId);
    console.log(`页面访问已记录: ${page}`);
  } catch (error) {
    console.error('记录页面访问失败:', error);
  }
}

/**
 * 记录歌曲播放
 * @param songId 歌曲ID
 * @param songName 歌曲名称
 * @param artistName 艺术家名称
 * @param duration 时长（秒）
 * @param completedPlay 是否完整播放
 */
export async function recordPlay(
  songId: string | number,
  songName: string,
  artistName: string,
  duration: number = 0,
  completedPlay: boolean = false
): Promise<void> {
  if (!isElectron) return;
  try {
    const userId = getUserId();

    await window.api.invoke('record-play', {
      userId,
      songId,
      songName,
      artistName,
      duration,
      completedPlay
    });

    console.log(`歌曲播放已记录: ${songName}`);
  } catch (error) {
    console.error('记录歌曲播放失败:', error);
  }
}

/**
 * 获取统计摘要
 * @returns 统计数据摘要
 */
export async function getStatsSummary(): Promise<any> {
  if (!isElectron) return null;
  try {
    return await window.api.invoke('get-stats-summary');
  } catch (error) {
    console.error('获取统计摘要失败:', error);
    return null;
  }
}

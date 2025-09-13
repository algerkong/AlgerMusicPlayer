import { Router } from 'vue-router';

import { useMusicStore } from '@/store/modules/music';

/**
 * 导航到音乐列表页面的通用方法
 * @param router Vue路由实例
 * @param options 导航选项
 */
export function navigateToMusicList(
  router: Router,
  options: {
    id?: string | number;
    type?: 'album' | 'playlist' | 'dailyRecommend' | string;
    name: string;
    songList: any[];
    listInfo?: any;
    canRemove?: boolean;
  }
) {
  const musicStore = useMusicStore();
  const { id, type, name, songList, listInfo, canRemove = false } = options;

  // 如果是每日推荐，不需要设置 musicStore，直接从 recommendStore 获取
  if (type !== 'dailyRecommend') {
    musicStore.setCurrentMusicList(songList, name, listInfo, canRemove);
  } else {
    // 确保 musicStore 的数据被清空，避免显示旧的列表
    musicStore.clearCurrentMusicList();
  }

  // 路由跳转
  if (id) {
    router.push({
      name: 'musicList',
      params: { id },
      query: { type }
    });
  } else {
    router.push({
      name: 'musicList',
      query: { type: 'dailyRecommend' }
    });
  }
}

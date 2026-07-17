import type { SongResult } from '@/types/music';

/**
 * 从 localStorage 获取项目，带类型安全和错误处理
 */
export function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * 设置 localStorage 项目，自动序列化
 */
export function setLocalStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save to localStorage: ${key}`, error);
  }
}

/**
 * 比较B站视频ID的辅助函数
 */
export const isBilibiliIdMatch = (id1: string | number, id2: string | number): boolean => {
  const str1 = String(id1);
  const str2 = String(id2);

  // 如果两个ID都不包含--分隔符，直接比较
  if (!str1.includes('--') && !str2.includes('--')) {
    return str1 === str2;
  }

  if (str1.includes('--') || str2.includes('--')) {
    // 尝试从ID中提取bvid和cid
    const extractBvIdAndCid = (str: string) => {
      if (!str.includes('--')) return { bvid: '', cid: '' };
      const parts = str.split('--');
      if (parts.length >= 3) {
        // bvid--pid--cid格式
        return { bvid: parts[0], cid: parts[2] };
      } else if (parts.length === 2) {
        // 旧格式或其他格式
        return { bvid: '', cid: parts[1] };
      }
      return { bvid: '', cid: '' };
    };

    const { bvid: bvid1, cid: cid1 } = extractBvIdAndCid(str1);
    const { bvid: bvid2, cid: cid2 } = extractBvIdAndCid(str2);

    // 如果两个ID都有bvid，比较bvid和cid
    if (bvid1 && bvid2) {
      return bvid1 === bvid2 && cid1 === cid2;
    }

    // 其他情况，只比较cid部分
    if (cid1 && cid2) {
      return cid1 === cid2;
    }
  }

  // 默认情况，直接比较完整ID
  return str1 === str2;
};

/** 雪花 id 一律 string，禁止 Number/parseInt 丢精度 */
export function trackIdKey(id: unknown): string {
  if (id == null) return '';
  if (typeof id === 'string' || typeof id === 'number') return String(id);
  return '';
}

/**
 * 曲目 id 相等（含 B 站 bvid--pid--cid）。
 * 全库 id 比较只走这里，禁止再写 String(a) === String(b)。
 */
export function sameTrackId(a: unknown, b: unknown): boolean {
  const sa = trackIdKey(a);
  const sb = trackIdKey(b);
  if (!sa || !sb) return false;
  if (sa.includes('--') || sb.includes('--')) {
    return isBilibiliIdMatch(sa, sb);
  }
  return sa === sb;
}

/**
 * Fisher-Yates 洗牌算法
 * @param list 歌曲列表
 * @param currentSong 当前歌曲（会被放在第一位）
 */
export const performShuffle = (list: SongResult[], currentSong?: SongResult): SongResult[] => {
  if (list.length <= 1) return [...list];

  const result: SongResult[] = [];
  const remainingSongs = [...list];

  // 如果指定了当前歌曲，先把它放在第一位
  if (currentSong && currentSong.id) {
    const currentSongIndex = remainingSongs.findIndex((song) => song.id === currentSong.id);
    if (currentSongIndex !== -1) {
      // 把当前歌曲放在第一位
      result.push(remainingSongs.splice(currentSongIndex, 1)[0]);
    }
  }

  // 对剩余歌曲进行洗牌
  if (remainingSongs.length > 0) {
    // Fisher-Yates 洗牌算法
    for (let i = remainingSongs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
    }

    // 把洗牌后的歌曲添加到结果中
    result.push(...remainingSongs);
  }

  return result;
};

/**
 * 预加载封面图片
 */
export const preloadCoverImage = (
  picUrl: string,
  getImgUrl: (url: string, size: string) => string
) => {
  if (!picUrl) return;

  try {
    const imageUrl = getImgUrl(picUrl, '500y500');
    console.log('预加载封面图片:', imageUrl);

    // 创建一个 Image 对象来预加载图片
    const img = new Image();
    img.src = imageUrl;

    // 可选：添加加载完成和错误的回调
    img.onload = () => {
      console.log('封面图片预加载成功:', imageUrl);
    };

    img.onerror = () => {
      console.error('封面图片预加载失败:', imageUrl);
    };
  } catch (error) {
    console.error('预加载封面图片出错:', error);
  }
};

import { cloneDeep } from 'lodash';
import { useMessage } from 'naive-ui';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getMusicLrc } from '@/api/music';
import { getSongUrl } from '@/store/modules/player';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';

const ipcRenderer = isElectron ? window.electron.ipcRenderer : null;

// 全局下载管理（闭包模式）
const createDownloadManager = () => {
  // 正在下载的文件集合
  const activeDownloads = new Set<string>();

  // 已经发送了通知的文件集合（避免重复通知）
  const notifiedDownloads = new Set<string>();

  // 事件监听器是否已初始化
  let isInitialized = false;

  // 监听器引用（用于清理）
  let completeListener: ((event: any, data: any) => void) | null = null;
  let errorListener: ((event: any, data: any) => void) | null = null;

  return {
    // 添加下载
    addDownload: (filename: string) => {
      activeDownloads.add(filename);
    },

    // 移除下载
    removeDownload: (filename: string) => {
      activeDownloads.delete(filename);
      // 延迟清理通知记录
      setTimeout(() => {
        notifiedDownloads.delete(filename);
      }, 5000);
    },

    // 标记文件已通知
    markNotified: (filename: string) => {
      notifiedDownloads.add(filename);
    },

    // 检查文件是否已通知
    isNotified: (filename: string) => {
      return notifiedDownloads.has(filename);
    },

    // 清理所有下载
    clearDownloads: () => {
      activeDownloads.clear();
      notifiedDownloads.clear();
    },

    // 初始化事件监听器
    initEventListeners: (message: any, t: any) => {
      if (isInitialized) return;

      // 移除可能存在的旧监听器
      if (completeListener) {
        ipcRenderer?.removeListener('music-download-complete', completeListener);
      }

      if (errorListener) {
        ipcRenderer?.removeListener('music-download-error', errorListener);
      }

      // 创建新的监听器
      completeListener = (_event, data) => {
        if (!data.filename || !activeDownloads.has(data.filename)) return;

        // 如果该文件已经通知过，则跳过
        if (notifiedDownloads.has(data.filename)) return;

        // 标记为已通知
        notifiedDownloads.add(data.filename);

        // 从活动下载移除
        activeDownloads.delete(data.filename);
      };

      errorListener = (_event, data) => {
        if (!data.filename || !activeDownloads.has(data.filename)) return;

        // 如果该文件已经通知过，则跳过
        if (notifiedDownloads.has(data.filename)) return;

        // 标记为已通知
        notifiedDownloads.add(data.filename);

        // 显示失败通知
        message.error(
          t('songItem.message.downloadFailed', {
            filename: data.filename,
            error: data.error || '未知错误'
          })
        );

        // 从活动下载移除
        activeDownloads.delete(data.filename);
      };

      // 添加监听器
      ipcRenderer?.on('music-download-complete', completeListener);
      ipcRenderer?.on('music-download-error', errorListener);

      isInitialized = true;
    },

    // 清理事件监听器
    cleanupEventListeners: () => {
      if (!isInitialized) return;

      if (completeListener) {
        ipcRenderer?.removeListener('music-download-complete', completeListener);
        completeListener = null;
      }

      if (errorListener) {
        ipcRenderer?.removeListener('music-download-error', errorListener);
        errorListener = null;
      }

      isInitialized = false;
    },

    // 获取活跃下载数量
    getActiveDownloadCount: () => {
      return activeDownloads.size;
    },

    // 检查是否有特定文件正在下载
    hasDownload: (filename: string) => {
      return activeDownloads.has(filename);
    }
  };
};

// 创建单例下载管理器
const downloadManager = createDownloadManager();

export const useDownload = () => {
  const { t } = useI18n();
  const message = useMessage();
  const isDownloading = ref(false);

  // 初始化事件监听器
  downloadManager.initEventListeners(message, t);

  /**
   * 下载单首音乐
   * @param song 歌曲信息
   * @returns Promise<void>
   */
  const downloadMusic = async (song: SongResult) => {
    if (isDownloading.value) {
      message.warning(t('songItem.message.downloading'));
      return;
    }

    try {
      isDownloading.value = true;

      const musicUrl = (await getSongUrl(song.id as number, cloneDeep(song), true)) as any;
      if (!musicUrl) {
        throw new Error(t('songItem.message.getUrlFailed'));
      }

      // 构建文件名
      const artistNames = (song.ar || song.song?.artists)?.map((a) => a.name).join(',');
      const filename = `${song.name} - ${artistNames}`;

      // 检查是否已在下载
      if (downloadManager.hasDownload(filename)) {
        isDownloading.value = false;
        return;
      }

      // 添加到活动下载集合
      downloadManager.addDownload(filename);

      const songData = cloneDeep(song);
      songData.ar = songData.ar || songData.song?.artists;

      // 发送下载请求
      ipcRenderer?.send('download-music', {
        url: typeof musicUrl === 'string' ? musicUrl : musicUrl.url,
        filename,
        songInfo: {
          ...songData,
          downloadTime: Date.now()
        },
        type: musicUrl.type
      });

      message.success(t('songItem.message.downloadQueued'));

      // 简化的监听逻辑，基本通知由全局监听器处理
      setTimeout(() => {
        isDownloading.value = false;
      }, 2000);
    } catch (error: any) {
      console.error('Download error:', error);
      isDownloading.value = false;
      message.error(error.message || t('songItem.message.downloadFailed'));
    }
  };

  /**
   * 批量下载音乐
   * @param songs 歌曲列表
   * @returns Promise<void>
   */
  const batchDownloadMusic = async (songs: SongResult[]) => {
    if (isDownloading.value) {
      message.warning(t('favorite.downloading'));
      return;
    }

    if (songs.length === 0) {
      message.warning(t('favorite.selectSongsFirst'));
      return;
    }

    try {
      isDownloading.value = true;
      message.success(t('favorite.downloading'));

      let successCount = 0;
      let failCount = 0;
      const totalCount = songs.length;

      // 下载进度追踪
      const trackProgress = () => {
        if (successCount + failCount === totalCount) {
          isDownloading.value = false;
          message.success(t('favorite.downloadSuccess'));
        }
      };

      // 并行获取所有歌曲的下载链接
      const downloadUrls = await Promise.all(
        songs.map(async (song) => {
          try {
            const data = (await getSongUrl(song.id, song, true)) as any;
            return { song, ...data };
          } catch (error) {
            console.error(`获取歌曲 ${song.name} 下载链接失败:`, error);
            failCount++;
            return { song, url: null };
          }
        })
      );

      // 开始下载有效的链接
      downloadUrls.forEach(({ song, url, type }) => {
        if (!url) {
          failCount++;
          trackProgress();
          return;
        }

        const songData = cloneDeep(song);
        const filename = `${song.name} - ${(song.ar || song.song?.artists)?.map((a) => a.name).join(',')}`;

        // 检查是否已在下载
        if (downloadManager.hasDownload(filename)) {
          failCount++;
          trackProgress();
          return;
        }

        // 添加到活动下载集合
        downloadManager.addDownload(filename);

        const songInfo = {
          ...songData,
          ar: songData.ar || songData.song?.artists,
          downloadTime: Date.now()
        };

        ipcRenderer?.send('download-music', {
          url,
          filename,
          songInfo,
          type
        });

        successCount++;
      });

      // 所有下载开始后，检查进度
      trackProgress();
    } catch (error) {
      console.error('下载失败:', error);
      isDownloading.value = false;
      message.destroyAll();
      message.error(t('favorite.downloadFailed'));
    }
  };

  /**
   * 下载单首歌曲的歌词（.lrc 文件）
   * @param song 歌曲信息
   */
  const downloadLyric = async (song: SongResult) => {
    try {
      const res = await getMusicLrc(song.id as number);
      const lyricData = res?.data;

      if (!lyricData?.lrc?.lyric) {
        message.warning(t('songItem.message.noLyric'));
        return;
      }

      // 构建 LRC 内容：保留原始歌词，如有翻译则合并
      let lrcContent = lyricData.lrc.lyric;
      if (lyricData.tlyric?.lyric) {
        lrcContent = mergeLrcWithTranslation(lyricData.lrc.lyric, lyricData.tlyric.lyric);
      }

      // 构建文件名
      const artistNames = (song.ar || song.song?.artists)?.map((a) => a.name).join(',');
      const filename = `${song.name} - ${artistNames}`;

      const result = await ipcRenderer?.invoke('save-lyric-file', { filename, lrcContent });

      if (result?.success) {
        message.success(t('songItem.message.lyricDownloaded'));
      } else {
        message.error(t('songItem.message.lyricDownloadFailed'));
      }
    } catch (error) {
      console.error('Download lyric error:', error);
      message.error(t('songItem.message.lyricDownloadFailed'));
    }
  };

  return {
    isDownloading,
    downloadMusic,
    downloadLyric,
    batchDownloadMusic
  };
};

/**
 * 将原文歌词和翻译歌词合并为一个 LRC 字符串
 */
function mergeLrcWithTranslation(originalText: string, translationText: string): string {
  const originalMap = parseLrcText(originalText);
  const translationMap = parseLrcText(translationText);

  const mergedLines: string[] = [];

  for (const [timeTag, content] of originalMap.entries()) {
    mergedLines.push(`${timeTag}${content}`);
    const translated = translationMap.get(timeTag);
    if (translated) {
      mergedLines.push(`${timeTag}${translated}`);
    }
  }

  // 按时间排序
  mergedLines.sort((a, b) => {
    const ta = a.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/)?.[0] || '';
    const tb = b.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/)?.[0] || '';
    return ta.localeCompare(tb);
  });

  return mergedLines.join('\n');
}

/**
 * 解析 LRC 文本为 Map<timeTag, content>
 */
function parseLrcText(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split('\n')) {
    const tags = line.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/g);
    if (!tags) continue;
    const content = line.replace(/\[\d{2}:\d{2}(\.\d{1,3})?\]/g, '').trim();
    if (!content) continue;
    for (const tag of tags) {
      map.set(tag, content);
    }
  }
  return map;
}

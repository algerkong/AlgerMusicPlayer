import { cloneDeep } from 'lodash';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';

import { getSongUrl } from '@/store/modules/player';
import type { SongResult } from '@/type/music';

export const useDownload = () => {
  const { t } = useI18n();
  const message = useMessage();
  const isDownloading = ref(false);

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

      const songData = cloneDeep(song);
      songData.ar = songData.ar || songData.song?.artists;
      // 发送下载请求
      window.electron.ipcRenderer.send('download-music', {
        url: musicUrl,
        filename,
        songInfo: {
          ...songData,
          downloadTime: Date.now()
        }
      });

      message.success(t('songItem.message.downloadQueued'));

      // 监听下载完成事件
      const handleDownloadComplete = (_, result) => {
        if (result.filename === filename) {
          isDownloading.value = false;
          removeListeners();
        }
      };

      // 监听下载错误事件
      const handleDownloadError = (_, result) => {
        if (result.filename === filename) {
          isDownloading.value = false;
          removeListeners();
        }
      };

      // 移除监听器函数
      const removeListeners = () => {
        window.electron.ipcRenderer.removeListener('music-download-complete', handleDownloadComplete);
        window.electron.ipcRenderer.removeListener('music-download-error', handleDownloadError);
      };

      // 添加事件监听器
      window.electron.ipcRenderer.once('music-download-complete', handleDownloadComplete);
      window.electron.ipcRenderer.once('music-download-error', handleDownloadError);

      // 30秒后自动清理监听器（以防下载过程中出现未知错误）
      setTimeout(removeListeners, 30000);
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

      // 移除旧的监听器
      window.electron.ipcRenderer.removeAllListeners('music-download-complete');

      let successCount = 0;
      let failCount = 0;

      // 添加新的监听器
      window.electron.ipcRenderer.on('music-download-complete', (_, result) => {
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }

        // 当所有下载完成时
        if (successCount + failCount === songs.length) {
          isDownloading.value = false;
          message.success(t('favorite.downloadSuccess'));
          window.electron.ipcRenderer.removeAllListeners('music-download-complete');
        }
      });

      // 并行获取所有歌曲的下载链接
      const downloadUrls = await Promise.all(
        songs.map(async (song) => {
          try {
            const data = (await getSongUrl(song.id, song, true)) as any;
            return { song, ...data };
          } catch (error) {
            console.error(`获取歌曲 ${song.name} 下载链接失败:`, error);
            return { song, url: null };
          }
        })
      );

      // 开始下载有效的链接
      downloadUrls.forEach(({ song, url, type }) => {
        if (!url) {
          failCount++;
          return;
        }
        const songData = cloneDeep(song);
        const songInfo = {
          ...songData,
          ar: songData.ar || songData.song?.artists,
          downloadTime: Date.now()
        };
        window.electron.ipcRenderer.send('download-music', {
          url,
          filename: `${song.name} - ${(song.ar || song.song?.artists)?.map((a) => a.name).join(',')}`,
          songInfo,
          type
        });
      });
    } catch (error) {
      console.error('下载失败:', error);
      isDownloading.value = false;
      message.destroyAll();
      message.error(t('favorite.downloadFailed'));
    }
  };

  return {
    isDownloading,
    downloadMusic,
    batchDownloadMusic
  };
};
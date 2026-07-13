import { useMessage } from 'naive-ui';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useDownloadStore } from '@/store/modules/download';
import { getSongUrl } from '@/store/modules/player';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';

import type { DownloadSongInfo } from '../../shared/download';

/**
 * Map a SongResult to the minimal DownloadSongInfo shape required by the download store.
 */
function toDownloadSongInfo(song: SongResult): DownloadSongInfo {
  return {
    id: song.id as number,
    name: song.name,
    picUrl: song.picUrl ?? song.al?.picUrl ?? '',
    ar: (song.ar || song.song?.artists || []).map((a: { name: string }) => ({ name: a.name })),
    al: {
      name: song.al?.name ?? '',
      picUrl: song.al?.picUrl ?? ''
    }
  };
}

export const useDownload = () => {
  const { t } = useI18n();
  const message = useMessage();
  const downloadStore = useDownloadStore();
  const isDownloading = ref(false);

  /**
   * Download a single song.
   * Resolves the URL in the renderer then delegates queuing to the download store.
   */
  const downloadMusic = async (song: SongResult) => {
    if (isDownloading.value) {
      message.warning(t('songItem.message.downloading'));
      return;
    }

    try {
      isDownloading.value = true;

      const musicUrl = (await getSongUrl(song.id as number, song, true)) as any;
      if (!musicUrl) {
        throw new Error(t('songItem.message.getUrlFailed'));
      }

      const url = typeof musicUrl === 'string' ? musicUrl : musicUrl.url;
      const type = typeof musicUrl === 'string' ? '' : (musicUrl.type ?? '');
      const songInfo = toDownloadSongInfo(song);

      await downloadStore.addDownload(songInfo, url, type);
      message.success(t('songItem.message.downloadQueued'));
    } catch (error: any) {
      console.error('Download error:', error);
      message.error(error.message || t('songItem.message.downloadFailed'));
    } finally {
      isDownloading.value = false;
    }
  };

  /**
   * Batch download multiple songs.
   *
   * NOTE: This deviates slightly from the original spec (which envisioned JIT URL resolution in
   * the main process via onDownloadRequestUrl). Instead we pre-resolve URLs here in batches of 5
   * to avoid request storms against the local NeteaseCloudMusicApi service (> ~5 concurrent TLS
   * connections can trigger 502s). The trade-off is acceptable: the renderer already has access to
   * getSongUrl and this keeps the main process simpler.
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

      const BATCH_SIZE = 5;
      const resolvedItems: Array<{ songInfo: DownloadSongInfo; url: string; type: string }> = [];

      // Resolve URLs in batches of 5 to avoid request storms
      for (let i = 0; i < songs.length; i += BATCH_SIZE) {
        const chunk = songs.slice(i, i + BATCH_SIZE);
        const chunkResults = await Promise.all(
          chunk.map(async (song) => {
            try {
              const data = (await getSongUrl(song.id as number, song, true)) as any;
              const url = typeof data === 'string' ? data : (data?.url ?? '');
              const type = typeof data === 'string' ? '' : (data?.type ?? '');
              if (!url) return null;
              return { songInfo: toDownloadSongInfo(song), url, type };
            } catch (error) {
              console.error(`获取歌曲 ${song.name} 下载链接失败:`, error);
              return null;
            }
          })
        );
        for (const item of chunkResults) {
          if (item) resolvedItems.push(item);
        }
      }

      if (resolvedItems.length > 0) {
        await downloadStore.batchDownload(resolvedItems);
      }
    } catch (error) {
      console.error('下载失败:', error);
      message.destroyAll();
      message.error(t('favorite.downloadFailed'));
    } finally {
      isDownloading.value = false;
    }
  };

  /**
   * Download the lyric (.lrc) for a single song.
   * 在线歌词 API 已移除；仅支持已有本地/缓存歌词。
   */
  const downloadLyric = async (song: SongResult) => {
    try {
      // Prefer already-loaded lyric on the song object
      let lrcContent = '';
      if (song.lyric?.lrcArray?.length) {
        lrcContent = song.lyric.lrcArray
          .map((line, i) => {
            const t = song.lyric?.lrcTimeArray?.[i] ?? 0;
            const m = Math.floor(t / 60);
            const s = (t % 60).toFixed(2).padStart(5, '0');
            return `[${String(m).padStart(2, '0')}:${s}]${line.text}`;
          })
          .join('\n');
      }

      if (!lrcContent && isElectron && song.playMusicUrl?.startsWith('local:///')) {
        let filePath = decodeURIComponent(song.playMusicUrl.replace('local:///', ''));
        if (/^\/[a-zA-Z]:\//.test(filePath)) filePath = filePath.slice(1);
        const embedded = await window.api.getEmbeddedLyrics(filePath);
        if (embedded) lrcContent = embedded;
      }

      if (!lrcContent) {
        message.warning(t('songItem.message.noLyric'));
        return;
      }

      const nameFormat =
        (isElectron ? (window.api.getSettings()?.downloadNameFormat as string) : null) ||
        '{songName} - {artistName}';
      const artistNames =
        (song.ar || song.song?.artists)?.map((a: { name: string }) => a.name).join('、') ||
        '未知艺术家';
      const albumName = song.al?.name || '未知专辑';
      const filename = nameFormat
        .replace(/\{songName\}/g, song.name || '')
        .replace(/\{artistName\}/g, artistNames)
        .replace(/\{albumName\}/g, albumName);

      const result = isElectron ? await window.api.saveLyricFile({ filename, lrcContent }) : null;

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

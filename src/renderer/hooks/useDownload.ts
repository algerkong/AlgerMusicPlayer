import { useMessage } from 'naive-ui';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getMusicLrc } from '@/api/music';
import { useDownloadStore } from '@/store/modules/download';
import { getSongUrl } from '@/store/modules/player';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';

import type { DownloadSongInfo } from '../../shared/download';

const ipcRenderer = isElectron ? window.electron.ipcRenderer : null;

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
   * This is independent of the download system and uses a direct IPC call.
   */
  const downloadLyric = async (song: SongResult) => {
    try {
      const res = await getMusicLrc(song.id as number);
      const lyricData = res?.data;

      if (!lyricData?.lrc?.lyric) {
        message.warning(t('songItem.message.noLyric'));
        return;
      }

      // Build LRC content: keep original lyrics, merge translation if available
      let lrcContent = lyricData.lrc.lyric;
      if (lyricData.tlyric?.lyric) {
        lrcContent = mergeLrcWithTranslation(lyricData.lrc.lyric, lyricData.tlyric.lyric);
      }

      const artistNames = (song.ar || song.song?.artists)
        ?.map((a: { name: string }) => a.name)
        .join(',');
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
 * Merge original LRC lyrics and translated LRC lyrics into a single LRC string.
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

  // Sort by time tag
  mergedLines.sort((a, b) => {
    const ta = a.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/)?.[0] || '';
    const tb = b.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/)?.[0] || '';
    return ta.localeCompare(tb);
  });

  return mergedLines.join('\n');
}

/**
 * Parse LRC text into a Map<timeTag, content>.
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

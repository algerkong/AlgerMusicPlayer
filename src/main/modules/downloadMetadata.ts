import * as mm from 'music-metadata';

type DownloadTagPatch = Parameters<typeof mm.updateFile>[1];

type DownloadTagInfo = {
  name?: string;
  no?: number | string;
  publishTime?: number | string | Date;
  al?: { name?: string };
  song?: {
    album?: { name?: string };
    artists?: Array<{ name?: string }>;
  };
  ar?: Array<{ name?: string }>;
};

/**
 * 从下载歌曲信息中提取艺术家名称，多个艺术家使用中文顿号连接。
 * 与旧版下载标签写入行为保持一致。
 */
export function getDownloadArtistNames(info: DownloadTagInfo): string {
  return (
    (info.ar || info.song?.artists)?.map((artist) => artist.name).join('\u3001') || '未知艺术家'
  );
}

function getTrackNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number.parseInt(String(value), 10);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function getYear(value: number | string | Date | undefined): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : String(date.getFullYear());
}

/**
 * 将下载歌曲信息映射为 music-metadata 的通用标签。
 *
 * MP3 写入由其 ID3v2.4 写入器完成：标题、艺术家、专辑艺术家、专辑、音轨号、
 * 日期、歌词和封面都使用通用字段，避免依赖 ID3 原生帧名称。
 */
export function buildMp3TagPatch(
  info: DownloadTagInfo,
  artistNames: string,
  taskFilename: string,
  coverImageBuffer: Buffer | null,
  lyricsContent: string
): DownloadTagPatch {
  const tags: DownloadTagPatch = {
    title: info.name,
    artist: artistNames,
    albumartist: artistNames,
    album: info.al?.name || info.song?.album?.name || info.name || taskFilename,
    track: getTrackNumber(info.no) ? { no: getTrackNumber(info.no) } : undefined,
    date: getYear(info.publishTime)
  };

  if (coverImageBuffer) {
    tags.picture = [
      {
        type: 'Cover (front)',
        description: 'Album cover',
        format: 'image/jpeg',
        data: coverImageBuffer
      }
    ];
  }

  if (lyricsContent) {
    tags.lyrics = {
      language: 'chi',
      descriptor: 'Lyrics',
      text: lyricsContent
    };
  }

  return tags;
}

/**
 * 读取内嵌歌词。music-metadata 将 ID3 USLT、Vorbis LYRICS/UNSYNCEDLYRICS 等
 * 格式统一映射到 common.lyrics，因此无需按扩展名分支。
 */
export async function readEmbeddedLyrics(filePath: string): Promise<string | null> {
  try {
    const metadata = await mm.parseFile(filePath);
    return metadata.common.lyrics?.find((lyrics) => lyrics.text)?.text ?? null;
  } catch (error: any) {
    // 文件已被外部删除是预期情况，静默返回 null
    if (error?.code === 'ENOENT') return null;
    console.error('Error reading embedded lyrics:', error);
    return null;
  }
}

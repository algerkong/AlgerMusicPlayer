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

/** ID3 SYLT / music-metadata 的毫秒时间戳格式 */
const TIMESTAMP_FORMAT_MILLISECONDS = 2;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/**
 * 从下载歌曲信息中提取艺术家名称，多个艺术家使用中文顿号连接。
 * 与旧版下载标签写入行为保持一致。
 */
export function getDownloadArtistNames(info: DownloadTagInfo | null | undefined): string {
  return (
    (info?.ar || info?.song?.artists)?.map((artist) => artist.name).join('\u3001') || '未知艺术家'
  );
}

/**
 * 按文件头判断封面 MIME。封面未经缩放时保留源站原图，可能是 PNG。
 */
export function getCoverMime(coverImageBuffer: Buffer): string {
  return coverImageBuffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
    ? 'image/png'
    : 'image/jpeg';
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

function formatLrcTimestamp(milliseconds: number): string {
  const total = Math.round(milliseconds);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}]`;
}

/**
 * 将下载歌曲信息映射为 music-metadata 的通用标签。
 *
 * MP3 写入由其 ID3v2.4 写入器完成：标题、艺术家、专辑艺术家、专辑、音轨号、
 * 日期、歌词和封面都使用通用字段，避免依赖 ID3 原生帧名称。
 */
export function buildMp3TagPatch(
  info: DownloadTagInfo | null | undefined,
  artistNames: string,
  taskFilename: string,
  coverImageBuffer: Buffer | null,
  lyricsContent: string
): DownloadTagPatch {
  const trackNumber = getTrackNumber(info?.no);
  const tags: DownloadTagPatch = {
    title: info?.name,
    artist: artistNames,
    albumartist: artistNames,
    album: info?.al?.name || info?.song?.album?.name || info?.name || taskFilename,
    track: trackNumber ? { no: trackNumber } : undefined,
    date: getYear(info?.publishTime)
  };

  if (coverImageBuffer) {
    tags.picture = [
      {
        type: 'Cover (front)',
        description: 'Album cover',
        format: getCoverMime(coverImageBuffer),
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
 * 从 music-metadata 的 common.lyrics 中取出歌词文本。
 *
 * music-metadata 12 会把 Vorbis LYRICS 里的 LRC 和 ID3 SYLT 解析成 syncText，
 * 此时 text 只剩去掉时间轴的纯文本。渲染进程依赖 LRC 时间戳做歌词滚动，
 * 所以带毫秒时间轴的歌词要还原成 LRC。
 */
export function extractLyricsText(lyrics: mm.ILyricsTag[] | undefined): string | null {
  const entry = lyrics?.find((item) => item.syncText.length > 0 || item.text);
  if (!entry) return null;

  const isTimed =
    entry.timeStampFormat === TIMESTAMP_FORMAT_MILLISECONDS &&
    entry.syncText.length > 0 &&
    entry.syncText.every((line) => typeof line.timestamp === 'number');
  if (isTimed) {
    return entry.syncText
      .map((line) => `${formatLrcTimestamp(line.timestamp as number)}${line.text}`)
      .join('\n');
  }

  return entry.text || entry.syncText.map((line) => line.text).join('\n') || null;
}

/**
 * 读取内嵌歌词。music-metadata 将 ID3 USLT/SYLT、Vorbis LYRICS/UNSYNCEDLYRICS 等
 * 格式统一映射到 common.lyrics，因此无需按扩展名分支。
 *
 * 不做 access 预检：直接读，缺文件时靠 ENOENT 返回 null，省掉慢盘上的一轮 stat。
 */
export async function readEmbeddedLyrics(filePath: string): Promise<string | null> {
  try {
    const metadata = await mm.parseFile(filePath);
    return extractLyricsText(metadata.common.lyrics);
  } catch (error: any) {
    // 文件已被外部删除是预期情况，静默返回 null
    if (error?.code === 'ENOENT') return null;
    console.error('Error reading embedded lyrics:', error);
    return null;
  }
}

// 本地音乐工具函数
// 提供格式过滤、元数据 fallback、类型转换、搜索过滤、增量扫描等功能

import type { LocalMusicEntry, LocalMusicMeta } from '@/types/localMusic';
import { SUPPORTED_AUDIO_FORMATS } from '@/types/localMusic';
import type { ILyric, ILyricText, IWordData, SongResult } from '@/types/music';
import { parseLyrics as parseYrcLyrics } from '@/utils/yrcParser';

/**
 * 判断文件路径是否为支持的音频格式
 * 通过提取文件扩展名（不区分大小写）与支持格式列表比对
 * @param filePath 文件路径
 * @returns 是否为支持的音频格式
 */
export function isSupportedAudioFormat(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return (SUPPORTED_AUDIO_FORMATS as readonly string[]).includes(ext);
}

/**
 * 从文件路径中提取歌曲标题（去除目录和扩展名）
 * @param filePath 文件路径
 * @returns 歌曲标题
 */
export function extractTitleFromFilename(filePath: string): string {
  // 兼容 Windows 和 Unix 路径分隔符
  const separator = filePath.includes('\\') ? '\\' : '/';
  const filename = filePath.split(separator).pop() || filePath;
  // 去除扩展名
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex > 0) {
    return filename.slice(0, dotIndex);
  }
  return filename;
}

/**
 * 构建缺失元数据时的 fallback 元数据对象
 * 使用文件名作为标题，"未知艺术家"和"未知专辑"作为默认值
 * @param filePath 文件路径
 * @returns 默认的 LocalMusicMeta 对象
 */
export function buildFallbackMeta(filePath: string): LocalMusicMeta {
  return {
    filePath,
    title: extractTitleFromFilename(filePath),
    artist: '未知艺术家',
    album: '未知专辑',
    duration: 0,
    cover: null,
    lyrics: null,
    fileSize: 0,
    modifiedTime: 0
  };
}

/**
 * 将 LRC 格式歌词字符串解析为 ILyric 对象
 * 复用 yrcParser 解析能力，兼容标准 LRC 和 YRC 格式
 * @param lrcString LRC 格式歌词文本
 * @returns ILyric 对象，解析失败返回 null
 */
export function parseLrcToILyric(lrcString: string | null): ILyric | null {
  if (!lrcString || typeof lrcString !== 'string') {
    return null;
  }

  try {
    const parseResult = parseYrcLyrics(lrcString);
    if (!parseResult.success) {
      return null;
    }

    const { lyrics: parsedLyrics } = parseResult.data;
    const lrcArray: ILyricText[] = [];
    const lrcTimeArray: number[] = [];
    let hasWordByWord = false;

    for (const line of parsedLyrics) {
      const hasWords = line.words && line.words.length > 0;
      if (hasWords) hasWordByWord = true;

      lrcArray.push({
        text: line.fullText,
        trText: '',
        words: hasWords ? (line.words as IWordData[]) : undefined,
        hasWordByWord: hasWords,
        startTime: line.startTime,
        duration: line.duration
      });

      lrcTimeArray.push(line.startTime / 1000);
    }

    if (lrcArray.length === 0) {
      return null;
    }

    return { lrcTimeArray, lrcArray, hasWordByWord };
  } catch {
    return null;
  }
}

/**
 * 将 LocalMusicEntry 转换为 SongResult，以复用现有播放系统
 * @param entry 本地音乐条目
 * @returns 兼容播放系统的 SongResult 对象
 */
export function toSongResult(entry: LocalMusicEntry): SongResult {
  // 解析内嵌歌词为 ILyric 对象
  const lyric = parseLrcToILyric(entry.lyrics);

  return {
    id: entry.id,
    name: entry.title,
    picUrl: entry.cover || '/images/default_cover.png',
    ar: [
      {
        name: entry.artist,
        id: 0,
        picId: 0,
        img1v1Id: 0,
        briefDesc: '',
        picUrl: '',
        img1v1Url: '',
        albumSize: 0,
        alias: [],
        trans: '',
        musicSize: 0,
        topicPerson: 0
      }
    ],
    al: {
      name: entry.album,
      id: 0,
      type: '',
      size: 0,
      picId: 0,
      blurPicUrl: '',
      companyId: 0,
      pic: 0,
      picUrl: entry.cover || '',
      publishTime: 0,
      description: '',
      tags: '',
      company: '',
      briefDesc: '',
      artist: {
        name: entry.artist,
        id: 0,
        picId: 0,
        img1v1Id: 0,
        briefDesc: '',
        picUrl: '',
        img1v1Url: '',
        albumSize: 0,
        alias: [],
        trans: '',
        musicSize: 0,
        topicPerson: 0
      },
      songs: [],
      alias: [],
      status: 0,
      copyrightId: 0,
      commentThreadId: '',
      artists: [],
      subType: '',
      transName: null,
      onSale: false,
      mark: 0,
      picId_str: ''
    },
    song: {
      artists: [{ name: entry.artist }],
      album: { name: entry.album }
    },
    playMusicUrl: `local:///${entry.filePath}`,
    duration: entry.duration,
    dt: entry.duration,
    source: 'netease' as const,
    count: 0,
    // 内嵌歌词（如果有）
    lyric: lyric ?? undefined,
    // 本地音乐 URL 不会过期，设置一个极大的过期时间
    createdAt: Date.now(),
    expiredAt: Date.now() + 365 * 24 * 60 * 60 * 1000
  };
}

/**
 * 将封面图片 Buffer 转换为 base64 Data URL
 * @param buffer 图片二进制数据
 * @param mime MIME 类型（如 image/jpeg、image/png）
 * @returns base64 Data URL 字符串
 */
export function coverToDataUrl(buffer: Buffer, mime: string): string {
  const base64 = buffer.toString('base64');
  return `data:${mime};base64,${base64}`;
}

/**
 * 按关键词搜索过滤本地音乐列表
 * 不区分大小写，匹配歌曲标题或艺术家名称
 * 空关键词返回完整列表
 * @param list 本地音乐列表
 * @param keyword 搜索关键词
 * @returns 过滤后的音乐列表
 */
export function filterByKeyword(list: LocalMusicEntry[], keyword: string): LocalMusicEntry[] {
  if (!keyword || keyword.trim() === '') {
    return list;
  }
  const lowerKeyword = keyword.toLowerCase();
  return list.filter((entry) => {
    return (
      entry.title.toLowerCase().includes(lowerKeyword) ||
      entry.artist.toLowerCase().includes(lowerKeyword)
    );
  });
}

/**
 * 增量扫描对比：找出新增或修改时间变更的文件
 * 对比扫描到的文件列表与缓存条目，返回需要重新解析的文件路径
 * @param files 扫描到的文件列表（包含路径和修改时间）
 * @param cached 已缓存的本地音乐条目
 * @returns 需要重新解析的文件路径列表
 */
export function getChangedFiles(
  files: { path: string; modifiedTime: number }[],
  cached: LocalMusicEntry[]
): string[] {
  // 构建缓存映射：filePath -> modifiedTime
  const cachedMap = new Map<string, number>();
  for (const entry of cached) {
    cachedMap.set(entry.filePath, entry.modifiedTime);
  }

  return files
    .filter((file) => {
      const cachedTime = cachedMap.get(file.path);
      // 缓存中不存在（新文件）或修改时间不匹配（已变更）
      return cachedTime === undefined || cachedTime !== file.modifiedTime;
    })
    .map((file) => file.path);
}

/**
 * 缓存清理：移除文件已不存在的条目
 * @param entries 缓存的本地音乐条目列表
 * @param existsMap 文件存在性映射（filePath -> 是否存在）
 * @returns 清理后的条目列表（仅保留文件仍存在的条目）
 */
export function removeStaleEntries(
  entries: LocalMusicEntry[],
  existsMap: Record<string, boolean>
): LocalMusicEntry[] {
  return entries.filter((entry) => existsMap[entry.filePath] === true);
}

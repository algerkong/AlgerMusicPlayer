// 本地音乐扫描模块
// 负责文件系统递归扫描和音乐文件元数据提取，通过 IPC 暴露给渲染进程

import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as mm from 'music-metadata';
import * as path from 'path';

/** 支持的音频文件格式 */
const SUPPORTED_AUDIO_FORMATS = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac'] as const;

/**
 * 主进程返回的原始音乐元数据
 * 与渲染进程 LocalMusicMeta 类型保持一致
 */
type LocalMusicMeta = {
  /** 文件绝对路径 */
  filePath: string;
  /** 歌曲标题 */
  title: string;
  /** 艺术家名称 */
  artist: string;
  /** 专辑名称 */
  album: string;
  /** 时长（毫秒） */
  duration: number;
  /** base64 Data URL 格式的封面图片，无封面时为 null */
  cover: string | null;
  /** LRC 格式歌词文本，无歌词时为 null */
  lyrics: string | null;
  /** 文件大小（字节） */
  fileSize: number;
  /** 文件修改时间戳 */
  modifiedTime: number;
};

/**
 * 判断文件扩展名是否为支持的音频格式
 * @param ext 文件扩展名（含点号，如 .mp3）
 * @returns 是否为支持的格式
 */
function isSupportedFormat(ext: string): boolean {
  return (SUPPORTED_AUDIO_FORMATS as readonly string[]).includes(ext.toLowerCase());
}

/**
 * 从文件路径中提取歌曲标题（去除目录和扩展名）
 * @param filePath 文件路径
 * @returns 歌曲标题
 */
function extractTitleFromFilename(filePath: string): string {
  const basename = path.basename(filePath);
  const dotIndex = basename.lastIndexOf('.');
  if (dotIndex > 0) {
    return basename.slice(0, dotIndex);
  }
  return basename;
}

/**
 * 将封面图片数据转换为 base64 Data URL
 * @param picture music-metadata 解析出的封面图片对象
 * @returns base64 Data URL 字符串，转换失败返回 null
 */
function extractCoverAsDataUrl(picture: mm.IPicture | undefined): string | null {
  if (!picture) {
    return null;
  }
  try {
    const mime = picture.format ?? 'image/jpeg';
    const base64 = Buffer.from(picture.data).toString('base64');
    return `data:${mime};base64,${base64}`;
  } catch (error) {
    console.error('封面提取失败:', error);
    return null;
  }
}

/**
 * 从 music-metadata 解析结果中提取歌词文本
 * @param lyrics music-metadata 解析出的歌词数组
 * @returns 歌词文本，提取失败返回 null
 */
function extractLyrics(lyrics: mm.ILyricsTag[] | undefined): string | null {
  if (!lyrics || lyrics.length === 0) {
    return null;
  }
  try {
    // 优先取第一条歌词的文本内容
    const firstLyric = lyrics[0];
    return firstLyric?.text ?? null;
  } catch (error) {
    console.error('歌词提取失败:', error);
    return null;
  }
}

/**
 * 递归扫描指定文件夹，返回所有支持格式的音乐文件路径
 * @param folderPath 要扫描的文件夹路径
 * @returns 音乐文件绝对路径列表
 */
async function scanMusicFiles(folderPath: string): Promise<string[]> {
  const results: string[] = [];

  // 检查文件夹是否存在
  if (!fs.existsSync(folderPath)) {
    throw new Error(`文件夹不存在: ${folderPath}`);
  }

  // 检查是否为目录
  const stat = await fs.promises.stat(folderPath);
  if (!stat.isDirectory()) {
    throw new Error(`路径不是文件夹: ${folderPath}`);
  }

  /**
   * 递归遍历目录
   * @param dirPath 当前目录路径
   */
  async function walkDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // 递归扫描子目录
          await walkDirectory(fullPath);
        } else if (entry.isFile()) {
          // 检查文件扩展名是否为支持的音频格式
          const ext = path.extname(entry.name);
          if (isSupportedFormat(ext)) {
            results.push(fullPath);
          }
        }
      }
    } catch (error) {
      // 单个目录读取失败不中断整体扫描，记录错误后继续
      console.error(`扫描目录失败: ${dirPath}`, error);
    }
  }

  await walkDirectory(folderPath);
  return results;
}

/**
 * 解析单个音乐文件的元数据
 * 解析失败时使用 fallback 默认值（文件名作标题），不抛出异常
 * @param filePath 音乐文件绝对路径
 * @returns 音乐元数据对象
 */
async function parseMetadata(filePath: string): Promise<LocalMusicMeta> {
  // 获取文件信息（大小和修改时间）
  let fileSize = 0;
  let modifiedTime = 0;
  try {
    const stat = await fs.promises.stat(filePath);
    fileSize = stat.size;
    modifiedTime = stat.mtimeMs;
  } catch (error) {
    console.error(`获取文件信息失败: ${filePath}`, error);
  }

  // 构建 fallback 默认值
  const fallback: LocalMusicMeta = {
    filePath,
    title: extractTitleFromFilename(filePath),
    artist: '未知艺术家',
    album: '未知专辑',
    duration: 0,
    cover: null,
    lyrics: null,
    fileSize,
    modifiedTime
  };

  try {
    const metadata = await mm.parseFile(filePath);
    const { common, format } = metadata;

    return {
      filePath,
      title: common.title || fallback.title,
      artist: common.artist || fallback.artist,
      album: common.album || fallback.album,
      duration: format.duration ? Math.round(format.duration * 1000) : 0,
      cover: extractCoverAsDataUrl(common.picture?.[0]),
      lyrics: extractLyrics(common.lyrics),
      fileSize,
      modifiedTime
    };
  } catch (error) {
    // 解析失败使用 fallback，不中断流程
    console.error(`元数据解析失败，使用 fallback: ${filePath}`, error);
    return fallback;
  }
}

/**
 * 批量解析音乐文件元数据
 * 内部逐个调用 parseMetadata，单文件失败不影响其他文件
 * @param filePaths 音乐文件路径列表
 * @returns 元数据对象列表
 */
async function batchParseMetadata(filePaths: string[]): Promise<LocalMusicMeta[]> {
  const results: LocalMusicMeta[] = [];

  for (const filePath of filePaths) {
    const meta = await parseMetadata(filePath);
    results.push(meta);
  }

  return results;
}

/**
 * 初始化本地音乐扫描模块
 * 注册 IPC handler，供渲染进程调用
 */
export function initializeLocalMusicScanner(): void {
  // 扫描指定文件夹中的音乐文件
  ipcMain.handle('scan-local-music', async (_, folderPath: string) => {
    try {
      const files = await scanMusicFiles(folderPath);
      return { files, count: files.length };
    } catch (error: any) {
      console.error('扫描本地音乐失败:', error);
      return { error: error.message || '扫描失败' };
    }
  });

  // 批量解析音乐文件元数据
  ipcMain.handle('parse-local-music-metadata', async (_, filePaths: string[]) => {
    try {
      const metadataList = await batchParseMetadata(filePaths);
      return metadataList;
    } catch (error: any) {
      console.error('解析本地音乐元数据失败:', error);
      return [];
    }
  });
}

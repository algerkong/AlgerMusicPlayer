/**
 * 歌词单词数据接口
 */
export interface WordData {
  /** 单词文本内容 */
  readonly text: string;
  /** 开始时间（毫秒） */
  readonly startTime: number;
  /** 持续时间（毫秒） */
  readonly duration: number;
  /** 该单词后是否有空格 */
  readonly space?: boolean;
}

/**
 * 歌词行数据接口
 */
export interface LyricLine {
  /** 行开始时间（毫秒） */
  readonly startTime: number;
  /** 行持续时间（毫秒） */
  readonly duration: number;
  /** 完整文本内容 */
  readonly fullText: string;
  /** 单词数组 */
  readonly words: readonly WordData[];
}

/**
 * 元数据接口
 */
export interface MetaData {
  /** 时间戳（可选，不带时间的元数据为 undefined） */
  readonly time?: number;
  /** 内容 */
  readonly content: string;
}

/**
 * 解析结果接口
 */
export interface ParsedLyrics {
  /** 元数据数组 */
  readonly metadata: readonly MetaData[];
  /** 歌词行数组 */
  readonly lyrics: readonly LyricLine[];
}

/**
 * 自定义解析错误类
 */
export class LyricParseError extends Error {
  constructor(
    message: string,
    public readonly line?: string
  ) {
    super(message);
    this.name = 'LyricParseError';
  }
}

/**
 * 解析结果类型
 */
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: LyricParseError };

// 预编译正则表达式以提高性能
const METADATA_PATTERN = /^\{("t":|"c":)/; // 匹配 {"t": 或 {"c":
const LINE_TIME_PATTERN = /^\[(\d+),(\d+)\](.+)$/; // 逐字歌词格式: [92260,4740]...
const LRC_TIME_PATTERN = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/; // 标准LRC格式: [00:25.47]...
const WORD_PATTERN = /\((\d+),(\d+),\d+\)([^(]*?)(?=\(|$)/g;

/**
 * 时间格式化函数
 * @param ms 毫秒数
 * @returns 格式化的时间字符串
 */
export const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

/**
 * 解析元数据行
 * @param line 元数据行字符串
 * @returns 解析结果
 */
const parseMetadata = (line: string): ParseResult<MetaData> => {
  try {
    const data = JSON.parse(line);

    // 类型守卫：检查数据结构
    if (typeof data !== 'object' || data === null) {
      return {
        success: false,
        error: new LyricParseError('元数据格式无效：不是有效的对象', line)
      };
    }

    // 检查必须有 c 字段（内容数组）
    if (!Array.isArray(data.c)) {
      return {
        success: false,
        error: new LyricParseError('元数据格式无效：缺少 c 字段', line)
      };
    }

    // t 字段（时间戳）是可选的
    if (data.t !== undefined && typeof data.t !== 'number') {
      return {
        success: false,
        error: new LyricParseError('元数据格式无效：t 字段必须是数字', line)
      };
    }

    const content = data.c
      .filter((item: any) => item && typeof item.tx === 'string')
      .map((item: any) => item.tx)
      .join('');

    return {
      success: true,
      data: {
        time: data.t,
        content
      }
    };
  } catch (error) {
    return {
      success: false,
      error: new LyricParseError(
        `JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        line
      )
    };
  }
};

/**
 * 解析标准LRC格式的歌词行
 * @param line 歌词行字符串
 * @returns 解析结果
 */
const parseLrcLine = (line: string): ParseResult<LyricLine> => {
  const lrcMatch = line.match(LRC_TIME_PATTERN);
  if (!lrcMatch) {
    return {
      success: false,
      error: new LyricParseError('LRC歌词行格式无效：无法匹配时间信息', line)
    };
  }

  const minutes = parseInt(lrcMatch[1], 10);
  const seconds = parseInt(lrcMatch[2], 10);
  const milliseconds = parseInt(lrcMatch[3].padEnd(3, '0'), 10); // 处理2位或3位毫秒
  const text = lrcMatch[4].trim();

  // 验证时间值
  if (
    isNaN(minutes) ||
    isNaN(seconds) ||
    isNaN(milliseconds) ||
    minutes < 0 ||
    seconds < 0 ||
    milliseconds < 0 ||
    seconds >= 60
  ) {
    return {
      success: false,
      error: new LyricParseError('LRC歌词行格式无效：时间值无效', line)
    };
  }

  const startTime = minutes * 60000 + seconds * 1000 + milliseconds;

  return {
    success: true,
    data: {
      startTime,
      duration: 0, // LRC格式没有持续时间信息
      fullText: text,
      words: [] // LRC格式没有逐字信息
    }
  };
};

/**
 * 解析逐字歌词行
 * @param line 歌词行字符串
 * @returns 解析结果
 */
const parseWordByWordLine = (line: string): ParseResult<LyricLine> => {
  // 使用预编译的正则表达式
  const lineTimeMatch = line.match(LINE_TIME_PATTERN);
  if (!lineTimeMatch) {
    return {
      success: false,
      error: new LyricParseError('逐字歌词行格式无效：无法匹配时间信息', line)
    };
  }

  const startTime = parseInt(lineTimeMatch[1], 10);
  const duration = parseInt(lineTimeMatch[2], 10);
  const content = lineTimeMatch[3];

  // 验证时间值
  if (isNaN(startTime) || isNaN(duration) || startTime < 0 || duration < 0) {
    return {
      success: false,
      error: new LyricParseError('逐字歌词行格式无效：时间值无效', line)
    };
  }
  // 重置正则表达式状态
  WORD_PATTERN.lastIndex = 0;

  const words: WordData[] = [];
  let match: RegExpExecArray | null;

  // 第一遍：提取所有单词的原始文本（包含空格），构建完整文本
  const rawTextParts: string[] = [];
  const tempWords: Array<{ startTime: number; duration: number; text: string }> = [];

  while ((match = WORD_PATTERN.exec(content)) !== null) {
    const wordStartTime = parseInt(match[1], 10);
    const wordDuration = parseInt(match[2], 10);
    const rawWordText = match[3]; // 保留原始文本（可能包含空格）
    const wordText = rawWordText.trim(); // 去除首尾空格的文本

    // 验证单词数据
    if (isNaN(wordStartTime) || isNaN(wordDuration)) {
      continue; // 跳过无效的单词数据
    }

    if (wordText) {
      tempWords.push({
        text: wordText,
        startTime: wordStartTime,
        duration: wordDuration
      });
      rawTextParts.push(rawWordText); // 保留原始格式用于分析空格
    }
  }

  // 构建完整的文本（保留原始空格）
  const fullText = rawTextParts.join('').trim();

  // 第二遍：检查每个单词在完整文本中是否后面有空格
  let currentPos = 0;
  for (const word of tempWords) {
    // 在完整文本中查找当前单词的位置
    const wordIndex = fullText.indexOf(word.text, currentPos);
    if (wordIndex === -1) {
      // 如果找不到，直接添加不带空格标记的单词
      words.push(word);
      continue;
    }

    // 计算单词结束位置
    const wordEndPos = wordIndex + word.text.length;
    // 检查单词后面是否有空格
    const hasSpace = wordEndPos < fullText.length && fullText[wordEndPos] === ' ';
    words.push({
      ...word,
      space: hasSpace
    });

    // 更新搜索位置
    currentPos = wordEndPos;
  }

  console.log('fullText', fullText);
  console.log('words', words);

  return {
    success: true,
    data: {
      startTime,
      duration,
      fullText,
      words
    }
  };
};

/**
 * 解析歌词行（自动检测格式）
 * @param line 歌词行字符串
 * @returns 解析结果
 */
const parseLyricLine = (line: string): ParseResult<LyricLine> => {
  // 首先尝试解析逐字歌词格式
  if (LINE_TIME_PATTERN.test(line)) {
    return parseWordByWordLine(line);
  }

  // 然后尝试解析标准LRC格式
  if (LRC_TIME_PATTERN.test(line)) {
    return parseLrcLine(line);
  }

  return {
    success: false,
    error: new LyricParseError('歌词行格式无效：不匹配任何已知格式', line)
  };
};

/**
 * 计算LRC格式歌词的持续时间
 * @param lyrics 歌词行数组
 * @returns 更新持续时间后的歌词行数组
 */
const calculateLrcDurations = (lyrics: LyricLine[]): LyricLine[] => {
  if (lyrics.length === 0) return lyrics;

  const updatedLyrics: LyricLine[] = [];

  for (let i = 0; i < lyrics.length; i++) {
    const currentLine = lyrics[i];

    // 如果已经有持续时间（逐字歌词），直接使用
    if (currentLine.duration > 0) {
      updatedLyrics.push(currentLine);
      continue;
    }

    // 计算LRC格式的持续时间
    let duration = 0;
    if (i < lyrics.length - 1) {
      // 使用下一行的开始时间减去当前行的开始时间
      duration = lyrics[i + 1].startTime - currentLine.startTime;
    } else {
      // 最后一行，使用默认持续时间（3秒）
      duration = 3000;
    }

    // 确保持续时间不为负数
    duration = Math.max(duration, 0);

    updatedLyrics.push({
      ...currentLine,
      duration
    });
  }

  return updatedLyrics;
};

/**
 * 解析不带时间戳的纯文本歌词行
 * @param line 纯文本歌词行
 * @returns 解析结果
 */
const parsePlainTextLine = (line: string): ParseResult<LyricLine> => {
  // 清理行首尾的 \r 等特殊字符
  const text = line.replace(/\r/g, '').trim();

  if (!text) {
    return {
      success: false,
      error: new LyricParseError('纯文本歌词行为空', line)
    };
  }

  return {
    success: true,
    data: {
      startTime: -1, // -1 表示没有时间信息
      duration: 0,
      fullText: text,
      words: []
    }
  };
};

/**
 * 主解析函数
 * @param lyricsStr 歌词字符串
 * @returns 解析结果
 */
export const parseLyrics = (lyricsStr: string): ParseResult<ParsedLyrics> => {
  if (typeof lyricsStr !== 'string') {
    return {
      success: false,
      error: new LyricParseError('输入参数必须是字符串')
    };
  }

  try {
    const lines = lyricsStr.trim().split('\n');
    const metadata: MetaData[] = [];
    const lyrics: LyricLine[] = [];
    const errors: LyricParseError[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (!trimmedLine) continue;

      // 使用预编译正则表达式进行快速检测
      if (METADATA_PATTERN.test(trimmedLine)) {
        const result = parseMetadata(trimmedLine);
        if (result.success) {
          metadata.push(result.data);
        } else {
          errors.push(result.error);
        }
      } else if (trimmedLine.startsWith('[')) {
        const result = parseLyricLine(trimmedLine);
        if (result.success) {
          lyrics.push(result.data);
        } else {
          errors.push(result.error);
        }
      } else {
        // 尝试解析为纯文本歌词行（不带时间戳）
        const result = parsePlainTextLine(trimmedLine);
        if (result.success) {
          lyrics.push(result.data);
        } else {
          errors.push(result.error);
        }
      }
    }

    // 如果有太多错误，可能整个文件格式有问题
    if (errors.length > 0 && errors.length > lines.length * 0.5) {
      return {
        success: false,
        error: new LyricParseError(
          `解析失败：错误行数过多 (${errors.length}/${lines.length})，可能文件格式不正确 ${JSON.stringify(errors)}`
        )
      };
    }

    // 按时间排序歌词行（将没有时间信息的行放在最前面）
    lyrics.sort((a, b) => {
      if (a.startTime === -1 && b.startTime === -1) return 0;
      if (a.startTime === -1) return -1;
      if (b.startTime === -1) return 1;
      return a.startTime - b.startTime;
    });

    // 计算LRC格式的持续时间
    const finalLyrics = calculateLrcDurations(lyrics);

    return {
      success: true,
      data: {
        metadata,
        lyrics: finalLyrics
      }
    };
  } catch (error) {
    return {
      success: false,
      error: new LyricParseError(
        `解析过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`
      )
    };
  }
};

/**
 * 导出默认解析函数（向后兼容）
 */
export default parseLyrics;

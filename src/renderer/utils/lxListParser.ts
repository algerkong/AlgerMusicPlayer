/**
 * 洛雪音乐歌单文件解析工具
 * 支持洛雪导出的 txt（双空格分隔：歌名  歌手  专辑）与 csv（歌曲名,艺术家,专辑名）格式
 * 参考：lx-music-desktop src/main/worker/main/list.ts 导出逻辑
 */

export type LxImportSong = {
  name: string;
  artist: string;
  album: string;
};

export type LxParseResult = {
  songs: LxImportSong[];
  /** 跳过的无效行数（空行不计入） */
  skipped: number;
};

export const LX_LIST_MAX_FILE_SIZE = 5 * 1024 * 1024;

const BOM = '﻿';

/** 去除 UTF-8 BOM（洛雪导出默认带 BOM） */
export function stripBom(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) return content.slice(1);
  if (content.startsWith(BOM)) return content.slice(1);
  return content;
}

/** 按优先级切分 txt 行：制表符 > 双空格(及以上) > 常见分隔符 */
function splitTxtLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t');
  if (/ {2,}/.test(line)) return line.split(/ {2,}/);
  if (/\s[-–—|]\s/.test(line)) return line.split(/\s[-–—|]\s/);
  return [line];
}

/** 解析 txt 内容 */
export function parseLxTxt(content: string): LxParseResult {
  const songs: LxImportSong[] = [];
  let skipped = 0;
  const lines = stripBom(content).split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const parts = splitTxtLine(line)
      .map((p) => p.trim())
      .filter((p) => p !== '');
    const [name = '', artist = '', album = ''] = parts;
    if (!name) {
      skipped += 1;
      continue;
    }
    songs.push({ name, artist, album });
  }
  return { songs, skipped };
}

/** 极简 RFC4180 CSV 行解析：处理引号、转义双引号、逗号 */
function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const text = stripBom(content);
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // 忽略 \r，由 \n 统一换行
    } else {
      field += ch;
    }
  }
  // 收尾：有残留字段或行时推入
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** 首行是否表头：洛雪表头跟随界面语言，不能硬匹配中文 */
const HEADER_KEYWORD_RE =
  /歌曲|歌名|曲名|艺术家|歌手|演唱|专辑|music|song|name|singer|artist|album|곡|제목|아티스트|앨범|楽曲|アーティスト|アルバム/i;

function isHeaderRow(cells: string[]): boolean {
  // 洛雪导出表头为「歌名/歌手/专辑」三列，要求至少两列命中关键词才判定为表头，
  // 避免把恰好含 name/song 等词的正常歌曲行误判
  const matched = cells.filter((cell) => HEADER_KEYWORD_RE.test(cell.trim())).length;
  return matched >= 2;
}

/** 解析 csv 内容 */
export function parseLxCsv(content: string): LxParseResult {
  const songs: LxImportSong[] = [];
  let skipped = 0;
  const rows = parseCsvRows(content).filter((row) => row.some((cell) => cell.trim() !== ''));
  if (rows.length === 0) return { songs, skipped };
  const dataRows = isHeaderRow(rows[0]) ? rows.slice(1) : rows;
  for (const row of dataRows) {
    const [name = '', artist = '', album = ''] = row.map((cell) => cell.trim());
    if (!name) {
      skipped += 1;
      continue;
    }
    songs.push({ name, artist, album });
  }
  return { songs, skipped };
}

/** 按文件名后缀分发解析 */
export function parseLxListFile(fileName: string, content: string): LxParseResult {
  if (/\.csv$/i.test(fileName.trim())) return parseLxCsv(content);
  return parseLxTxt(content);
}

/** 校验可导入的文件类型 */
export function isSupportedListFile(fileName: string): boolean {
  return /\.(txt|csv)$/i.test(fileName.trim());
}

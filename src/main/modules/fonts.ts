import { ipcMain } from 'electron';
import { getFonts } from 'font-list';

/**
 * 清理字体名称
 * @param fontName 原始字体名称
 * @returns 清理后的字体名称
 */
function cleanFontName(fontName: string): string {
  return fontName
    .trim()
    .replace(/^["']|["']$/g, '') // 移除首尾的引号
    .replace(/\s+/g, ' '); // 将多个空格替换为单个空格
}

/**
 * 获取系统字体列表
 */
async function getSystemFonts(): Promise<string[]> {
  try {
    // 使用 font-list 获取系统字体
    const fonts = await getFonts();
    // 清理字体名称并去重
    const cleanedFonts = [...new Set(fonts.map(cleanFontName))];
    // 添加系统默认字体并排序
    return ['system-ui', ...cleanedFonts].sort();
  } catch (error) {
    console.error('获取系统字体失败:', error);
    // 如果获取失败，至少返回系统默认字体
    return ['system-ui'];
  }
}

/**
 * 初始化字体管理模块
 */
export function initializeFonts() {
  // 添加获取系统字体的 IPC 处理
  ipcMain.handle('get-system-fonts', async () => {
    return await getSystemFonts();
  });
}

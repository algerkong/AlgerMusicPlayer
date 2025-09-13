import axios from 'axios';
import { ipcMain } from 'electron';

/**
 * 初始化其他杂项 API（如搜索建议等）
 */
export function initializeOtherApi() {
  // 搜索建议（从酷狗获取）
  ipcMain.handle('get-search-suggestions', async (_, keyword: string) => {
    if (!keyword || !keyword.trim()) {
      return [];
    }
    try {
      console.log(`[Main Process Proxy] Forwarding suggestion request for: ${keyword}`);
      const response = await axios.get('http://msearchcdn.kugou.com/new/app/i/search.php', {
        params: {
          cmd: 302,
          keyword: keyword
        },
        timeout: 5000
      });
      return response.data;
    } catch (error: any) {
      console.error('[Main Process Proxy] Failed to fetch search suggestions:', error.message);
      return [];
    }
  });
}

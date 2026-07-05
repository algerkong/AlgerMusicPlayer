/**
 * 落雪音乐 HTTP 请求处理（主进程）
 * 绕过渲染进程的 CORS 限制
 */

import { ipcMain } from 'electron';
import fetch, { type RequestInit } from 'node-fetch';

interface LxHttpRequest {
  url: string;
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    form?: Record<string, string>;
    formData?: Record<string, string>;
    timeout?: number;
  };
  requestId: string;
}

interface LxHttpResponse {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: any;
}

// 取消控制器映射
const abortControllers = new Map<string, AbortController>();

/**
 * 初始化 HTTP 请求处理
 */
export const initLxMusicHttp = () => {
  // 处理 HTTP 请求
  ipcMain.handle(
    'lx-music-http-request',
    async (_, request: LxHttpRequest): Promise<LxHttpResponse> => {
      const { url, options, requestId } = request;
      const controller = new AbortController();

      // 保存取消控制器
      abortControllers.set(requestId, controller);

      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        console.log(`[LxMusicHttp] 请求: ${options.method || 'GET'} ${url}`);

        const fetchOptions: RequestInit = {
          method: options.method || 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ...(options.headers || {})
          },
          signal: controller.signal
        };

        // 处理请求体
        if (options.body) {
          fetchOptions.body = options.body;
        } else if (options.form) {
          const formData = new URLSearchParams(options.form);
          fetchOptions.body = formData.toString();
          fetchOptions.headers = {
            ...fetchOptions.headers,
            'Content-Type': 'application/x-www-form-urlencoded'
          };
        } else if (options.formData) {
          // node-fetch 的 FormData 需要特殊处理
          const FormData = (await import('form-data')).default;
          const formData = new FormData();
          for (const [key, value] of Object.entries(options.formData)) {
            formData.append(key, value);
          }
          fetchOptions.body = formData as any;
          // FormData 会自动设置 Content-Type
        }

        // 设置超时
        const timeout = options.timeout || 30000;
        timeoutId = setTimeout(() => {
          console.warn(`[LxMusicHttp] 请求超时: ${url}`);
          controller.abort();
        }, timeout);

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        timeoutId = null;

        console.log(`[LxMusicHttp] 响应: ${response.status} ${url}`);

        // 读取响应体
        const rawBody = await response.text();

        // 尝试解析 JSON
        let parsedBody: any = rawBody;
        const contentType = response.headers.get('content-type') || '';
        if (
          contentType.includes('application/json') ||
          rawBody.startsWith('{') ||
          rawBody.startsWith('[')
        ) {
          try {
            parsedBody = JSON.parse(rawBody);
          } catch {
            // 解析失败则使用原始字符串
          }
        }

        // 转换 headers 为普通对象
        const headers: Record<string, string | string[]> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        const result: LxHttpResponse = {
          statusCode: response.status,
          headers,
          body: parsedBody
        };

        return result;
      } catch (error: any) {
        console.error(`[LxMusicHttp] 请求失败: ${url}`, error.message);
        throw error;
      } finally {
        // 清理超时定时器（fetch 出错时前面来不及 clear）与取消控制器
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        abortControllers.delete(requestId);
      }
    }
  );

  // 处理请求取消
  ipcMain.handle('lx-music-http-cancel', (_, requestId: string) => {
    const controller = abortControllers.get(requestId);
    if (controller) {
      console.log(`[LxMusicHttp] 取消请求: ${requestId}`);
      controller.abort();
      abortControllers.delete(requestId);
    }
  });

  console.log('[LxMusicHttp] HTTP 请求处理已初始化');
};

/**
 * 清理所有正在进行的请求
 */
export const cleanupLxMusicHttp = () => {
  for (const [requestId, controller] of abortControllers.entries()) {
    console.log(`[LxMusicHttp] 清理请求: ${requestId}`);
    controller.abort();
  }
  abortControllers.clear();
};

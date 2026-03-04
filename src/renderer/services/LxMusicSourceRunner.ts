/**
 * 落雪音乐 (LX Music) 音源脚本执行器
 *
 * 核心职责：
 * 1. 解析脚本元信息
 * 2. 在 Worker 隔离环境执行用户脚本
 * 3. 模拟 globalThis.lx API
 * 4. 处理初始化和音乐解析请求
 */

import type {
  LxInitedData,
  LxLyricResult,
  LxMusicInfo,
  LxQuality,
  LxScriptInfo,
  LxSourceConfig,
  LxSourceKey
} from '@/types/lxMusic';

type WorkerInitializeMessage = {
  type: 'initialize';
  script: string;
  scriptInfo: LxScriptInfo;
};

type WorkerInvokeMessage = {
  type: 'invoke-request';
  callId: string;
  payload: any;
};

type WorkerHttpResponseMessage = {
  type: 'http-response';
  requestId: string;
  response: any;
  body: any;
  error?: string;
};

type RunnerToWorkerMessage =
  | WorkerInitializeMessage
  | WorkerInvokeMessage
  | WorkerHttpResponseMessage;

type WorkerInitializedMessage = {
  type: 'initialized';
  data: LxInitedData;
};

type WorkerScriptErrorMessage = {
  type: 'script-error';
  message: string;
};

type WorkerInvokeResultMessage = {
  type: 'invoke-result';
  callId: string;
  result: any;
};

type WorkerInvokeErrorMessage = {
  type: 'invoke-error';
  callId: string;
  message: string;
};

type WorkerHttpRequestMessage = {
  type: 'http-request';
  requestId: string;
  url: string;
  options: any;
};

type WorkerLogMessage = {
  type: 'log';
  level: 'log' | 'warn' | 'error' | 'info';
  args: any[];
};

type WorkerToRunnerMessage =
  | WorkerInitializedMessage
  | WorkerScriptErrorMessage
  | WorkerInvokeResultMessage
  | WorkerInvokeErrorMessage
  | WorkerHttpRequestMessage
  | WorkerLogMessage;

type PendingInvocation = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeoutId: number;
};

/**
 * 解析脚本头部注释中的元信息
 */
export const parseScriptInfo = (script: string): LxScriptInfo => {
  const info: LxScriptInfo = {
    name: '未知音源',
    rawScript: script
  };

  const headerMatch = script.match(/^\/\*+[\s\S]*?\*\//);
  if (!headerMatch) {
    console.warn('[parseScriptInfo] 未找到脚本头部注释块');
    return info;
  }

  const header = headerMatch[0];

  const nameMatch = header.match(/@name\s+(.+?)(?:\r?\n|\*\/)/);
  if (nameMatch) {
    info.name = nameMatch[1].trim().replace(/^\*\s*/, '');
  } else {
    console.warn('[parseScriptInfo] 未找到 @name 标签');
  }

  const descMatch = header.match(/@description\s+(.+?)(?:\r?\n|\*\/)/);
  if (descMatch) {
    info.description = descMatch[1].trim().replace(/^\*\s*/, '');
  }

  const versionMatch = header.match(/@version\s+(.+?)(?:\r?\n|\*\/)/);
  if (versionMatch) {
    info.version = versionMatch[1].trim().replace(/^\*\s*/, '');
  }

  const authorMatch = header.match(/@author\s+(.+?)(?:\r?\n|\*\/)/);
  if (authorMatch) {
    info.author = authorMatch[1].trim().replace(/^\*\s*/, '');
  }

  const homepageMatch = header.match(/@homepage\s+(.+?)(?:\r?\n|\*\/)/);
  if (homepageMatch) {
    info.homepage = homepageMatch[1].trim().replace(/^\*\s*/, '');
  }

  return info;
};

/**
 * 落雪音源脚本执行器
 * 通过 Worker 隔离用户脚本执行，避免主线程直接执行动态脚本
 */
export class LxMusicSourceRunner {
  private script: string;
  private scriptInfo: LxScriptInfo;
  private sources: Partial<Record<LxSourceKey, LxSourceConfig>> = {};
  private initialized = false;
  private initPromise: Promise<LxInitedData> | null = null;

  private worker: Worker | null = null;
  private pendingInvocations = new Map<string, PendingInvocation>();
  private pendingHttpCancels = new Map<string, () => void>();
  private callSequence = 0;

  private initResolver: ((data: LxInitedData) => void) | null = null;
  private initRejecter: ((error: Error) => void) | null = null;
  private initTimeoutId: number | null = null;

  // 临时存储最后一次 HTTP 请求返回的音乐 URL（用于脚本返回 undefined 时的后备）
  private lastMusicUrl: string | null = null;

  constructor(script: string) {
    this.script = script;
    this.scriptInfo = parseScriptInfo(script);
  }

  /**
   * 获取脚本信息
   */
  getScriptInfo(): LxScriptInfo {
    return this.scriptInfo;
  }

  /**
   * 获取支持的音源列表
   */
  getSources(): Partial<Record<LxSourceKey, LxSourceConfig>> {
    return this.sources;
  }

  private ensureWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }

    const worker = new Worker(new URL('./workers/lxScriptSandbox.worker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (event: MessageEvent<WorkerToRunnerMessage>) => {
      this.handleWorkerMessage(event.data);
    };
    worker.onerror = (event) => {
      const message = event.message || '脚本 Worker 运行错误';
      console.error('[LxMusicRunner] Worker error:', message);
      this.rejectInitialization(new Error(message));
      this.rejectAllInvocations(new Error(message));
    };

    this.worker = worker;
    return worker;
  }

  private clearInitState() {
    this.initResolver = null;
    this.initRejecter = null;
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
      this.initTimeoutId = null;
    }
  }

  private rejectInitialization(error: Error) {
    if (this.initRejecter) {
      this.initRejecter(error);
    }
    this.clearInitState();
    this.initPromise = null;
  }

  private resolveInitialization(data: LxInitedData) {
    if (this.initResolver) {
      this.initResolver(data);
    }
    this.clearInitState();
  }

  private rejectAllInvocations(error: Error) {
    this.pendingInvocations.forEach((pending) => {
      clearTimeout(pending.timeoutId);
      pending.reject(error);
    });
    this.pendingInvocations.clear();
  }

  private settleInvocationResult(callId: string, result: any) {
    const pending = this.pendingInvocations.get(callId);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    this.pendingInvocations.delete(callId);
    pending.resolve(result);
  }

  private settleInvocationError(callId: string, message: string) {
    const pending = this.pendingInvocations.get(callId);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    this.pendingInvocations.delete(callId);
    pending.reject(new Error(message));
  }

  private postToWorker(message: RunnerToWorkerMessage) {
    const worker = this.ensureWorker();
    worker.postMessage(message);
  }

  private handleWorkerMessage(message: WorkerToRunnerMessage) {
    switch (message.type) {
      case 'initialized':
        this.sources = message.data.sources;
        this.initialized = true;
        console.log('[LxMusicRunner] 初始化成功:', message.data.sources);
        this.resolveInitialization(message.data);
        break;

      case 'script-error':
        console.error('[LxMusicRunner] 脚本初始化失败:', message.message);
        this.rejectInitialization(new Error(message.message));
        break;

      case 'http-request':
        this.handleWorkerHttpRequest(message);
        break;

      case 'invoke-result':
        this.settleInvocationResult(message.callId, message.result);
        break;

      case 'invoke-error':
        this.settleInvocationError(message.callId, message.message);
        break;

      case 'log':
        if (message.level === 'error') {
          console.error('[LxScript]', ...message.args);
        } else if (message.level === 'warn') {
          console.warn('[LxScript]', ...message.args);
        } else if (message.level === 'info') {
          console.info('[LxScript]', ...message.args);
        } else {
          console.log('[LxScript]', ...message.args);
        }
        break;

      default:
        break;
    }
  }

  private handleWorkerHttpRequest(message: WorkerHttpRequestMessage) {
    const cancel = this.handleHttpRequest(
      message.url,
      message.options,
      (error: Error | null, response: any, body: any) => {
        this.pendingHttpCancels.delete(message.requestId);

        if (body && typeof body.url === 'string') {
          this.lastMusicUrl = body.url;
        }

        this.postToWorker({
          type: 'http-response',
          requestId: message.requestId,
          response,
          body,
          error: error?.message
        });
      }
    );

    this.pendingHttpCancels.set(message.requestId, cancel);
  }

  private async invokeRequest(payload: any, timeoutMs = 20000): Promise<any> {
    if (!this.initialized) {
      throw new Error('脚本尚未初始化');
    }

    const callId = `call_${Date.now()}_${this.callSequence++}`;
    return await new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingInvocations.delete(callId);
        reject(new Error('脚本请求超时'));
      }, timeoutMs);

      this.pendingInvocations.set(callId, {
        resolve,
        reject,
        timeoutId
      });

      this.postToWorker({
        type: 'invoke-request',
        callId,
        payload
      });
    });
  }

  /**
   * 初始化执行器
   */
  async initialize(): Promise<LxInitedData> {
    if (this.initPromise) return this.initPromise;
    if (this.initialized) {
      return {
        openDevTools: false,
        sources: this.sources
      };
    }

    this.initPromise = new Promise<LxInitedData>((resolve, reject) => {
      this.initResolver = resolve;
      this.initRejecter = reject;
      this.initTimeoutId = window.setTimeout(() => {
        this.rejectInitialization(new Error('脚本初始化超时'));
      }, 10000);
    });

    this.postToWorker({
      type: 'initialize',
      script: this.script,
      scriptInfo: this.scriptInfo
    });

    return this.initPromise;
  }

  /**
   * 处理 HTTP 请求（优先使用主进程，绕过 CORS 限制）
   */
  private handleHttpRequest(
    url: string,
    options: any,
    callback: (err: Error | null, resp: any, body: any) => void
  ): () => void {
    console.log(`[LxMusicRunner] HTTP 请求: ${options.method || 'GET'} ${url}`);

    const timeout = options.timeout || 30000;
    const requestId = `lx_http_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const hasMainProcessHttp = typeof window.api?.lxMusicHttpRequest === 'function';

    if (hasMainProcessHttp) {
      window.api
        .lxMusicHttpRequest({
          url,
          options: {
            ...options,
            timeout
          },
          requestId
        })
        .then((response: any) => {
          callback(null, response, response.body);
        })
        .catch((error: Error) => {
          callback(error, null, null);
        });

      return () => {
        void window.api?.lxMusicHttpCancel?.(requestId);
      };
    }

    const controller = new AbortController();
    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      },
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit'
    };

    if (options.body) {
      fetchOptions.body = options.body;
    } else if (options.form) {
      fetchOptions.body = new URLSearchParams(options.form);
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Content-Type': 'application/x-www-form-urlencoded'
      };
    } else if (options.formData) {
      const formData = new FormData();
      for (const [key, value] of Object.entries(options.formData)) {
        formData.append(key, value as string);
      }
      fetchOptions.body = formData;
    }

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, timeout);

    fetch(url, fetchOptions)
      .then(async (response) => {
        clearTimeout(timeoutId);
        const rawBody = await response.text();

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
            // keep raw text
          }
        }

        callback(
          null,
          {
            statusCode: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: parsedBody
          },
          parsedBody
        );
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        callback(error, null, null);
      });

    return () => controller.abort();
  }

  /**
   * 获取音乐 URL
   */
  async getMusicUrl(
    source: LxSourceKey,
    musicInfo: LxMusicInfo,
    quality: LxQuality
  ): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const sourceConfig = this.sources[source];
    if (!sourceConfig) {
      throw new Error(`脚本不支持音源: ${source}`);
    }

    if (!sourceConfig.actions.includes('musicUrl')) {
      throw new Error(`音源 ${source} 不支持获取音乐 URL`);
    }

    let targetQuality = quality;
    if (!sourceConfig.qualitys.includes(quality)) {
      const qualityPriority: LxQuality[] = ['flac24bit', 'flac', '320k', '128k'];
      for (const q of qualityPriority) {
        if (sourceConfig.qualitys.includes(q)) {
          targetQuality = q;
          break;
        }
      }
    }

    try {
      const result = await this.invokeRequest({
        source,
        action: 'musicUrl',
        info: {
          type: targetQuality,
          musicInfo
        }
      });

      let url: string | undefined;
      if (typeof result === 'string') {
        url = result;
      } else if (result && typeof result === 'object') {
        url = result.url || result.data || result;
      }

      if (typeof url !== 'string' || !url) {
        if (this.lastMusicUrl) {
          url = this.lastMusicUrl;
          this.lastMusicUrl = null;
        } else {
          throw new Error(result?.message || result?.msg || '获取音乐 URL 失败');
        }
      }

      return url;
    } catch (error) {
      console.error('[LxMusicRunner] 获取音乐 URL 失败:', error);
      throw error;
    }
  }

  /**
   * 获取歌词
   */
  async getLyric(source: LxSourceKey, musicInfo: LxMusicInfo): Promise<LxLyricResult | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const sourceConfig = this.sources[source];
    if (!sourceConfig || !sourceConfig.actions.includes('lyric')) {
      return null;
    }

    try {
      const result = await this.invokeRequest({
        source,
        action: 'lyric',
        info: {
          type: null,
          musicInfo
        }
      });

      return result as LxLyricResult;
    } catch (error) {
      console.error('[LxMusicRunner] 获取歌词失败:', error);
      return null;
    }
  }

  /**
   * 获取封面图
   */
  async getPic(source: LxSourceKey, musicInfo: LxMusicInfo): Promise<string | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const sourceConfig = this.sources[source];
    if (!sourceConfig || !sourceConfig.actions.includes('pic')) {
      return null;
    }

    try {
      const result = await this.invokeRequest({
        source,
        action: 'pic',
        info: {
          type: null,
          musicInfo
        }
      });
      return typeof result === 'string' ? result : null;
    } catch (error) {
      console.error('[LxMusicRunner] 获取封面失败:', error);
      return null;
    }
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 销毁执行器
   */
  dispose() {
    this.pendingHttpCancels.forEach((cancel) => {
      try {
        cancel();
      } catch {
        // ignore
      }
    });
    this.pendingHttpCancels.clear();

    this.rejectAllInvocations(new Error('执行器已销毁'));
    this.clearInitState();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.initialized = false;
    this.initPromise = null;
    this.sources = {};
    this.lastMusicUrl = null;
  }
}

// 全局单例
let runnerInstance: LxMusicSourceRunner | null = null;

/**
 * 获取落雪音源执行器实例
 */
export const getLxMusicRunner = (): LxMusicSourceRunner | null => {
  return runnerInstance;
};

/**
 * 设置落雪音源执行器实例
 */
export const setLxMusicRunner = (runner: LxMusicSourceRunner | null): void => {
  if (runnerInstance && runnerInstance !== runner) {
    runnerInstance.dispose();
  }
  runnerInstance = runner;
};

/**
 * 初始化落雪音源执行器（从脚本内容）
 */
export const initLxMusicRunner = async (script: string): Promise<LxMusicSourceRunner> => {
  if (runnerInstance) {
    runnerInstance.dispose();
  }

  const runner = new LxMusicSourceRunner(script);
  await runner.initialize();

  runnerInstance = runner;
  return runner;
};

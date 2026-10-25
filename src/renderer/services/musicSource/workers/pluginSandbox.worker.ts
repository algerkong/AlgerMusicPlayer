/**
 * 统一音源插件沙箱 Worker（三方言单一运行时）
 *
 * - native：CommonJS wrapper（module/exports/ctx），无 require
 * - musicfree：CommonJS wrapper + require 垫片（axios/crypto-js/cheerio 等）+ 全局 env
 * - lxmusic：注入 globalThis.lx 事件宿主（on/send/request/utils），脚本顶层注册
 *   handler 后 send(inited)；适配器把事件模型包装成统一的 getMediaSource 导出
 *
 * 消息协议（与 PluginSandboxRunner 对应）：
 *   host→worker: initialize{script, dialect, scriptInfo} | invoke{callId, method, args, userVars}
 *                | http-response{requestId, response, error?}
 *   worker→host: initialized{meta} | script-error | invoke-result | invoke-error
 *                | http-request{requestId, url, options} | log
 *
 * 参照 AlgerMusicFlutter server/src/plugin/loader.js 的方言适配分层：
 * 方言差异（执行包装/全局注入/返回值归一）全部收敛在 worker 内，
 * Runner 与上层只面对统一的导出对象形状。
 */
import bigInteger from 'big-integer';
import * as cheerio from 'cheerio';
import CryptoJS from 'crypto-js';
import dayjs from 'dayjs';
import * as fflate from 'fflate';
import * as he from 'he';
import * as qs from 'qs';

import type { LxQuality, LxSourceKey } from '@/types/lxMusic';
import type { MusicSourcePluginDialect } from '@/types/musicSourcePlugin';
import type { MusicSourcePluginMeta } from '@/types/musicSourcePlugin';
import * as lxCrypto from '@/utils/lxCrypto';

// ─── 消息协议 ────────────────────────────────────────────────────────────

type WorkerInitMessage = {
  type: 'initialize';
  script: string;
  dialect: MusicSourcePluginDialect;
  scriptInfo: MusicSourcePluginMeta;
};

type WorkerInvokeMessage = {
  type: 'invoke';
  callId: string;
  method: string;
  args: unknown[];
  userVars: Record<string, string>;
};

type WorkerHttpResponseMessage = {
  type: 'http-response';
  requestId: string;
  response: unknown;
  error?: string;
};

type WorkerHostMessage = WorkerInitMessage | WorkerInvokeMessage | WorkerHttpResponseMessage;

export type SandboxPluginMeta = {
  platform?: string;
  name?: string;
  version?: string;
  author?: string;
  description?: string;
  sourceUrl?: string;
  methods: string[];
  userVariables: unknown[];
  /** lxmusic 方言：脚本 inited 握手声明的源表 */
  lxSources?: Record<string, { name?: string; actions?: string[]; qualitys?: string[] }>;
};

type HostInitializedMessage = { type: 'initialized'; meta: SandboxPluginMeta };
type HostScriptErrorMessage = { type: 'script-error'; message: string };
type HostInvokeResultMessage = { type: 'invoke-result'; callId: string; result: unknown };
type HostInvokeErrorMessage = { type: 'invoke-error'; callId: string; message: string };
type HostHttpRequestMessage = {
  type: 'http-request';
  requestId: string;
  url: string;
  options: Record<string, unknown>;
};
type HostLogMessage = { type: 'log'; level: 'log' | 'warn' | 'error' | 'info'; args: unknown[] };

type HostWorkerMessage =
  | HostInitializedMessage
  | HostHttpRequestMessage
  | HostInvokeResultMessage
  | HostInvokeErrorMessage
  | HostScriptErrorMessage
  | HostLogMessage;

// ─── 状态 ────────────────────────────────────────────────────────────────

type PluginExports = Record<string, any> & {
  __lxSources?: SandboxPluginMeta['lxSources'];
};

let pluginExports: PluginExports | null = null;
let currentDialect: MusicSourcePluginDialect = 'native';
let currentUserVars: Record<string, string> = {};
let currentContext: Record<string, any> | null = null;
let requestCounter = 0;

const pendingHttpRequests = new Map<
  string,
  { resolve: (value: HttpResponse) => void; reject: (error: Error) => void }
>();
/** LX 脚本的回调风格请求（lx.request(url, options, callback)） */
const pendingHttpCallbacks = new Map<
  string,
  (error: Error | null, response: any, body: any) => void
>();

const storage = new Map<string, unknown>();

const postToHost = (message: HostWorkerMessage): void => {
  self.postMessage(message);
};

const postLog = (level: HostLogMessage['level'], ...args: unknown[]): void => {
  postToHost({ type: 'log', level, args });
};

// ─── HTTP 通道（promise 风格，native/musicfree 用） ────────────────────────

type HttpResponse = {
  statusCode: number;
  headers?: Record<string, string | string[]>;
  body?: unknown;
};

type HttpOptions = Record<string, unknown> & {
  method?: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  body?: unknown;
  timeout?: number;
};

const requestHost = async (url: string, options: HttpOptions = {}): Promise<HttpResponse> => {
  const requestId = `plugin_http_${Date.now()}_${requestCounter++}`;
  const response = new Promise<HttpResponse>((resolve, reject) => {
    pendingHttpRequests.set(requestId, { resolve, reject });
  });
  postToHost({
    type: 'http-request',
    requestId,
    url,
    options: {
      ...options,
      data: options.data !== undefined ? options.data : options.body,
      method: String(options.method || 'GET').toUpperCase()
    }
  });
  return response;
};

const createHttpContext = () => {
  const request = (url: string, options: HttpOptions = {}) =>
    requestHost(url, options).then((response) => ({
      status: response.statusCode,
      statusCode: response.statusCode,
      headers: response.headers || {},
      data: response.body
    }));

  return {
    request,
    get: (url: string, options: HttpOptions = {}) => request(url, { ...options, method: 'GET' }),
    post: (url: string, data?: unknown, options: HttpOptions = {}) =>
      request(url, { ...options, method: 'POST', data }),
    put: (url: string, data?: unknown, options: HttpOptions = {}) =>
      request(url, { ...options, method: 'PUT', data }),
    delete: (url: string, options: HttpOptions = {}) =>
      request(url, { ...options, method: 'DELETE' })
  };
};

// ─── 编解码 / 加密工具（ctx 与 LX utils 共用底层） ────────────────────────

const toBytes = (value: unknown, encoding = 'utf-8'): Uint8Array => {
  if (typeof value === 'string') {
    switch (encoding.toLowerCase()) {
      case 'base64':
        return lxCrypto.base64Decode(value);
      case 'hex':
        return hexToBytes(value);
      case 'binary':
      case 'latin1': {
        const out = new Uint8Array(value.length);
        for (let i = 0; i < out.length; i++) out[i] = value.charCodeAt(i) & 0xff;
        return out;
      }
      default:
        return new TextEncoder().encode(value);
    }
  }
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(
      (value as Uint8Array).buffer,
      (value as Uint8Array).byteOffset,
      (value as Uint8Array).byteLength
    );
  }
  if (Array.isArray(value)) return Uint8Array.from(value as number[]);
  return new Uint8Array();
};

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.length % 2 ? `0${hex}` : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  return out;
};

const bytesToString = (data: unknown, encoding = 'utf-8'): string => {
  const bytes = toBytes(data);
  switch (encoding.toLowerCase()) {
    case 'base64':
      return lxCrypto.base64Encode(bytes);
    case 'hex': {
      let out = '';
      for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
      return out;
    }
    case 'binary':
    case 'latin1': {
      let out = '';
      for (const byte of bytes) out += String.fromCharCode(byte);
      return out;
    }
    default:
      return new TextDecoder(encoding).decode(bytes);
  }
};

/** Node Buffer 语义（LX 脚本按 lx-music-desktop 的 Node 环境编写） */
class LxBuffer extends Uint8Array {
  toString(encoding = 'utf-8'): string {
    return bytesToString(this, encoding);
  }
}

const toLxBuffer = (bytes: Uint8Array): LxBuffer =>
  new LxBuffer(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength);

const bytesToHex = (value: unknown): string =>
  Array.from(toBytes(value))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('');

const bytesToBase64 = (value: unknown): string => {
  let binary = '';
  for (const byte of toBytes(value)) binary += String.fromCharCode(byte);
  return btoa(binary);
};

// ─── ctx（native 方言注入） ───────────────────────────────────────────────

const createCryptoContext = () => ({
  md5: (value: unknown) => CryptoJS.MD5(String(value)).toString(),
  sha1: (value: unknown) => CryptoJS.SHA1(String(value)).toString(),
  sha256: (value: unknown) => CryptoJS.SHA256(String(value)).toString(),
  randomBytes: (size: number) => {
    const bytes = new Uint8Array(Math.max(0, Math.floor(size)));
    crypto.getRandomValues(bytes);
    return bytes;
  }
});

const createCodecContext = () => ({
  hexEncode: bytesToHex,
  hexDecode: (value: string) => hexToBytes(value),
  base64Encode: bytesToBase64,
  base64Decode: (value: string) => lxCrypto.base64Decode(value),
  utf8Encode: (value: string) => new TextEncoder().encode(value),
  utf8Decode: (value: unknown) => new TextDecoder().decode(toBytes(value))
});

const createConsoleContext = () => ({
  log: (...args: unknown[]) => postLog('log', ...args),
  info: (...args: unknown[]) => postLog('info', ...args),
  warn: (...args: unknown[]) => postLog('warn', ...args),
  error: (...args: unknown[]) => postLog('error', ...args)
});

const createPluginContext = () => ({
  http: createHttpContext(),
  crypto: createCryptoContext(),
  codec: createCodecContext(),
  console: createConsoleContext(),
  env: { host: 'desktop', appVersion: 'AlgerMusicPlayer' },
  userVars: currentUserVars,
  storage: {
    get: (key: string) => storage.get(key) ?? null,
    set: (key: string, value: unknown) => {
      if (storage.size >= 500 && !storage.has(key)) throw new Error('plugin storage is full');
      storage.set(key, value);
    },
    remove: (key: string) => storage.delete(key)
  }
});

// ─── MusicFree 的 require 垫片 ───────────────────────────────────────────

type AxiosLike = {
  (configOrUrl: string | Record<string, unknown>, config?: Record<string, unknown>): Promise<any>;
  defaults: Record<string, unknown>;
  get: (url: string, config?: Record<string, unknown>) => Promise<any>;
  post: (url: string, data?: unknown, config?: Record<string, unknown>) => Promise<any>;
  request: (
    configOrUrl: string | Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<any>;
  create: (defaults?: Record<string, unknown>) => AxiosLike;
  interceptors: {
    response: {
      use: (fulfilled: (response: any) => any, rejected?: (error: unknown) => any) => number;
    };
  };
};

const buildAxiosResponse = (response: HttpResponse, config: Record<string, unknown>) => ({
  data: response.body,
  status: response.statusCode,
  statusText: String(response.statusCode),
  headers: response.headers || {},
  config
});

/**
 * axios 调优对齐 MusicFree 宿主（行为级兼容，参照 Flutter loader.js）：
 * 移动端宿主 `defaults.timeout = 2000`，且响应拦截器把长度为 1 的 set-cookie
 * 按逗号拆开。不调优则「装得上、跑不对」：慢站点无超时挂死、cookie 取值形状错。
 */
const tuneAxiosLikeMusicFree = (mod: Record<string, any>): void => {
  if (!mod || !mod.defaults || mod.__mfTuned) return;
  mod.__mfTuned = true;
  if (!mod.defaults.timeout) mod.defaults.timeout = 2000;
  if (!mod.interceptors || !mod.interceptors.response) return;
  mod.interceptors.response.use((res: any) => {
    const sc = res && res.headers && res.headers['set-cookie'];
    if (Array.isArray(sc) && sc.length === 1) {
      res.headers['x-set-cookie'] = sc[0];
      res.headers['set-cookie'] = sc[0].split(',').map((s: string) => s.trim());
    }
    return res;
  });
};

const createAxiosShim = (initialDefaults: Record<string, unknown> = {}): AxiosLike => {
  const responseInterceptors: Array<(response: any) => any> = [];
  const defaults = { timeout: 2000, ...initialDefaults };

  const request = async (
    configOrUrl: string | Record<string, unknown>,
    maybeConfig: Record<string, unknown> = {}
  ): Promise<any> => {
    const config: Record<string, unknown> = {
      ...defaults,
      ...(typeof configOrUrl === 'string' ? maybeConfig : configOrUrl)
    };
    if (typeof configOrUrl === 'string') config.url = configOrUrl;
    const url = String(config.url || '');
    if (!url) throw new Error('axios: request URL is empty');

    const response = await requestHost(url, {
      ...config,
      method: String(config.method || 'GET').toUpperCase(),
      headers: (config.headers || {}) as Record<string, string>,
      params: config.params as Record<string, unknown> | undefined,
      data: config.data,
      timeout: Number(config.timeout || defaults.timeout || 0)
    });
    let result = buildAxiosResponse(response, config);
    for (const interceptor of responseInterceptors) {
      result = await interceptor(result);
    }
    return result;
  };

  const axios = ((
    configOrUrl: string | Record<string, unknown>,
    config?: Record<string, unknown>
  ) => request(configOrUrl, config)) as AxiosLike;

  axios.defaults = defaults;
  axios.request = request;
  axios.get = (url, config) => request(url, { ...(config || {}), method: 'GET' });
  axios.post = (url, data, config) => request(url, { ...(config || {}), method: 'POST', data });
  axios.create = (config) => createAxiosShim({ ...defaults, ...(config || {}) });
  axios.interceptors = {
    response: {
      use: (fulfilled) => {
        responseInterceptors.push(fulfilled);
        return responseInterceptors.length - 1;
      }
    }
  };
  (axios as any).default = axios;
  return axios;
};

/**
 * 生态里绝大多数插件是 TS 编译产物：`qs_1.default.stringify(...)` 是标准形状。
 * 不能直接赋值 .default —— Vite/worker 的 ESM namespace 对象是冻结的
 * （批量语料 31/73 份死在 `Cannot add property default, object is not
 * extensible`），冻结对象改用 Proxy 透传 default 键。
 */
const withDefault = (mod: unknown): unknown => {
  const obj = mod as Record<string, unknown> | null;
  if (!obj || typeof obj !== 'object') return obj;
  if (obj.default !== undefined) return obj;
  try {
    obj.default = obj;
    return obj;
  } catch {
    return new Proxy(obj, {
      get(target, key) {
        return key === 'default' ? target : Reflect.get(target, key);
      }
    });
  }
};

const createRequireShim = () => {
  const axios = createAxiosShim();
  const cryptoJs = CryptoJS as any;
  cryptoJs.default = cryptoJs;
  return (name: string): unknown => {
    switch (name) {
      case 'axios':
        tuneAxiosLikeMusicFree(axios as any);
        return axios;
      case 'crypto-js':
        return cryptoJs;
      case 'qs':
        return withDefault(qs);
      case 'he':
        return withDefault(he);
      case 'dayjs':
        return withDefault(dayjs);
      case 'big-integer':
        return withDefault(bigInteger);
      case 'cheerio':
        return withDefault(cheerio);
      case 'fflate':
        return withDefault(fflate);
      default:
        throw new Error(`plugin require is not available: ${name}`);
    }
  };
};

/** CJS/ESM 互操作：Parcel 打包的插件把实例挂在 module.exports.default 上 */
const unwrapDefault = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object') return {};
  const object = value as Record<string, any>;
  const defaultValue = object.default;
  const topHasPlatform = typeof object.platform === 'string' && object.platform;
  const defHasPlatform =
    defaultValue &&
    typeof defaultValue === 'object' &&
    typeof defaultValue.platform === 'string' &&
    defaultValue.platform;
  if (!topHasPlatform && defHasPlatform) return defaultValue;
  return object;
};

// ─── LX Music 方言宿主（事件模型 → 统一导出对象） ─────────────────────────

type LxInitedSources = Record<
  string,
  { name?: string; type?: string; actions?: string[]; qualitys?: string[] }
>;

const QUALITY_TO_LX: Record<string, LxQuality> = {
  standard: '128k',
  higher: '320k',
  exhigh: '320k',
  lossless: 'flac',
  hires: 'flac24bit',
  jyeffect: 'flac',
  sky: 'flac',
  dolby: 'flac',
  jymaster: 'flac24bit'
};
const LX_QUALITY_LADDER: LxQuality[] = ['flac24bit', 'flac', '320k', '128k'];
const LX_SOURCE_PRIORITY: LxSourceKey[] = ['wy', 'kw', 'mg', 'kg', 'tx'];

/** 统一导出条目（toPluginItem 形状）→ LX 协议 musicInfo */
const itemToLxMusicInfo = (item: Record<string, any>) => {
  const artists = (item.artists || []).map((a: { name?: string }) => a?.name).filter(Boolean);
  const durationMs = Number(item.duration) || 0;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    songmid: String(item.id ?? ''),
    name: item.name || '',
    singer: artists.join('、'),
    album: item.album?.name || '',
    albumId: '',
    source: 'wy',
    interval: `${pad(minutes)}:${pad(seconds)}`,
    img: ''
  };
};

/**
 * 注入 globalThis.lx 事件宿主并执行脚本，等 inited 握手后把
 * 「源选择 + musicUrl 请求 + 音质降级 + 返回值归一」包装成统一导出对象。
 */
const loadLxDialect = async (
  script: string,
  scriptInfo: MusicSourcePluginMeta
): Promise<PluginExports> => {
  let requestHandler: ((data: any) => Promise<any>) | null = null;
  let lxSources: LxInitedSources = {};

  let settleInited: (() => void) | null = null;
  const initedPromise = new Promise<void>((resolve, reject) => {
    settleInited = resolve;
    setTimeout(() => reject(new Error('LX 脚本初始化超时（未收到 inited 握手）')), 15000);
  });

  const lxApi: Record<string, any> = {
    version: '2.8.0',
    env: 'desktop',
    appInfo: { version: '2.8.0', versionNum: 208, locale: 'zh-cn' },
    currentScriptInfo: {
      name: scriptInfo.name,
      version: scriptInfo.version,
      author: scriptInfo.author,
      rawScript: script
    },
    EVENT_NAMES: { inited: 'inited', request: 'request', updateAlert: 'updateAlert' },
    on: (eventName: string, handler: (data: any) => Promise<any>) => {
      if (eventName === 'request') requestHandler = handler;
    },
    send: (eventName: string, data: any) => {
      if (eventName === 'inited') {
        lxSources = (data?.sources || {}) as LxInitedSources;
        settleInited?.();
      } else if (eventName === 'updateAlert') {
        postLog('info', '[LxScript][updateAlert]', data);
      }
    },
    request: (
      url: string,
      options: any,
      callback: (err: Error | null, resp: any, body: any) => void
    ) => {
      const requestId = `lx_http_${Date.now()}_${requestCounter++}`;
      pendingHttpCallbacks.set(requestId, callback);
      postToHost({ type: 'http-request', requestId, url, options });
      return () => {
        pendingHttpCallbacks.delete(requestId);
      };
    },
    utils: {
      buffer: {
        from: (data: any, encoding?: string) => toLxBuffer(toBytes(data, encoding)),
        bufToString: (buffer: any, encoding?: string) => bytesToString(buffer, encoding)
      },
      crypto: {
        md5: lxCrypto.md5,
        sha1: lxCrypto.sha1,
        sha256: lxCrypto.sha256,
        randomBytes: (size: number) => {
          const bytes = new Uint8Array(size);
          crypto.getRandomValues(bytes);
          return toLxBuffer(bytes);
        },
        aesEncrypt: (buffer: any, mode: string, key: any, iv: any) =>
          toLxBuffer(lxCrypto.aesEncrypt(buffer, mode, key, iv)),
        aesDecrypt: (buffer: any, mode: string, key: any, iv: any) =>
          toLxBuffer(lxCrypto.aesDecrypt(buffer, mode, key, iv)),
        rsaEncrypt: (buffer: any, key: string) => toLxBuffer(lxCrypto.rsaEncrypt(buffer, key)),
        rsaDecrypt: (buffer: any, key: string) => toLxBuffer(lxCrypto.rsaDecrypt(buffer, key)),
        base64Encode: lxCrypto.base64Encode,
        base64Decode: (str: string) => toLxBuffer(lxCrypto.base64Decode(str))
      },
      zlib: {
        inflate: (buffer: ArrayBuffer) => streamDecompress('deflate', buffer),
        deflate: (buffer: ArrayBuffer) => streamCompress('deflate', buffer)
      }
    }
  };

  // installGlobals 已设 window=globalThis；本 Worker 每插件一个实例（独立 realm），
  // lx 挂 globalThis.lx 后 window.lx 自然可见，脚本访问 window.setTimeout 等也正常。
  // 不在包装里前置 `const lx = globalThis.lx`：语料里有脚本顶层自声明
  // `const lx`/`const z`，前置声明会与其冲突（Identifier has already been
  // declared）；裸用 lx 的脚本沿作用域链同样命中 globalThis.lx。
  const globalValue = globalThis as any;
  globalValue.lx = lxApi;

  const sandboxScript = script;
  const scriptUrl = URL.createObjectURL(new Blob([sandboxScript], { type: 'text/javascript' }));
  try {
    await import(/* @vite-ignore */ scriptUrl);
  } catch {
    // Node 测试台不支持 blob: 模块；LX 脚本是 IIFE + globalThis.lx 回调模型，
    // 不依赖模块作用域，两种装载手段等价（真语法错误两条路径都抛）
    new Function(sandboxScript)();
  } finally {
    URL.revokeObjectURL(scriptUrl);
  }

  await initedPromise;

  const sourceKeys = Object.keys(lxSources);
  const pickSource = (): { key: LxSourceKey; actions: string[]; qualitys: string[] } | null => {
    const key = LX_SOURCE_PRIORITY.find((k) => sourceKeys.includes(k)) ?? sourceKeys[0];
    if (!key) return null;
    const cfg = lxSources[key] || {};
    return {
      key: key as LxSourceKey,
      actions: cfg.actions || [],
      qualitys: (cfg.qualitys || []) as string[]
    };
  };

  const exports_: PluginExports = {
    // LX 脚本不声明 platform；由 meta 静态解析兜底
    getMediaSource: async (item: Record<string, any>, quality: string) => {
      if (typeof requestHandler !== 'function') {
        throw new Error('LX 脚本未注册请求处理器');
      }
      const source = pickSource();
      if (!source) throw new Error('LX 脚本未声明可用音源');
      if (!source.actions.includes('musicUrl')) {
        throw new Error(`LX 音源 ${source.key} 不支持获取音乐 URL`);
      }

      let targetQuality: LxQuality = QUALITY_TO_LX[quality] || '320k';
      if (!source.qualitys.includes(targetQuality)) {
        targetQuality = LX_QUALITY_LADDER.find((q) => source.qualitys.includes(q)) || targetQuality;
      }

      const result = await requestHandler({
        source: source.key,
        action: 'musicUrl',
        info: { type: targetQuality, musicInfo: itemToLxMusicInfo(item) }
      });

      let url: unknown;
      if (typeof result === 'string') {
        url = result;
      } else if (result && typeof result === 'object') {
        url = (result as Record<string, unknown>).url ?? (result as Record<string, unknown>).data;
      }
      if (typeof url !== 'string' || !url) {
        throw new Error(
          ((result as Record<string, unknown>)?.message as string) || 'LX 脚本未返回音乐 URL'
        );
      }
      // LX 脚本可能返回 API 端点而非直链；此处保持乐观返回，由上层 resolveAudioUrl 验证
      return { url };
    }
  };
  Object.defineProperty(exports_, '__lxSources', {
    value: lxSources,
    enumerable: false
  });
  return exports_;
};

const streamThrough = async (
  transform: { writable: any; readable: any } | null,
  buffer: ArrayBuffer
): Promise<ArrayBuffer> => {
  if (!transform) return buffer;
  try {
    const writer = transform.writable.getWriter();
    writer.write(buffer);
    writer.close();
    const reader = transform.readable.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      if (result.value) chunks.push(result.value);
    }
    const total = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out.buffer;
  } catch {
    return buffer;
  }
};

const streamDecompress = (format: string, buffer: ArrayBuffer) =>
  streamThrough(
    new DecompressionStream(format as 'deflate') as unknown as { writable: any; readable: any },
    buffer
  );
const streamCompress = (format: string, buffer: ArrayBuffer) =>
  streamThrough(
    new CompressionStream(format as 'deflate') as unknown as { writable: any; readable: any },
    buffer
  );

// ─── 全局环境 ────────────────────────────────────────────────────────────

const installGlobals = () => {
  const globalValue = globalThis as any;
  if (!globalValue.window) globalValue.window = globalValue;
  if (!globalValue.global) globalValue.global = globalValue;
  for (const key of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) {
    try {
      Object.defineProperty(globalValue, key, {
        configurable: true,
        writable: false,
        value: undefined
      });
    } catch {
      // The worker may already have a non-configurable property.
    }
  }
};

// ─── 装载 ────────────────────────────────────────────────────────────────

const initializePlugin = async (
  script: string,
  dialect: MusicSourcePluginDialect,
  scriptInfo: MusicSourcePluginMeta
): Promise<void> => {
  installGlobals();
  currentDialect = dialect;
  currentUserVars = {};
  currentContext = createPluginContext();
  storage.clear();
  pendingHttpCallbacks.clear();

  if (dialect === 'lxmusic') {
    pluginExports = await loadLxDialect(script, scriptInfo);
  } else {
    const moduleObject = { exports: {} as Record<string, any> };
    const requireShim = createRequireShim();
    // env 挂全局而不是 wrapper 形参：语料 8/73 份脚本顶层自声明 `const env`
    // （形参即函数作用域声明，会与其冲突）。裸读 env 的脚本沿作用域链命中全局。
    if (dialect === 'musicfree') {
      (globalThis as any).env = {
        os: 'desktop',
        lang: 'zh-CN',
        appVersion: 'AlgerMusicPlayer',
        getUserVariables: () => ({ ...currentUserVars }),
        getEnv: () => ({ host: 'desktop' })
      };
    }
    const wrapper = new Function('module', 'exports', 'ctx', 'require', script) as (
      module: { exports: Record<string, any> },
      exports: Record<string, any>,
      ctx: Record<string, any>,
      require?: (name: string) => unknown
    ) => unknown;

    await Promise.resolve(
      wrapper(
        moduleObject,
        moduleObject.exports,
        currentContext,
        dialect === 'musicfree' ? requireShim : undefined
      )
    );
    pluginExports = unwrapDefault(moduleObject.exports);
  }

  const methods = Object.keys(pluginExports).filter(
    (key) => typeof pluginExports?.[key] === 'function' && key !== '__lxSources'
  );
  const lxSources = pluginExports?.__lxSources as SandboxPluginMeta['lxSources'];
  const runtimePlatform =
    typeof pluginExports.platform === 'string' ? pluginExports.platform : scriptInfo.platform;
  const runtimeName = typeof pluginExports.name === 'string' ? pluginExports.name : scriptInfo.name;

  postToHost({
    type: 'initialized',
    meta: {
      ...(runtimePlatform || scriptInfo.platform
        ? { platform: runtimePlatform || scriptInfo.platform }
        : {}),
      name: runtimeName,
      ...(typeof pluginExports.version === 'string'
        ? { version: pluginExports.version }
        : scriptInfo.version
          ? { version: scriptInfo.version }
          : {}),
      ...(typeof pluginExports.author === 'string'
        ? { author: pluginExports.author }
        : scriptInfo.author
          ? { author: scriptInfo.author }
          : {}),
      ...(scriptInfo.description ? { description: scriptInfo.description } : {}),
      ...(scriptInfo.sourceUrl ? { sourceUrl: scriptInfo.sourceUrl } : {}),
      methods,
      userVariables: Array.isArray(pluginExports.userVariables) ? pluginExports.userVariables : [],
      ...(lxSources && Object.keys(lxSources).length ? { lxSources } : {})
    }
  });
};

const invokePlugin = async (message: WorkerInvokeMessage): Promise<void> => {
  if (!pluginExports) {
    postToHost({
      type: 'invoke-error',
      callId: message.callId,
      message: 'plugin is not initialized'
    });
    return;
  }

  currentUserVars = { ...message.userVars };
  if (currentContext) {
    currentContext.userVars = currentUserVars;
  }

  const method = pluginExports[message.method];
  if (typeof method !== 'function') {
    postToHost({
      type: 'invoke-error',
      callId: message.callId,
      message: `method-not-found:${message.method}`
    });
    return;
  }

  try {
    // native 协议 ctx 恒为最后一参；musicfree/lxmusic 的适配在方言层内部完成
    const args = currentDialect === 'native' ? [...message.args, currentContext] : message.args;
    const result = await Promise.resolve(method.apply(pluginExports, args));
    postToHost({ type: 'invoke-result', callId: message.callId, result });
  } catch (error) {
    postToHost({
      type: 'invoke-error',
      callId: message.callId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

// ─── 消息循环 ────────────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<WorkerHostMessage>) => {
  const message = event.data;

  if (message.type === 'initialize') {
    try {
      await initializePlugin(message.script, message.dialect, message.scriptInfo);
    } catch (error) {
      postToHost({
        type: 'script-error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
    return;
  }

  if (message.type === 'invoke') {
    await invokePlugin(message);
    return;
  }

  // http-response：两条通道（promise / LX 回调）按 requestId 命中各自队列
  const callback = pendingHttpCallbacks.get(message.requestId);
  if (callback) {
    pendingHttpCallbacks.delete(message.requestId);
    if (message.error) {
      callback(new Error(message.error), null, null);
    } else {
      const response = (message.response || {}) as HttpResponse;
      callback(null, response, response.body);
    }
    return;
  }

  const pending = pendingHttpRequests.get(message.requestId);
  if (!pending) return;
  pendingHttpRequests.delete(message.requestId);
  if (message.error) {
    pending.reject(new Error(message.error));
  } else {
    pending.resolve((message.response || {}) as HttpResponse);
  }
};

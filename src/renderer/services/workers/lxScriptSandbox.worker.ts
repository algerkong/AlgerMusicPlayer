import type { LxInitedData, LxScriptInfo } from '@/types/lxMusic';
import * as lxCrypto from '@/utils/lxCrypto';

type WorkerInitMessage = {
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

type WorkerHostMessage = WorkerInitMessage | WorkerInvokeMessage | WorkerHttpResponseMessage;

type HostInitializedMessage = {
  type: 'initialized';
  data: LxInitedData;
};

type HostScriptErrorMessage = {
  type: 'script-error';
  message: string;
};

type HostInvokeResultMessage = {
  type: 'invoke-result';
  callId: string;
  result: any;
};

type HostInvokeErrorMessage = {
  type: 'invoke-error';
  callId: string;
  message: string;
};

type HostHttpRequestMessage = {
  type: 'http-request';
  requestId: string;
  url: string;
  options: any;
};

type HostLogMessage = {
  type: 'log';
  level: 'log' | 'warn' | 'error' | 'info';
  args: any[];
};

type HostWorkerMessage =
  | HostInitializedMessage
  | HostScriptErrorMessage
  | HostInvokeResultMessage
  | HostInvokeErrorMessage
  | HostHttpRequestMessage
  | HostLogMessage;

let requestHandler: ((data: any) => Promise<any>) | null = null;
let requestCounter = 0;

const pendingHttpCallbacks = new Map<
  string,
  (error: Error | null, response: any, body: any) => void
>();

const postToHost = (message: HostWorkerMessage) => {
  self.postMessage(message);
};

const postLog = (level: HostLogMessage['level'], ...args: any[]) => {
  postToHost({
    type: 'log',
    level,
    args
  });
};

/**
 * Node Buffer 语义的最小实现。
 * 落雪脚本按 lx-music-desktop 的 Node 环境编写：
 * buffer.from/bufToString 依赖 encoding 参数（base64/hex 等），
 * 且会对返回的 Buffer 调用 .toString(encoding)
 */
class LxBuffer extends Uint8Array {
  toString(encoding = 'utf-8'): string {
    return bytesToString(this, encoding);
  }
}

const toLxBuffer = (bytes: Uint8Array): LxBuffer =>
  new LxBuffer(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength);

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.length % 2 ? `0${hex}` : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return out;
};

const toBytes = (data: any, encoding = 'utf-8'): Uint8Array => {
  if (typeof data === 'string') {
    switch (encoding.toLowerCase()) {
      case 'base64':
        return lxCrypto.base64Decode(data);
      case 'hex':
        return hexToBytes(data);
      case 'binary':
      case 'latin1': {
        const out = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
          out[i] = data.charCodeAt(i) & 0xff;
        }
        return out;
      }
      default:
        return new TextEncoder().encode(data);
    }
  }
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (Array.isArray(data)) return Uint8Array.from(data);
  return new Uint8Array(0);
};

const bytesToString = (data: any, encoding = 'utf-8'): string => {
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

/**
 * 落雪脚本参照 lx-music-desktop 环境编写（隐藏 BrowserWindow，window 存在）。
 * 混淆脚本常用 `window -> (process/require ? global : this)` 探测全局对象，
 * 而 module worker 中三者全为 undefined，随后访问 `.console` 即抛
 * "Cannot read properties of undefined (reading 'console')"，这里补齐别名。
 */
const exposeNodeLikeGlobals = () => {
  const g = globalThis as any;
  if (!g.window) g.window = g;
  if (!g.global) g.global = g;
};

const hardenGlobalScope = () => {
  const blockedKeys: Array<keyof typeof globalThis> = [
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource'
  ] as any;

  blockedKeys.forEach((key) => {
    try {
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: false,
        value: undefined
      });
    } catch {
      // ignore
    }
  });
};

const createLxApi = (scriptInfo: LxScriptInfo) => {
  return {
    version: '2.8.0',
    env: 'desktop',
    appInfo: {
      version: '2.8.0',
      versionNum: 208,
      locale: 'zh-cn'
    },
    currentScriptInfo: scriptInfo,
    EVENT_NAMES: {
      inited: 'inited',
      request: 'request',
      updateAlert: 'updateAlert'
    },
    on: (eventName: string, handler: (data: any) => Promise<any>) => {
      if (eventName === 'request') {
        requestHandler = handler;
      }
    },
    send: (eventName: string, data: any) => {
      if (eventName === 'inited') {
        postToHost({
          type: 'initialized',
          data: data as LxInitedData
        });
      } else if (eventName === 'updateAlert') {
        postLog('info', '[LxScript][updateAlert]', data);
      }
    },
    request: (
      url: string,
      options: any,
      callback: (err: Error | null, resp: any, body: any) => void
    ) => {
      const requestId = `wreq_${Date.now()}_${requestCounter++}`;
      pendingHttpCallbacks.set(requestId, callback);
      postToHost({
        type: 'http-request',
        requestId,
        url,
        options
      });
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
        // lx-music 中 randomBytes 返回 Node Buffer，脚本会对其调用 .toString(encoding)
        randomBytes: (size: number) => {
          const bytes = new Uint8Array(size);
          crypto.getRandomValues(bytes);
          return toLxBuffer(bytes);
        },
        aesEncrypt: (
          buffer: string | Uint8Array,
          mode: string,
          key: string | Uint8Array,
          iv: string | Uint8Array
        ) => toLxBuffer(lxCrypto.aesEncrypt(buffer, mode, key as any, iv as any)),
        aesDecrypt: (
          buffer: Uint8Array,
          mode: string,
          key: string | Uint8Array,
          iv: string | Uint8Array
        ) => toLxBuffer(lxCrypto.aesDecrypt(buffer, mode, key as any, iv as any)),
        rsaEncrypt: (buffer: string | Uint8Array, key: string) =>
          toLxBuffer(lxCrypto.rsaEncrypt(buffer, key)),
        rsaDecrypt: (buffer: Uint8Array, key: string) =>
          toLxBuffer(lxCrypto.rsaDecrypt(buffer, key)),
        base64Encode: lxCrypto.base64Encode,
        base64Decode: (str: string) => toLxBuffer(lxCrypto.base64Decode(str))
      },
      zlib: {
        inflate: async (buffer: ArrayBuffer) => {
          try {
            const ds = new DecompressionStream('deflate');
            const writer = ds.writable.getWriter();
            writer.write(buffer);
            writer.close();
            const reader = ds.readable.getReader();
            const chunks: Uint8Array[] = [];
            let done = false;
            while (!done) {
              const result = await reader.read();
              done = result.done;
              if (result.value) chunks.push(result.value);
            }
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
              result.set(chunk, offset);
              offset += chunk.length;
            }
            return result.buffer;
          } catch {
            return buffer;
          }
        },
        deflate: async (buffer: ArrayBuffer) => {
          try {
            const cs = new CompressionStream('deflate');
            const writer = cs.writable.getWriter();
            writer.write(buffer);
            writer.close();
            const reader = cs.readable.getReader();
            const chunks: Uint8Array[] = [];
            let done = false;
            while (!done) {
              const result = await reader.read();
              done = result.done;
              if (result.value) chunks.push(result.value);
            }
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
              result.set(chunk, offset);
              offset += chunk.length;
            }
            return result.buffer;
          } catch {
            return buffer;
          }
        }
      }
    }
  };
};

const resetWorkerState = () => {
  requestHandler = null;
  pendingHttpCallbacks.clear();
  requestCounter = 0;
};

const initializeScript = async (script: string, scriptInfo: LxScriptInfo) => {
  resetWorkerState();
  hardenGlobalScope();
  exposeNodeLikeGlobals();

  (globalThis as any).lx = createLxApi(scriptInfo);

  const sandboxScript = `
    const globalThisRef = globalThis;
    const lx = globalThis.lx;
    ${script}
    export {};
  `;
  const scriptUrl = URL.createObjectURL(
    new Blob([sandboxScript], {
      type: 'text/javascript'
    })
  );

  try {
    await import(/* @vite-ignore */ scriptUrl);
    // 不在此处判定 initialized：脚本可能异步初始化（如先请求远端配置，
    // 回调里才调用 lx.send(inited)），由 Runner 侧的初始化超时兜底
  } finally {
    URL.revokeObjectURL(scriptUrl);
  }
};

const resolveInvocation = async (callId: string, payload: any) => {
  if (!requestHandler) {
    postToHost({
      type: 'invoke-error',
      callId,
      message: '脚本未注册请求处理器'
    });
    return;
  }

  try {
    const result = await requestHandler(payload);
    postToHost({
      type: 'invoke-result',
      callId,
      result
    });
  } catch (error) {
    postToHost({
      type: 'invoke-error',
      callId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

self.onmessage = async (event: MessageEvent<WorkerHostMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'initialize':
      try {
        await initializeScript(message.script, message.scriptInfo);
      } catch (error) {
        postToHost({
          type: 'script-error',
          message: error instanceof Error ? error.message : String(error)
        });
      }
      break;

    case 'invoke-request':
      await resolveInvocation(message.callId, message.payload);
      break;

    case 'http-response': {
      const callback = pendingHttpCallbacks.get(message.requestId);
      if (!callback) return;
      pendingHttpCallbacks.delete(message.requestId);
      if (message.error) {
        callback(new Error(message.error), null, null);
      } else {
        callback(null, message.response, message.body);
      }
      break;
    }

    default:
      break;
  }
};

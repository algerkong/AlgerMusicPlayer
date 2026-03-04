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
let initialized = false;
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
        initialized = true;
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
        from: (data: any, _encoding?: string) => {
          if (typeof data === 'string') {
            return new TextEncoder().encode(data);
          }
          return new Uint8Array(data);
        },
        bufToString: (buffer: Uint8Array, encoding?: string) => {
          return new TextDecoder(encoding || 'utf-8').decode(buffer);
        }
      },
      crypto: {
        md5: lxCrypto.md5,
        sha1: lxCrypto.sha1,
        sha256: lxCrypto.sha256,
        randomBytes: lxCrypto.randomBytes,
        aesEncrypt: lxCrypto.aesEncrypt,
        aesDecrypt: lxCrypto.aesDecrypt,
        rsaEncrypt: lxCrypto.rsaEncrypt,
        rsaDecrypt: lxCrypto.rsaDecrypt,
        base64Encode: lxCrypto.base64Encode,
        base64Decode: lxCrypto.base64Decode
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
  initialized = false;
  pendingHttpCallbacks.clear();
  requestCounter = 0;
};

const initializeScript = async (script: string, scriptInfo: LxScriptInfo) => {
  resetWorkerState();
  hardenGlobalScope();

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
    if (!initialized) {
      throw new Error('脚本未调用 lx.send(EVENT_NAMES.inited, data)');
    }
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

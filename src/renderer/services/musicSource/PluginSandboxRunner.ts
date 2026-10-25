/**
 * 统一插件沙箱 Runner（三方言）
 *
 * 每个插件一个 Worker 实例（独立 realm，天然隔离），消息协议见
 * workers/pluginSandbox.worker.ts。方言差异已全部收敛在 worker 的
 * 适配层，本层只负责：实例缓存、调用编排、MediaSource 归一校验。
 */
import type { SongResult } from '@/types/music';
import type {
  MusicSourcePlugin,
  MusicSourcePluginDialect,
  MusicSourcePluginMeta,
  MusicSourcePluginVar,
  PluginMediaSource
} from '@/types/musicSourcePlugin';
import { parseMusicFreeVars, parseMusicSourcePluginMeta } from '@/utils/musicSourcePlugin';

import {
  getMusicFreeQualityLadder,
  inferPluginAudioFormat,
  validatePluginMediaSource
} from '../musicSourcePluginProtocol';

type WorkerInitializeMessage = {
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

type RunnerToWorkerMessage =
  | WorkerInitializeMessage
  | WorkerInvokeMessage
  | WorkerHttpResponseMessage;

export type SandboxPluginRuntime = {
  platform?: string;
  name?: string;
  version?: string;
  author?: string;
  description?: string;
  sourceUrl?: string;
  methods: string[];
  userVariables: MusicSourcePluginVar[];
  lxSources?: Record<string, { name?: string; actions?: string[]; qualitys?: string[] }>;
};

type WorkerInitializedMessage = {
  type: 'initialized';
  meta: {
    platform?: string;
    name?: string;
    version?: string;
    author?: string;
    description?: string;
    sourceUrl?: string;
    methods: string[];
    userVariables: unknown[];
    lxSources?: Record<string, { name?: string; actions?: string[]; qualitys?: string[] }>;
  };
};

type WorkerScriptErrorMessage = { type: 'script-error'; message: string };
type WorkerInvokeResultMessage = { type: 'invoke-result'; callId: string; result: unknown };
type WorkerInvokeErrorMessage = { type: 'invoke-error'; callId: string; message: string };
type WorkerHttpRequestMessage = {
  type: 'http-request';
  requestId: string;
  url: string;
  options: Record<string, unknown>;
};
type WorkerLogMessage = { type: 'log'; level: 'log' | 'warn' | 'error' | 'info'; args: unknown[] };

type WorkerToRunnerMessage =
  | WorkerInitializedMessage
  | WorkerScriptErrorMessage
  | WorkerInvokeResultMessage
  | WorkerInvokeErrorMessage
  | WorkerHttpRequestMessage
  | WorkerLogMessage;

type PendingInvocation = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutId: number;
};

// ─── 歌曲条目适配（方言无关的统一入参形状） ───────────────────────────────

export const toPluginItem = (song: SongResult, platform: string) => {
  const artists = (song.ar || song.artists || [])
    .map((artist) => artist?.name)
    .filter(Boolean)
    .map((name) => ({ name }));
  const duration = song.dt || song.duration || 0;
  return {
    id: String(song.id),
    platform,
    name: song.name || '',
    artists,
    album:
      song.al?.name || song.album?.name ? { name: song.al?.name || song.album?.name } : undefined,
    duration,
    extra: (song as SongResult & { extra?: Record<string, unknown> }).extra
  };
};

export const toMusicFreeItem = (song: SongResult, platform: string): Record<string, unknown> => {
  const artists = (song.ar || song.artists || []).map((artist) => artist?.name).filter(Boolean);
  const durationMs = song.dt || song.duration || 0;
  const durationSeconds =
    durationMs > 0 && durationMs < 14_400 * 1000 ? Math.round(durationMs / 1000) : durationMs;
  const extra = (song as SongResult & { extra?: Record<string, unknown> }).extra || {};

  return {
    id: String(song.id),
    platform,
    title: song.name || '',
    artist: artists.join('、'),
    album: song.al?.name || song.album?.name || '',
    artwork: song.picUrl || song.al?.picUrl || song.album?.picUrl || '',
    duration: durationSeconds,
    // 网易/腾讯系插件会读 musicItem.qualities[quality]，缺了就是 TypeError 四档全抛
    qualities: { low: {}, standard: {}, high: {}, super: {} },
    ...extra
  };
};

/** MusicFree 协议的 MediaSource：userAgent 字段并入 headers（值不同时 headers 优先） */
export const adaptRawMediaSource = (value: unknown): PluginMediaSource | null => {
  if (typeof value === 'string') return validatePluginMediaSource({ url: value });
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  const headers =
    raw.headers && typeof raw.headers === 'object'
      ? { ...(raw.headers as Record<string, string>) }
      : {};
  if (
    typeof raw.userAgent === 'string' &&
    raw.userAgent &&
    !Object.keys(headers).some((key) => key.toLowerCase() === 'user-agent')
  ) {
    headers['User-Agent'] = raw.userAgent;
  }

  return validatePluginMediaSource({
    ...raw,
    ...(Object.keys(headers).length > 0 ? { headers } : {})
  });
};

// ─── Runner ──────────────────────────────────────────────────────────────

export class PluginSandboxRunner {
  private readonly plugin: MusicSourcePlugin;
  private readonly initialMeta: MusicSourcePluginMeta;
  private worker: Worker | null = null;
  private initPromise: Promise<SandboxPluginRuntime> | null = null;
  private runtimeMeta: SandboxPluginRuntime | null = null;
  private pendingInvocations = new Map<string, PendingInvocation>();
  private pendingHttpCancels = new Map<string, () => void>();
  private callSequence = 0;

  private initResolver: ((value: SandboxPluginRuntime) => void) | null = null;
  private initRejecter: ((error: Error) => void) | null = null;
  private initTimeoutId: number | null = null;

  constructor(plugin: MusicSourcePlugin) {
    this.plugin = plugin;
    this.initialMeta = parseMusicSourcePluginMeta(plugin.source);
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    const worker = new Worker(new URL('./workers/pluginSandbox.worker.ts', import.meta.url), {
      type: 'module'
    });
    worker.onmessage = (event: MessageEvent<WorkerToRunnerMessage>) => {
      this.handleWorkerMessage(event.data);
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || 'plugin sandbox worker error');
      this.rejectInitialization(error);
      this.rejectAllInvocations(error);
    };
    this.worker = worker;
    return worker;
  }

  private postToWorker(message: RunnerToWorkerMessage): void {
    this.ensureWorker().postMessage(message);
  }

  private rejectInitialization(error: Error): void {
    if (!this.initPromise) return;
    this.initRejecter?.(error);
    this.clearInitializationState();
  }

  private clearInitializationState(): void {
    this.initResolver = null;
    this.initRejecter = null;
    if (this.initTimeoutId !== null) {
      clearTimeout(this.initTimeoutId);
      this.initTimeoutId = null;
    }
    this.initPromise = null;
  }

  private rejectAllInvocations(error: Error): void {
    for (const pending of this.pendingInvocations.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject(error);
    }
    this.pendingInvocations.clear();
  }

  private toRuntimeMeta(meta: WorkerInitializedMessage['meta']): SandboxPluginRuntime {
    return {
      ...(meta.platform ? { platform: meta.platform } : {}),
      name: meta.name || this.initialMeta.name,
      ...(meta.version ? { version: meta.version } : {}),
      ...(meta.author ? { author: meta.author } : {}),
      ...(meta.description ? { description: meta.description } : {}),
      ...(meta.sourceUrl ? { sourceUrl: meta.sourceUrl } : {}),
      methods: meta.methods,
      userVariables: parseMusicFreeVars(meta.userVariables),
      ...(meta.lxSources ? { lxSources: meta.lxSources } : {})
    };
  }

  private handleWorkerMessage(message: WorkerToRunnerMessage): void {
    switch (message.type) {
      case 'initialized': {
        this.runtimeMeta = this.toRuntimeMeta(message.meta);
        this.initResolver?.(this.runtimeMeta);
        this.clearInitializationState();
        break;
      }
      case 'script-error':
        this.rejectInitialization(new Error(message.message));
        break;
      case 'invoke-result': {
        const pending = this.pendingInvocations.get(message.callId);
        if (!pending) return;
        clearTimeout(pending.timeoutId);
        this.pendingInvocations.delete(message.callId);
        pending.resolve(message.result);
        break;
      }
      case 'invoke-error': {
        const pending = this.pendingInvocations.get(message.callId);
        if (!pending) return;
        clearTimeout(pending.timeoutId);
        this.pendingInvocations.delete(message.callId);
        pending.reject(new Error(message.message));
        break;
      }
      case 'http-request':
        this.handleHttpRequest(message);
        break;
      case 'log':
        console[message.level](`[MusicSource:${this.plugin.name}]`, ...message.args);
        break;
      default:
        break;
    }
  }

  private handleHttpRequest(message: WorkerHttpRequestMessage): void {
    const requestId = `plugin_sandbox_${this.plugin.id}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const request = window.api.lxMusicHttpRequest({
      url: message.url,
      options: { ...message.options, requestId },
      requestId
    });
    request
      .then((response: unknown) => {
        this.pendingHttpCancels.delete(message.requestId);
        this.postToWorker({
          type: 'http-response',
          requestId: message.requestId,
          response
        });
      })
      .catch((error: unknown) => {
        this.pendingHttpCancels.delete(message.requestId);
        this.postToWorker({
          type: 'http-response',
          requestId: message.requestId,
          response: null,
          error: error instanceof Error ? error.message : String(error)
        });
      });

    this.pendingHttpCancels.set(message.requestId, () => {
      void window.api.lxMusicHttpCancel(requestId);
    });
  }

  async initialize(): Promise<SandboxPluginRuntime> {
    if (this.runtimeMeta) return this.runtimeMeta;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<SandboxPluginRuntime>((resolve, reject) => {
      this.initResolver = resolve;
      this.initRejecter = reject;
      this.initTimeoutId = window.setTimeout(() => {
        this.rejectInitialization(new Error('音源插件初始化超时'));
      }, 20000);
    });

    this.postToWorker({
      type: 'initialize',
      script: this.plugin.source,
      dialect: this.plugin.dialect,
      scriptInfo: this.initialMeta
    });
    return this.initPromise;
  }

  private async invoke(method: string, args: unknown[], timeoutMs = 20000): Promise<unknown> {
    await this.initialize();
    const callId = `sandbox_call_${Date.now()}_${this.callSequence++}`;
    return new Promise<unknown>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingInvocations.delete(callId);
        reject(new Error('音源插件请求超时'));
      }, timeoutMs);
      this.pendingInvocations.set(callId, { resolve, reject, timeoutId });
      this.postToWorker({
        type: 'invoke',
        callId,
        method,
        args,
        userVars: { ...this.plugin.userVars }
      });
    });
  }

  /**
   * 统一解析入口：SongResult + 音质 → 校验过的 MediaSource。
   * 方言差异（条目形状/ctx 注入/音质档位）已由 worker 适配层处理。
   */
  async getMediaSource(song: SongResult, quality: string): Promise<PluginMediaSource | null> {
    const runtime = await this.initialize();
    if (!runtime.methods.includes('getMediaSource')) return null;

    // 条目里的 platform 表示歌曲的来源平台（解析入参），与插件自身 platform 无关
    const songPlatform = song.source || 'netease';

    if (this.plugin.dialect === 'musicfree') {
      const item = toMusicFreeItem(song, songPlatform);
      let lastError: unknown = null;
      for (const candidateQuality of getMusicFreeQualityLadder(quality)) {
        try {
          const result = await this.invoke('getMediaSource', [item, candidateQuality]);
          const media = adaptRawMediaSource(result);
          if (media) return media;
        } catch (error) {
          lastError = error;
        }
      }
      if (lastError) console.warn(`[MusicSource:${this.plugin.name}]`, lastError);
      return null;
    }

    if (this.plugin.dialect === 'lxmusic') {
      // 条目形状与 native 一致；worker 内的 LX 适配器负责转成 musicInfo 协议
      const item = toPluginItem(song, songPlatform);
      try {
        return adaptRawMediaSource(await this.invoke('getMediaSource', [item, quality]));
      } catch (error) {
        console.warn(`[MusicSource:${this.plugin.name}] getMediaSource failed`, error);
        return null;
      }
    }

    const item = toPluginItem(song, songPlatform);
    try {
      return adaptRawMediaSource(await this.invoke('getMediaSource', [item, quality]));
    } catch (error) {
      console.warn(`[MusicSource:${this.plugin.name}] getMediaSource failed`, error);
      return null;
    }
  }

  getRuntimeMeta(): SandboxPluginRuntime | null {
    return this.runtimeMeta;
  }

  dispose(): void {
    for (const cancel of this.pendingHttpCancels.values()) {
      try {
        cancel();
      } catch {
        // Ignore cancellation errors while disposing a source.
      }
    }
    this.pendingHttpCancels.clear();
    this.rejectAllInvocations(new Error('音源插件已销毁'));
    this.clearInitializationState();
    this.worker?.terminate();
    this.worker = null;
    this.runtimeMeta = null;
  }
}

// ─── 实例缓存（源码/变量变化自动重建） ────────────────────────────────────

const runnerCache = new Map<string, { fingerprint: string; runner: PluginSandboxRunner }>();

export const getPluginSandboxRunner = async (
  plugin: MusicSourcePlugin
): Promise<PluginSandboxRunner> => {
  const fingerprint = `${plugin.updatedAt}:${plugin.source.length}:${plugin.dialect}`;
  const cached = runnerCache.get(plugin.id);
  if (cached?.fingerprint === fingerprint) {
    return cached.runner;
  }

  cached?.runner.dispose();
  const runner = new PluginSandboxRunner(plugin);
  await runner.initialize();
  runnerCache.set(plugin.id, { fingerprint, runner });
  return runner;
};

export const disposePluginSandbox = (pluginId: string): void => {
  const cached = runnerCache.get(pluginId);
  cached?.runner.dispose();
  runnerCache.delete(pluginId);
};

export const disposeAllPluginSandboxes = (): void => {
  for (const cached of runnerCache.values()) cached.runner.dispose();
  runnerCache.clear();
};

export { inferPluginAudioFormat };

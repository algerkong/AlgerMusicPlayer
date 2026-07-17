import { persistenceService, volumeSchema } from '@/services/persistenceService';
import {
  canPromoteFromBuffer,
  getBufferedAheadSeconds,
  PROMOTE_MIN_BUFFER_SEC
} from '@/services/streamPipeline';
import type { AudioOutputDevice } from '@/types/audio';
import type { SongResult } from '@/types/music';
import { getImgUrl, isElectron } from '@/utils';
import { ttfaAudioReady } from '@/utils/ttfaMetrics';

type AudioSlot = {
  audio: HTMLAudioElement;
  track: SongResult | null;
  /** 逻辑 URL（与 audio.src 可能差 origin 前缀） */
  logicUrl: string;
  pendingCleanup: (() => void) | null;
  sourceNode: MediaElementAudioSourceNode | null;
  slotGain: GainNode | null;
};

class AudioService {
  /** 当前出声槽的 audio（swap 后会换引用，外部 getCurrentSound 依赖此字段） */
  private audio: HTMLAudioElement;
  private currentTrack: SongResult | null = null;

  /** P1 双槽：0=当前，1=预加载；swap 时交换角色 */
  private slots: [AudioSlot, AudioSlot];
  private activeIdx = 0;

  private context: AudioContext | null = null;
  private filters: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  /** 双槽增益汇入点 → EQ → master gain */
  private eqEntry: GainNode | null = null;
  private eqInitialized = false;
  private bypass = false;

  private playbackRate = 1.0;
  private currentSinkId: string = 'default';
  private _isLoading = false;

  private operationLock = false;
  private operationLockTimer: ReturnType<typeof setTimeout> | null = null;

  // 当前一次加载挂载在「正在加载的槽」上的清理函数
  private pendingLoadCleanup: (() => void) | null = null;

  /**
   * 切歌过渡 pause 时抑制 media 事件 → store，
   * 避免 MusicHook 把 userPlayIntent 打成 false，导致新歌 canplay 后仍「已加载却暂停」。
   */
  private suppressMediaEvents = 0;

  private readonly frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  private defaultEQSettings: { [key: string]: number } = {
    '31': 0,
    '62': 0,
    '125': 0,
    '250': 0,
    '500': 0,
    '1000': 0,
    '2000': 0,
    '4000': 0,
    '8000': 0,
    '16000': 0
  };

  // 事件系统
  private callbacks: { [key: string]: Function[] } = {};

  constructor() {
    const makeSlot = (): AudioSlot => {
      const el = new Audio();
      el.crossOrigin = 'anonymous';
      el.preload = 'auto';
      return {
        audio: el,
        track: null,
        logicUrl: '',
        pendingCleanup: null,
        sourceNode: null,
        slotGain: null
      };
    };
    this.slots = [makeSlot(), makeSlot()];
    this.audio = this.slots[0].audio;
    this.bindSlotEvents(this.slots[0].audio);
    this.bindSlotEvents(this.slots[1].audio);

    if ('mediaSession' in navigator) {
      this.initMediaSession();
    }

    const bypassState = localStorage.getItem('eqBypass');
    this.bypass = bypassState ? JSON.parse(bypassState) : false;

    this.forceResetOperationLock();
    window.addEventListener('beforeunload', () => this.forceResetOperationLock());
  }

  private activeSlot(): AudioSlot {
    return this.slots[this.activeIdx];
  }

  private standbySlot(): AudioSlot {
    return this.slots[1 - this.activeIdx];
  }

  private syncActiveRef() {
    this.audio = this.activeSlot().audio;
    this.currentTrack = this.activeSlot().track;
  }

  private urlsMatch(a?: string | null, b?: string | null): boolean {
    if (!a || !b) return false;
    if (a === b) return true;
    try {
      // blob/local/http 尾缀匹配
      return a.endsWith(b) || b.endsWith(a) || a.includes(b) || b.includes(a);
    } catch {
      return false;
    }
  }

  private applySlotGains() {
    const a = this.slots[0];
    const b = this.slots[1];
    if (a.slotGain && b.slotGain && this.context) {
      const t = this.context.currentTime;
      a.slotGain.gain.cancelScheduledValues(t);
      b.slotGain.gain.cancelScheduledValues(t);
      a.slotGain.gain.setValueAtTime(this.activeIdx === 0 ? 1 : 0, t);
      b.slotGain.gain.setValueAtTime(this.activeIdx === 1 ? 1 : 0, t);
    } else {
      // 无 WebAudio：用 element.volume
      const vol = persistenceService.load(volumeSchema);
      this.slots[0].audio.volume = this.activeIdx === 0 ? vol : 0;
      this.slots[1].audio.volume = this.activeIdx === 1 ? vol : 0;
    }
  }

  // ==================== 原生 DOM 事件绑定 ====================

  /** 过渡期暂停不往外抛 pause（不改 Pinia 意图） */
  public beginSuppressMediaEvents(ms = 500) {
    this.suppressMediaEvents += 1;
    window.setTimeout(() => {
      this.suppressMediaEvents = Math.max(0, this.suppressMediaEvents - 1);
    }, ms);
  }

  public isSuppressingMediaEvents(): boolean {
    return this.suppressMediaEvents > 0;
  }

  private bindSlotEvents(el: HTMLAudioElement) {
    el.addEventListener('play', () => {
      if (el !== this.audio) return;
      if (this.suppressMediaEvents > 0) {
        // 仍更新 mediaSession，但不 emit 以免和过渡 pause 打架
        this.updateMediaSessionState(true);
        return;
      }
      this.updateMediaSessionState(true);
      this.emit('play');
    });

    el.addEventListener('pause', () => {
      if (el !== this.audio) return;
      if (this.suppressMediaEvents > 0) {
        return;
      }
      this.updateMediaSessionState(false);
      this.emit('pause');
    });

    el.addEventListener('ended', () => {
      if (el !== this.audio) return;
      if (this.suppressMediaEvents > 0) return;
      this.emit('end');
    });

    el.addEventListener('seeked', () => {
      if (el !== this.audio) return;
      this.updateMediaSessionPositionState();
      this.emit('seek');
    });

    el.addEventListener('waiting', () => {
      if (el !== this.audio) return;
      this._isLoading = true;
    });

    el.addEventListener('canplay', () => {
      if (el !== this.audio) return;
      this._isLoading = false;
    });

    el.addEventListener('error', () => {
      if (el !== this.audio) return;
      const error = el.error;
      console.error('Audio element error:', error?.code, error?.message);
      this.emit('audio_error', { type: 'media_error', error });
    });
  }

  // ==================== 系统媒体会话 ====================

  private initMediaSession() {
    navigator.mediaSession.setActionHandler('play', () => {
      this.audio.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.audio.pause();
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      this.stop();
    });

    navigator.mediaSession.setActionHandler('seekto', (event) => {
      if (event.seekTime !== undefined) {
        this.seek(event.seekTime);
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', (event) => {
      this.seek(this.audio.currentTime - (event.seekOffset || 10));
    });

    navigator.mediaSession.setActionHandler('seekforward', (event) => {
      this.seek(this.audio.currentTime + (event.seekOffset || 10));
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.emit('previoustrack');
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.emit('nexttrack');
    });
  }

  private updateMediaSessionMetadata(track: SongResult) {
    try {
      if (!('mediaSession' in navigator)) return;

      const artists = track.ar
        ? track.ar.map((a) => a.name)
        : track.song.artists?.map((a) => a.name);
      const album = track.al ? track.al.name : track.song.album.name;
      // 上限提到 1024 提升 SMTC/AMLL 等系统媒体控件的封面清晰度（#595）；
      // 走 getImgUrl 以正确处理 data:/local:// 封面与已带参数的 URL
      const artwork = ['96', '128', '192', '256', '384', '512', '1024'].map((size) => ({
        src: getImgUrl(track.picUrl, `${size}y${size}`),
        type: 'image/jpg',
        sizes: `${size}x${size}`
      }));

      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: track.name || '',
        artist: artists ? artists.join(',') : '',
        album: album || '',
        artwork
      });
    } catch (error) {
      console.error('更新媒体会话元数据时出错:', error);
    }
  }

  private updateMediaSessionState(isPlaying: boolean) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    this.updateMediaSessionPositionState();
  }

  private updateMediaSessionPositionState() {
    try {
      if (!('mediaSession' in navigator)) return;
      if (!this.audio.duration || !isFinite(this.audio.duration)) return;

      if ('setPositionState' in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: this.audio.duration,
          playbackRate: this.playbackRate,
          position: this.audio.currentTime
        });
      }
    } catch (error) {
      console.error('更新媒体会话位置状态时出错:', error);
    }
  }

  // ==================== 事件发射 ====================

  private emit(event: string, ...args: any[]) {
    const eventCallbacks = this.callbacks[event];
    if (eventCallbacks) {
      eventCallbacks.forEach((callback) => callback(...args));
    }
  }

  on(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  off(event: string, callback: Function) {
    const eventCallbacks = this.callbacks[event];
    if (eventCallbacks) {
      this.callbacks[event] = eventCallbacks.filter((cb) => cb !== callback);
    }
  }

  clearAllListeners() {
    this.callbacks = {};
  }

  // ==================== 均衡器 ====================

  private setupEQ() {
    if (this.eqInitialized) return;

    if (!isElectron) {
      console.log('Web环境中跳过EQ设置，避免CORS问题');
      this.bypass = true;
      this.eqInitialized = true;
      this.applySlotGains();
      return;
    }

    try {
      this.context = new AudioContext();
      this.eqEntry = this.context.createGain();
      this.gainNode = this.context.createGain();

      // 双槽各自 MediaElementSource → slotGain → eqEntry（只一路有声）
      for (const slot of this.slots) {
        slot.sourceNode = this.context.createMediaElementSource(slot.audio);
        slot.slotGain = this.context.createGain();
        slot.sourceNode.connect(slot.slotGain);
        slot.slotGain.connect(this.eqEntry);
      }
      // 创建 10 段滤波链
      const savedSettings = this.loadEQSettings();
      this.filters = this.frequencies.map((freq) => {
        const filter = this.context!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = savedSettings[freq.toString()] || 0;
        return filter;
      });

      this.applyBypassState();
      this.applySlotGains();
      this.applyVolume(persistenceService.load(volumeSchema));
      this.setupContextStateMonitoring();
      this.restoreSavedAudioDevice();
      this.eqInitialized = true;
      console.log('EQ initialization successful (dual-slot)');
    } catch (error) {
      console.error('EQ initialization failed:', error);
      this.context = null;
      this.eqEntry = null;
      this.eqInitialized = true;
      this.applySlotGains();
    }
  }

  private applyBypassState() {
    if (!this.eqEntry || !this.gainNode || !this.context) return;

    try {
      try {
        this.eqEntry.disconnect();
      } catch {
        /* 已断开 */
      }
      this.filters.forEach((filter) => {
        try {
          filter.disconnect();
        } catch {
          /* 已断开 */
        }
      });
      try {
        this.gainNode.disconnect();
      } catch {
        /* 已断开 */
      }

      if (this.bypass || this.filters.length === 0) {
        // EQ 关闭：eqEntry -> masterGain -> destination
        this.eqEntry.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
      } else {
        // EQ 开启：eqEntry -> filters -> masterGain -> destination
        this.eqEntry.connect(this.filters[0]);
        this.filters.forEach((filter, index) => {
          if (index < this.filters.length - 1) {
            filter.connect(this.filters[index + 1]);
          }
        });
        this.filters[this.filters.length - 1].connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
      }
    } catch (error) {
      console.error('Error applying EQ state, attempting fallback:', error);
      try {
        if (this.eqEntry && this.context) {
          this.eqEntry.connect(this.context.destination);
        }
      } catch (fallbackError) {
        console.error('Fallback connection also failed:', fallbackError);
        this.emit('audio_error', { type: 'graph_disconnected', error: fallbackError });
      }
    }
  }

  public isEQEnabled(): boolean {
    return !this.bypass;
  }

  public setEQEnabled(enabled: boolean) {
    this.bypass = !enabled;
    localStorage.setItem('eqBypass', JSON.stringify(this.bypass));

    if (this.eqEntry && this.gainNode && this.context) {
      this.applyBypassState();
    }
  }

  public setEQFrequencyGain(frequency: string, gain: number) {
    const filterIndex = this.frequencies.findIndex((f) => f.toString() === frequency);
    if (filterIndex !== -1 && this.filters[filterIndex]) {
      this.filters[filterIndex].gain.setValueAtTime(gain, this.context?.currentTime || 0);
      this.saveEQSettings(frequency, gain);
    }
  }

  public resetEQ() {
    this.filters.forEach((filter) => {
      filter.gain.setValueAtTime(0, this.context?.currentTime || 0);
    });
    localStorage.removeItem('eqSettings');
  }

  public getAllEQSettings(): { [key: string]: number } {
    return this.loadEQSettings();
  }

  public getCurrentPreset(): string | null {
    return localStorage.getItem('currentPreset');
  }

  public setCurrentPreset(preset: string): void {
    localStorage.setItem('currentPreset', preset);
  }

  private saveEQSettings(frequency: string, gain: number) {
    const settings = this.loadEQSettings();
    settings[frequency] = gain;
    localStorage.setItem('eqSettings', JSON.stringify(settings));
  }

  private loadEQSettings(): { [key: string]: number } {
    const savedSettings = localStorage.getItem('eqSettings');
    return savedSettings ? JSON.parse(savedSettings) : { ...this.defaultEQSettings };
  }

  // ==================== 操作锁 ====================

  private setOperationLock(): boolean {
    if (this.operationLock) {
      return false;
    }
    this.operationLock = true;

    if (this.operationLockTimer) clearTimeout(this.operationLockTimer);
    this.operationLockTimer = setTimeout(() => {
      console.warn('操作锁超时自动释放');
      this.releaseOperationLock();
    }, 5000);

    return true;
  }

  public releaseOperationLock(): void {
    this.operationLock = false;
    if (this.operationLockTimer) {
      clearTimeout(this.operationLockTimer);
      this.operationLockTimer = null;
    }
  }

  public forceResetOperationLock(): void {
    this.operationLock = false;
    if (this.operationLockTimer) {
      clearTimeout(this.operationLockTimer);
      this.operationLockTimer = null;
    }
  }

  // ==================== 播放控制 ====================

  /** HAVE_CURRENT_DATA = 2：有当前帧即可尝试起播，不必等 canplay */
  private static readonly READY_TO_START = 2;

  private clearSlot(slot: AudioSlot) {
    if (slot.pendingCleanup) {
      slot.pendingCleanup();
      slot.pendingCleanup = null;
    }
    try {
      slot.audio.pause();
      slot.audio.removeAttribute('src');
      slot.audio.load();
    } catch {
      /* ignore */
    }
    slot.track = null;
    slot.logicUrl = '';
  }

  /**
   * 预加载到 standby 槽（不 play、不打断当前曲）。
   * play(url) 命中时可秒 promote。
   */
  public preload(url: string, track: SongResult): void {
    if (!url || !track) return;
    const active = this.activeSlot();
    // 同 URL 已在出声：无需 standby。
    // 注意：同曲不同 URL（前缀→full / 升质）必须允许灌 standby，勿用 track.id 短路。
    if (this.urlsMatch(active.logicUrl, url) || this.urlsMatch(active.audio.src, url)) {
      return;
    }
    const standby = this.standbySlot();
    if (
      this.urlsMatch(standby.logicUrl, url) &&
      standby.audio.readyState >= AudioService.READY_TO_START
    ) {
      return;
    }
    // standby 已在缓冲「另一首」且已有数据：勿抢占（保护下一首预热）
    if (
      standby.logicUrl &&
      !this.urlsMatch(standby.logicUrl, url) &&
      standby.track &&
      String(standby.track.id) !== String(track.id) &&
      standby.audio.readyState >= 1
    ) {
      console.info(
        `[audio] preload skip id=${track.id}, standby busy id=${standby.track.id} ready=${standby.audio.readyState}`
      );
      return;
    }

    if (standby.pendingCleanup) {
      standby.pendingCleanup();
      standby.pendingCleanup = null;
    }

    try {
      this.setupEQ();
      standby.track = track;
      standby.logicUrl = url;
      standby.audio.preload = 'auto';
      standby.audio.src = url;
      standby.audio.load();
      console.info(`[audio] preload standby id=${track.id} ready=${standby.audio.readyState}`);
    } catch (e) {
      console.warn('[audio] preload failed', e);
    }
  }

  public hasPreloaded(url?: string | null): boolean {
    if (!url) return false;
    const s = this.standbySlot();
    if (!(this.urlsMatch(s.logicUrl, url) || this.urlsMatch(s.audio.src, url))) {
      return false;
    }
    // 就绪 + 有一小段缓冲，promote 更稳
    return (
      s.audio.readyState >= AudioService.READY_TO_START &&
      (canPromoteFromBuffer(s.audio) || s.audio.readyState >= 3)
    );
  }

  /** 当前出声点之后已缓冲秒数（升质 / 切歌决策用） */
  public getBufferedAhead(): number {
    return getBufferedAheadSeconds(this.audio);
  }

  /** standby 槽缓冲秒数 */
  public getStandbyBufferedAhead(): number {
    return getBufferedAheadSeconds(this.standbySlot().audio);
  }

  /**
   * 解码流水线预热：尽早建 AudioContext + 双槽 MediaElementSource，
   * 避免首播才 init EQ 造成卡顿。可在用户手势后调用。
   */
  public warmDecodePipeline(): void {
    try {
      this.setupEQ();
      if (this.context?.state === 'suspended') {
        void this.context.resume().catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
  }

  /** 仅暂停当前出声，不卸 src（resolve 期间可先静音旧曲）；不改 store 播放意图 */
  public softPause() {
    this.beginSuppressMediaEvents(600);
    try {
      this.audio.pause();
    } catch {
      /* ignore */
    }
  }

  private promoteStandby(
    track: SongResult,
    isPlay: boolean,
    seekTime: number
  ): Promise<HTMLAudioElement> {
    const prev = this.activeSlot();
    const next = this.standbySlot();
    const prevIdx = this.activeIdx;
    const nextIdx = 1 - prevIdx;

    // 过渡 pause 不改意图
    this.beginSuppressMediaEvents(700);

    // 先把 next 设为可播
    next.track = track;
    if (seekTime > 0) {
      try {
        next.audio.currentTime = seekTime;
      } catch {
        /* ignore */
      }
    }
    next.audio.playbackRate = this.playbackRate;

    // 交叉淡化（有 WebAudio 选路 gain 时）
    const canXfade =
      isPlay && !!this.context && !!prev.slotGain && !!next.slotGain && !prev.audio.paused;

    if (canXfade) {
      const t = this.context!.currentTime;
      const dur = 0.05;
      // next 从 0 起播
      next.slotGain!.gain.cancelScheduledValues(t);
      next.slotGain!.gain.setValueAtTime(0, t);
      void next.audio.play().catch((err) => {
        console.error('Audio promote play failed:', err);
        this.emit('playerror', { track, error: err });
      });
      next.slotGain!.gain.linearRampToValueAtTime(1, t + dur);
      prev.slotGain!.gain.cancelScheduledValues(t);
      prev.slotGain!.gain.setValueAtTime(prev.slotGain!.gain.value || 1, t);
      prev.slotGain!.gain.linearRampToValueAtTime(0, t + dur);

      this.activeIdx = nextIdx;
      this.syncActiveRef();
      this.currentTrack = track;

      window.setTimeout(
        () => {
          try {
            prev.audio.pause();
          } catch {
            /* ignore */
          }
          this.clearSlot(prev);
          this.applySlotGains();
        },
        Math.ceil(dur * 1000) + 20
      );
    } else {
      try {
        prev.audio.pause();
      } catch {
        /* ignore */
      }
      this.activeIdx = nextIdx;
      this.syncActiveRef();
      this.activeSlot().track = track;
      this.currentTrack = track;
      this.applySlotGains();
      if (isPlay) {
        void this.audio.play().catch((err) => {
          console.error('Audio promote play failed:', err);
          this.emit('playerror', { track, error: err });
        });
      }
      this.clearSlot(prev);
    }

    this.applyVolume(persistenceService.load(volumeSchema));
    this.updateMediaSessionMetadata(track);
    this.updateMediaSessionPositionState();
    this._isLoading = false;

    this.emit('load');
    // 明确通知：若 suppress 挡住了 play 事件，仍要推进进度与意图
    if (isPlay) {
      window.setTimeout(() => {
        this.emit('play');
      }, 0);
    }
    ttfaAudioReady('promote');
    console.info(`[audio] promote standby → active id=${track.id} xfade=${canXfade}`);
    return Promise.resolve(this.audio);
  }

  public play(
    url: string,
    track: SongResult,
    isPlay: boolean = true,
    seekTime: number = 0,
    _existingSound?: HTMLAudioElement
  ): Promise<HTMLAudioElement> {
    // 无新 URL/曲目时恢复当前播放
    if (this.audio.src && !url && !track) {
      void this.audio.play();
      return Promise.resolve(this.audio);
    }

    this.forceResetOperationLock();
    this.setOperationLock();

    if (!url || !track) {
      this.releaseOperationLock();
      return Promise.reject(new Error('缺少必要参数: url和track'));
    }

    this.setupEQ();
    if (this.context && this.context.state === 'suspended') {
      this.context.resume().catch((e) => console.warn('Failed to resume AudioContext:', e));
    }

    const active = this.activeSlot();
    // 同一 URL：仅恢复/seek，不重载
    if (this.urlsMatch(active.logicUrl, url) || this.urlsMatch(active.audio.src, url)) {
      active.track = track;
      this.currentTrack = track;
      if (seekTime > 0) this.audio.currentTime = seekTime;
      if (isPlay) void this.audio.play();
      this.updateMediaSessionMetadata(track);
      this.releaseOperationLock();
      ttfaAudioReady('same');
      return Promise.resolve(this.audio);
    }

    // standby 已预热且有缓冲水位：promote（切歌空窗最小）
    const standby = this.standbySlot();
    if (
      (this.urlsMatch(standby.logicUrl, url) || this.urlsMatch(standby.audio.src, url)) &&
      standby.audio.readyState >= 1 &&
      (canPromoteFromBuffer(standby.audio) ||
        standby.audio.readyState >= AudioService.READY_TO_START ||
        getBufferedAheadSeconds(standby.audio) >= PROMOTE_MIN_BUFFER_SEC * 0.5)
    ) {
      this.releaseOperationLock();
      return this.promoteStandby(track, isPlay, seekTime);
    }

    // 取消 active 上未完成的加载
    if (this.pendingLoadCleanup) {
      this.pendingLoadCleanup();
      this.pendingLoadCleanup = null;
    }
    if (active.pendingCleanup) {
      active.pendingCleanup();
      active.pendingCleanup = null;
    }

    // 立刻停掉旧曲声音（不 clear standby，以免冲掉别的预加载）
    try {
      active.audio.pause();
    } catch {
      /* ignore */
    }

    return new Promise<HTMLAudioElement>((resolve, reject) => {
      let retryCount = 0;
      const maxRetries = 1;
      let settled = false;
      let retryTimer: ReturnType<typeof setTimeout> | null = null;
      let detachLoadListeners: (() => void) | null = null;
      const target = active;

      const settleResolve = (el: HTMLAudioElement) => {
        if (settled) return;
        settled = true;
        if (this.pendingLoadCleanup === cancelPendingLoad) {
          this.pendingLoadCleanup = null;
        }
        target.pendingCleanup = null;
        resolve(el);
      };
      const settleReject = (err: Error) => {
        if (settled) return;
        settled = true;
        if (this.pendingLoadCleanup === cancelPendingLoad) {
          this.pendingLoadCleanup = null;
        }
        target.pendingCleanup = null;
        reject(err);
      };

      const clearRetryTimer = () => {
        if (retryTimer !== null) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
      };

      const cancelPendingLoad = () => {
        clearRetryTimer();
        detachLoadListeners?.();
        detachLoadListeners = null;
        this._isLoading = false;
        this.releaseOperationLock();
        const err = new Error('Playback cancelled');
        err.name = 'AbortError';
        settleReject(err);
      };
      this.pendingLoadCleanup = cancelPendingLoad;
      target.pendingCleanup = cancelPendingLoad;

      const startWhenReady = () => {
        if (settled) return;
        if (target.audio.readyState < AudioService.READY_TO_START) return;

        detachLoadListeners?.();
        detachLoadListeners = null;
        this._isLoading = false;

        target.track = track;
        target.logicUrl = url;
        this.currentTrack = track;
        this.syncActiveRef();
        this.applySlotGains();

        if (seekTime > 0) {
          try {
            target.audio.currentTime = seekTime;
          } catch {
            /* ignore */
          }
        }

        if (isPlay) {
          void target.audio.play().catch((err) => {
            console.error('Audio play failed:', err);
            this.emit('playerror', { track, error: err });
          });
          // softPause suppress 可能挡住原生 play 事件 → 补发，保证进度条/意图
          if (this.suppressMediaEvents > 0) {
            window.setTimeout(() => this.emit('play'), 0);
          }
        }

        this.applyVolume(persistenceService.load(volumeSchema));
        target.audio.playbackRate = this.playbackRate;
        this.updateMediaSessionMetadata(track);
        this.updateMediaSessionPositionState();
        this.emit('load');
        this.releaseOperationLock();
        ttfaAudioReady('load');
        settleResolve(target.audio);
      };

      const tryPlay = () => {
        if (settled) return;

        this._isLoading = true;
        target.track = track;
        target.logicUrl = url;

        const onError = () => {
          detachLoadListeners?.();
          detachLoadListeners = null;
          this._isLoading = false;
          if (settled) return;

          const error = target.audio.error;
          console.error('Audio load error:', error?.code, error?.message);
          this.emit('loaderror', { track, error });

          const isSrcNotSupported = error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;

          if (!isSrcNotSupported && retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying playback (${retryCount}/${maxRetries})...`);
            this.pendingLoadCleanup = cancelPendingLoad;
            clearRetryTimer();
            retryTimer = setTimeout(() => {
              retryTimer = null;
              if (settled) return;
              tryPlay();
            }, 1000 * retryCount);
          } else {
            this.emit('url_expired', track);
            this.releaseOperationLock();
            settleReject(new Error('音频加载失败，请尝试切换其他歌曲'));
          }
        };

        detachLoadListeners = () => {
          target.audio.removeEventListener('loadeddata', startWhenReady);
          target.audio.removeEventListener('canplay', startWhenReady);
          target.audio.removeEventListener('error', onError);
        };

        // 谁先到用谁：loadeddata / canplay
        target.audio.addEventListener('loadeddata', startWhenReady);
        target.audio.addEventListener('canplay', startWhenReady);
        target.audio.addEventListener('error', onError, { once: true });

        target.audio.src = url;
        target.audio.load();
        // 已有缓存时可能同步 ready
        if (target.audio.readyState >= AudioService.READY_TO_START) {
          startWhenReady();
        }
      };

      tryPlay();
    }).finally(() => {
      this.releaseOperationLock();
    });
  }

  public pause() {
    this.forceResetOperationLock();
    try {
      this.audio.pause();
    } catch (error) {
      console.error('暂停音频失败:', error);
    }
  }

  public stop() {
    this.forceResetOperationLock();
    if (this.pendingLoadCleanup) {
      this.pendingLoadCleanup();
      this.pendingLoadCleanup = null;
    }
    for (const slot of this.slots) {
      this.clearSlot(slot);
    }
    this.activeIdx = 0;
    this.syncActiveRef();
    this.applySlotGains();
    this.currentTrack = null;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }

  public seek(time: number) {
    this.forceResetOperationLock();
    try {
      this.emit('seek_start', time);
      this.audio.currentTime = Math.max(0, time);
      this.updateMediaSessionPositionState();
    } catch (error) {
      console.error('Seek操作失败:', error);
    }
  }

  public setVolume(volume: number) {
    this.applyVolume(volume);
  }

  private applyVolume(volume: number) {
    const normalizedVolume = Math.max(0, Math.min(1, volume));

    if (this.gainNode && this.context) {
      this.gainNode.gain.cancelScheduledValues(this.context.currentTime);
      this.gainNode.gain.setValueAtTime(normalizedVolume, this.context.currentTime);
      // slot 增益只做 0/1 选路
      this.applySlotGains();
    } else {
      // 回退：active 有声量，standby 静音
      this.slots[this.activeIdx].audio.volume = normalizedVolume;
      this.slots[1 - this.activeIdx].audio.volume = 0;
    }

    persistenceService.save(volumeSchema, normalizedVolume);
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    for (const slot of this.slots) {
      slot.audio.playbackRate = rate;
    }
    this.updateMediaSessionPositionState();
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  // ==================== 状态查询 ====================

  getCurrentSound(): HTMLAudioElement | null {
    return this.audio.src ? this.audio : null;
  }

  getCurrentTrack(): SongResult | null {
    return this.currentTrack;
  }

  isLoading(): boolean {
    return this._isLoading || this.operationLock;
  }

  isActuallyPlaying(): boolean {
    if (!this.audio.src) return false;
    try {
      const isPlaying = !this.audio.paused && !this.audio.ended;
      const contextOk = !this.context || this.context.state === 'running';
      return isPlaying && !this._isLoading && contextOk;
    } catch (error) {
      console.error('检查播放状态出错:', error);
      return false;
    }
  }

  // ==================== 音频输出设备 ====================

  public async getAudioOutputDevices(): Promise<AudioOutputDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

      return audioOutputs.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Speaker ${index + 1}`,
        isDefault: device.deviceId === 'default' || device.deviceId === ''
      }));
    } catch (error) {
      console.error('枚举音频设备失败:', error);
      return [{ deviceId: 'default', label: 'Default', isDefault: true }];
    }
  }

  public async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    try {
      if (this.context && typeof (this.context as any).setSinkId === 'function') {
        await (this.context as any).setSinkId(deviceId);
        this.currentSinkId = deviceId;
        localStorage.setItem('audioOutputDeviceId', deviceId);
        console.log('音频输出设备已切换:', deviceId);
        return true;
      } else {
        console.warn('AudioContext.setSinkId 不可用');
        return false;
      }
    } catch (error) {
      console.error('设置音频输出设备失败:', error);
      return false;
    }
  }

  public getCurrentSinkId(): string {
    return this.currentSinkId;
  }

  private async restoreSavedAudioDevice(): Promise<void> {
    const savedDeviceId = localStorage.getItem('audioOutputDeviceId');
    if (savedDeviceId && savedDeviceId !== 'default') {
      try {
        await this.setAudioOutputDevice(savedDeviceId);
      } catch (error) {
        console.warn('恢复音频输出设备失败，回退到默认设备:', error);
        localStorage.removeItem('audioOutputDeviceId');
        this.currentSinkId = 'default';
      }
    }
  }

  private setupContextStateMonitoring() {
    if (!this.context) return;

    this.context.addEventListener('statechange', async () => {
      console.log('AudioContext state changed:', this.context?.state);

      if (this.context?.state === 'suspended' && !this.audio.paused) {
        console.log('AudioContext suspended while playing, attempting to resume...');
        try {
          await this.context.resume();
          console.log('AudioContext resumed successfully');
        } catch (e) {
          console.error('Failed to resume AudioContext:', e);
          this.emit('audio_error', { type: 'context_suspended', error: e });
        }
      } else if (this.context?.state === 'closed') {
        console.warn('AudioContext was closed unexpectedly');
        this.emit('audio_error', { type: 'context_closed' });
      }
    });
  }

  /** 休眠/唤醒后尝试拉起挂起的 AudioContext（有歌在播时） */
  async resumeContextIfNeeded(): Promise<void> {
    if (!this.context || this.context.state !== 'suspended') return;
    try {
      await this.context.resume();
      console.log('[audio] AudioContext resumed after wake');
    } catch (e) {
      console.warn('[audio] resume after wake failed', e);
    }
  }
}

export const audioService = new AudioService();

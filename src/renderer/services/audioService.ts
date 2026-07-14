import { persistenceService, volumeSchema } from '@/services/persistenceService';
import type { AudioOutputDevice } from '@/types/audio';
import type { SongResult } from '@/types/music';
import { getImgUrl, isElectron } from '@/utils';

class AudioService {
  private audio: HTMLAudioElement;
  private currentTrack: SongResult | null = null;

  private context: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  private bypass = false;

  private playbackRate = 1.0;
  private currentSinkId: string = 'default';
  private _isLoading = false;

  private operationLock = false;
  private operationLockTimer: ReturnType<typeof setTimeout> | null = null;

  // 当前一次加载（play）挂载在共享 audio 元素上的 canplay/error 监听器的清理函数。
  // 快速切歌时，上一首尚未结算的监听器必须在新一轮加载或 stop() 时移除，
  // 否则新歌 canplay 会同时触发旧歌的回调，导致"过期回调 stop 掉正在播放的新歌"卡死。
  private pendingLoadCleanup: (() => void) | null = null;

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
    // 创建常驻 audio 元素
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';

    // 绑定原生 DOM 事件
    this.bindAudioEvents();

    if ('mediaSession' in navigator) {
      this.initMediaSession();
    }

    // 恢复 EQ 旁路状态
    const bypassState = localStorage.getItem('eqBypass');
    this.bypass = bypassState ? JSON.parse(bypassState) : false;

    this.forceResetOperationLock();
    window.addEventListener('beforeunload', () => this.forceResetOperationLock());
  }

  // ==================== 原生 DOM 事件绑定 ====================

  private bindAudioEvents() {
    this.audio.addEventListener('play', () => {
      this.updateMediaSessionState(true);
      this.emit('play');
    });

    this.audio.addEventListener('pause', () => {
      this.updateMediaSessionState(false);
      this.emit('pause');
    });

    this.audio.addEventListener('ended', () => {
      this.emit('end');
    });

    this.audio.addEventListener('seeked', () => {
      this.updateMediaSessionPositionState();
      this.emit('seek');
    });

    this.audio.addEventListener('timeupdate', () => {
      // 需要时可监听；主要用于 MediaSession 同步
    });

    this.audio.addEventListener('waiting', () => {
      this._isLoading = true;
    });

    this.audio.addEventListener('canplay', () => {
      this._isLoading = false;
    });

    this.audio.addEventListener('error', () => {
      const error = this.audio.error;
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
    if (this.sourceNode) return; // Already initialized

    if (!isElectron) {
      console.log('Web环境中跳过EQ设置，避免CORS问题');
      this.bypass = true;
      return;
    }

    try {
      this.context = new AudioContext();
      this.sourceNode = this.context.createMediaElementSource(this.audio);
      this.gainNode = this.context.createGain();

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

      // 连接音频图
      this.applyBypassState();

      // 应用已保存音量（静态 import，renderer 无 Node require）
      this.applyVolume(persistenceService.load(volumeSchema));

      this.setupContextStateMonitoring();

      // 恢复已保存的音频输出设备
      this.restoreSavedAudioDevice();

      console.log('EQ initialization successful');
    } catch (error) {
      console.error('EQ initialization failed:', error);
      // 回退：audio 直连（无 EQ）
      this.sourceNode = null;
      this.context = null;
    }
  }

  private applyBypassState() {
    if (!this.sourceNode || !this.gainNode || !this.context) return;

    try {
      // 全部断开
      try {
        this.sourceNode.disconnect();
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

      if (this.bypass) {
        // EQ 关闭：source -> gain -> destination
        this.sourceNode.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
      } else {
        // EQ 开启：source -> filters[0..9] -> gain -> destination
        this.sourceNode.connect(this.filters[0]);
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
        if (this.sourceNode && this.context) {
          this.sourceNode.connect(this.context.destination);
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

    if (this.sourceNode && this.gainNode && this.context) {
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

  public play(
    url: string,
    track: SongResult,
    isPlay: boolean = true,
    seekTime: number = 0,
    _existingSound?: HTMLAudioElement
  ): Promise<HTMLAudioElement> {
    // 无新 URL/曲目时恢复当前播放
    if (this.audio.src && !url && !track) {
      this.audio.play();
      return Promise.resolve(this.audio);
    }

    this.forceResetOperationLock();
    this.setOperationLock();

    if (!url || !track) {
      this.releaseOperationLock();
      return Promise.reject(new Error('缺少必要参数: url和track'));
    }

    // 同一 URL 则仅恢复/seek
    const currentSrc = this.audio.src;
    const isSameUrl = currentSrc && currentSrc === url;

    if (isSameUrl) {
      this.currentTrack = track;
      if (seekTime > 0) this.audio.currentTime = seekTime;
      if (isPlay) this.audio.play();
      this.updateMediaSessionMetadata(track);
      this.releaseOperationLock();
      return Promise.resolve(this.audio);
    }

    // 开始新一轮前：卸监听/清 retry timer，并以 AbortError 结算上一轮 Promise
    if (this.pendingLoadCleanup) {
      this.pendingLoadCleanup();
      this.pendingLoadCleanup = null;
    }

    return new Promise<HTMLAudioElement>((resolve, reject) => {
      let retryCount = 0;
      const maxRetries = 1;
      let settled = false;
      let retryTimer: ReturnType<typeof setTimeout> | null = null;
      let detachLoadListeners: (() => void) | null = null;

      const settleResolve = (el: HTMLAudioElement) => {
        if (settled) return;
        settled = true;
        if (this.pendingLoadCleanup === cancelPendingLoad) {
          this.pendingLoadCleanup = null;
        }
        resolve(el);
      };
      const settleReject = (err: Error) => {
        if (settled) return;
        settled = true;
        if (this.pendingLoadCleanup === cancelPendingLoad) {
          this.pendingLoadCleanup = null;
        }
        reject(err);
      };

      const clearRetryTimer = () => {
        if (retryTimer !== null) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
      };

      // 整轮 play 生命周期的取消：监听器 + 延迟重试 + Promise 结算
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

      const tryPlay = () => {
        // 延迟重试到期时若已 cancel/settled，禁止再写 audio.src
        if (settled) return;

        this._isLoading = true;
        this.currentTrack = track;

        // 初始化 EQ/AudioContext（只跑一次）
        this.setupEQ();

        // AudioContext 挂起时恢复（需用户手势）
        if (this.context && this.context.state === 'suspended') {
          this.context.resume().catch((e) => console.warn('Failed to resume AudioContext:', e));
        }

        const onCanPlay = () => {
          detachLoadListeners?.();
          detachLoadListeners = null;
          this._isLoading = false;

          if (seekTime > 0) {
            this.audio.currentTime = seekTime;
          }

          if (isPlay) {
            this.audio.play().catch((err) => {
              console.error('Audio play failed:', err);
              this.emit('playerror', { track, error: err });
            });
          }

          this.applyVolume(persistenceService.load(volumeSchema));

          this.audio.playbackRate = this.playbackRate;
          this.updateMediaSessionMetadata(track);
          this.updateMediaSessionPositionState();
          this.emit('load');
          this.releaseOperationLock();
          settleResolve(this.audio);
        };

        const onError = () => {
          detachLoadListeners?.();
          detachLoadListeners = null;
          this._isLoading = false;
          if (settled) return;

          const error = this.audio.error;
          console.error('Audio load error:', error?.code, error?.message);
          this.emit('loaderror', { track, error });

          // MEDIA_ERR_SRC_NOT_SUPPORTED(4)：源本身无效（URL 已失效/返回了
          // 非音频内容），用同一 URL 重试毫无意义，直接走 url_expired 换新 URL
          const isSrcNotSupported = error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;

          if (!isSrcNotSupported && retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying playback (${retryCount}/${maxRetries})...`);
            // 重试等待期间保持 cancelPendingLoad，可清 timer 并结算 Promise
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
          this.audio.removeEventListener('canplay', onCanPlay);
          this.audio.removeEventListener('error', onError);
        };

        this.audio.addEventListener('canplay', onCanPlay, { once: true });
        this.audio.addEventListener('error', onError, { once: true });

        this.audio.src = url;
        this.audio.load();
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
    // 卸监听并以 AbortError 结算尚未完成的 play() Promise
    if (this.pendingLoadCleanup) {
      this.pendingLoadCleanup();
      this.pendingLoadCleanup = null;
    }
    try {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load(); // Reset the element
    } catch (error) {
      console.error('停止音频失败:', error);
    }
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
    } else {
      // 回退：直接设音量（无 Web Audio）
      this.audio.volume = normalizedVolume;
    }

    persistenceService.save(volumeSchema, normalizedVolume);
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    this.audio.playbackRate = rate;
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
}

export const audioService = new AudioService();
